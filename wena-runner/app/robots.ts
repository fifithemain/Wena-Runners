import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/account", "/earnings", "/messages", "/payment"] }],
    sitemap: "https://wena-runners.vercel.app/sitemap.xml",
    host: "https://wena-runners.vercel.app",
  };
}
