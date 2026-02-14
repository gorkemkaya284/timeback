/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Static export (output: 'export') disabled - Supabase auth + admin panel require server
};

export default nextConfig;
