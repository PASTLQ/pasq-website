# pasq-website

自分のことをゆるく書き綴る個人ブログ(実験サイト)。Astro 7 の静的サイトを GitHub Pages で公開する。
オーナー: Kai(GitHub: PASTLQ)。以前は Cloudflare Pages で運用していたが、より軽くするため GitHub Pages に移行した。
会話・コミットメッセージ・記事は日本語でよい。

## 現在の状態(2026-11-21 時点)
- 雛形は完成。`astro build` は成功、スマホ幅(390px)のライト・ダークで表示確認済み。
- リモートは `https://github.com/PASTLQ/pasq-website.git`。初回コミット `init: Astro blog` は push 済み(`origin/main` と同期)。
- **未確認**: GitHub Pages の設定とデプロイ。次にやること:
  1. GitHub の Settings → Pages → Source が **GitHub Actions** になっているか確認(ユーザー操作)
  2. Actions の初回デプロイが成功するか確認。公開URLは `https://pastlq.github.io/pasq-website/`
  3. サンプル記事 2 本(`src/content/posts/2026-11-21-*.md`)を残すか消すか確認する
- ローカルでは `npm install` が必要(`node_modules` は Git に入れない)。

## コマンド
```sh
npm install          # 初回のみ
npm run dev          # http://localhost:4321(draft: true の記事も見える)
npm run build        # dist/ に静的出力
npm run preview      # build 結果の確認
npm run new          # 今日の日付で記事の雛形(draft: true)を作る。npm run new -- memo で名前つき
```

## 構成
```
src/content/posts/*.md      記事(これを足すだけで公開される)
src/content.config.ts       記事の項目の定義(date 必須、title/tags/draft は任意)
src/site.ts                 サイト名、記事取得(getPosts)、日付整形、url() ヘルパー
src/layouts/Base.astro      共通レイアウト(ヘッダーのナビ3つ: 日々 / タグ / このサイト)
src/pages/                  index(一覧) posts/[...slug] tags/ about rss.xml.js
src/styles/ds.css           デザインシステム Desk 2 / Quiet Pro(原則として編集しない)
src/styles/app.css          このサイト固有のスタイル
scripts/new.mjs             記事の雛形生成
drafts/                     公開しない下書き(.gitignore で Git に入らない)
.github/workflows/deploy.yml  main への push で自動デプロイ
```

## 記事のルール
```md
---
date: 2026-11-21     # 必須
title: タイトル      # 省略可。なければ日付だけが見出しになる(つぶやき風)
tags: [日記]         # 省略可
draft: false         # true の間は本番に出ない
---
本文(Markdown)
```
- ファイル名は `YYYY-MM-DD-名前.md`。ファイル名がそのまま URL(`/posts/<ファイル名>`)になる。
- 本番ビルドでは `draft: true` を除外する(一覧・個別ページ・タグ・RSS すべて)。開発サーバーでは表示する。
- 画像は `public/` に置く。base パスが付くので、記事内では `/pasq-website/xxx.jpg` のように参照する(`url()` は .astro/.ts 内用)。

## デザインの方針
- Kai 共通のデザインシステム「Desk 2 / Quiet Pro」(白とジンク、1px の線、アクセントはインディゴ1色、ライト・ダーク自動)。旧 Soft(ニューモーフィズム)は廃止。
- 色・余白・角丸はトークン(`--bg` `--surface` `--surface-2` `--border` `--fg` `--muted` `--accent` など)から取る。**色のリテラルを書かない。**
- 完全にモノトーン(アクセントも `--fg`)。透明感は `app.css` の glass トークン(`--glass` など)で出す。背景の淡い光とガラス調はこのサイトの意図的な例外。色のついたグラデーション・光彩・絵文字は使わない。
- 遷移は View Transitions、記事の出現と読み進みバーはスクロール駆動アニメーション。`prefers-reduced-motion` / `prefers-reduced-transparency` で止める。
- ナビは画面下に浮かぶガラスのドック(`.dock`)。
- 本文は日本語基準(14px / 行間1.65)。記事本文 `.prose` は 16px / 行間1.9。
- 操作要素はタッチ端末で 44px 以上。選択状態は `--accent-soft` + 太字(色だけに頼らない)。
- ナビの入口は3つまで。増やさない。

## ハマりどころ(実際に踏んだもの)
- **公開URLのサブパス**: `astro.config.mjs` が `GITHUB_REPOSITORY` から `site` と `base` を自動で決める(`/pasq-website`)。ローカルは `base` なし。内部リンクは必ず `url()` を通す。`/` 直書きは公開で壊れる。
- 独自ドメインにする場合は、ワークフローの build に `env: SITE: https://example.com` を足し、`public/CNAME` を置く。
- `package-lock.json` は必須(Actions は `npm ci`)。依存を足したらロックも一緒にコミットする。
- 日付は `Asia/Tokyo` で整形している(`formatDate`)。UTC のままだと日付がずれる。
- 引き継ぎ前の作業環境(Cowork)は npm レジストリにも GitHub の認証にも届かなかった。そのため push・デプロイは未確認。
- `.github/` 配下は、リモートツール経由では書き込めない場合がある(ローカルのシェルや Claude Code なら問題ない)。

## 作業の約束
- push や force push、`drafts/` の扱い、記事の公開(`draft` を false にする)は、Kai の意向を確認してから行う。
- 変更後は `npm run build` が通ることを確認する。見た目を変えたら 390px 幅のライト・ダーク両方を見る。
- コミットメッセージは日本語でも英語でもよい。短く、何を変えたかが分かるように。
