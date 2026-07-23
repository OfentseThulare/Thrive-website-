import {
  pageContentSchema,
  type PageContent,
  type PageContentInput,
} from "./contracts.ts";
import { legalRawPages } from "./legal-seed.ts";

const rennySeated = {
  src: "/images/renny-portrait-seated.jpg",
  alt: "Renny smiling while seated beside a large window",
  width: 3628,
  height: 3628,
  position: "centre" as const,
};

const rennyStanding = {
  src: "/images/renny-portrait-standing.jpg",
  alt: "Renny standing outdoors in a patterned dress",
  width: 1033,
  height: 1600,
  position: "top" as const,
};

const quietPath = {
  src: "/images/stock-path.webp",
  alt: "A person seen from behind walking along a quiet mountain path",
  width: 2200,
  height: 1466,
  position: "centre" as const,
};

const reflectionStillLife = {
  src: "/images/stock-reflection.webp",
  alt: "An open book and cup of tea resting on white linen",
  width: 2200,
  height: 2200,
  position: "centre" as const,
};

const nourishmentStillLife = {
  src: "/images/stock-nourishment.webp",
  alt: "Fresh vegetables, fruit and herbs arranged on a table",
  width: 1760,
  height: 2200,
  position: "centre" as const,
};

const coachingDesk = {
  src: "/images/ai-coaching-desk.webp",
  alt: "A quiet coaching desk with a notebook, cup and laptop in soft daylight",
  width: 4096,
  height: 2737,
  position: "centre" as const,
};

const counsellingRoom = {
  src: "/images/ai-counselling-room.webp",
  alt: "Two empty chairs in a calm counselling room with teal walls and soft light",
  width: 4096,
  height: 2737,
  position: "centre" as const,
};

const preventionHabits = {
  src: "/images/ai-prevention-habits.webp",
  alt: "Walking shoes, water and fresh greens arranged in a calm home setting",
  width: 4096,
  height: 2737,
  position: "centre" as const,
};

const pemsGems = {
  src: "/images/ai-pems-gems.webp",
  alt: "Four smooth natural stones on pale linen for whole person reflection",
  width: 4096,
  height: 2737,
  position: "centre" as const,
};

const bookingCalendar = {
  src: "/images/ai-booking-calendar.webp",
  alt: "A blank calendar, pen, tea cup and phone on a warm wooden desk",
  width: 4096,
  height: 2737,
  position: "centre" as const,
};

const researchReading = {
  src: "/images/ai-research-reading.webp",
  alt: "An open book with note tabs, tea and a pencil beside a bright window",
  width: 4096,
  height: 2737,
  position: "centre" as const,
};

const caregiverMugs = {
  src: "/images/ai-caregiver-mugs.webp",
  alt: "Two mugs, a folded blanket and plants in a quiet sunlit room",
  width: 4096,
  height: 2737,
  position: "centre" as const,
};

const appointmentNotes = {
  src: "/images/ai-appointment-notes.webp",
  alt: "A blank notepad, pen, folder, eyeglasses and tea on a pale desk",
  width: 4096,
  height: 2737,
  position: "centre" as const,
};

const mindBodyCalm = {
  src: "/images/ai-mind-body-calm.webp",
  alt: "A woven mat, cushion, plant and ceramic bowl in a calm room",
  width: 4096,
  height: 2737,
  position: "centre" as const,
};

const permaCards = {
  src: "/images/ai-perma-cards.webp",
  alt: "Blank reflection cards, a journal, pencil, flowers and tea on linen",
  width: 4096,
  height: 2737,
  position: "centre" as const,
};

const openGarden = {
  src: "/images/ai-open-garden.webp",
  alt: "An open doorway leading from a teal room into a small green garden",
  width: 4096,
  height: 2737,
  position: "centre" as const,
};

const routinePlanning = {
  src: "/images/ai-routine-planning.webp",
  alt: "A small clock, blank reminder cards, pen and water glass on a bright table",
  width: 4096,
  height: 2737,
  position: "centre" as const,
};

const privateSession = {
  src: "/images/ai-private-session.webp",
  alt: "Headphones, a closed laptop, notebook and water glass beside a window",
  width: 4096,
  height: 2737,
  position: "centre" as const,
};

const financialPlanning = {
  src: "/images/ai-financial-planning.webp",
  alt: "A blank envelope, calculator, notebook, pen and tea on a wooden table",
  width: 4096,
  height: 2737,
  position: "centre" as const,
};

