
import type {NextConfig} from 'next';
import path from 'path';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
} from 'fs';
import withPWAInit from "@ducanh2912/next-pwa";

// Function to copy files recursively
const copyDirSync = (src: string, dest: string) => {
  if (!existsSync(dest)) {
    mkdirSync(dest, {recursive: true});
  }
  const entries = readdirSync(src, {withFileTypes: true});
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    entry.isDirectory()
      ? copyDirSync(srcPath, destPath)
      : copyFileSync(srcPath, destPath);
  }
};

// Copy the pdf.js worker to the public directory.
const pdfWorkerSrc = path.join(
  path.dirname(require.resolve('pdfjs-dist/package.json')),
  'build',
  'pdf.worker.mjs'
);
const pdfWorkerDest = path.join(process.cwd(), 'public', 'pdf.worker.mjs');

// Create public directory if it doesn't exist
if (!existsSync(path.join(process.cwd(), 'public'))) {
  mkdirSync(path.join(process.cwd(), 'public'));
}

if (!existsSync(pdfWorkerDest) || statSync(pdfWorkerSrc).mtimeMs > statSync(pdfWorkerDest).mtimeMs) {
  copyFileSync(pdfWorkerSrc, pdfWorkerDest);
}

const withPWA = withPWAInit({
  dest: "public",
  sw: "sw.js",
  customWorkerSrc: "src/app/sw.ts",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  scope: ".",
  start_url: ".",
  fallbacks: {
    document: "/_offline",
  },
});


const nextConfig: NextConfig = {
  output: 'export',
  distDir: 'out2',
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default withPWA(nextConfig);

    