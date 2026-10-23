"use client";

import Link from "@tiptap/extension-link";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

/**
 * Restricted rich text: paragraphs, two heading levels, emphasis, lists,
 * quotes and links. The server sanitizes the HTML again on every save, so this
 * editor is a convenience, not the security boundary.
 */
export function RichText({
  value,
  onChange,
  readOnly = false,
  label,
  lang,
}: {
  value: string;
  onChange: (html: string) => void;
  readOnly?: boolean;
  label: string;
  lang: string;
}) {
  const t = useTranslations("cms.toolbar");
  const editor = useEditor({
    immediatelyRender: false,
    editable: !readOnly,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        link: false,
        underline: false,
      }),
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

  const tool = (key: keyof NonNullable<typeof state>, text: string, run: () => void) => (
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
        {tool("italic", "I", () => editor.chain().focus().toggleItalic().run())}
        {tool("h2", "H2", () => editor.chain().focus().toggleHeading({ level: 2 }).run())}
        {tool("h3", "H3", () => editor.chain().focus().toggleHeading({ level: 3 }).run())}
        {tool("bullet", "•", () => editor.chain().focus().toggleBulletList().run())}
        {tool("ordered", "1.", () => editor.chain().focus().toggleOrderedList().run())}
        {tool("quote", "❝", () => editor.chain().focus().toggleBlockquote().run())}
        {tool("link", "🔗", () => {
          if (editor.isActive("link")) {
            editor.chain().focus().unsetLink().run();
            return;
          }
          const href = window.prompt(t("linkPrompt"))?.trim();
          if (href && /^(https?:\/\/|mailto:|\/(?!\/))/i.test(href)) editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
        })}
        <span className="mx-1 w-px bg-rule" aria-hidden="true" />
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
