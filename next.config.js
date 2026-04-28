/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['firebase-admin']
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'api.dicebear.com' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'http', hostname: 'localhost', port: '9199' },
      { protocol: 'http', hostname: '127.0.0.1', port: '9199' }
    ]
  }
};

module.exports = nextConfig;
