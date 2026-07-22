import headerHtml from "@/generated/header.html?raw";

export function SiteHeader() {
  return <div dangerouslySetInnerHTML={{ __html: headerHtml }} />;
}