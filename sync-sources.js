#!/usr/bin/env node
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCES_PATH = join(__dirname, "sources.json");

const {
  MICROCMS_API_KEY,
  MICROCMS_SERVICE_ID = "a5xuqpwtq5",
  MICROCMS_ENDPOINT = "project",
  EXCLUDE_IDS = "",
} = process.env;

if (!MICROCMS_API_KEY) {
  console.error("Error: MICROCMS_API_KEY is required");
  process.exit(1);
}

const excludeIds = EXCLUDE_IDS.split(",").map((s) => s.trim()).filter(Boolean);

function decodeHtmlEntities(s) {
  return s
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function extractFromBody(body) {
  if (!body) return { description: "", imageUrls: [], lastP: "" };

  const firstPMatch = body.match(/<p>([\s\S]*?)<\/p>/);
  let description = firstPMatch ? firstPMatch[1] : "";
  description = description
    .replace(/<br\s*\/?>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim();
  description = decodeHtmlEntities(description);

  const imgMatches = [...body.matchAll(/<figure>\s*<img\s+src="([^"]+)"/g)];
  let imageUrls = imgMatches.map((m) =>
    decodeHtmlEntities(m[1]).replace(/'/g, "%27")
  );

  imageUrls = imageUrls.filter((u) => {
    const decoded = decodeURIComponent(u);
    return !/(竣工図|平面|断面|立面|スペー|外観[1-9]?\.png|模型|シェルフスヘ|sketch|drawing)/.test(decoded);
  });

  const allPs = [...body.matchAll(/<p>([\s\S]*?)<\/p>/g)];
  const lastP = allPs.length > 1 ? allPs[allPs.length - 1][1] : "";
  const lastPText = decodeHtmlEntities(
    lastP.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " ")
  );

  return { description, imageUrls, lastP: lastPText };
}

function extractLocation(lastPText) {
  const locMatch = lastPText.match(/所在地[\s　]*[::][\s　]*([^\s　:::用]+)/);
  const yearMatch = lastPText.match(/竣[\s　]*工[\s　]*[::][\s　]*([\d\.]+)/);
  const locStr = locMatch ? locMatch[1].trim() : "";
  const yearStr = yearMatch ? yearMatch[1].trim() : "";
  return [locStr, yearStr].filter(Boolean).join(" / ");
}

const TOPIC_HINTS = {
  Shop: "素材選定の理由(木・コンクリート・鉄など)",
  Office: "内と外の境界の作り方",
  Other: "図面では伝わらない空間体験",
  Public: "街と建築の関係",
};

async function fetchAll() {
  const url = `https://${MICROCMS_SERVICE_ID}.microcms.io/api/v1/${MICROCMS_ENDPOINT}?limit=100`;
  const res = await fetch(url, {
    headers: { "X-MICROCMS-API-KEY": MICROCMS_API_KEY },
  });
  if (!res.ok) {
    throw new Error(`microCMS API failed: ${res.status} ${await res.text()}`);
  }
  return await res.json();
}

async function main() {
  console.log(`Fetching from microCMS: ${MICROCMS_SERVICE_ID}/${MICROCMS_ENDPOINT}`);
  const data = await fetchAll();
  console.log(`Got ${data.contents.length} items (totalCount: ${data.totalCount})`);

  const sources = data.contents
    .filter((work) => !excludeIds.includes(work.id))
    .map((work) => {
      const { description, imageUrls, lastP } = extractFromBody(work.body);
      const location = extractLocation(lastP);
      const cat = (work.category || ["Office"])[0];
      const topicHint = TOPIC_HINTS[cat] || "光と影の設計について";

      return {
        id: work.id,
        title: work.title,
        location,
        image_url: imageUrls[0] || (work.thumbs?.[0]?.url || ""),
        all_image_urls: imageUrls,
        carousel_image_urls: imageUrls.slice(0, 4),
        source_url: `https://colohu.com/project/${work.id}/`,
        description,
        topic_hint: topicHint,
        category: cat,
      };
    })
    .filter((s) => s.description && s.description.length >= 30 && s.all_image_urls.length >= 1);

  writeFileSync(SOURCES_PATH, JSON.stringify(sources, null, 2));
  console.log(`✅ Wrote ${sources.length} entries to sources.json`);
  sources.forEach((s, i) => {
    console.log(`${i + 1}. ${s.title} (${s.category}) — ${s.all_image_urls.length} images`);
  });
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
