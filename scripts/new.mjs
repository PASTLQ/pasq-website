// 新しい記事の雛形を作る:  npm run new            → 今日の日付で作成
//                          npm run new -- memo    → 2026-11-21-memo.md のように名前つきで作成
import { writeFileSync, existsSync } from 'node:fs';

const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
const pad = (n) => String(n).padStart(2, '0');
const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const name = process.argv[2];
const file = `src/content/posts/${date}${name ? `-${name}` : ''}.md`;

if (existsSync(file)) {
  console.error(`すでにあります: ${file}`);
  process.exit(1);
}
writeFileSync(file, `---\ndate: ${date}\ntitle:\ntags: []\ndraft: true\n---\n\n`);
console.log(`作成しました: ${file}\n公開するときは draft: true を false にしてください。`);
