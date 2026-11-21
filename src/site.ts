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
