import type { Locale } from "./config";

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  parentId: string | null;
  alternates: Record<Locale, string | null>;
}

export interface CategoryDetail extends Category {
  parent: Category | null;
  children: Category[];
}

export interface Tag {
  id: string;
  name: string;
  slug: string | null;
  alternates: Record<Locale, string | null>;
  count?: number;
}

export interface AuthorRef {
  id: string;
  name: string;
  slug: string | null;
}

export interface Author extends AuthorRef {
  bio: string;
  avatarUrl: string | null;
}

export interface Image {
  id: string;
  provider: "cloudinary" | "static";
  url: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
  credit: string;
  focalX: number;
  focalY: number;
}

export type ArticleFormat = "standard" | "explainer" | "opinion" | "photo" | "video";

export interface ArticleCard {
  id: string;
  translationGroup: string;
  locale: Locale;
  slug: string;
  title: string;
  summary: string;
  format: ArticleFormat;
  category: Category | null;
  image: Image | null;
  authors: AuthorRef[];
  readingMinutes: number;
  publishedAt: string | null;
  updatedAt: string | null;
  isBreaking: boolean;
  views?: number;
}

export interface ArticleDetail extends ArticleCard {
  body: string;
  tags: Tag[];
  videoUrl: string | null;
  seo: { title: string; description: string; canonicalUrl: string; socialImage: Image | null };
  translations: { locale: Locale; slug: string }[];
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Homepage {
  breaking: ArticleCard[];
  lead: ArticleCard | null;
  top: ArticleCard[];
  latest: ArticleCard[];
  editorsPicks: ArticleCard[];
  explainers: ArticleCard[];
  visual: ArticleCard[];
  opinion: ArticleCard[];
  sections: { category: Category; variant: "grid" | "list" | "feature"; items: ArticleCard[] }[];
}

export interface AdPlacement {
  key: string;
  slotId: string;
  format: "auto" | "rectangle" | "horizontal" | "fluid";
  minHeight: number;
}

export interface EditorialPage {
  key: string;
  locale: Locale;
  title: string;
  body: string;
  updatedAt: string;
}
