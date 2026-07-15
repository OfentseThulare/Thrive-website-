export const publicRoutes = [
  { path: "/", slug: "home", priority: 1 },
  { path: "/about", slug: "about", priority: 0.8 },
  { path: "/services", slug: "services", priority: 0.9 },
  {
    path: "/services/cancer-health-coaching",
    slug: "cancer-health-coaching",
    priority: 0.8,
  },
  {
    path: "/services/psycho-oncology-counselling",
    slug: "psycho-oncology-counselling",
    priority: 0.8,
  },
  {
    path: "/services/cancer-prevention-coaching",
    slug: "cancer-prevention-coaching",
    priority: 0.8,
  },
  { path: "/approach", slug: "approach", priority: 0.8 },
  { path: "/pems-assessment", slug: "pems-assessment", priority: 0.7 },
  { path: "/pricing", slug: "pricing", priority: 0.8 },
  { path: "/book", slug: "book", priority: 0.9 },
  { path: "/resources", slug: "resources", priority: 0.7 },
] as const;
