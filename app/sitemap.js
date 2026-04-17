const SITE_URL = "https://bot.mubx.dev";

const staticRoutes = [
  {
    path: "/",
    changeFrequency: "daily",
    priority: 1.0
  },
  {
    path: "/test-chat",
    changeFrequency: "weekly",
    priority: 0.5
  },
  {
    path: "/faq",
    changeFrequency: "weekly",
    priority: 0.8
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
