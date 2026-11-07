/** @type {import('next').NextConfig} */
const nextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    ...(process.env.VERCEL ? {} : { cpus: 1, workerThreads: false }),
  },
};

export default nextConfig;

