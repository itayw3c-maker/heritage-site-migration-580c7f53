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
    og_image: raw.og_image,
    twitter: raw.twitter,
    schema: raw.schema ? JSON.stringify(raw.schema) : null,
  };
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}