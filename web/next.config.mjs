// GitHub Pages への静的エクスポート対応。
// - output: 'export' で out/ に静的サイトを書き出す（API ルート・SSR は使わない前提）
// - basePath はプロジェクトページのサブパス（例: /terra-nexus）。
//   ローカル開発では未設定（= ルート）。CI で NEXT_PUBLIC_BASE_PATH を渡す。
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath || undefined,
  images: { unoptimized: true },
  reactStrictMode: true,
  trailingSlash: true,
};

export default nextConfig;
