import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// GitHub Actions 上では GITHUB_REPOSITORY (owner/repo) から公開URLを自動で決める。
// ローカルでは site/base なしで動く。独自ドメインにする場合は SITE=https://example.com を指定。
const [owner, repo] = (process.env.GITHUB_REPOSITORY ?? '').split('/');
const isUserSite = !!repo && repo.toLowerCase() === `${owner.toLowerCase()}.github.io`;

export default defineConfig({
  site: process.env.SITE ?? (owner ? `https://${owner}.github.io` : undefined),
  base: process.env.SITE ? '/' : repo && !isUserSite ? `/${repo}` : '/',
  trailingSlash: 'ignore',
  integrations: [react()],
});
