import footerHtml from "@/generated/footer.html?raw";
import { improveMigratedHtml } from "@/lib/migrated-html";

const normalizedFooterHtml = improveMigratedHtml(footerHtml, "RR");

export function SiteFooter() {
  return <div dangerouslySetInnerHTML={{ __html: normalizedFooterHtml }} />;
}
