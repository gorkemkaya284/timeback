/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // No output: 'export' — API routes and SSR require Node server (Vercel serverless).
};

export default nextConfig;
