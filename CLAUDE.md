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
- 「Desk 2 / Quiet Pro」のトークン(ds.css)を土台に、このサイト専用の **editorial monochrome** を重ねている(`app.css`)。完全にモノトーン。色を足さない。
- 見せ場はトップの Three.js(`components/Scene.tsx`): ChatGPT 発案の彫刻をコードで組んだもの。コンクリートの台座と打ち放しの塊、ブラッシュ仕上げの金属フレーム、薄いガラスの箱、ツタと苔。右上の最大のガラスキューブの手前に「PASQ」を刻印。ドラッグで回せる(OrbitControls、横方向のみ・ズームなし)。初期視点は参考画像に近い斜め正面で、画面に全体が収まる距離を自動で求める。照明は自作のスタジオ環境(ソフトボックス)を PMREM にして使い、コンクリートは手続き生成のテクスチャ。ツタと苔の緑だけは、彫刻の素材として例外的に色を使う。
- 書体は Inter Tight(見出し)/ Instrument Serif(イタリックの差し色)/ Geist Mono(キャプション)を `@fontsource` で同梱。日本語は system のゴシック。
- React の島(Islands): `Chrome.tsx`(Lenis の慣性スクロール + カーソルの輪, `client:idle`)、`PostIndex.tsx`(記事の索引。ホバーで行が反転、抜粋カードが追従, `client:load`)、`Scene.tsx`(`client:only`)。それ以外は Astro の静的 HTML。
- 遷移は View Transitions(クロスドキュメント)。出現・読み進みバーは CSS のスクロール駆動アニメーション。
- `prefers-reduced-motion` で動きを止める(Lenis・Scene・各アニメーション)。WebGL が無い環境では背景なしで表示される。
- 色のリテラルは書かない(ブレンド用の `#fff` だけ例外)。操作要素はタッチ端末で 44px 以上。
- ナビは「記事 / タグ / about」の3つまで。増やさない。
- 既定はライト(`<html data-theme="light">`)。フッターの「Light / Dark」で切り替え、選択は localStorage に保存。OS の設定には従わない。

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
