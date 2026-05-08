#!/usr/bin/env node
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, appendFileSync, existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(join(__dirname, "config.json"), "utf-8"));
const LOG_PATH = join(__dirname, "posts.log");
const SOURCES_PATH = join(__dirname, "sources.json");

const MODE = (process.argv[2] || "draft").toLowerCase();

const {
  ANTHROPIC_API_KEY,
  THREADS_USER_ID,
  THREADS_ACCESS_TOKEN,
  INSTAGRAM_USER_ID,
  INSTAGRAM_ACCESS_TOKEN,
  DRAFT_OUT,
  DRAFT_IN_THREADS_TEXT,
  DRAFT_IN_INSTAGRAM_CAPTION,
  DRAFT_IN_IMAGE_URL,
  TARGET,
} = process.env;

if (MODE === "draft") {
  if (!ANTHROPIC_API_KEY) die("ANTHROPIC_API_KEY is required for draft mode");
  await runDraft();
} else if (MODE === "publish") {
  await runPublish();
} else {
  die(`Unknown mode: ${MODE} (use 'draft' or 'publish')`);
}

// ===== DRAFT MODE =====

async function runDraft() {
  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  const source = pickSource();
  if (!source) die("No sources found in sources.json");

  const [threadsResult, instagramResult] = await Promise.all([
    generatePost(anthropic, source, "threads"),
    generatePost(anthropic, source, "instagram"),
  ]);

  const result = {
    source_id: source.id,
    topic: threadsResult.topic,
    title: source.title || null,
    location: source.location || null,
    image_url: source.image_url,
    source_url: source.source_url || null,
    threads_text: threadsResult.text,
    instagram_caption: instagramResult.text,
    generated_at: new Date().toISOString(),
  };

  console.log(JSON.stringify(result, null, 2));

  if (DRAFT_OUT) {
    writeFileSync(DRAFT_OUT, JSON.stringify(result, null, 2));
    console.error(`Draft written to ${DRAFT_OUT}`);
  }
}

function pickSource() {
  if (!existsSync(SOURCES_PATH)) return null;
  const sources = JSON.parse(readFileSync(SOURCES_PATH, "utf-8"));
  if (!Array.isArray(sources) || sources.length === 0) return null;
  const usedIds = readUsedSourceIds();
  const unused = sources.filter((s) => !usedIds.includes(s.id));
  const pool = unused.length > 0 ? unused : sources;
  return pool[Math.floor(Math.random() * pool.length)];
}

function readUsedSourceIds() {
  try {
    const lines = readFileSync(LOG_PATH, "utf-8").trim().split("\n").filter(Boolean);
    return lines
      .slice(-Math.min(lines.length, 30))
      .map((l) => { try { return JSON.parse(l).source_id; } catch { return null; } })
      .filter(Boolean);
  } catch { return []; }
}

async function generatePost(anthropic, source, target) {
  const topic = source.topic_hint
    || config.topics[Math.floor(Math.random() * config.topics.length)];
  const recent = readRecentPosts(5, target);
  const styleRules = target === "instagram" ? config.instagram_style_rules : config.threads_style_rules;
  const platformLabel = target === "instagram" ? "Instagram" : "Threads";
  const limit = target === "instagram" ? 2200 : 500;

  const systemPrompt = [
    `あなたは建築設計士の${platformLabel}投稿文を執筆するアシスタント。`,
    `言語: ${config.language}`,
    `ペルソナ: ${config.persona}`,
    ``,
    `${platformLabel}用スタイルルール:`,
    ...styleRules.map((r) => `- ${r}`),
    ``,
    `直近の投稿(重複・類似は避ける):`,
    recent.length ? recent.map((p, i) => `${i + 1}. ${p}`).join("\n") : "(まだ無し)",
  ].join("\n");

  const userPromptParts = [`今回のテーマ: 「${topic}」`];
  userPromptParts.push("");
  userPromptParts.push(`添付する作品の情報:`);
  if (source.title) userPromptParts.push(`- 作品名: ${source.title}`);
  if (source.location) userPromptParts.push(`- 場所/竣工: ${source.location}`);
  if (source.description) userPromptParts.push(`- 設計概要: ${source.description}`);
  userPromptParts.push("");
  userPromptParts.push("この作品と関連する投稿文を書いてください。");
  userPromptParts.push("");
  userPromptParts.push("投稿本文だけを出力してください。前置きや説明、引用符は不要です。");

  const res = await anthropic.messages.create({
    model: config.model,
    max_tokens: target === "instagram" ? 2000 : 800,
    system: systemPrompt,
    messages: [{ role: "user", content: userPromptParts.join("\n") }],
  });

  const text = res.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim()
    .replace(/^["「『]|["」』]$/g, "");

  if (!text) throw new Error(`Empty generation for ${target}`);
  if (text.length > limit) throw new Error(`Too long for ${target}: ${text.length} chars (limit ${limit})`);
  return { text, topic };
}

