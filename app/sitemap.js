const SITE_URL = "https://bot.mubx.dev";

const staticRoutes = [
  {
    path: "/",
    changeFrequency: "daily",
    priority: 1.0
  },
  {
    path: "/faq",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    path: "/for-ai",
    changeFrequency: "monthly",
    priority: 0.2
  },
  {
    path: "/contribute",
    changeFrequency: "monthly",
    priority: 0.4
  }
];

export default function sitemap() {
  const now = new Date();

  return staticRoutes.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority
  }));
}
