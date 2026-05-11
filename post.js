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

// 環境変数を読み込み + secret に混入しがちな空白/改行/制御文字を全除去
// (GitHub Secrets に貼る時にトークン中央や末尾に改行が紛れ込むと OAuth 190 "Cannot parse access token" になる)
// OAuthトークン・API key・数値IDには空白文字は入らないので全除去で安全
const _clean = (v) => (v == null ? v : String(v).replace(/\s/g, ''));
const {
  ANTHROPIC_API_KEY: _RAW_ANTHROPIC_API_KEY,
  THREADS_USER_ID: _RAW_THREADS_USER_ID,
  THREADS_ACCESS_TOKEN: _RAW_THREADS_ACCESS_TOKEN,
  INSTAGRAM_USER_ID: _RAW_INSTAGRAM_USER_ID,
  INSTAGRAM_ACCESS_TOKEN: _RAW_INSTAGRAM_ACCESS_TOKEN,
  DRAFT_OUT,
  DRAFT_IN_THREADS_TEXT,
  DRAFT_IN_INSTAGRAM_CAPTION,
  DRAFT_IN_IMAGE_URL,
  DRAFT_IN_CAROUSEL_URLS,
  TARGET,
} = process.env;
const ANTHROPIC_API_KEY = _clean(_RAW_ANTHROPIC_API_KEY);
const THREADS_USER_ID = _clean(_RAW_THREADS_USER_ID);
const THREADS_ACCESS_TOKEN = _clean(_RAW_THREADS_ACCESS_TOKEN);
const INSTAGRAM_USER_ID = _clean(_RAW_INSTAGRAM_USER_ID);
const INSTAGRAM_ACCESS_TOKEN = _clean(_RAW_INSTAGRAM_ACCESS_TOKEN);

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

  const carouselUrls = pickCarouselImages(source);
  const isCarousel = carouselUrls.length >= 2;

  const [threadsResult, instagramResult] = await Promise.all([
    generatePost(anthropic, source, "threads", isCarousel),
    generatePost(anthropic, source, "instagram", isCarousel),
  ]);

  const result = {
    source_id: source.id,
    topic: threadsResult.topic,
    title: source.title || null,
    location: source.location || null,
    image_url: source.image_url,
    carousel_image_urls: carouselUrls,
    is_carousel: isCarousel,
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

  // LINEから「別のプロジェクト」指示が来た時に渡される除外ID(カンマ区切り)
  const explicitExcludes = (process.env.EXCLUDE_SOURCE_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // 過去に投稿済みのID(直近30件)
  const usedIds = readUsedSourceIds();

  // 1. まず「明示除外 + 過去投稿済み」を全部弾いたプールを作る
  const fullyExcluded = new Set([...explicitExcludes, ...usedIds]);
  let pool = sources.filter((s) => !fullyExcluded.has(s.id));

  // 2. 何も残らなければ、明示除外だけは絶対守って、過去履歴は無視
  if (pool.length === 0) {
    const minimalExcluded = new Set(explicitExcludes);
    pool = sources.filter((s) => !minimalExcluded.has(s.id));
  }

  // 3. それでも空(=全作品が除外指定されている)なら、最後の手段で全件から
  if (pool.length === 0) pool = sources;

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

function readRecentImageUrlsForSource(sourceId) {
  try {
    const lines = readFileSync(LOG_PATH, "utf-8").trim().split("\n").filter(Boolean);
    const used = new Set();
    for (const l of lines) {
      try {
        const e = JSON.parse(l);
        if (e.source_id === sourceId && Array.isArray(e.carousel_image_urls)) {
          e.carousel_image_urls.forEach((u) => used.add(u));
        }
      } catch {}
    }
    return [...used];
  } catch { return []; }
}

function pickCarouselImages(source) {
  // 全画像URLがあればそこから、無ければ既存のcarousel_image_urlsから
  const allUrls = (Array.isArray(source.all_image_urls) && source.all_image_urls.length > 0)
    ? source.all_image_urls
    : (Array.isArray(source.carousel_image_urls) ? source.carousel_image_urls : []);

  if (allUrls.length === 0) return [];
  if (allUrls.length <= 4) return allUrls.slice(0, 4);

  // 直近で同じ作品で使った画像を避ける
  const recentlyUsed = readRecentImageUrlsForSource(source.id);
  const unused = allUrls.filter((u) => !recentlyUsed.includes(u));
  const pool = unused.length >= 4 ? unused : allUrls;

  // ランダムに4枚選ぶ(順番もシャッフル)
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 4);
}

async function generatePost(anthropic, source, target, isCarousel) {
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
  if (target === "instagram" && isCarousel) {
    userPromptParts.push(`- 複数枚のカルーセル投稿(スワイプ式、${(source.carousel_image_urls || []).length}枚)`);
  }
  userPromptParts.push("");
  userPromptParts.push("この作品と関連する投稿文を書いてください。");
  userPromptParts.push("");
  userPromptParts.push("投稿本文だけを出力してください。前置きや説明、引用符は不要です。");

  const res = await anthropic.messages.create({
    model: config.model,
    max_tokens: target === "instagram" ? 1500 : 800,
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
  if (text.length > 500) die(`Text too long: ${text.length} chars (Threads limit 500)`);

  const carouselUrls = (DRAFT_IN_CAROUSEL_URLS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4); // Threads APIは最大20だが、X側に揃えて4枚まで
  const singleImageUrl = (DRAFT_IN_IMAGE_URL || "").trim() || null;

  let containerId;
  if (carouselUrls.length >= 2) {
    containerId = await threadsCreateCarousel(carouselUrls, text);
  } else {
    const url = singleImageUrl || (carouselUrls.length === 1 ? carouselUrls[0] : null);
    containerId = await threadsCreateSingle(url, text);
  }

  // コンテナ処理待ち(画像がある時は長めに)
  await sleep(carouselUrls.length >= 2 ? 12000 : (singleImageUrl || carouselUrls.length > 0 ? 8000 : 3000));

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
    image_url: singleImageUrl || carouselUrls[0] || null,
    carousel_count: carouselUrls.length,
    carousel_image_urls: carouselUrls,
    postId,
  }) + "\n");

  console.log(`Threads posted: id=${postId}`);
}

