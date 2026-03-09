/** @type {import('next').NextConfig} */
const nextConfig = {
  // FIX 4: Halang Next.js dari bundle packages ni — kena load native
  serverExternalPackages: ['puppeteer-core', '@sparticuz/chromium'],
  
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('@sparticuz/chromium');
    }
    return config;
  },
};
export default nextConfig;
