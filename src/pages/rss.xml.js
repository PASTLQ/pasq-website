import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = (await getCollection('posts', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
  );
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return rss({
    title: 'pasq',
    description: '自分のことをゆるく書き綴る場所',
    site: context.site ?? 'http://localhost:4321',
    items: posts.map((p) => ({
      title: p.data.title ?? p.data.date.toISOString().slice(0, 10),
      pubDate: p.data.date,
      link: `${base}/posts/${p.id}/`,
    })),
  });
}
