"use client";

import { useParams } from "next/navigation";
import { ArticleEditor } from "@/components/cms/article-editor";

export default function EditArticlePage() {
  const { id } = useParams<{ id: string }>();
  if (!/^[a-f0-9]{24}$/.test(id)) return null;
  return <ArticleEditor key={id} id={id} />;
}
