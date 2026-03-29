import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  // On récupère OussamaShoesAI-Studio de l'URL Github pour permettre un chargement correct.
  basePath: process.env.NODE_ENV === 'production' ? '/OussamaShoesAI-Studio' : '',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

