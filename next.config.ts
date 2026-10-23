import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nextConfig: NextConfig = {
  // Prevent Next from treating the user home as workspace root
  // when multiple lockfiles exist on the machine.
  outputFileTracingRoot: __dirname,
  // Tree-shake icon/UI barrels so each menu page compiles a smaller graph.
  experimental: {
    optimizePackageImports: ['lucide-react', '@headlessui/react'],
  },
  // Avoid dev/build fighting over the same `.next` directory.
  // In this repo we sometimes run `next build` while `next dev` is running,
  // which can delete/overwrite chunk files and cause runtime errors like:
  // "Cannot find module './331.js'" or "__webpack_modules__[moduleId] is not a function".
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  // The public "save contact" link: a phone opens the vCard in its native
  // contact screen. /contact is the plain landing page, with no app code.
  async headers() {
    return [
      {
        source: '/suitlabs-bali.vcf',
        headers: [
          { key: 'Content-Type', value: 'text/vcard; charset=utf-8' },
          { key: 'Content-Disposition', value: 'inline; filename="suitlabs-bali.vcf"' },
        ],
      },
    ];
  },
  async rewrites() {
    return [{ source: '/contact', destination: '/contact.html' }];
  },
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: '**' },
      { protocol: 'https', hostname: '**' },
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), 'canvas', 'jsdom'];
    }
    
    // Fix webpack module resolution issues
    config.resolve = {
      ...config.resolve,
      fallback: {
        ...config.resolve?.fallback,
        fs: false,
        net: false,
        tls: false,
      },
    };
    
    return config;
  },
};

export default nextConfig;
