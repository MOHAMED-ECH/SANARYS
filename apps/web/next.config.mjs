/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@sanarys/design-tokens", "@sanarys/schemas"],

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
    // Proxy de developpement vers l'API Fastify (evite le CORS en local).
    return [
      {
        source: "/api/v1/:path*",
        destination: `${process.env.API_INTERNAL_URL ?? "http://localhost:4000/api/v1"}/:path*`,
      },
    ];
  },
};

export default nextConfig;
