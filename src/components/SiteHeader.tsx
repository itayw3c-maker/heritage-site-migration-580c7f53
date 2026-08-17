import headerHtml from "@/generated/header.html?raw";
import { improveMigratedHtml } from "@/lib/migrated-html";

const normalizedHeaderHtml = improveMigratedHtml(headerHtml, "רפאל שמאות רכוש");

export function SiteHeader() {
  return <div style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: normalizedHeaderHtml }} />;
}
