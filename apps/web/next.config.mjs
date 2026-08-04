/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@sanarys/design-tokens", "@sanarys/schemas"],
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
