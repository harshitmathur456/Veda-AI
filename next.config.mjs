/** @type {import('next').NextMode} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Canvas & worker support for pdfjs-dist
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
