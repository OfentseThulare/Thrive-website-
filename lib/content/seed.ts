import {
  pageContentSchema,
  type PageContent,
  type PageContentInput,
} from "./contracts.ts";
import { legalRawPages } from "./legal-seed.ts";

const rennySeated = {
  src: "/images/renny-portrait-seated.jpg",
  alt: "Renny smiling while seated beside a large window",
  width: 2048,
  height: 2048,
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

const rawPages: PageContentInput[] = [
  {
    slug: "home",
    title: "Thrive Through Cancer",
    description:
      "Compassionate cancer health coaching and psycho-oncology counselling for diagnosis, treatment, survivorship, caregiving and prevention.",
    status: "published",
    sections: [
      {
        blockType: "hero",
        eyebrow: "Cancer and Psycho-Oncology Support",
        heading: "Cancer changes the map. You do not have to navigate it alone.",
        body:
          "Compassionate, science informed coaching and counselling to help you move through diagnosis, treatment and life beyond cancer with greater clarity, resilience and hope.",
        primaryAction: { label: "Plan a first conversation", href: "/book" },
        secondaryAction: { label: "Meet Renny", href: "/about" },
        image: rennySeated,
        aside: "Whole person support, thoughtfully guided.",
      },
      {
        blockType: "introduction",
        eyebrow: "Support that begins where you are",
        heading: "A steadier way through uncertainty",
        body: [
          "A cancer diagnosis can affect far more than physical health. It can reshape identity, relationships, confidence and the rhythm of everyday life.",
          "Thrive Through Cancer is a virtual practice for people living with cancer, those caring for someone they love, and people ready to build more supportive health habits.",
        ],
        align: "centre",
      },
      {
        blockType: "card_collection",
        eyebrow: "Where are you now?",
        heading: "There is space for this part of your story",
        tone: "mist",
        cards: [
          {
            kicker: "Newly diagnosed",
            title: "Finding your footing",
            body:
              "Create room for questions, emotions and practical next steps when the future suddenly feels unfamiliar.",
            link: { label: "Explore your options", href: "/services" },
          },
          {
            kicker: "In treatment",
            title: "Supporting daily wellbeing",
            body:
              "Build realistic routines for nourishment, movement, rest, stress and treatment plan adherence alongside your medical care.",
            link: {
              label: "Explore health coaching",
              href: "/services/cancer-health-coaching",
            },
          },
          {
            kicker: "Life after treatment",
            title: "Meeting survivorship with care",
            body:
              "Work with uncertainty, changed priorities and the gradual process of returning to daily life after treatment.",
            link: {
              label: "Explore counselling",
              href: "/services/psycho-oncology-counselling",
            },
          },
          {
            kicker: "Caring for someone",
            title: "Support for the supporter",
            body:
              "Make room for your own stress, needs and resilience while caring for someone living with cancer.",
            link: { label: "See how support works", href: "/approach" },
          },
        ],
      },
      {
        blockType: "comparison",
        eyebrow: "Ways to work together",
        heading: "Choose the kind of support you need",
        introduction:
          "Coaching and counselling have different purposes. Both are grounded in respect for your experience and work alongside, never instead of, oncology and medical care.",
        columns: [
          {
            title: "Cancer Health Coaching",
            body: "Practical partnership for supportive habits, confidence and everyday wellbeing.",
            points: ["Lifestyle planning", "Sustainable behaviour change", "Treatment plan support"],
            link: {
              label: "Explore coaching",
              href: "/services/cancer-health-coaching",
            },
          },
          {
            title: "Psycho-Oncology Counselling",
            body: "A reflective space for the emotional, mental and relational impact of cancer.",
            points: ["Emotional processing", "Body image and identity", "Relationships and reintegration"],
            link: {
              label: "Explore counselling",
              href: "/services/psycho-oncology-counselling",
            },
          },
          {
            title: "Cancer Prevention Coaching",
            body: "Accountable support for turning risk awareness into realistic, lasting habits.",
            points: ["Personal priorities", "Barriers to change", "A practical prevention plan"],
            link: {
              label: "Explore prevention",
              href: "/services/cancer-prevention-coaching",
            },
          },
        ],
      },
      {
        blockType: "editorial_split",
        eyebrow: "Meet your guide",
        heading: "Renny brings attentive partnership to every conversation",
        body: [
          "Renny is a health coach and psycho-oncology counsellor dedicated to helping people navigate cancer with resilience and hope.",
          "Her approach brings together health coaching, behaviour change, positive psychology and psycho-oncology support, with care taken to remain within a non medical scope.",
        ],
        image: rennyStanding,
        imageSide: "right",
        action: { label: "Read Renny’s story", href: "/about" },
        tone: "white",
      },
      {
        blockType: "editorial_split",
        eyebrow: "An integrated approach",
        heading: "Practical tools for the whole person",
        body: [
          "Sessions can draw on Functional Medicine coaching principles, positive psychology, behaviour change science, mind and body practices, Radical Remission learning and the Physical, Emotional, Mental and Spiritual framework known as PEMS.",
          "These approaches support reflection and everyday wellbeing. They do not diagnose disease, prescribe treatment or promise a health outcome.",
        ],
        image: quietPath,
        imageSide: "left",
        action: { label: "Explore our approach", href: "/approach" },
        tone: "cream",
      },
      {
        blockType: "pricing",
        eyebrow: "Clear starting points",
        heading: "Session pricing",
        plans: [
          {
            name: "Foundation Session",
            duration: "3 hours",
            price: "R1 785",
            body: "An extended first session to understand your priorities and shape a supportive way forward.",
          },
          {
            name: "Follow Up Session",
            duration: "1 hour",
            price: "R700",
            body: "Focused ongoing support for reflection, accountability and practical next steps.",
          },
        ],
        notes: ["A 12 session package is offered with a 10% discount. The final package structure will be confirmed before payment is enabled."],
      },
      {
        blockType: "call_to_action",
        heading: "Begin with a grounded conversation",
        body:
          "Review how the planned booking process will work and what you can consider before choosing a session.",
        action: { label: "Prepare to book", href: "/book" },
      },
    ],
  },
  {
    slug: "about",
    title: "About Renny",
    description:
      "Meet Renny, a Functional Medicine Certified Health Coach and psycho-oncology counsellor supporting people through cancer.",
    status: "published",
    sections: [
      {
        blockType: "hero",
        eyebrow: "About Renny",
        heading: "Knowledge, compassion and room to be human",
        body:
          "Renny supports individuals and families as they meet the practical and emotional realities of cancer, from diagnosis and treatment to survivorship and prevention.",
        primaryAction: { label: "Explore services", href: "/services" },
        secondaryAction: { label: "Prepare to book", href: "/book" },
        image: rennyStanding,
        aside: "Support that respects your pace and your priorities.",
        tone: "mist",
      },
      {
        blockType: "introduction",
        eyebrow: "Her mission",
        heading: "Helping you discover your inherent capacity for health",
        body: [
          "Renny’s mission is to help people move beyond simply surviving and towards a life with greater agency, meaning and wellbeing.",
          "She believes every person holds strengths that can be recognised and practised, even when illness has made life feel unfamiliar.",
        ],
      },
      {
        blockType: "editorial_split",
        eyebrow: "A committed guide",
        heading: "Walking alongside people through change",
        body: [
          "Renny is a health coach and psycho-oncology counsellor dedicated to helping individuals navigate cancer with resilience and hope. She supports people who are newly diagnosed, undergoing treatment, living with uncertainty or adapting to life after treatment.",
          "Her work with clients across the cancer journey has shaped a deep respect for the impact diagnosis can have on individuals and families. Her training and research inform practical ways to reduce stress, process emotions and strengthen resilience.",
          "As a health educator and researcher, Renny is passionate about equipping people with skills that support self efficacy. Her role is to offer thoughtful questions, practical tools, encouragement and accountable partnership.",
        ],
        image: rennySeated,
        imageSide: "left",
        tone: "white",
      },
      {
        blockType: "feature_list",
        eyebrow: "Training supplied by the client",
        heading: "Renny’s credentials",
        introduction:
          "The qualification names below follow the wording supplied in the website brief. Two institution names remain intentionally neutral pending documentary confirmation.",
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
            body: "Institution name awaiting confirmation from the final certificate.",
          },
          {
            title: "BA in Psychology and Communication",
            body: "Institution name awaiting confirmation from the final certificate.",
          },
        ],
      },
      {
        blockType: "notice",
        heading: "Credential verification is still in progress",
        body: [
          "The supplied draft names “Tech School of Medicine” and “University Northwest”. Those labels may be incomplete or reversed. They will not be guessed or paired with logos until the client supplies certificates and confirms display permission.",
          "No professional registration, protected title or medical qualification is claimed beyond the supplied wording.",
        ],
        tone: "verification",
      },
      {
        blockType: "feature_list",
        eyebrow: "Working philosophy",
        heading: "A relationship built on partnership",
        layout: "grid",
        tone: "cream",
        items: [
          { title: "Your experience leads", body: "You bring knowledge of your life, values and needs. Coaching and counselling begin there." },
          { title: "Small steps matter", body: "Sustainable changes are shaped around your energy, circumstances and medical plan." },
          { title: "Hope stays honest", body: "Support can hold hope without promising a cure or minimising the difficulty of cancer." },
          { title: "Care stays connected", body: "This work complements your oncology and medical team and does not replace them." },
        ],
      },
      {
        blockType: "call_to_action",
        heading: "Find the support that fits",
        body: "Compare coaching and counselling, then consider which conversation would be most useful now.",
        action: { label: "Explore services", href: "/services" },
      },
    ],
  },
  {
    slug: "services",
    title: "Services",
    description:
      "Compare cancer health coaching, psycho-oncology counselling and cancer prevention coaching with Thrive Through Cancer.",
    status: "published",
    sections: [
      {
        blockType: "hero",
        eyebrow: "Ways to work together",
        heading: "The right kind of support for this part of the journey",
        body:
          "Some moments call for practical change. Others need emotional space. Explore three distinct services and choose the conversation that best matches your needs.",
        primaryAction: { label: "Choose a service", href: "/services" },
        secondaryAction: { label: "View pricing", href: "/pricing" },
        image: quietPath,
        aside: "Different needs, one respectful standard of care.",
      },
      {
        blockType: "comparison",
        eyebrow: "Coaching and counselling",
        heading: "Two disciplines, clearly distinguished",
        introduction:
          "Coaching focuses on supportive habits and the present and future. Counselling makes room for the emotional, mental and relational impact of cancer. Neither provides medical diagnosis or treatment.",
        columns: [
          {
            title: "Health coaching",
            body: "Useful when you want to turn intentions into practical action and build confidence in daily wellbeing choices.",
            points: ["Goals and routines", "Motivation and accountability", "Planning around real life"],
            link: { label: "Cancer Health Coaching", href: "/services/cancer-health-coaching" },
          },
          {
            title: "Psycho-Oncology counselling",
            body: "Useful when cancer has brought distress, fear, loss, body image changes or strain in relationships.",
            points: ["Emotional processing", "Coping and resilience", "Identity and relationships"],
            link: { label: "Psycho-Oncology Counselling", href: "/services/psycho-oncology-counselling" },
          },
        ],
      },
      {
        blockType: "card_collection",
        eyebrow: "Service chooser",
        heading: "Start with what you want support with",
        tone: "mist",
        cards: [
          {
            kicker: "Practical wellbeing",
            title: "Cancer Health Coaching",
            body: "For people living with cancer who want support with nourishing routines, movement, rest, stress, treatment plan adherence and self advocacy.",
            link: { label: "Explore health coaching", href: "/services/cancer-health-coaching" },
          },
          {
            kicker: "Emotional wellbeing",
            title: "Psycho-Oncology Counselling",
            body: "For people affected by cancer who want a dedicated space for emotions, identity, body image, relationships and life transitions.",
            link: { label: "Explore counselling", href: "/services/psycho-oncology-counselling" },
          },
          {
            kicker: "Risk aware habits",
            title: "Cancer Prevention Coaching",
            body: "For people who want to understand their priorities and build realistic habits that support long term wellbeing.",
            link: { label: "Explore prevention", href: "/services/cancer-prevention-coaching" },
          },
        ],
      },
      {
        blockType: "notice",
        heading: "Support that complements medical care",
        body: [
          "Thrive Through Cancer does not diagnose, treat or prevent cancer. Coaching and counselling are supportive services and do not replace oncology care, medical advice, mental health crisis care or treatment from an appropriately registered practitioner.",
        ],
        tone: "scope",
      },
      {
        blockType: "call_to_action",
        heading: "Still deciding where to begin?",
        body: "Review the booking preparation page to understand the planned first conversation and what to consider beforehand.",
        action: { label: "Prepare to book", href: "/book" },
      },
    ],
  },
  {
    slug: "cancer-health-coaching",
    title: "Cancer Health Coaching",
    description:
      "Personalised cancer health coaching for practical wellbeing habits, treatment plan support and greater self efficacy.",
    status: "published",
    sections: [
      {
        blockType: "hero",
        eyebrow: "Cancer Health Coaching",
        heading: "Make supportive choices feel possible in daily life",
        body:
          "A practical, personalised partnership to help you shape sustainable habits around nutrition, movement, sleep, stress and your wider treatment plan.",
        primaryAction: { label: "Prepare to book", href: "/book" },
        secondaryAction: { label: "View pricing", href: "/pricing" },
        image: nourishmentStillLife,
        aside: "Progress shaped around your energy, needs and medical plan.",
        tone: "mist",
      },
      {
        blockType: "introduction",
        eyebrow: "A personalised programme",
        heading: "From good intentions to sustainable support",
        body: [
          "Cancer can make everyday health decisions feel complicated. Coaching helps you identify what matters now, understand what is realistic and build a plan that fits your life.",
          "Together, we look for motivation that comes from within so that commitment, consistency and confidence can grow. Coaching remains aligned with the treatment plan provided by your medical team.",
        ],
      },
      {
        blockType: "feature_list",
        eyebrow: "What the programme can include",
        heading: "Four forms of practical support",
        introduction:
          "Every plan is individual. The service brief includes the following areas, each offered within a non medical coaching scope.",
        tone: "mist",
        layout: "grid",
        items: [
          {
            title: "Lifestyle changes",
            body: "Identify supportive adjustments to nourishment, movement, sleep, rest and stress that are realistic for your circumstances.",
          },
          {
            title: "Research and self advocacy",
            body: "Find credible information, organise questions and prepare for conversations with your medical team. Coaching does not interpret evidence as medical advice.",
          },
          {
            title: "Appointment preparation",
            body: "Prepare notes, priorities and questions. Accompaniment to selected appointments may be discussed, subject to location, availability and prior agreement.",
          },
          {
            title: "Treatment plan support",
            body: "Build routines and reminders that support adherence to the treatment plan agreed with your medical team.",
          },
        ],
      },
      {
        blockType: "feature_list",
        eyebrow: "Lifestyle support",
        heading: "Working with the rhythms that shape wellbeing",
        tone: "cream",
        layout: "stack",
        items: [
          { title: "Nourishment", body: "Explore practical meal routines and food choices that respect medical guidance, access, culture, energy and preference." },
          { title: "Movement", body: "Consider manageable ways to move, with medical clearance where needed and careful attention to changing energy." },
          { title: "Sleep and rest", body: "Shape evening, recovery and rest practices that support your daily capacity." },
          { title: "Stress support", body: "Practise grounding, breath and reflection tools that can help create steadier moments." },
          { title: "Motivation", body: "Understand what helps or hinders change and design steps that can be repeated, reviewed and adapted." },
        ],
      },
      {
        blockType: "process",
        eyebrow: "The coaching process",
        heading: "A plan that develops with you",
        introduction: "Coaching is collaborative and responsive. It does not impose a fixed formula.",
        steps: [
          { title: "Understand", body: "Clarify your current context, priorities, strengths and constraints." },
          { title: "Choose", body: "Select one or two meaningful areas rather than trying to change everything at once." },
          { title: "Practise", body: "Turn those priorities into small actions, supportive cues and realistic routines." },
          { title: "Review", body: "Notice what is helping, adapt what is not and recognise progress without judgement." },
        ],
      },
      {
        blockType: "faq",
        eyebrow: "Common questions",
        heading: "Cancer Health Coaching FAQs",
        items: [
          { question: "Does coaching replace my oncologist or dietitian?", answer: "No. Coaching complements your medical care. It does not diagnose, prescribe, interpret tests or replace advice from your oncology team, doctor, dietitian or other registered practitioner." },
          { question: "Do I need to be in treatment?", answer: "No. Coaching may be useful after diagnosis, during treatment, in survivorship or when preparing for a new phase of care." },
          { question: "Will I be given a strict lifestyle plan?", answer: "The aim is a personalised and collaborative plan. Any changes should fit your circumstances and remain consistent with medical guidance." },
          { question: "Can a caregiver attend?", answer: "A support person may be included where it is helpful and you both agree on the purpose and boundaries of the session." },
        ],
      },
      {
        blockType: "notice",
        heading: "Coaching supports wellbeing, not cancer treatment",
        body: ["This service does not offer medical care, nutritional treatment, diagnosis or a promise of healing. Decisions about treatment, supplements, exercise safety and clinical nutrition belong with your medical team."],
        tone: "scope",
      },
      {
        blockType: "call_to_action",
        heading: "Consider your first coaching conversation",
        body: "Review pricing and the honest preparation path while secure calendar booking is being completed.",
        action: { label: "Prepare to book", href: "/book" },
      },
    ],
  },
  {
    slug: "psycho-oncology-counselling",
    title: "Psycho-Oncology Counselling",
    description:
      "Emotional and psychological support for people affected by cancer across diagnosis, treatment, survivorship and caregiving.",
    status: "published",
    sections: [
      {
        blockType: "hero",
        eyebrow: "Psycho-Oncology Counselling",
        heading: "A place for what cancer asks you to carry",
        body:
          "Cancer can affect emotions, thoughts, identity and relationships. Counselling offers a dedicated space to process that impact with care.",
        primaryAction: { label: "Prepare to book", href: "/book" },
        secondaryAction: { label: "View pricing", href: "/pricing" },
        image: reflectionStillLife,
        aside: "Emotional support through every stage of the experience.",
      },
      {
        blockType: "introduction",
        eyebrow: "Across the cancer journey",
        heading: "Support before, during and after treatment",
        body: [
          "Psycho-oncology counselling can support people facing tests or a possible diagnosis, moving through active treatment, adjusting to survivorship, living with recurrence or advanced illness, and caring for someone with cancer.",
          "The work honours both difficult emotions and personal strengths. There is no expectation to stay positive or move through grief at a particular pace.",
        ],
      },
      {
        blockType: "feature_list",
        eyebrow: "What counselling may support",
        heading: "Five areas of emotional and relational care",
        tone: "mist",
        layout: "grid",
        items: [
          { title: "Process emotions", body: "Make room for fear, anger, sadness, uncertainty, relief and the emotions that may be difficult to name." },
          { title: "Body image and function", body: "Explore changes in appearance, physical function, sexuality, confidence and sense of self." },
          { title: "Relationships", body: "Navigate communication, changing roles, intimacy, parenting, caregiving and the wish to protect people you love." },
          { title: "Daily life after treatment", body: "Approach return to work, routines and social life while recognising that survivorship can bring its own uncertainty." },
          { title: "Coping and resilience", body: "Develop reflective, grounding and cognitive tools that may support steadier responses to stress." },
        ],
      },
      {
        blockType: "process",
        eyebrow: "The counselling process",
        heading: "A conversation paced with care",
        introduction: "Your goals, safety and consent shape the direction of the work.",
        steps: [
          { title: "Settle", body: "Begin with what is most present, without needing to tell the whole story at once." },
          { title: "Understand", body: "Explore emotions, beliefs, relationships and patterns with curiosity rather than judgement." },
          { title: "Respond", body: "Practise coping and communication tools that are appropriate to your circumstances." },
          { title: "Integrate", body: "Notice what is changing and carry useful insight into daily life and relationships." },
        ],
      },
      {
        blockType: "notice",
        heading: "Clear therapeutic boundaries",
        body: [
          "This service is not emergency or crisis care. If you may harm yourself or someone else, or need urgent mental health support, contact local emergency services or an appropriate crisis service now.",
          "The final public wording for professional registration and regulated counselling scope remains subject to client confirmation. The service will not claim protected registration that has not been documented.",
        ],
        tone: "scope",
      },
      {
        blockType: "faq",
        eyebrow: "Common questions",
        heading: "Psycho-Oncology Counselling FAQs",
        items: [
          { question: "Is counselling only for the person with cancer?", answer: "No. Caregivers and family members can also experience significant emotional strain and may seek support for their own needs." },
          { question: "Do I need to be in crisis?", answer: "No. Counselling can be useful for reflection, adjustment and strengthening coping before distress becomes overwhelming." },
          { question: "Can counselling change my medical treatment?", answer: "No. Medical decisions stay with you and your oncology team. Counselling may help you process choices and prepare questions, but it does not provide medical direction." },
          { question: "Are sessions virtual?", answer: "The supplied practice model is virtual, allowing you to join from a private place where you feel comfortable and can speak confidentially." },
        ],
      },
      {
        blockType: "call_to_action",
        heading: "You do not have to hold this alone",
        body: "Review the preparation path for a first counselling conversation and decide what feels right for you.",
        action: { label: "Prepare to book", href: "/book" },
      },
    ],
  },
  {
    slug: "cancer-prevention-coaching",
    title: "Cancer Prevention Coaching",
    description:
      "Practical coaching to turn risk awareness into sustainable habits for long term wellbeing.",
    status: "published",
    sections: [
      {
        blockType: "hero",
        eyebrow: "Cancer Prevention Coaching",
        heading: "Turn health intentions into habits that can last",
        body:
          "Prevention coaching helps you identify personal priorities, understand barriers and build realistic routines with encouragement and accountability.",
        primaryAction: { label: "Prepare to book", href: "/book" },
        secondaryAction: { label: "View pricing", href: "/pricing" },
        image: quietPath,
        aside: "A practical path shaped around your real life.",
        tone: "mist",
      },
      {
        blockType: "editorial_split",
        eyebrow: "Risk awareness without fear",
        heading: "Focus on choices you can influence",
        body: [
          "Cancer risk is complex and no lifestyle can guarantee prevention. Coaching focuses on evidence informed, health supporting behaviours without blame or certainty claims.",
          "Together, we identify the areas that matter most to you, such as nourishment, movement, sleep, alcohol or tobacco use, stress and recommended screening conversations with your healthcare provider.",
        ],
        image: nourishmentStillLife,
        imageSide: "right",
        tone: "white",
      },
      {
        blockType: "feature_list",
        eyebrow: "What prevention coaching can support",
        heading: "Four outcomes for sustainable change",
        tone: "mist",
        layout: "grid",
        items: [
          { title: "Identify priorities", body: "Reflect on personal and family context, existing habits and the areas you want to discuss with your healthcare provider." },
          { title: "Understand barriers", body: "Explore fear, overwhelm, competing demands and the patterns that make change difficult." },
          { title: "Build practical skills", body: "Create strategies, cues and routines that make supportive choices easier to repeat." },
          { title: "Stay accountable", body: "Review progress, adapt the plan and remain connected to why the change matters to you." },
        ],
      },
      {
        blockType: "process",
        eyebrow: "Behaviour change",
        heading: "Change that respects context",
        introduction: "The aim is not perfect behaviour. It is a pattern of choices that becomes more workable over time.",
        steps: [
          { title: "Notice", body: "Understand the current habit, its triggers and what need it may be meeting." },
          { title: "Design", body: "Choose a small alternative and shape the environment to support it." },
          { title: "Repeat", body: "Practise consistently enough to learn what helps, without treating a difficult day as failure." },
          { title: "Adapt", body: "Use feedback, changing circumstances and healthcare guidance to keep the plan relevant." },
        ],
      },
      {
        blockType: "notice",
        heading: "Prevention is never a guarantee",
        body: ["Coaching cannot remove cancer risk and does not provide screening, diagnosis or medical risk assessment. Discuss screening, family history, symptoms and individual risk with an appropriately qualified healthcare professional."],
        tone: "scope",
      },
      {
        blockType: "faq",
        eyebrow: "Common questions",
        heading: "Prevention Coaching FAQs",
        items: [
          { question: "Will coaching tell me my cancer risk?", answer: "No. Individual risk assessment belongs with an appropriately qualified healthcare professional. Coaching can help you prepare questions and act on agreed priorities." },
          { question: "Do I need to change everything at once?", answer: "No. The process is designed around a small number of meaningful changes that can be practised and adapted over time." },
          { question: "Is this a nutrition programme?", answer: "Nutrition may be one area of coaching, but the service is broader and does not replace individual clinical nutrition advice from a registered dietitian." },
        ],
      },
      {
        blockType: "call_to_action",
        heading: "Choose one meaningful place to begin",
        body: "Review the preparation path for a first coaching session and consider the change you most want support with.",
        action: { label: "Prepare to book", href: "/book" },
      },
    ],
  },
  {
    slug: "approach",
    title: "Our Approach",
    description:
      "Explore the whole person frameworks that inform Thrive Through Cancer coaching and counselling.",
    status: "published",
    sections: [
      {
        blockType: "hero",
        eyebrow: "Our approach",
        heading: "Whole person support, grounded in honest scope",
        body:
          "Renny draws from several coaching and wellbeing frameworks to help people reflect, make practical changes and strengthen resilience alongside medical care.",
        primaryAction: { label: "Explore PEMS", href: "/pems-assessment" },
        secondaryAction: { label: "Compare services", href: "/services" },
        image: quietPath,
        aside: "Frameworks for reflection, not formulas for healing.",
        tone: "teal",
      },
      {
        blockType: "editorial_split",
        eyebrow: "Radical Remission",
        heading: "Learning from ten reported healing factors",
        body: [
          "Radical Remission is a concept developed by Dr Kelly Turner after studying people who experienced recovery outside medical projections. Her work identified ten factors commonly reported across those stories.",
          "In coaching, these factors may be used as prompts for reflection and supportive lifestyle conversations. They complement conventional cancer treatment and must not be interpreted as proof that a person can cause or guarantee remission.",
          "The original brief proposed survivor stories. The site does not reproduce or imply endorsements from survivors. Approved external reading can be added to Resources after links and permissions are reviewed.",
        ],
        image: reflectionStillLife,
        imageSide: "right",
        action: { label: "Visit resources", href: "/resources" },
        tone: "white",
      },
      {
        blockType: "feature_list",
        eyebrow: "Functional Medicine coaching",
        heading: "Five modalities that can inform the conversation",
        introduction:
          "These disciplines are used as coaching lenses. They do not turn a coaching session into medical or psychological diagnosis or treatment.",
        tone: "mist",
        layout: "stack",
        items: [
          { title: "Functional Medicine principles", body: "Consider how genetics, environment and lifestyle may shape personal context, while leaving clinical assessment and treatment to the medical team." },
          { title: "Positive psychology and PERMA", body: "Explore Positive Emotion, Engagement, Relationships, Meaning and Accomplishment as dimensions of wellbeing." },
          { title: "Behaviour change science", body: "Use motivation, environment, repetition and feedback to make supportive habits more sustainable." },
          { title: "Neuroscience informed tools", body: "Learn how attention, practice and regulation may support new responses, without making unsupported claims about rewiring disease." },
          { title: "Mind and body practices", body: "Consider breathwork, visualisation, grounding, meditation and carefully framed reflective practices where they feel appropriate." },
        ],
      },
      {
        blockType: "feature_list",
        eyebrow: "PERMA",
        heading: "Five dimensions of wellbeing",
        tone: "cream",
        layout: "gems",
        items: [
          { title: "Positive Emotion", body: "Notice moments of warmth, gratitude, calm or pleasure without demanding constant positivity." },
          { title: "Engagement", body: "Reconnect with absorbing activities that offer interest, skill or a sense of presence." },
          { title: "Relationships", body: "Strengthen connection, communication and the ability to ask for or receive support." },
          { title: "Meaning", body: "Reflect on values, identity and what feels worth carrying forward." },
          { title: "Accomplishment", body: "Recognise effort, progress and goals at a scale that respects current capacity." },
        ],
      },
      {
        blockType: "editorial_split",
        eyebrow: "PEMS Conditioning Gems",
        heading: "A four part lens for personal reflection",
        body: [
          "The client’s proposed flagship tool considers Physical, Emotional, Mental and Spiritual wellbeing through twelve “gems”. It is intended to help people notice strengths and possible areas for support.",
          "The final twelve gem questions, scoring method and personalised feedback rules were not supplied. The current site therefore explains the framework without pretending to provide a validated assessment result.",
        ],
        image: nourishmentStillLife,
        imageSide: "left",
        action: { label: "Explore the PEMS pathway", href: "/pems-assessment" },
        tone: "white",
      },
      {
        blockType: "notice",
        heading: "A complement to oncology and medical care",
        body: ["These frameworks may support wellbeing and reflection. They do not determine prognosis, treat cancer, replace evidence based oncology care or imply that illness reflects a failure of mindset, behaviour or spirituality."],
        tone: "scope",
      },
      {
        blockType: "call_to_action",
        heading: "See how the approach becomes practical",
        body: "Compare the services and choose the type of support that best matches your present needs.",
        action: { label: "Explore services", href: "/services" },
      },
    ],
  },
  {
    slug: "pems-assessment",
    title: "PEMS Introductory Assessment",
    description:
      "A non diagnostic introduction to the Physical, Emotional, Mental and Spiritual PEMS framework.",
    status: "published",
    sections: [
      {
        blockType: "hero",
        eyebrow: "PEMS Conditioning Gems",
        heading: "Notice the whole picture before choosing a next step",
        body:
          "This introductory pathway helps you reflect on Physical, Emotional, Mental and Spiritual wellbeing without collecting health information or producing a clinical score.",
        primaryAction: { label: "Compare services", href: "/services" },
        secondaryAction: { label: "Read our approach", href: "/approach" },
        image: reflectionStillLife,
        aside: "Reflection first. No diagnosis, scoring or stored answers.",
        tone: "mist",
      },
      {
        blockType: "introduction",
        eyebrow: "A carefully scoped introduction",
        heading: "The final assessment is not yet published",
        body: [
          "The source brief describes twelve PEMS Conditioning Gems developed from cancer research, but it does not provide the final questions, scoring logic, evidence notes or personalised feedback rules.",
          "Rather than invent those details, this page offers four private reflection prompts. Nothing is entered, submitted or stored. You can consider the prompts for yourself or bring what feels useful to a future conversation.",
        ],
      },
      {
        blockType: "feature_list",
        eyebrow: "PEMS areas",
        heading: "Four gentle questions for reflection",
        introduction: "You do not need to answer online. Notice only what feels useful and safe.",
        tone: "mist",
        layout: "gems",
        items: [
          { title: "Physical", body: "Which daily routines currently support your energy, comfort, rest and ability to follow medical guidance?" },
          { title: "Emotional", body: "Which feelings have had the least space, and what kind of support would help you meet them safely?" },
          { title: "Mental", body: "Which thoughts, questions or decisions are taking the most attention at the moment?" },
          { title: "Spiritual", body: "What offers meaning, connection, perspective or steadiness for you, whether religious or not?" },
        ],
      },
      {
        blockType: "process",
        eyebrow: "A future supported pathway",
        heading: "How a completed PEMS tool should work",
        introduction: "These steps describe the quality and consent standard for a later version, not a live assessment.",
        steps: [
          { title: "Understand", body: "Read the purpose, limits, consent terms and how any information would be handled." },
          { title: "Reflect", body: "Move through approved questions at your own pace, with an option to stop or skip." },
          { title: "Review", body: "Receive transparent feedback that never claims diagnosis, prognosis or treatment advice." },
          { title: "Choose", body: "Decide whether to keep the reflection private, discuss it in coaching or speak with your medical team." },
        ],
      },
      {
        blockType: "notice",
        heading: "No answers are collected on this page",
        body: ["PEMS is not a diagnostic, prognostic or medical assessment. A future interactive tool requires approved questions, evidence, consent, privacy, retention and deletion rules before any personal information can be accepted."],
        tone: "status",
      },
      {
        blockType: "call_to_action",
        heading: "Talk through the framework with care",
        body: "If PEMS feels relevant, review the services and booking preparation pages before deciding on a conversation.",
        action: { label: "Compare services", href: "/services" },
      },
    ],
  },
  {
    slug: "pricing",
    title: "Pricing",
    description:
      "Transparent session pricing for Thrive Through Cancer coaching and counselling in South African rand.",
    status: "published",
    sections: [
      {
        blockType: "hero",
        eyebrow: "Pricing",
        heading: "Clear fees, with room for a human conversation",
        body:
          "The supplied fees are shown in South African rand. Payment and secure booking will only activate once the operational setup has been completed and tested.",
        primaryAction: { label: "Prepare to book", href: "/book" },
        secondaryAction: { label: "Compare services", href: "/services" },
        image: rennySeated,
        aside: "Transparent starting points for planning support.",
      },
      {
        blockType: "pricing",
        eyebrow: "Session fees",
        heading: "Ways to work together",
        plans: [
          {
            name: "Foundation Session",
            duration: "3 hours",
            price: "R1 785",
            body: "A longer first session for understanding context, clarifying priorities and shaping an initial support plan.",
          },
          {
            name: "Follow Up Session",
            duration: "1 hour",
            price: "R700",
            body: "Ongoing space to review progress, process what is changing and decide on practical next steps.",
          },
          {
            name: "12 Session Package",
            duration: "Structure to be confirmed",
            price: "10% discount",
            body: "The brief confirms a 10% package discount but does not define whether the foundation session is included. The final package total will be published before checkout opens.",
          },
        ],
        notes: [
          "The brief does not confirm VAT treatment. Displayed amounts must be reconfirmed before live payment is enabled.",
          "PayFast remains unavailable unless production credentials, approved legal versions and the secure server integration are all configured.",
        ],
      },
      {
        blockType: "editorial_split",
        eyebrow: "Financial flexibility",
        heading: "Please speak to us if cost is a barrier",
        body: [
          "The client’s intention is to make support more accessible when financial hardship arises during treatment. People who can pay the full fee help create room for those who cannot.",
          "The eligibility, available places and approval process still need to be formalised. No reduced fee is guaranteed until that process is confirmed directly with the practice.",
        ],
        image: reflectionStillLife,
        imageSide: "left",
        tone: "mist",
      },
      {
        blockType: "notice",
        heading: "Payment methods remain carefully controlled",
        body: [
          "When live payment is approved and configured, PayFast hosted checkout is the only online payment route. Credit or debit card details are never entered directly into this website.",
          "The legal pages are published as transparent drafts, but client-specific cancellation, refund, VAT, package and EFT rules still require approval. EFT remains disabled until formal banking and reconciliation instructions are approved.",
        ],
        tone: "status",
      },
      {
        blockType: "call_to_action",
        heading: "Choose the service before the session",
        body: "Compare coaching and counselling, then review what the booking preparation page asks you to consider.",
        action: { label: "Explore services", href: "/services" },
      },
    ],
  },
  {
    slug: "book",
    title: "Book a Session",
    description:
      "Choose an available session and understand each secure booking, payment and calendar confirmation stage.",
    status: "published",
    sections: [
      {
        blockType: "hero",
        eyebrow: "Prepare to book",
        heading: "A calm, private first step",
        body:
          "The secure booking workspace below shows live options only when Supabase, availability and Google Calendar checks are configured. Viewing this page does not reserve or confirm an appointment, and a held time is never presented as confirmed.",
        primaryAction: { label: "Compare services", href: "/services" },
        secondaryAction: { label: "View pricing", href: "/pricing" },
        image: reflectionStillLife,
        aside: "Share contact details, never diagnosis or treatment information.",
        tone: "mist",
      },
      {
        blockType: "process",
        eyebrow: "The secure flow",
        heading: "How booking works",
        introduction: "Each stage fails closed when its required calendar, database, legal or payment configuration is unavailable.",
        steps: [
          { title: "Choose a service", body: "Select health coaching, psycho-oncology counselling or cancer prevention coaching." },
          { title: "Choose a session", body: "Select an available Foundation Session, Follow Up Session or approved package option." },
          { title: "Choose a time", body: "View real availability in Africa/Johannesburg time and hold a suitable calendar slot." },
          { title: "Share contact details", body: "Provide only the minimum needed for the booking, such as name, email and optional telephone number. No diagnosis or treatment details will be requested." },
          { title: "Complete payment", body: "Use PayFast hosted checkout when it is configured. EFT is not offered until approved banking and reconciliation rules are published." },
          { title: "Receive confirmation", body: "A booking is confirmed only after payment and calendar checks succeed. A browser return page alone will never claim success." },
        ],
      },
      {
        blockType: "feature_list",
        eyebrow: "Before your first conversation",
        heading: "A few things you may want to consider",
        tone: "cream",
        layout: "grid",
        items: [
          { title: "What support would help?", body: "Think about whether you want practical habit support, emotional space, or help deciding between the two." },
          { title: "What feels most present?", body: "You do not need to prepare your full health history. A simple sense of what you want from the conversation is enough." },
          { title: "What is your availability?", body: "Available times are shown in Africa/Johannesburg time. Consider the privacy and energy you need around a virtual session." },
          { title: "What questions do you have?", body: "You can ask about scope, session structure, fees and fit before sharing any sensitive information." },
        ],
      },
      {
        blockType: "notice",
        heading: "A hold is not a confirmed appointment",
        body: [
          "The booking workspace asks only for the minimum contact details needed to hold a selected time. It has no health-information field and will not place a hold unless database availability, active consent and Google Calendar checks all succeed.",
          "A booking becomes confirmed only after a valid PayFast server notification for the exact local amount and a successful calendar event. If payment is disabled, the status page says so plainly and no payment is taken.",
        ],
        tone: "status",
      },
      {
        blockType: "call_to_action",
        heading: "Use this time to choose the right service",
        body: "Read the service descriptions and pricing so that the first booking step is clearer when secure scheduling opens.",
        action: { label: "Compare services", href: "/services" },
      },
    ],
  },
  {
    slug: "resources",
    title: "Resources",
    description:
      "Carefully scoped resources for cancer wellbeing, reflection and preparing questions for your healthcare team.",
    status: "published",
    sections: [
      {
        blockType: "hero",
        eyebrow: "Resources",
        heading: "Thoughtful reading for the moments between conversations",
        body:
          "A growing library of practical, carefully reviewed material for reflection, self advocacy, supportive habits and emotional wellbeing.",
        primaryAction: { label: "Explore our approach", href: "/approach" },
        secondaryAction: { label: "Explore our approach", href: "/approach" },
        image: nourishmentStillLife,
        aside: "Clear sources, careful claims and no fabricated survivor stories.",
        tone: "teal",
      },
      {
        blockType: "card_collection",
        eyebrow: "Resource areas",
        heading: "What the library will cover",
        tone: "mist",
        cards: [
          { kicker: "Preparing for care", title: "Questions and self advocacy", body: "Tools for organising questions, making notes and preparing for appointments without replacing medical advice." },
          { kicker: "Daily wellbeing", title: "Supportive routines", body: "Practical reflections on nourishment, movement, sleep, rest and stress that remain aligned with professional medical guidance." },
          { kicker: "Emotional care", title: "Coping and connection", body: "Grounding, communication and reflection resources for people living with cancer and those who care for them." },
          { kicker: "Frameworks", title: "Radical Remission, PERMA and PEMS", body: "Plain language context on the frameworks used by the practice, including their limits and appropriate scope." },
          { kicker: "Prevention", title: "Risk aware habits", body: "Behaviour change resources that support health without promising that lifestyle can eliminate cancer risk." },
          { kicker: "Survivorship", title: "Life after treatment", body: "Careful material on uncertainty, identity, returning to daily life and recognising that recovery is not a simple finish line." },
        ],
      },
      {
        blockType: "editorial_split",
        eyebrow: "Radical Remission reading",
        heading: "Links will be reviewed before publication",
        body: [
          "The source brief asks for more information about Radical Remission and inspiring survivor stories. No unreviewed external link or borrowed story is presented as approved content.",
          "Future entries will name the author, publisher, date, original URL and why the resource is included. Personal stories will never be presented as evidence that a particular approach causes remission.",
        ],
        image: reflectionStillLife,
        imageSide: "right",
        action: { label: "Read the approach overview", href: "/approach" },
        tone: "white",
      },
      {
        blockType: "notice",
        heading: "The resource library is being curated",
        body: [
          "This page is transparent about what is ready. It does not use placeholder links, copied survivor stories or unverified medical claims. Approved sources and downloadable guides can be added through the CMS in a later task.",
          "Resources are educational and never a substitute for personal medical or mental health advice.",
        ],
        tone: "status",
      },
      {
        blockType: "call_to_action",
        heading: "Begin with a service, not a search result",
        body: "If you need personal support, compare coaching and counselling and choose the form of conversation that fits best.",
        action: { label: "Explore services", href: "/services" },
      },
    ],
  },
  ...legalRawPages,
];

const parsedPages: PageContent[] = rawPages.map((page) => pageContentSchema.parse(page));

export const seedPages = new Map<string, PageContent>(
  parsedPages.map((page) => [page.slug, page]),
);
