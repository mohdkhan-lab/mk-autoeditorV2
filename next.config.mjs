/** @type {import('next').NextConfig} */
const isGithubActions = process.env.GITHUB_ACTIONS || false;
const basePath = isGithubActions ? "/mk-autoeditorV2" : "";

const nextConfig = {
  output: "export",
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  ...(basePath ? { basePath, assetPrefix: `${basePath}/` } : {}),
};

export default nextConfig;
