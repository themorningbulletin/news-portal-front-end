"use client";

import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { uploadImage } from "./upload";

/**
 * Restricted rich text: paragraphs, three heading levels, emphasis, underline,
 * strikethrough, alignment, lists, quotes, dividers, links and uploaded images. The server sanitizes the HTML again on every save, so this
 * editor is a convenience, not the security boundary.
 */
/** The familiar four-line alignment glyphs. */
function AlignIcon({ align }: { align: "left" | "center" | "right" | "justify" }) {
  const lines: [number, number][] =
    align === "left" ? [[3, 21], [3, 15], [3, 21], [3, 15]]
    : align === "center" ? [[3, 21], [6, 18], [3, 21], [6, 18]]
    : align === "right" ? [[3, 21], [9, 21], [3, 21], [9, 21]]
    : [[3, 21], [3, 21], [3, 21], [3, 21]];
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      {lines.map(([x1, x2], i) => (
        <line key={i} x1={x1} x2={x2} y1={5 + i * 4.7} y2={5 + i * 4.7} />
      ))}
    </svg>
  );
}

export function RichText({
  value,
  onChange,
  readOnly = false,
  label,
  lang,
  onUploadError,
}: {
  value: string;
  onChange: (html: string) => void;
  readOnly?: boolean;
  label: string;
  lang: string;
  onUploadError?: () => void;
}) {
  const t = useTranslations("cms.toolbar");
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const editor = useEditor({
    immediatelyRender: false,
    editable: !readOnly,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        code: false,
        codeBlock: false,
        link: false,
      }),
      TextAlign.configure({ types: ["heading", "paragraph"], alignments: ["left", "center", "right", "justify"] }),
      Image.configure({ allowBase64: false }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        protocols: ["http", "https", "mailto"],
        HTMLAttributes: { rel: null, target: null },
        isAllowedUri: (url) => /^(https?:\/\/|mailto:|\/(?!\/))/i.test(url),
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: "prose-news min-h-[22rem] max-w-none p-4 focus:outline-none",
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": label,
        lang,
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
  });

  useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [editor, readOnly]);

  // Replace content only when it changes from outside (e.g. a revision restore).
  useEffect(() => {
    if (editor && value !== editor.getHTML()) editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            underline: e.isActive("underline"),
            strike: e.isActive("strike"),
            alignLeft: e.isActive({ textAlign: "left" }),
            alignCenter: e.isActive({ textAlign: "center" }),
            alignRight: e.isActive({ textAlign: "right" }),
            alignJustify: e.isActive({ textAlign: "justify" }),
            h4: e.isActive("heading", { level: 4 }),
            h2: e.isActive("heading", { level: 2 }),
            h3: e.isActive("heading", { level: 3 }),
            bullet: e.isActive("bulletList"),
            ordered: e.isActive("orderedList"),
            quote: e.isActive("blockquote"),
            link: e.isActive("link"),
          }
        : null,
  });

  if (!editor) return <div className="skeleton min-h-[22rem]" aria-hidden="true" />;

  const tool = (key: keyof NonNullable<typeof state>, text: ReactNode, run: () => void) => (
    <button
      type="button"
      key={key}
      onClick={run}
      aria-pressed={Boolean(state?.[key])}
      title={t(key)}
      aria-label={t(key)}
      disabled={readOnly}
      className="inline-flex h-9 min-w-9 items-center justify-center rounded px-2 text-sm font-semibold hover:bg-surface-2 aria-pressed:bg-brand-soft disabled:opacity-40"
    >
      {text}
    </button>
  );

  return (
    <div className="rounded border border-rule-strong bg-paper">
      <div role="toolbar" aria-label={label} className="sticky top-0 z-10 flex flex-wrap gap-1 border-b border-rule bg-surface p-1">
        {tool("bold", "B", () => editor.chain().focus().toggleBold().run())}
        {tool("italic", <span className="italic">I</span>, () => editor.chain().focus().toggleItalic().run())}
        {tool("underline", <span className="underline">U</span>, () => editor.chain().focus().toggleUnderline().run())}
        {tool("strike", <span className="line-through">S</span>, () => editor.chain().focus().toggleStrike().run())}
        <span className="mx-1 w-px bg-rule" aria-hidden="true" />
        {tool("h2", "H2", () => editor.chain().focus().toggleHeading({ level: 2 }).run())}
        {tool("h3", "H3", () => editor.chain().focus().toggleHeading({ level: 3 }).run())}
        {tool("h4", "H4", () => editor.chain().focus().toggleHeading({ level: 4 }).run())}
        <span className="mx-1 w-px bg-rule" aria-hidden="true" />
        {(["left", "center", "right", "justify"] as const).map((a) => {
          const key = `align${a[0]!.toUpperCase()}${a.slice(1)}` as "alignLeft" | "alignCenter" | "alignRight" | "alignJustify";
          // Both alignments toggle off again to the default (left).
          return tool(key, <AlignIcon align={a} />, () =>
            state?.[key] ? editor.chain().focus().unsetTextAlign().run() : editor.chain().focus().setTextAlign(a).run(),
          );
        })}
        <span className="mx-1 w-px bg-rule" aria-hidden="true" />
        {tool("bullet", "•", () => editor.chain().focus().toggleBulletList().run())}
        {tool("ordered", "1.", () => editor.chain().focus().toggleOrderedList().run())}
        {tool("quote", "❝", () => editor.chain().focus().toggleBlockquote().run())}
        <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} disabled={readOnly} aria-label={t("divider")} title={t("divider")} className="h-9 rounded px-2 hover:bg-surface-2 disabled:opacity-40">
          ―
        </button>
        {tool("link", "🔗", () => {
          if (editor.isActive("link")) {
            editor.chain().focus().unsetLink().run();
            return;
          }
          const href = window.prompt(t("linkPrompt"))?.trim();
          if (href && /^(https?:\/\/|mailto:|\/(?!\/))/i.test(href)) editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
        })}
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={readOnly || uploading}
          aria-label={t("image")}
          title={t("image")}
          className="inline-flex h-9 items-center justify-center rounded px-2 text-sm font-semibold hover:bg-surface-2 disabled:opacity-40"
        >
          {uploading ? t("imageUploading") : `🖼 ${t("image")}`}
        </button>
        <input
          ref={fileInput}
          type="file"
          hidden
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            const alt = window.prompt(t("imageAltPrompt"))?.trim();
            if (alt === undefined) return;
            setUploading(true);
            try {
              const media = await uploadImage(file, lang === "bn" ? { alt_bn: alt } : { alt_en: alt });
              editor.chain().focus().setImage({ src: media.url, alt, width: media.width, height: media.height }).run();
            } catch {
              onUploadError?.();
            } finally {
              setUploading(false);
            }
          }}
        />
        <span className="mx-1 w-px bg-rule" aria-hidden="true" />
        <button type="button" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().unsetTextAlign().run()} disabled={readOnly} aria-label={t("clear")} title={t("clear")} className="h-9 rounded px-2 text-sm hover:bg-surface-2 disabled:opacity-40">
          T<sub>×</sub>
        </button>
        <button type="button" onClick={() => editor.chain().focus().undo().run()} disabled={readOnly} aria-label={t("undo")} title={t("undo")} className="h-9 rounded px-2 hover:bg-surface-2">
          ↶
        </button>
        <button type="button" onClick={() => editor.chain().focus().redo().run()} disabled={readOnly} aria-label={t("redo")} title={t("redo")} className="h-9 rounded px-2 hover:bg-surface-2">
          ↷
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
