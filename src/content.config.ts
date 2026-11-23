import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// 統一記事形式(blog-studio docs/SPEC.md §3)。1記事 = 1フォルダ: src/content/posts/{slug}/index.mdx
// 画像は同じフォルダに置き、本文から ![alt](ファイル名) で参照する(Astro が最適化して出力する)。
const posts = defineCollection({
  loader: glob({
    pattern: '*/index.mdx',
    base: './src/content/posts',
    generateId: ({ entry }) => entry.split('/')[0], // フォルダ名 = slug = URL
  }),
  schema: z.object({
    slug: z.string().optional(), // フォルダ名と一致させる(検証は blog-studio 側)
    date: z.coerce.date(),
    title: z.string().optional(), // なければ日付だけ表示(つぶやき風)
    description: z.string().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    category: z.string().optional(),
    hero: z.object({ src: z.string(), alt: z.string().default('') }).optional(),
    updated: z.coerce.date().optional(),
  }),
});

export const collections = { posts };
