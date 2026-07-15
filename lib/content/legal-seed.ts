import type { PageContentInput } from "./contracts.ts";

const lastUpdated = "Last updated 15/07/2026. This draft must be approved with the practice specific facts before live payment is enabled.";

export const legalRawPages: PageContentInput[] = [
  {
    slug: "privacy", title: "Privacy notice",
    description: "How Thrive Through Cancer proposes to collect, use, protect and manage personal information for website visits, bookings and payments.",
    status: "published", sections: [
      { blockType: "introduction", eyebrow: "Privacy notice", heading: "Your information should be handled with care and restraint", body: [lastUpdated, "The responsible party’s full legal name, physical address, privacy contact and Information Officer details are pending practice confirmation. Until those facts are approved and published, this notice is a transparent operational draft and live payment must remain disabled."], align: "left" },
      { blockType: "feature_list", eyebrow: "What is handled", heading: "Information, purposes and limits", layout: "stack", tone: "white", items: [
        { title: "Website and security data", body: "Technical request data, security logs, device or browser information and consent records may be used to operate, protect and diagnose the service. Retention will be limited by legal, security and operational need." },
        { title: "Booking details", body: "A booking asks only for name, email address, optional telephone number, chosen service and time. The booking form has no health-information field. Please do not enter diagnoses, treatment, symptoms or other special personal information." },
        { title: "Payment and appointment data", body: "The local record keeps a ZAR amount snapshot, merchant payment reference, payment status, hashed webhook receipt and audit events. Card details are entered on PayFast and are not collected by this website. Google Calendar receives appointment timing and a non-health booking reference." },
        { title: "Purposes and lawful handling", body: "Information is used to respond, hold and confirm a booking, reconcile payment, create the calendar appointment, keep appropriate records, prevent misuse and meet applicable obligations. A specific lawful justification must be confirmed for each production purpose." },
        { title: "Processors and cross-border handling", body: "Proposed providers are Vercel for hosting, Supabase for database and authentication, Google Calendar for scheduling, and PayFast for hosted payment. Their service locations and safeguards may involve cross-border processing and must be reviewed before launch." },
        { title: "Retention and safeguards", body: "Retention periods will be based on legal duties, financial records, dispute needs, security and the purpose for collection. Proposed safeguards include least-privilege access, multi-factor controls, encrypted transport, private booking tokens, row-level policies, immutable audit events and minimised logs." },
        { title: "Your choices and rights", body: "Subject to applicable law, you may ask for access, correction or deletion; object to or restrict certain processing; withdraw consent where consent is relied on; and complain. Withdrawal does not undo lawful handling already completed." },
        { title: "Marketing and minors", body: "Marketing consent is separate from booking consent and is not requested in this flow. The intended approach to children and guardian consent is pending practice confirmation; bookings for minors must remain outside the live scope until approved." },
      ] },
      { blockType: "notice", heading: "Special personal information needs extra care", body: ["Cancer-related information may be special personal information under POPIA. Do not submit it through the booking, payment, CMS or calendar fields. Any future clinical or counselling records require a separately approved purpose, system, access model, retention rule and notice.", "The Information Regulator South Africa publishes current contact and complaint channels at https://inforegulator.org.za. Its published head office is JD House, 27 Stiemens Street, Braamfontein, Johannesburg, and its complaints email is POPIAComplaints@inforegulator.org.za. Confirm these details against the official site before launch."], tone: "verification" },
      { blockType: "call_to_action", heading: "Questions should reach a named person", body: "The practice must approve and publish a responsible party, Information Officer and privacy contact before launch.", action: { label: "Review booking information", href: "/book" } },
    ],
  },
  {
    slug: "terms", title: "Website and booking terms",
    description: "Plain-language draft terms for the Thrive Through Cancer website, coaching and counselling booking journey.",
    status: "published", sections: [
      { blockType: "introduction", eyebrow: "Terms", heading: "Clear expectations before a session is booked", body: [lastUpdated, "The legal contracting entity, service address, contact details, VAT status and any professional registration facts are pending practice confirmation. These terms preserve rights under South African law and should receive legal review before live payment."], align: "left" },
      { blockType: "feature_list", eyebrow: "Using the service", heading: "How the proposed booking journey works", layout: "stack", tone: "cream", items: [
        { title: "Service scope", body: "Thrive Through Cancer proposes virtual coaching and psycho-oncology support within the practitioner’s confirmed training and lawful scope. The exact legal provider and any regulated scope must be approved before launch." },
        { title: "Review and correct", body: "Before payment, review the service, Johannesburg appointment time and ZAR total. Return to the booking flow to correct a selection. Contact and correction channels are pending practice confirmation." },
        { title: "When a booking binds", body: "A calendar hold is temporary. A booking is formed only after PayFast sends a valid server notification for the exact local amount and reference, and the appointment is successfully confirmed in the practice calendar. A browser return page alone is never proof of payment." },
        { title: "Prices, ZAR and VAT", body: "Prices are recorded in South African rand. Whether displayed prices include VAT, and whether VAT applies, is pending practice confirmation. No different amount may be substituted by the browser." },
        { title: "Technology and third parties", body: "Availability depends on internet, Vercel, Supabase, Google Calendar and PayFast services. Reasonable efforts will be made to keep records consistent, but third-party availability cannot be guaranteed." },
        { title: "Respectful conduct", body: "Clients and the practice should communicate respectfully, protect access links and avoid entering health details into booking, payment or calendar metadata. Unlawful, abusive or unsafe conduct may result in a session being declined, subject to applicable rights." },
        { title: "Consumer rights remain", body: "Nothing here excludes rights or remedies that cannot lawfully be excluded under the Consumer Protection Act, Electronic Communications and Transactions Act, POPIA or other applicable South African law." },
      ] },
      { blockType: "notice", heading: "Practice facts and legal review are still required", body: ["Live payment must not be enabled until the provider identity, contact route, VAT position, delivery model, complaint process, cancellation rules and early-performance approach are approved."], tone: "verification" },
      { blockType: "call_to_action", heading: "Understand the support before paying", body: "Review service boundaries and the medical disclaimer before choosing a session.", action: { label: "Read the medical disclaimer", href: "/medical-disclaimer" } },
    ],
  },
  {
    slug: "cancellation-refunds", title: "Cancellation and refund policy",
    description: "Draft cancellation, rescheduling and refund principles for Thrive Through Cancer bookings, pending practice approval.",
    status: "published", sections: [
      { blockType: "introduction", eyebrow: "Cancellations and refunds", heading: "Fair rules need to be approved before payment opens", body: [lastUpdated, "The cancellation method, notice periods, reasonable charges, no-show rules, rescheduling limits, refund timing and support contact are all pending practice confirmation. There is no blanket non-refundable term."], align: "left" },
      { blockType: "feature_list", eyebrow: "Proposed principles", heading: "What the final policy must cover", layout: "stack", tone: "white", items: [
        { title: "Client cancellation and rescheduling", body: "The final policy must state a usable cancellation channel, cut-off times and any reasonable charge. Charges must reflect applicable law and the circumstances, not operate as an automatic forfeiture." },
        { title: "Death, hospitalisation and serious disruption", body: "The source notes an exception for death or hospitalisation. The evidence, discretion and refund or reschedule outcome require humane, privacy-conscious wording and practice approval." },
        { title: "No-shows and late arrival", body: "No-show and late-arrival consequences, including whether a shorter session can proceed, remain pending. They must be clear before checkout and applied consistently." },
        { title: "Practice cancellation", body: "If the practitioner cannot provide the session, the final rule should offer a reasonable reschedule or refund and explain the communication process." },
        { title: "Duplicate or incorrect payment", body: "Verified duplicate payments or an incorrect local charge should be reconciled through finance records and PayFast. Refunds are not marked complete until the provider operation is verified." },
        { title: "ECTA cooling-off review", body: "ECTA may provide a seven-day cancellation right for certain electronic service transactions, with an exception where performance begins with the consumer’s consent before that period ends. Applicability, the timing of sessions and an explicit early-performance request require South African legal review." },
        { title: "Direct marketing", body: "Any cancellation or cooling-off rights arising from direct marketing under the Consumer Protection Act remain preserved. Marketing consent is separate and is not bundled into booking." },
      ] },
      { blockType: "notice", heading: "No refund promise is activated by this draft", body: ["Until the practice approves the operational rules and contact method, EFT and live PayFast payment must remain disabled. Staff should not invent a refund outcome outside a documented, auditable process."], tone: "status" },
      { blockType: "call_to_action", heading: "Review the complete booking terms", body: "The terms explain when a hold becomes a confirmed appointment.", action: { label: "Read the terms", href: "/terms" } },
    ],
  },
  {
    slug: "medical-disclaimer", title: "Medical disclaimer",
    description: "Important scope and safety information for Thrive Through Cancer coaching and psycho-oncology support.",
    status: "published", sections: [
      { blockType: "introduction", eyebrow: "Medical disclaimer", heading: "Support alongside care, never instead of it", body: [lastUpdated, "Thrive Through Cancer describes coaching and supportive conversations. It is not an emergency service and does not diagnose cancer, prescribe or change treatment, or replace an oncologist, doctor or appropriately qualified mental health professional."], align: "left" },
      { blockType: "feature_list", eyebrow: "Important boundaries", heading: "Keep medical decisions with your healthcare team", layout: "stack", tone: "cream", items: [
        { title: "No diagnosis or treatment", body: "Website content, coaching frameworks and sessions are educational and supportive. They are not medical advice, diagnosis, treatment, psychotherapy or psychological care unless a specific qualified and lawful scope is confirmed in writing." },
        { title: "Do not delay or change care", body: "Do not stop, delay or change medicines, tests, oncology care, nutrition plans or mental health care because of website content or a coaching conversation. Discuss treatment decisions with the relevant registered professional." },
        { title: "No guaranteed outcome", body: "No framework, habit, session, resource or testimonial can promise prevention, remission, recovery or a particular wellbeing outcome. Individual experiences are not clinical evidence and results vary." },
        { title: "Referral and limits", body: "If a need falls outside the practitioner’s confirmed competence or scope, the appropriate response is to pause, refer or encourage contact with a suitable healthcare professional." },
        { title: "Urgent and emergency needs", body: "This service is not monitored for emergencies. Practice-approved South African emergency and urgent mental-health instructions are still required before launch; no unverified number is invented here. If there is immediate danger, use an appropriate local emergency service or go to the nearest emergency facility." },
      ] },
      { blockType: "notice", heading: "Urgent-care facts require approval", body: ["The practice must approve crisis boundaries, monitored contact hours, local emergency wording and referral arrangements before the booking service is promoted. The booking form must never be used to request urgent help."], tone: "verification" },
      { blockType: "call_to_action", heading: "Choose support with clear expectations", body: "Compare the coaching and counselling descriptions before booking.", action: { label: "Explore services", href: "/services" } },
    ],
  },
];
