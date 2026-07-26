import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { useEffect, useState } from "react";

type Props = {
  value: string;
  onChange: (html: string) => void;
};

export function RichEditor({ value, onChange }: Props) {
  const [mode, setMode] = useState<"rich" | "html">("rich");
  const [htmlDraft, setHtmlDraft] = useState(value);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({}),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener" } }),
    ],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: { dir: "rtl", class: "admin-rich__editor" },
      transformPastedHTML: (html) => html,
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
      setHtmlDraft(html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (mode === "rich" && editor.getHTML() !== value) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
    setHtmlDraft(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, value]);

  function switchMode(next: "rich" | "html") {
    if (next === mode) return;
    if (next === "html") {
      setHtmlDraft(editor?.getHTML() ?? value);
      setMode("html");
    } else {
      editor?.commands.setContent(htmlDraft, { emitUpdate: false });
      onChange(htmlDraft);
      setMode("rich");
    }
  }

  if (!editor) return null;

  return (
    <div className="admin-rich">
      <div className="admin-rich__toolbar" role="toolbar">
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor.isActive("heading", { level: 2 }) ? "is-active" : ""}>H2</button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={editor.isActive("heading", { level: 3 }) ? "is-active" : ""}>H3</button>
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive("bold") ? "is-active" : ""}><b>B</b></button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive("italic") ? "is-active" : ""}><i>I</i></button>
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={editor.isActive("bulletList") ? "is-active" : ""}>• רשימה</button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={editor.isActive("orderedList") ? "is-active" : ""}>1. רשימה</button>
        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={editor.isActive("blockquote") ? "is-active" : ""}>“ ציטוט</button>
        <button
          type="button"
          onClick={() => {
            const prev = editor.getAttributes("link").href as string | undefined;
            const url = window.prompt("קישור:", prev ?? "https://");
            if (url === null) return;
            if (url === "") editor.chain().focus().extendMarkRange("link").unsetLink().run();
            else editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
          }}
          className={editor.isActive("link") ? "is-active" : ""}
        >
          🔗
        </button>
        <div className="admin-rich__spacer" />
        <button
          type="button"
          onClick={() => switchMode(mode === "rich" ? "html" : "rich")}
          className="admin-rich__mode"
        >
          {mode === "rich" ? "מצב HTML" : "מצב עורך"}
        </button>
      </div>
      {mode === "rich" ? (
        <EditorContent editor={editor} />
      ) : (
        <textarea
          className="admin-rich__html"
          dir="ltr"
          value={htmlDraft}
          onChange={(e) => {
            setHtmlDraft(e.target.value);
            onChange(e.target.value);
          }}
        />
      )}
    </div>
  );
}