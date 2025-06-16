import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    // Temporarily disabled to fix test compatibility issues
    // ppr: true,
  },
  serverExternalPackages: ['gray-matter'],
  images: {
    remotePatterns: [
      {
        hostname: 'avatar.vercel.sh',
      },
    ],
  },
};

export default nextConfig;
