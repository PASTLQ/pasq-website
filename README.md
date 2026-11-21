# pasq-website

自分のことをゆるく書き綴るブログ。Astro + GitHub Pages。

## 書く

```sh
npm run new            # 今日の日付で下書きを作る
npm run new -- memo    # 名前つき(2026-11-21-memo.md)
```

`src/content/posts/` に Markdown を置くだけです。

```md
---
date: 2026-11-21
title: タイトル(省略可)
tags: [日記]
draft: false   # true の間は公開されない
---
本文
```

- 公開: `main` に push → 1〜2分で自動公開
- 書きかけ: `draft: true`(公開されない。`npm run dev` では見える)
- 完全に手元だけ: `drafts/` に置く(Git に入らない)
- 画像: `public/` に置いて `![説明](/pasq-website/xxx.jpg)` のように参照(base を含める)

## 確認

```sh
npm install      # 初回のみ
npm run dev      # http://localhost:4321
```

## 公開の設定(初回のみ)

1. GitHub にリポジトリを作って push
2. Settings → Pages → Source を **GitHub Actions** にする
3. 以降は push するたびに自動デプロイ

公開URLは `https://<ユーザー名>.github.io/<リポジトリ名>/`。
リポジトリ名を `<ユーザー名>.github.io` にするとルート直下になります。
独自ドメインにする場合は、ワークフローの build ステップに `env: SITE: https://example.com` を追加し、`public/CNAME` を置きます。
