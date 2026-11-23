// 新しい記事の雛形(フォルダ形式)を作る:  npm run new            → 2026-11-21/index.mdx
//                                          npm run new -- memo    → 2026-11-21-memo/index.mdx
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';

const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
const pad = (n) => String(n).padStart(2, '0');
const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const name = process.argv[2];
const slug = `${date}${name ? `-${name}` : ''}`;
const dir = `src/content/posts/${slug}`;

if (existsSync(dir)) {
  console.error(`すでにあります: ${dir}`);
  process.exit(1);
}
mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}/index.mdx`, `---\nslug: "${slug}"\ndate: ${date}\ntitle:\ntags: []\ndraft: true\n---\n\n`);
console.log(`作成しました: ${dir}/index.mdx\n公開するときは draft: true を false にしてください。`);