async function threadsCreateSingle(imageUrl, text) {
  const createUrl = `https://graph.threads.net/v1.0/${THREADS_USER_ID}/threads`;
  const body = { text, access_token: THREADS_ACCESS_TOKEN };
  if (imageUrl) {
    body.media_type = "IMAGE";
    body.image_url = imageUrl;
  } else {
    body.media_type = "TEXT";
  }
  const res = await fetch(createUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Threads create failed: ${res.status} ${await res.text()}`);
  const { id } = await res.json();
  return id;
}

async function threadsCreateCarousel(imageUrls, text) {
  const childIds = [];
  for (const imageUrl of imageUrls) {
    const childUrl = `https://graph.threads.net/v1.0/${THREADS_USER_ID}/threads`;
    const res = await fetch(childUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_type: "IMAGE",
        image_url: imageUrl,
        is_carousel_item: true,
        access_token: THREADS_ACCESS_TOKEN,
      }),
    });
    if (!res.ok) throw new Error(`Threads carousel child failed: ${res.status} ${await res.text()}`);
    const { id } = await res.json();
    childIds.push(id);
    await sleep(2500); // 子コンテナの処理待ち
  }
  const parentUrl = `https://graph.threads.net/v1.0/${THREADS_USER_ID}/threads`;
  const res = await fetch(parentUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      media_type: "CAROUSEL",
      text,
      children: childIds.join(","),
      access_token: THREADS_ACCESS_TOKEN,
    }),
  });
  if (!res.ok) throw new Error(`Threads carousel parent failed: ${res.status} ${await res.text()}`);
  const { id } = await res.json();
  return id;
}

