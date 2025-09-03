/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'dist',
  trailingSlash: true,
  basePath: '/ParentingPlanner',
  assetPrefix: '/ParentingPlanner',
  images: {
    unoptimized: true
  }
}

module.exports = nextConfig