function readRecentPosts(n, target) {
  try {
    const lines = readFileSync(LOG_PATH, "utf-8").trim().split("\n").filter(Boolean);
    return lines
      .slice(-n * 2)
      .map((l) => { try { return JSON.parse(l); } catch { return null; } })
      .filter(Boolean)
      .filter((e) => !target || e.target === target || !e.target)
      .slice(-n)
      .map((e) => e.text)
      .filter(Boolean);
  } catch { return []; }
}

// ===== PUBLISH MODE =====

async function runPublish() {
  const target = (TARGET || "threads").toLowerCase();
  if (target === "threads") return await publishThreads();
  if (target === "instagram") return await publishInstagram();
  die(`Unknown TARGET: ${target} (use 'threads' or 'instagram')`);
}

async function publishThreads() {
  if (!THREADS_USER_ID || !THREADS_ACCESS_TOKEN) die("THREADS_USER_ID and THREADS_ACCESS_TOKEN are required");
  const text = DRAFT_IN_THREADS_TEXT;
  if (!text) die("DRAFT_IN_THREADS_TEXT is required");

  const imageUrl = (DRAFT_IN_IMAGE_URL || "").trim() || null;

  if (text.length > 500) die(`Text too long: ${text.length} chars (Threads limit 500)`);

  const createUrl = `https://graph.threads.net/v1.0/${THREADS_USER_ID}/threads`;
  const body = { text, access_token: THREADS_ACCESS_TOKEN };
  if (imageUrl) {
    body.media_type = "IMAGE";
    body.image_url = imageUrl;
  } else {
    body.media_type = "TEXT";
  }

  const createRes = await fetch(createUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!createRes.ok) throw new Error(`Threads create failed: ${createRes.status} ${await createRes.text()}`);
  const { id: containerId } = await createRes.json();

  await sleep(imageUrl ? 8000 : 3000);

  const publishUrl = `https://graph.threads.net/v1.0/${THREADS_USER_ID}/threads_publish`;
  const publishRes = await fetch(publishUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: containerId, access_token: THREADS_ACCESS_TOKEN }),
  });
  if (!publishRes.ok) throw new Error(`Threads publish failed: ${publishRes.status} ${await publishRes.text()}`);
  const { id: postId } = await publishRes.json();

  appendFileSync(LOG_PATH, JSON.stringify({
    ts: new Date().toISOString(),
    target: "threads",
    text,
    image_url: imageUrl,
    postId,
  }) + "\n");

  console.log(`Threads posted: id=${postId}`);
}

async function publishInstagram() {
  if (!INSTAGRAM_USER_ID || !INSTAGRAM_ACCESS_TOKEN) die("INSTAGRAM_USER_ID and INSTAGRAM_ACCESS_TOKEN are required");
  const caption = DRAFT_IN_INSTAGRAM_CAPTION;
  if (!caption) die("DRAFT_IN_INSTAGRAM_CAPTION is required");

  const imageUrl = (DRAFT_IN_IMAGE_URL || "").trim();
  if (!imageUrl) die("DRAFT_IN_IMAGE_URL is required (Instagram requires an image)");

  if (caption.length > 2200) die(`Caption too long: ${caption.length} chars (IG limit 2200)`);

  const containerId = await igCreateImageContainer(imageUrl, caption);
  await igWaitForContainer(containerId);

  const publishUrl = `https://graph.instagram.com/v21.0/${INSTAGRAM_USER_ID}/media_publish`;
  const publishRes = await fetch(publishUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: containerId, access_token: INSTAGRAM_ACCESS_TOKEN }),
  });
  if (!publishRes.ok) throw new Error(`IG publish failed: ${publishRes.status} ${await publishRes.text()}`);
  const { id: postId } = await publishRes.json();

  appendFileSync(LOG_PATH, JSON.stringify({
    ts: new Date().toISOString(),
    target: "instagram",
    text: caption,
    image_url: imageUrl,
    postId,
  }) + "\n");

  console.log(`Instagram posted: id=${postId}`);
}

async function igCreateImageContainer(imageUrl, caption) {
  const url = `https://graph.instagram.com/v21.0/${INSTAGRAM_USER_ID}/media`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_url: imageUrl,
      caption,
      access_token: INSTAGRAM_ACCESS_TOKEN,
    }),
  });
  if (!res.ok) throw new Error(`IG image container failed: ${res.status} ${await res.text()}`);
  const { id } = await res.json();
  return id;
}

async function igWaitForContainer(containerId, maxWaitMs = 90000) {
  const start = Date.now();
  let lastStatus = "";
  while (Date.now() - start < maxWaitMs) {
    await sleep(5000);
    const url = `https://graph.instagram.com/v21.0/${containerId}?fields=status_code,status&access_token=${INSTAGRAM_ACCESS_TOKEN}`;
    const res = await fetch(url);
    if (!res.ok) continue;
    const j = await res.json();
    lastStatus = j.status_code;
    if (j.status_code === "FINISHED") return;
    if (j.status_code === "ERROR") throw new Error(`IG container error: ${j.status || "unknown"}`);
  }
  throw new Error(`IG container did not finish in ${maxWaitMs}ms (last status: ${lastStatus})`);
}

// ===== utils =====

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function die(msg) {
  console.error(`Error: ${msg}`);
  process.exit(1);
}
