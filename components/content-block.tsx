import Image from "next/image";

import { ActionLink } from "@/components/action-link";
import { ReusableCollectionView } from "@/components/reusable-collection";
import type { ContentBlock } from "@/lib/content/contracts";
import type { ResolvedReusableEntry } from "@/lib/content/reusable";

function toCssPosition(position: "centre" | "top" | "bottom" | "left" | "right") {
  return position === "centre" ? "center" : position;
}

function EditorialImage({
  image,
  sizes = "(max-width: 620px) calc(100vw - 32px), (max-width: 1080px) min(76vw, 580px), 48vw",
}: {
  image: Extract<ContentBlock, { blockType: "editorial_split" }>["image"];
  sizes?: string;
}) {
  if (!image) return null;

  return (
    <figure className="editorial-image">
      <Image
        src={image.src}
        alt={image.alt}
        width={image.width}
        height={image.height}
        sizes={sizes}
        style={{ objectPosition: toCssPosition(image.position) }}
      />
      {image.caption ? <figcaption>{image.caption}</figcaption> : null}
    </figure>
  );
}

export function ContentBlockView({
  block,
  reusableEntries = [],
}: {
  block: ContentBlock;
  reusableEntries?: readonly ResolvedReusableEntry[];
}) {
  switch (block.blockType) {
    case "hero":
      return (
        <section className={`hero hero-${block.tone}`}>
          <div className="shell hero-grid">
            <div className="hero-copy">
              <p className="eyebrow">{block.eyebrow}</p>
              <h1>{block.heading}</h1>
              <p className="hero-lead">{block.body}</p>
              <div className="hero-actions">
                <ActionLink {...block.primaryAction} />
                {block.secondaryAction ? <ActionLink {...block.secondaryAction} quiet /> : null}
              </div>
            </div>
            <figure className="hero-image">
              <Image
                src={block.image.src}
                alt={block.image.alt}
                width={block.image.width}
                height={block.image.height}
                priority
                sizes="(max-width: 620px) 78vw, (max-width: 1080px) min(78vw, 520px), 44vw"
                style={{ objectPosition: toCssPosition(block.image.position) }}
              />
              {block.aside ? <figcaption>{block.aside}</figcaption> : null}
            </figure>
          </div>
        </section>
      );
    case "introduction":
      return (
        <section className={`section intro-section intro-${block.align}`}>
          <div className="shell narrow">
            <p className="eyebrow">{block.eyebrow}</p>
            <h2>{block.heading}</h2>
            {block.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>
      );
    case "card_collection":
      return (
        <section className={`section card-section tone-${block.tone}`}>
          <div className="shell">
            <p className="eyebrow">{block.eyebrow}</p>
            <h2>{block.heading}</h2>
            <div className="card-grid">
              {block.cards.map((card, index) => (
                <article key={card.title} className="content-card">
                  <span aria-hidden="true">0{index + 1}</span>
                  {card.kicker ? <p className="card-kicker">{card.kicker}</p> : null}
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                  {card.link ? <ActionLink {...card.link} quiet /> : null}
                </article>
              ))}
            </div>
          </div>
        </section>
      );
    case "editorial_split":
      return (
        <section className={`section split-section tone-${block.tone}`}>
          <div className={`shell split-grid image-${block.imageSide}`}>
            {block.image ? <EditorialImage image={block.image} /> : null}
            <div className="split-copy">
              <p className="eyebrow">{block.eyebrow}</p>
              <h2>{block.heading}</h2>
              {block.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {block.note ? <p className="editorial-note">{block.note}</p> : null}
              {block.action ? <ActionLink {...block.action} quiet /> : null}
            </div>
          </div>
        </section>
      );
    case "feature_list":
      return (
        <section className={`section feature-section tone-${block.tone}`}>
          <div className="shell">
            <div className="section-heading">
              <p className="eyebrow">{block.eyebrow}</p>
              <h2>{block.heading}</h2>
              {block.introduction ? <p>{block.introduction}</p> : null}
            </div>
            <div className={`feature-list feature-${block.layout}`}>
              {block.items.map((item, index) => (
                <article key={item.title}>
                  <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.body}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      );
    case "process":
      return (
        <section className="section process-section">
          <div className="shell process-grid">
            <div className="process-intro">
              <p className="eyebrow">{block.eyebrow}</p>
              <h2>{block.heading}</h2>
              {block.introduction ? <p>{block.introduction}</p> : null}
            </div>
            <ol className="process-list">
              {block.steps.map((step, index) => (
                <li key={step.title}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      );
    case "comparison":
      return (
        <section className="section comparison-section">
          <div className="shell">
            <div className="section-heading">
              <p className="eyebrow">{block.eyebrow}</p>
              <h2>{block.heading}</h2>
              {block.introduction ? <p>{block.introduction}</p> : null}
            </div>
            <div className="comparison-grid">
              {block.columns.map((column) => (
                <article key={column.title}>
                  <h3>{column.title}</h3>
                  <p>{column.body}</p>
                  <ul>
                    {column.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                  {column.link ? <ActionLink {...column.link} quiet /> : null}
                </article>
              ))}
            </div>
          </div>
        </section>
      );
    case "pricing":
      return (
        <section className="section pricing-section">
          <div className="shell">
            <p className="eyebrow">{block.eyebrow}</p>
            <h2>{block.heading}</h2>
            <div className="pricing-grid">
              {block.plans.map((plan) => (
                <article key={plan.name}>
                  <p className="price-duration">{plan.duration}</p>
                  <h3>{plan.name}</h3>
                  <p className="price">{plan.price}</p>
                  <p>{plan.body}</p>
                </article>
              ))}
            </div>
            <div className="pricing-notes">
              {block.notes.map((note) => (
                <p key={note}>{note}</p>
              ))}
            </div>
          </div>
        </section>
      );
    case "faq":
      return (
        <section className="section faq-section">
          <div className="shell faq-grid">
            <div>
              <p className="eyebrow">{block.eyebrow}</p>
              <h2>{block.heading}</h2>
            </div>
            <div className="faq-list">
              {block.items.map((item, index) => (
                <details key={item.question} open={index === 0}>
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      );
    case "notice":
      return (
        <aside className={`section notice notice-${block.tone}`} aria-label={block.heading}>
          <div className="shell notice-inner">
            <p className="eyebrow">Important context</p>
            <h2>{block.heading}</h2>
            {block.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </aside>
      );
    case "call_to_action":
      return (
        <section className="section cta-section">
          <div className="shell cta-inner">
            <div>
              <p className="eyebrow">A thoughtful next step</p>
              <h2>{block.heading}</h2>
              <p>{block.body}</p>
            </div>
            <ActionLink {...block.action} />
          </div>
        </section>
      );
    case "reusable_collection":
      return <ReusableCollectionView block={block} entries={reusableEntries} />;
  }
}
