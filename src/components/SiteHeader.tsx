import headerHtml from "@/generated/header.html?raw";

export function SiteHeader() {
  return <div style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: headerHtml }} />;
}