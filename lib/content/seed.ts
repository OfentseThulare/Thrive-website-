import { pageContentSchema, type PageContent } from "./contracts";

const home: PageContent = {
  slug: "home",
  title: "Thrive Through Cancer",
  description:
    "Compassionate cancer health coaching and psycho-oncology counselling with Renny.",
  status: "published",
  sections: [
    {
      blockType: "hero",
      eyebrow: "Cancer and Psycho-Oncology Coaching",
      heading: "Cancer changes the map. You do not have to navigate it alone.",
      body:
        "Compassionate, science informed support to help you move through diagnosis, treatment and life beyond cancer with greater clarity, resilience and hope.",
      primaryAction: { label: "Plan a first conversation", href: "/book" },
      secondaryAction: { label: "Meet Renny", href: "/about" },
      image: {
        src: "/images/renny-portrait-seated.jpg",
        alt: "Renny smiling while seated beside a large window",
        width: 2048,
        height: 2048,
      },
    },
    {
      blockType: "introduction",
      eyebrow: "Whole person support",
      heading: "Support that begins with where you are",
      body: [
        "Cancer reaches beyond the body. It can affect identity, relationships, confidence and the rhythm of everyday life.",
        "Thrive Through Cancer offers virtual coaching and counselling support for diagnosis, treatment, survivorship, caregiving and prevention.",
      ],
    },
    {
      blockType: "card_collection",
      eyebrow: "Ways to work together",
      heading: "Care shaped around your needs",
      cards: [
        {
          title: "Cancer Health Coaching",
          body: "Build practical, sustainable wellbeing habits alongside your medical care.",
          link: { label: "Explore coaching", href: "/services/cancer-health-coaching" },
        },
        {
          title: "Psycho-Oncology Counselling",
          body: "Make space for the emotional and relational impact of cancer.",
          link: { label: "Explore counselling", href: "/services/psycho-oncology-counselling" },
        },
        {
          title: "Cancer Prevention Coaching",
          body: "Turn prevention evidence into realistic choices for everyday life.",
          link: { label: "Explore prevention", href: "/services/cancer-prevention-coaching" },
        },
      ],
    },
    {
      blockType: "call_to_action",
      heading: "Begin with a grounded conversation",
      body:
        "A first conversation helps us understand what support you are seeking and whether this practice is the right fit.",
      action: { label: "Book a session", href: "/book" },
    },
  ],
};

export const seedPages = new Map<string, PageContent>([
  [home.slug, pageContentSchema.parse(home)],
]);
