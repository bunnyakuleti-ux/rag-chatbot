/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow calling the backend API from Next.js API routes
  env: {
    BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:8000',
  },
};

module.exports = nextConfig;