async function publishInstagram() {
  if (!INSTAGRAM_USER_ID || !INSTAGRAM_ACCESS_TOKEN) die("INSTAGRAM_USER_ID and INSTAGRAM_ACCESS_TOKEN are required");
  // デバッグ: トークンが正しく読めてるか先頭/末尾と長さを表示(全文は出さない)
  console.error(`[DEBUG] INSTAGRAM_USER_ID = ${INSTAGRAM_USER_ID}`);
  console.error(`[DEBUG] INSTAGRAM_ACCESS_TOKEN length = ${INSTAGRAM_ACCESS_TOKEN.length}`);
  console.error(`[DEBUG] INSTAGRAM_ACCESS_TOKEN prefix = ${INSTAGRAM_ACCESS_TOKEN.slice(0, 10)}...${INSTAGRAM_ACCESS_TOKEN.slice(-6)}`);
  const caption = DRAFT_IN_INSTAGRAM_CAPTION;
  if (!caption) die("DRAFT_IN_INSTAGRAM_CAPTION is required");

  const carouselUrls = (DRAFT_IN_CAROUSEL_URLS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const singleUrl = (DRAFT_IN_IMAGE_URL || "").trim();

  if (caption.length > 2200) die(`Caption too long: ${caption.length} chars (IG limit 2200)`);

  let creationId;
  if (carouselUrls.length >= 2) {
    creationId = await igCreateCarouselContainer(carouselUrls, caption);
  } else {
    if (!singleUrl) die("DRAFT_IN_IMAGE_URL is required for single image post");
    creationId = await igCreateImageContainer(singleUrl, caption);
  }

  await igWaitForContainer(creationId);

  const publishUrl = `https://graph.facebook.com/v21.0/${INSTAGRAM_USER_ID}/media_publish`;
  const publishRes = await fetch(publishUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: creationId, access_token: INSTAGRAM_ACCESS_TOKEN }),
  });
  if (!publishRes.ok) throw new Error(`IG publish failed: ${publishRes.status} ${await publishRes.text()}`);
  const { id: postId } = await publishRes.json();

  appendFileSync(LOG_PATH, JSON.stringify({
    ts: new Date().toISOString(),
    target: "instagram",
    text: caption,
    image_url: singleUrl || carouselUrls[0],
    carousel_count: carouselUrls.length,
    carousel_image_urls: carouselUrls,
    source_id: process.env.DRAFT_IN_SOURCE_ID || null,
    postId,
  }) + "\n");

  console.log(`Instagram posted: id=${postId}`);
}

async function igCreateImageContainer(imageUrl, caption) {
  const url = `https://graph.facebook.com/v21.0/${INSTAGRAM_USER_ID}/media`;
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

async function igCreateCarouselContainer(imageUrls, caption) {
  const childIds = [];
  for (const imageUrl of imageUrls) {
    const url = `https://graph.facebook.com/v21.0/${INSTAGRAM_USER_ID}/media`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: imageUrl,
        is_carousel_item: true,
        access_token: INSTAGRAM_ACCESS_TOKEN,
      }),
    });
    if (!res.ok) throw new Error(`IG carousel child failed: ${res.status} ${await res.text()}`);
    const { id } = await res.json();
    childIds.push(id);
    await igWaitForContainer(id);
  }

  const url = `https://graph.facebook.com/v21.0/${INSTAGRAM_USER_ID}/media`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      media_type: "CAROUSEL",
      caption,
      children: childIds.join(","),
      access_token: INSTAGRAM_ACCESS_TOKEN,
    }),
  });
  if (!res.ok) throw new Error(`IG carousel parent failed: ${res.status} ${await res.text()}`);
  const { id } = await res.json();
  return id;
}

async function igWaitForContainer(containerId, maxWaitMs = 120000) {
  const start = Date.now();
  let lastStatus = "";
  while (Date.now() - start < maxWaitMs) {
    await sleep(5000);
    const url = `https://graph.facebook.com/v21.0/${containerId}?fields=status_code,status&access_token=${INSTAGRAM_ACCESS_TOKEN}`;
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
