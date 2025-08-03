
import type {NextConfig} from 'next';
import path from 'path';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
} from 'fs';
import WorkboxPlugin from 'workbox-webpack-plugin';

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


const nextConfig: NextConfig = {
  output: 'export',
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
   webpack: (config, { isServer, dev }) => {
    if (!isServer && !dev) {
      config.plugins.push(
        new WorkboxPlugin.InjectManifest({
          swSrc: './src/app/sw.ts',
          swDest: '../public/sw.js',
          // Ensure the service worker is not precaching route files,
          // as we want to handle them with runtime caching.
          // Add pdf.worker.mjs to the precache manifest.
          include: [
            ({asset}) => asset.name.endsWith('.mjs'),
          ],
          exclude: [
            /\.map$/, 
            /manifest\.json$/, 
            /next-assets-manifest\.json$/, 
            /_next\/static\/chunks\/app\/_next\/static\//,
            /\/_next\/static\/css\//
          ],
        })
      );
    }
    return config;
  },
};

export default nextConfig;

    