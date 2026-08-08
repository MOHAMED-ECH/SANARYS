/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@sanarys/design-tokens", "@sanarys/schemas"],

  images: {
    // L'Image Optimizer est desactive volontairement. La vulnerabilite de deni
    // de service signalee sur next@14 le vise precisement ; tant qu'aucune
    // route /_next/image n'existe, elle reste sans effet sur ce deploiement.
    // Voir docs/dependances-securite.md — cette ligne est ce qui rend
    // l'analyse valide, ne pas la retirer sans migrer next au prealable.
    unoptimized: true,
  },

  webpack: (config) => {
    // Les packages partages utilisent des imports relatifs en ".js" (resolution
    // NodeNext pour l'API). Le bundler doit les faire pointer vers les sources
    // TypeScript correspondantes.
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },

  async rewrites() {
    const apiBase = (process.env.API_INTERNAL_URL ?? "http://127.0.0.1:4000/api/v1")
      .replace(/^http:\/\/localhost:/, "http://127.0.0.1:")
      .replace(/\/$/, "");

    // Proxy de developpement vers l'API Fastify (evite le CORS en local).
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiBase}/:path*`,
      },
    ];
  },
};

export default nextConfig;
