import { getCollection, type CollectionEntry } from 'astro:content';

export const SITE = {
  name: 'PASQ',
  description: '自分のことをゆるく書き綴る場所',
  author: 'PASQ',
};

export type Post = CollectionEntry<'posts'>;

/** 公開する記事を新しい順に返す(draft は本番ビルドから除外、開発中は表示) */
export async function getPosts(): Promise<Post[]> {
  const all = await getCollection('posts', ({ data }) => import.meta.env.DEV || !data.draft);
  return all.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

const fmt = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'long', day: 'numeric' });
export const formatDate = (d: Date) => fmt.format(d);
export const isoDate = (d: Date) => d.toISOString().slice(0, 10);

/** base を考慮した内部リンク */
export const url = (path: string) => import.meta.env.BASE_URL.replace(/\/$/, '') + path;

export const excerptOf = (body = '', n = 120) =>
  body.replace(/[#>*`\-\[\]()!]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);

/** 一覧用の軽い形(React の索引に渡す) */
export function toIndexItems(posts: Post[]) {
  return posts.map((p) => ({
    id: p.id,
    href: url(`/posts/${p.id}`),
    date: formatDate(p.data.date),
    iso: isoDate(p.data.date),
    title: p.data.title ?? null,
    excerpt: excerptOf(p.body, 90),
    tags: p.data.tags as string[],
    draft: p.data.draft,
  }));
}
