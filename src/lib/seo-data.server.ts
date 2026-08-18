import { seoFileKey, type SeoRecord } from "./seo-head";

type RawSeoRecord = {
  canonical?: string;
  robots?: Record<string, string>;
  og?: Record<string, string>;
  og_image?: { url?: string; width?: number; height?: number } | null;
  twitter?: SeoRecord["twitter"];
  schema?: unknown;
};

type SeoJsonModule = { default: RawSeoRecord } | RawSeoRecord;
type SeoImporter = () => Promise<SeoJsonModule>;

const DEFAULT_SOCIAL_IMAGE = {
  url: "https://www.rrshamaut.co.il/og-cover.png",
  width: 1200,
  height: 630,
};

const seoFiles = import.meta.glob<SeoJsonModule>("@/generated/seo/*.json", {
  eager: false,
});

const seoImportersByDecodedPath = buildSeoImporterMap(seoFiles);

export async function loadSeoRecord(path: string): Promise<SeoRecord | null> {
  const key = normalizeSeoLookupPath(path);
  const importer = seoImportersByDecodedPath.get(key);
  if (!importer) return null;

  try {
    const mod = await importer();
    const raw = "default" in mod ? mod.default : mod;
    return normalizeSeoRecord(raw);
  } catch {
    return null;
  }
}

function buildSeoImporterMap(files: Record<string, SeoImporter>): Map<string, SeoImporter> {
  const map = new Map<string, SeoImporter>();
  for (const [globPath, importer] of Object.entries(files)) {
    const fileName = globPath.split("/").pop();
    if (!fileName?.endsWith(".json")) continue;

    const encodedKey = fileName.slice(0, -".json".length);
    const decodedKey = safeDecodeURIComponent(encodedKey);
    map.set(decodedKey, importer);
  }
  return map;
}

function normalizeSeoLookupPath(path: string): string {
  const trimmed = (path || "").replace(/^\/+|\/+$/g, "");
  const fileKey = seoFileKey(trimmed);
  return safeDecodeURIComponent(fileKey);
}

function normalizeSeoRecord(raw: RawSeoRecord): SeoRecord {
  return {
    canonical: raw.canonical,
    robots: raw.robots,
    og: raw.og,
    og_image: raw.og_image?.url
      ? raw.og_image
      : (getFallbackOgImage(raw.schema) ?? DEFAULT_SOCIAL_IMAGE),
    twitter: raw.twitter,
    schema: raw.schema ? JSON.stringify(raw.schema) : null,
  };
}

function getFallbackOgImage(schema: unknown): SeoRecord["og_image"] {
  if (!schema || typeof schema !== "object") return null;
  const graph = (schema as { "@graph"?: unknown })["@graph"];
  if (!Array.isArray(graph)) return null;

  for (const item of graph) {
    if (!item || typeof item !== "object") continue;
    const thumbnailUrl = (item as { thumbnailUrl?: unknown }).thumbnailUrl;
    if (typeof thumbnailUrl === "string" && thumbnailUrl) return { url: thumbnailUrl };
  }

  for (const item of graph) {
    const image = readImageUrl(item);
    if (image) return { url: image };
  }

  return null;
}

function readImageUrl(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const image = (value as { image?: unknown; logo?: unknown }).image;
  const logo = (value as { image?: unknown; logo?: unknown }).logo;
  return readUrl(image) ?? readUrl(logo);
}

function readUrl(value: unknown): string | null {
  if (typeof value === "string" && value) return value;
  if (!value || typeof value !== "object") return null;
  const url = (value as { url?: unknown; contentUrl?: unknown }).url;
  if (typeof url === "string" && url) return url;
  const contentUrl = (value as { url?: unknown; contentUrl?: unknown }).contentUrl;
  return typeof contentUrl === "string" && contentUrl ? contentUrl : null;
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
