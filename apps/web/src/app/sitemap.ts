import type { MetadataRoute } from "next";
import { SECTORS, SERVICES } from "@/content/site";

const BASE = "https://www.sanarys.ma";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const staticRoutes = [
    { path: "", priority: 1 },
    { path: "/modele-csps", priority: 0.9 },
    { path: "/simulateur", priority: 0.9 },
    { path: "/solutions", priority: 0.8 },
    { path: "/secteurs", priority: 0.8 },
    { path: "/zones", priority: 0.8 },
    { path: "/qualite-conformite", priority: 0.7 },
    { path: "/ressources", priority: 0.6 },
    { path: "/a-propos", priority: 0.6 },
    { path: "/contact", priority: 0.7 },
    { path: "/audit", priority: 0.8 },
  ];

  return [
    ...staticRoutes.map((route) => ({
      url: `${BASE}${route.path}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: route.priority,
    })),
    ...SERVICES.map((service) => ({
      url: `${BASE}/solutions/${service.slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...SECTORS.map((sector) => ({
      url: `${BASE}/secteurs/${sector.slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
