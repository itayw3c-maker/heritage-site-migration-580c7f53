import footerHtml from "@/generated/footer.html?raw";

export function SiteFooter() {
  return <div dangerouslySetInnerHTML={{ __html: footerHtml }} />;
}