// Copy source of record: "Cancer Coaching Website Final Draft-3" supplied by the practice.
// Wording follows that document. Only punctuation and UK spelling have been house-styled.
const rawPages: PageContentInput[] = [
  {
    slug: "home",
    title: "Thrive Through Cancer",
    description:
      "Cancer and psycho-oncology coaching and counselling. Our mission is to empower you to discover your inherent health and truly thrive, not just survive.",
    status: "published",
    sections: [
      {
        blockType: "hero",
        eyebrow: "Cancer and Psycho-Oncology Coaching and Counselling",
        heading: "Discover your inherent health and truly thrive, not just survive",
        body:
          "Living with cancer does not have to be a struggle, you have it in you to THRIVE. Through our virtual coaching practice, we empower you to take control of your health from the comfort of your home.",
        primaryAction: { label: "Book a Cancer Coaching Session", href: "/book" },
        secondaryAction: { label: "Meet Renny", href: "/about" },
        image: rennySeated,
        aside: "A division of Inheritance Academy.",
      },
      {
        blockType: "introduction",
        eyebrow: "About us",
        heading: "Facing a cancer diagnosis?",
        body: [
          "If you’ve been diagnosed with cancer, you may feel overwhelmed and uncertain about the future. Cancer affects not only your physical health but also your emotional and mental well-being.",
          "Are you undergoing treatment? The challenges of cancer can create distress in many aspects of life, especially your emotional and mental health.",
          "Are you caring for someone with cancer? The journey can bring anxiety and stress to the entire family.",
          "We understand. But living with cancer doesn’t have to be a struggle, you have it in you to THRIVE. Let us support and guide you on your journey. We believe that a high quality of life is possible during and after treatment because true health lies within you.",
        ],
        align: "centre",
      },
      {
        blockType: "editorial_split",
        eyebrow: "Meet your guide",
        heading: "Renny",
        body: [
          "I’m Renny, a health coach and psycho-oncology counsellor dedicated to helping individuals navigate a cancer journey with resilience and hope. Whether you’re newly diagnosed, undergoing treatment, or facing uncertainty, I provide the support and strategies you need to manage fear, anxiety, and emotional challenges.",
          "My approach integrates functional medicine principles, lifestyle modifications, and psycho-oncology techniques to help you cope, heal, and thrive.",
        ],
        image: rennyStanding,
        imageSide: "right",
        action: { label: "Read more about Renny", href: "/about" },
        tone: "white",
      },
      {
        blockType: "card_collection",
        eyebrow: "How we work together",
        heading: "Our services",
        tone: "mist",
        cards: [
          {
            kicker: "Health Coaching",
            title: "Cancer Health Coaching",
            body:
              "Our coaching program is designed to help you make sustainable lifestyle changes that support healing and well-being. We partner with you to develop a personalised health plan.",
            link: {
              label: "Explore Health Coaching",
              href: "/services/cancer-health-coaching",
            },
          },
          {
            kicker: "Counselling",
            title: "Psycho-Oncology Counselling",
            body:
              "Emotional and psychological support at every stage, pre-diagnosis, during treatment, survivorship, and beyond.",
            link: {
              label: "Explore Psycho-Oncology Counselling",
              href: "/services/psycho-oncology-counselling",
            },
          },
          {
            kicker: "Prevention",
            title: "Cancer Prevention Coaching",
            body:
              "Prevention is key to longevity. We use neuroscience-backed techniques to help clients build habits that last.",
            link: {
              label: "Explore Cancer Prevention Coaching",
              href: "/services/cancer-prevention-coaching",
            },
          },
        ],
      },
      {
        blockType: "comparison",
        eyebrow: "Work with us",
        heading: "Coaching vs. Psycho-Oncology counselling",
        introduction:
          "While coaching focuses on lifestyle changes and thriving in the present and future, psycho-oncology counselling addresses the emotional, mental, and behavioural aspects of coping with cancer. Together, they provide comprehensive support for your healing journey.",
        columns: [
          {
            title: "Coaching",
            body: "Focuses on lifestyle changes and thriving in the present and future.",
            points: [
              "Identification of lifestyle changes to propel healing",
              "Medical research and advocacy",
              "Personalised support to enhance adherence to treatment plans",
            ],
            link: {
              label: "Explore Health Coaching",
              href: "/services/cancer-health-coaching",
            },
          },
          {
            title: "Psycho-Oncology counselling",
            body:
              "Addresses the emotional, mental, and behavioural aspects of coping with cancer.",
            points: [
              "Process emotions and reduce distress",
              "Cope with changes in body image and function",
              "Navigate relationship challenges",
            ],
            link: {
              label: "Explore Psycho-Oncology Counselling",
              href: "/services/psycho-oncology-counselling",
            },
          },
        ],
      },
      {
        blockType: "editorial_split",
        eyebrow: "Our approach",
        heading: "We empower you to approach healing with confidence",
        body: [
          "Cancer may bring uncertainty, but vibrant life after diagnosis is possible. Our approach integrates the 12 PEMS Conditioning Gems, Functional Medicine Coaching, and insights from the Radical Remission Project to guide clients toward optimal health in order to thrive beyond cancer.",
          "Our art and science of coaching is rooted in Functional Medicine principles, positive psychology, mind-body medicine, behavioural change science, and neuroscience to help you achieve optimal well-being.",
        ],
        image: coachingDesk,
        imageSide: "left",
        action: { label: "Explore our approach", href: "/approach" },
        tone: "cream",
      },
      {
        blockType: "pricing",
        eyebrow: "Session pricing",
        heading: "Session pricing",
        plans: [
          {
            name: "Foundation Session",
            duration: "3 hours",
            price: "R1 785",
            body: "An extended first session to understand your priorities and shape your plan.",
          },
          {
            name: "Follow-up Session",
            duration: "1 hour",
            price: "R700",
            body: "Ongoing support to review progress and decide on practical next steps.",
          },
          {
            name: "12-Session Package",
            duration: "12 sessions",
            price: "10% discount",
            body: "A package of twelve sessions, offered at a 10% discount.",
          },
        ],
        notes: [
          "We recognise that financial concerns may arise during treatment. If financial hardship is a barrier, we invite you to pay what you can afford. If you can pay in full, your contribution helps us expand our services to those in need.",
        ],
      },
      {
        blockType: "call_to_action",
        heading: "We’re here to support you",
        body:
          "Partner with us and let’s help you THRIVE through cancer and beyond.",
        action: { label: "Book a session today", href: "/book" },
      },
    ],
  },
  {
    slug: "about",
    title: "About Renny",
    description:
      "Meet Renny, a Functional Medicine Certified Health Coach, health educator, researcher and psycho-oncology counsellor.",
    status: "published",
    sections: [
      {
        blockType: "hero",
        eyebrow: "Meet your guide",
        heading: "I’m Renny",
        body:
          "A health coach and psycho-oncology counsellor dedicated to helping individuals navigate a cancer journey with resilience and hope. Whether you’re newly diagnosed, undergoing treatment, or facing uncertainty, I provide the support and strategies you need to manage fear, anxiety, and emotional challenges.",
        primaryAction: { label: "Book a Cancer Coaching Session", href: "/book" },
        secondaryAction: { label: "Explore services", href: "/services" },
        image: rennyStanding,
        aside: "Cancer and Psycho-Oncology Coaching and Counselling.",
        tone: "mist",
      },
      {
        blockType: "introduction",
        eyebrow: "Our mission",
        heading: "To empower you to discover your inherent health and truly thrive",
        body: [
          "Our mission is to empower you to discover your inherent health and truly thrive, not just survive.",
          "I believe that every individual possesses the strength and resilience to overcome adversity, and I’m passionate about equipping my clients with the tools they need to harness that and thrive.",
        ],
      },
      {
        blockType: "editorial_split",
        eyebrow: "Experience",
        heading: "Walking the cancer journey alongside you",
        body: [
          "Having worked with clients at all stages of the cancer journey, I deeply understand the impact a cancer diagnosis has on individuals and their families. My research and training in psycho-oncology and functional medicine coaching allow me to use science-backed techniques to help clients reduce stress, process emotions, and build resilience.",
          "I am a certified Functional Medicine Health Coach, a health educator, and a researcher committed to helping people live their best lives.",
          "Let’s walk this journey together. I will support you every step of the way, offering encouragement and empowering you with the skills needed for self-efficacy and healing.",
        ],
        image: caregiverMugs,
        imageSide: "left",
        tone: "white",
      },
      {
        blockType: "feature_list",
        eyebrow: "My approach",
        heading: "Three strands that shape every session",
        introduction:
          "My approach integrates functional medicine principles, lifestyle modifications, and psycho-oncology techniques to help you cope, heal, and thrive.",
        layout: "grid",
        tone: "cream",
        items: [
          {
            title: "Functional medicine principles",
            body: "Addressing the root causes of disease, considering genetic, environmental, and lifestyle factors.",
          },
          {
            title: "Lifestyle modifications",
            body: "Practical changes to nutrition, exercise, sleep, and stress management that support your healing journey.",
          },
          {
            title: "Psycho-oncology techniques",
            body: "Science-backed techniques to help you manage fear, anxiety, and emotional challenges.",
          },
        ],
      },
      {
        blockType: "feature_list",
        eyebrow: "Renny’s credentials",
        heading: "Renny’s credentials",
        layout: "stack",
        tone: "mist",
        items: [
          {
            title: "Functional Medicine Certified Health Coach",
            body: "Functional Medicine Coaching Academy.",
          },
          {
            title: "Radical Remission Health Coach and Teacher",
            body: "Radical Remission Project.",
          },
          {
            title: "Master’s in Psycho-Oncology",
            body: "Tech School of Medicine.",
          },
          {
            title: "BA in Psychology and Communication",
            body: "University Northwest.",
          },
        ],
      },
      {
        blockType: "call_to_action",
        heading: "Let’s walk this journey together",
        body:
          "I will support you every step of the way, offering encouragement and empowering you with the skills needed for self-efficacy and healing.",
        action: { label: "Book a Cancer Coaching Session", href: "/book" },
      },
    ],
  },
  {
    slug: "services",
    title: "Services",
    description:
      "Cancer health coaching, psycho-oncology counselling and cancer prevention coaching with Thrive Through Cancer.",
    status: "published",
    sections: [
      {
        blockType: "hero",
        eyebrow: "Work with us",
        heading: "Comprehensive support for your healing journey",
        body:
          "While coaching focuses on lifestyle changes and thriving in the present and future, psycho-oncology counselling addresses the emotional, mental, and behavioural aspects of coping with cancer. Together, they provide comprehensive support for your healing journey.",
        primaryAction: { label: "Book a Cancer Coaching Session", href: "/book" },
        secondaryAction: { label: "View pricing", href: "/pricing" },
        image: openGarden,
        aside: "Every client is unique, and so is their path to healing.",
      },
      {
        blockType: "card_collection",
        eyebrow: "Our services",
        heading: "Choose the support you need",
        tone: "mist",
        cards: [
          {
            kicker: "Health Coaching",
            title: "Cancer Health Coaching",
            body:
              "Our coaching program is designed to help you make sustainable lifestyle changes that support healing and well-being. We partner with you to develop a personalised health plan, incorporating essential lifestyle changes like nutrition, exercise, sleep, and stress management.",
            link: {
              label: "Explore Health Coaching",
              href: "/services/cancer-health-coaching",
            },
          },
          {
            kicker: "Counselling",
            title: "Psycho-Oncology Counselling",
            body:
              "A cancer diagnosis is life-altering, it doesn’t just affect the body, it deeply impacts emotions, thoughts, and relationships. Counselling provides emotional and psychological support at every stage.",
            link: {
              label: "Explore Psycho-Oncology Counselling",
              href: "/services/psycho-oncology-counselling",
            },
          },
          {
            kicker: "Prevention",
            title: "Cancer Prevention Coaching",
            body:
              "Did you know that 30 to 50% of cancers can be prevented by adopting healthy lifestyle habits? Prevention is key to longevity, and we use neuroscience-backed techniques to help clients build habits that last.",
            link: {
              label: "Explore Cancer Prevention Coaching",
              href: "/services/cancer-prevention-coaching",
            },
          },
        ],
      },
      {
        blockType: "comparison",
        eyebrow: "Coaching vs. counselling",
        heading: "Two disciplines, one healing journey",
        introduction:
          "Coaching and counselling serve different purposes. Many clients use both.",
        columns: [
          {
            title: "Coaching",
            body: "Focuses on lifestyle changes and thriving in the present and future.",
            points: [
              "Identification of lifestyle changes to propel healing",
              "Medical research and advocacy",
              "Accompaniment to medical appointments (if needed)",
              "Personalised support to enhance adherence to treatment plans",
            ],
            link: {
              label: "Explore Health Coaching",
              href: "/services/cancer-health-coaching",
            },
          },
          {
            title: "Psycho-Oncology counselling",
            body:
              "Addresses the emotional, mental, and behavioural aspects of coping with cancer.",
            points: [
              "Process emotions and reduce distress",
              "Cope with changes in body image and function",
              "Navigate relationship challenges",
              "Reintegrate into daily life post-treatment",
            ],
            link: {
              label: "Explore Psycho-Oncology Counselling",
              href: "/services/psycho-oncology-counselling",
            },
          },
        ],
      },
      {
        blockType: "notice",
        heading: "Support that complements your medical care",
        body: [
          "Coaching and counselling complement traditional cancer treatment. They do not diagnose, treat or replace the care of your oncology and medical team.",
          "The estimate that 30 to 50% of cancers are preventable is published by the World Health Organization.",
        ],
        tone: "scope",
      },
      {
        blockType: "call_to_action",
        heading: "Every client is unique, and so is their path to healing",
        body: "Let’s create a plan that works for you.",
        action: { label: "Book a session today", href: "/book" },
      },
    ],
  },
  {
    slug: "cancer-health-coaching",
    title: "Cancer Health Coaching",
    description:
      "Sustainable lifestyle changes that support healing and well-being, with a personalised health plan built around you.",
    status: "published",
    sections: [
      {
        blockType: "hero",
        eyebrow: "Health Coaching",
        heading: "Sustainable lifestyle changes that support healing and well-being",
        body:
          "Our coaching program is designed to help you make sustainable lifestyle changes that support healing and well-being. We partner with you to develop a personalised health plan, incorporating essential lifestyle changes like nutrition, exercise, sleep, and stress management to support your healing journey.",
        primaryAction: { label: "Book a Cancer Coaching Session", href: "/book" },
        secondaryAction: { label: "View pricing", href: "/pricing" },
        image: nourishmentStillLife,
        aside: "Every client is unique, and so is their path to healing.",
        tone: "mist",
      },
      {
        blockType: "introduction",
        eyebrow: "Our approach",
        heading: "We empower you to approach healing with confidence",
        body: [
          "In addition, we help our clients to dig deep and find the motivation from within to become committed, compliant and consistent with their treatment and healing plan.",
          "Cancer may bring uncertainty, but vibrant life after diagnosis is possible. Our approach integrates the 12 PEMS Conditioning Gems, Functional Medicine Coaching, and insights from the Radical Remission Project to guide clients toward optimal health in order to thrive beyond cancer.",
        ],
      },
      {
        blockType: "feature_list",
        eyebrow: "What is included",
        heading: "Our services include",
        tone: "mist",
        layout: "grid",
        items: [
          {
            title: "Lifestyle changes",
            body: "Identification of lifestyle changes to propel healing.",
          },
          {
            title: "Research and advocacy",
            body: "Medical research and advocacy.",
          },
          {
            title: "Appointment accompaniment",
            body: "Accompaniment to medical appointments (if needed).",
          },
          {
            title: "Treatment plan support",
            body: "Personalised support to enhance adherence to treatment plans.",
          },
        ],
      },
      {
        blockType: "feature_list",
        eyebrow: "Your personalised health plan",
        heading: "Essential lifestyle changes we work on together",
        introduction:
          "We partner with you to develop a personalised health plan, incorporating essential lifestyle changes to support your healing journey.",
        tone: "cream",
        layout: "stack",
        items: [
          { title: "Nutrition", body: "Food choices that support your healing journey." },
          { title: "Exercise", body: "Movement that fits your energy and your treatment plan." },
          { title: "Sleep", body: "Rest and recovery practices that restore your daily capacity." },
          { title: "Stress management", body: "Practical tools to reduce distress and steady the day." },
          {
            title: "Motivation from within",
            body: "Digging deep to become committed, compliant and consistent with your treatment and healing plan.",
          },
        ],
      },
      {
        blockType: "notice",
        heading: "Alongside your medical team",
        body: [
          "These evidence-based methods complement traditional cancer treatments. Coaching does not diagnose, prescribe or replace advice from your oncology team.",
        ],
        tone: "scope",
      },
      {
        blockType: "call_to_action",
        heading: "Every client is unique, and so is their path to healing",
        body: "Let’s create a plan that works for you.",
        action: { label: "Book a Cancer Coaching Session", href: "/book" },
      },
    ],
  },
  {
    slug: "psycho-oncology-counselling",
    title: "Psycho-Oncology Counselling",
    description:
      "Emotional and psychological support at every stage, pre-diagnosis, during treatment, survivorship, and beyond.",
    status: "published",
    sections: [
      {
        blockType: "hero",
        eyebrow: "Psycho-Oncology Counselling",
        heading: "A cancer diagnosis is life-altering",
        body:
          "It doesn’t just affect the body, it deeply impacts emotions, thoughts, and relationships. Psycho-oncology counselling is a critical part of healing and is designed to provide emotional and psychological support at every stage, pre-diagnosis, during treatment, survivorship, and beyond.",
        primaryAction: {
          label: "Book a Psycho-Oncology counselling Session",
          href: "/book",
        },
        secondaryAction: { label: "View pricing", href: "/pricing" },
        image: counsellingRoom,
        aside: "You don’t have to go through this journey alone.",
      },
      {
        blockType: "introduction",
        eyebrow: "Why it matters",
        heading: "Distress is common, and it deserves proper support",
        body: [
          "Studies show that up to 30% of cancer patients experience significant anxiety, distress, or depression during their journey.",
          "That’s why psycho-oncology counselling is designed to provide emotional and psychological support at every stage, pre-diagnosis, during treatment, survivorship, and beyond.",
        ],
      },
      {
        blockType: "feature_list",
        eyebrow: "How we help",
        heading: "Our psycho-oncology counselling services help you",
        tone: "mist",
        layout: "grid",
        items: [
          { title: "Process emotions", body: "Process emotions and reduce distress." },
          {
            title: "Body image and function",
            body: "Cope with changes in body image and function.",
          },
          { title: "Relationships", body: "Navigate relationship challenges." },
          { title: "Daily life", body: "Reintegrate into daily life post-treatment." },
          {
            title: "Mental resilience",
            body: "Improve mental resilience through mind-body techniques and cognitive behavioural therapy.",
          },
        ],
      },
      {
        blockType: "notice",
        heading: "If you need urgent support",
        body: [
          "Counselling is not an emergency or crisis service. If you are at risk of harming yourself or someone else, contact your local emergency services or a crisis line immediately.",
          "Distress prevalence figures on this page are drawn from published psycho-oncology research.",
        ],
        tone: "scope",
      },
      {
        blockType: "call_to_action",
        heading: "You don’t have to go through this journey alone",
        body: "Integrate psychosocial support to your treatment plan.",
        action: {
          label: "Book a Psycho-Oncology counselling Session",
          href: "/book",
        },
      },
    ],
  },
  {
    slug: "cancer-prevention-coaching",
    title: "Cancer Prevention Coaching",
    description:
      "30 to 50% of cancers can be prevented by adopting healthy lifestyle habits. Prevention coaching helps you build habits that last.",
    status: "published",
    sections: [
      {
        blockType: "hero",
        eyebrow: "Cancer Prevention Coaching",
        heading: "Did you know that 30 to 50% of cancers can be prevented?",
        body:
          "Adopting healthy lifestyle habits is one of the most powerful things you can do. Prevention is key to longevity. Yet, making lifestyle changes, like improving diet, managing stress, and increasing physical activity, can be challenging. That’s where our coaching comes in.",
        primaryAction: {
          label: "Book a Cancer Prevention Coaching Session",
          href: "/book",
        },
        secondaryAction: { label: "View pricing", href: "/pricing" },
        image: appointmentNotes,
        aside: "Take charge of your health today.",
        tone: "mist",
      },
      {
        blockType: "editorial_split",
        eyebrow: "How it works",
        heading: "Habits that last, built on neuroscience",
        body: [
          "Prevention is key to longevity. Yet, making lifestyle changes, like improving diet, managing stress, and increasing physical activity, can be challenging.",
          "That’s where our coaching comes in. We use neuroscience-backed techniques to help clients build habits that last.",
        ],
        image: preventionHabits,
        imageSide: "right",
        tone: "white",
      },
      {
        blockType: "feature_list",
        eyebrow: "What we work on",
        heading: "Our preventative coaching approach helps individuals",
        tone: "mist",
        layout: "grid",
        items: [
          { title: "Risk factors", body: "Identify personal risk factors." },
          { title: "Fears and obstacles", body: "Overcome fears and obstacles to change." },
          {
            title: "Skills and strategies",
            body: "Develop new skills and strategies for long-term health.",
          },
          {
            title: "Accountability",
            body: "Stay accountable and committed to a prevention plan.",
          },
        ],
      },
      {
        blockType: "notice",
        heading: "Prevention is not a guarantee",
        body: [
          "Coaching supports healthy lifestyle habits. It does not provide screening, diagnosis or individual medical risk assessment. Speak to a qualified healthcare professional about screening, family history and symptoms.",
          "The estimate that 30 to 50% of cancers are preventable is published by the World Health Organization.",
        ],
        tone: "scope",
      },
      {
        blockType: "call_to_action",
        heading: "Take charge of your health today",
        body: "Build the habits that support long-term health, with support and accountability.",
        action: {
          label: "Book a Cancer Prevention Coaching Session",
          href: "/book",
        },
      },
    ],
  },
  {
    slug: "approach",
    title: "Our Approach",
    description:
      "Functional Medicine Coaching, the Radical Remission Project and the 12 PEMS Conditioning Gems.",
    status: "published",
    sections: [
      {
        blockType: "hero",
        eyebrow: "Functional Medicine Coaching",
        heading: "A holistic approach",
        body:
          "Our art and science of coaching is rooted in Functional Medicine principles, positive psychology, mind-body medicine, behavioural change science, and neuroscience to help you achieve optimal well-being.",
        primaryAction: {
          label: "Book a Functional Medicine Coaching Session",
          href: "/book",
        },
        secondaryAction: { label: "Explore PEMS", href: "/pems-assessment" },
        image: permaCards,
        aside: "Healing is not just about treating symptoms.",
        tone: "teal",
      },
      {
        blockType: "feature_list",
        eyebrow: "What informs our coaching",
        heading: "Five disciplines behind every session",
        tone: "mist",
        layout: "stack",
        items: [
          {
            title: "Functional Medicine",
            body: "Addresses the root causes of disease, considering genetic, environmental, and lifestyle factors.",
          },
          {
            title: "Positive Psychology’s PERMA model",
            body: "Positive Emotions, Engagement, Relationships, Meaning, and Achievement, fostering emotional well-being.",
          },
          {
            title: "Behavioural change science",
            body: "Helping clients adopt sustainable health habits.",
          },
          {
            title: "Neuroscience techniques",
            body: "Leveraging the brain’s ability to rewire for health and resilience.",
          },
          {
            title: "Mind-body medicine",
            body: "Strategies including breathwork, visualisation, grounding, energy work and meditation.",
          },
        ],
      },
      {
        blockType: "editorial_split",
        eyebrow: "Radical Remission",
        heading: "What is Radical Remission?",
        body: [
          "Radical Remission is a concept developed by Dr Kelly Turner, PhD, after studying those experiencing cancer and healing against medical projections. Her research identified 10 key healing factors that significantly improve quality of life and enhance the body’s ability to heal.",
          "We integrate these 10 Healing Factors, along with 12 PEMS Conditioning Gems and Functional Medicine coaching principles, into our coaching sessions and workshops. These evidence-based methods complement traditional cancer treatments and provide practical, science-backed lifestyle changes.",
        ],
        image: researchReading,
        imageSide: "right",
        action: {
          label: "Learn more about Radical Remission",
          href: "https://www.radicalremission.com",
        },
        tone: "white",
      },
      {
        blockType: "editorial_split",
        eyebrow: "PEMS Conditioning Gems",
        heading: "A personalised healing tool",
        body: [
          "Our unique flagship tool, PEMS Conditioning Gems, assesses four key areas of your well-being, Physical, Emotional, Mental, and Spiritual, to help condition your body for healing.",
          "The 12 Gems, developed from extensive cancer research, provide actionable insights tailored to your unique needs.",
        ],
        image: mindBodyCalm,
        imageSide: "left",
        action: { label: "Access the assessment", href: "/pems-assessment" },
        tone: "white",
      },
      {
        blockType: "call_to_action",
        heading: "Healing is not just about treating symptoms",
        body: "It’s about creating a life where you thrive.",
        action: {
          label: "Book a Functional Medicine Coaching Session",
          href: "/book",
        },
      },
    ],
  },
  {
    slug: "pems-assessment",
    title: "PEMS Conditioning Gems",
    description:
      "Our flagship tool assesses four key areas of your well-being: Physical, Emotional, Mental, and Spiritual.",
    status: "published",
    sections: [
      {
        blockType: "hero",
        eyebrow: "PEMS Conditioning Gems",
        heading: "A personalised healing tool",
        body:
          "Our unique flagship tool, PEMS Conditioning Gems, assesses four key areas of your well-being, Physical, Emotional, Mental, and Spiritual, to help condition your body for healing. The 12 Gems, developed from extensive cancer research, provide actionable insights tailored to your unique needs.",
        primaryAction: { label: "Book a Coaching Session", href: "/book" },
        secondaryAction: { label: "Read our approach", href: "/approach" },
        image: pemsGems,
        aside: "Physical, Emotional, Mental and Spiritual.",
        tone: "mist",
      },
      {
        blockType: "feature_list",
        eyebrow: "Four key areas",
        heading: "What the Gems assess",
        tone: "mist",
        layout: "gems",
        items: [
          {
            title: "Physical",
            body: "The routines, nutrition, movement and rest that condition your body for healing.",
          },
          {
            title: "Emotional",
            body: "The feelings a cancer journey brings, and the support needed to process them.",
          },
          {
            title: "Mental",
            body: "The thoughts, decisions and mental resilience that shape how you cope.",
          },
          {
            title: "Spiritual",
            body: "The meaning, connection and perspective that steady you through treatment.",
          },
        ],
      },
      {
        blockType: "notice",
        heading: "The interactive assessment is on its way",
        body: [
          "The 12 Gems assessment will be published here as an interactive form with personalised feedback. Until then, you are welcome to book a session and work through the Gems together with Renny.",
        ],
        tone: "status",
      },
      {
        blockType: "call_to_action",
        heading: "Interested?",
        body: "Book a session and we will walk through the 12 Gems with you.",
        action: { label: "Book a Coaching Session", href: "/book" },
      },
    ],
  },
  {
    slug: "pricing",
    title: "Pricing",
    description:
      "Session pricing for Thrive Through Cancer coaching and counselling, with a pay what you can afford option.",
    status: "published",
    sections: [
      {
        blockType: "hero",
        eyebrow: "Session pricing",
        heading: "Clear fees, and room for a conversation",
        body:
          "We recognise that financial concerns may arise during treatment. If financial hardship is a barrier, we invite you to pay what you can afford.",
        primaryAction: { label: "Book a session today", href: "/book" },
        secondaryAction: { label: "Explore services", href: "/services" },
        image: bookingCalendar,
        aside: "Foundation, follow-up and 12-session package options.",
      },
      {
        blockType: "pricing",
        eyebrow: "Session pricing",
        heading: "Ways to work together",
        plans: [
          {
            name: "Foundation Session",
            duration: "3 hours",
            price: "R1 785",
            body: "An extended first session to understand your priorities and shape your plan.",
          },
          {
            name: "Follow-up Session",
            duration: "1 hour",
            price: "R700",
            body: "Ongoing support to review progress and decide on practical next steps.",
          },
          {
            name: "12-Session Package",
            duration: "12 sessions",
            price: "10% discount",
            body: "A package of twelve sessions, offered at a 10% discount.",
          },
        ],
        notes: [
          "Our sessions can be booked online, with payment options including PayFast, credit card, and direct EFT.",
        ],
      },
      {
        blockType: "editorial_split",
        eyebrow: "Pay what you can afford",
        heading: "Financial hardship should not be a barrier",
        body: [
          "We recognise that financial concerns may arise during treatment. If financial hardship is a barrier, we invite you to pay what you can afford.",
          "If you can pay in full, your contribution helps us expand our services to those in need.",
        ],
        image: financialPlanning,
        imageSide: "left",
        tone: "mist",
      },
      {
        blockType: "call_to_action",
        heading: "We’re here to support you",
        body: "Partner with us and let’s help you THRIVE through cancer and beyond.",
        action: { label: "Book a session today", href: "/book" },
      },
    ],
  },
  {
    slug: "book",
    title: "Book a Session",
    description:
      "Book your cancer coaching or psycho-oncology counselling session online, with PayFast, credit card and direct EFT payment options.",
    status: "published",
    sections: [
      {
        blockType: "hero",
        eyebrow: "Payment and booking",
        heading: "Book a session today",
        body:
          "Our sessions can be booked online, with payment options including PayFast, credit card, and direct EFT. Choose your service, choose a time that suits you, and we will confirm by email.",
        primaryAction: { label: "Explore services", href: "/services" },
        secondaryAction: { label: "View pricing", href: "/pricing" },
        image: routinePlanning,
        aside: "We’re here to support you.",
        tone: "mist",
      },
      {
        blockType: "process",
        eyebrow: "How it works",
        heading: "Four steps to your first session",
        steps: [
          {
            title: "Choose a service",
            body: "Cancer health coaching, psycho-oncology counselling, or cancer prevention coaching.",
          },
          {
            title: "Choose a session",
            body: "A 3-hour Foundation Session, a 1-hour Follow-up Session, or the 12-Session Package.",
          },
          {
            title: "Choose a time",
            body: "Pick from available times in South African time and hold your slot.",
          },
          {
            title: "Pay and confirm",
            body: "Pay by PayFast, credit card or direct EFT. Your booking is confirmed by email.",
          },
        ],
      },
      {
        blockType: "notice",
        heading: "Your booking is confirmed once payment is received",
        body: [
          "Choosing a time places a hold on that slot. Viewing this page does not reserve or confirm an appointment, and a hold becomes a confirmed appointment only once your payment succeeds and your confirmation email arrives.",
          "We ask only for the minimum contact details needed for the booking. There is no health-information field, so please do not share diagnosis or treatment details here.",
        ],
        tone: "status",
      },
      {
        blockType: "call_to_action",
        heading: "Partner with us",
        body: "Let’s help you THRIVE through cancer and beyond.",
        action: { label: "Explore services", href: "/services" },
      },
    ],
  },
  {
    slug: "resources",
    title: "Resources",
    description:
      "Radical Remission reading, survivor stories and practical resources for your healing journey.",
    status: "published",
    sections: [
      {
        blockType: "hero",
        eyebrow: "Resources",
        heading: "Reading for the moments between sessions",
        body:
          "Learn more about the frameworks behind our coaching, including the Radical Remission Project, the PERMA model and the 12 PEMS Conditioning Gems.",
        primaryAction: { label: "Read our approach", href: "/approach" },
        secondaryAction: { label: "Explore services", href: "/services" },
        image: reflectionStillLife,
        aside: "Evidence-based methods that complement traditional treatment.",
        tone: "teal",
      },
      {
        blockType: "editorial_split",
        eyebrow: "Radical Remission",
        heading: "Read inspiring survivor stories",
        body: [
          "Radical Remission is a concept developed by Dr Kelly Turner, PhD, after studying those experiencing cancer and healing against medical projections. Her research identified 10 key healing factors that significantly improve quality of life and enhance the body’s ability to heal.",
          "Learn more about Radical Remission and read inspiring survivor stories on the Radical Remission Project website.",
        ],
        image: quietPath,
        imageSide: "right",
        action: {
          label: "Visit the Radical Remission Project",
          href: "https://www.radicalremission.com",
        },
        tone: "white",
      },
      {
        blockType: "card_collection",
        eyebrow: "More to come",
        heading: "What we are adding next",
        tone: "mist",
        cards: [
          {
            kicker: "Assessment",
            title: "The 12 PEMS Conditioning Gems",
            body: "An interactive assessment with personalised feedback, coming soon.",
            link: { label: "Read about PEMS", href: "/pems-assessment" },
          },
          {
            kicker: "Workshops",
            title: "Radical Remission workshops",
            body: "We integrate the 10 Healing Factors into our coaching sessions and workshops.",
            link: { label: "Read our approach", href: "/approach" },
          },
        ],
      },
      {
        blockType: "call_to_action",
        heading: "Ready to begin?",
        body: "Partner with us and let’s help you THRIVE through cancer and beyond.",
        action: { label: "Book a session today", href: "/book" },
      },
    ],
  },
  ...legalRawPages,
];

const parsedPages: PageContent[] = rawPages.map((page) => pageContentSchema.parse(page));

export const seedPages = new Map<string, PageContent>(
  parsedPages.map((page) => [page.slug, page]),
);
