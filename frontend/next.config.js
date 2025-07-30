/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'localhost', 
      'res.cloudinary.com', 
      'via.placeholder.com', 
      'priceconvert.ru', 
      '192.168.50.69', 
      '192.168.50.71', 
      'technoline-api.loca.lt',
      'technohubstore.net',
      '62.60.178.146'
    ],
    unoptimized: true
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://technohubstore.net/api',
  },
  async redirects() {
    return [
      {
        source: '/category/:slug',
        destination: '/catalog/:slug',
        permanent: true,
      },
      {
        source: '/categories/:slug',
        destination: '/catalog/:slug',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://technohubstore.net/api';
    const baseUrl = apiUrl.replace('/api', ''); // Убираем /api из конца
    return [
      {
        source: '/api/:path*',
        destination: `${baseUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig; 