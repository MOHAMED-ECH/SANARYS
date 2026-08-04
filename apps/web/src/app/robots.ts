import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Espaces authentifies : jamais indexes.
        disallow: ["/portail/", "/staff/", "/connexion"],
      },
    ],
    sitemap: "https://www.sanarys.ma/sitemap.xml",
  };
}
