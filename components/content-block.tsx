import Image from "next/image";
import Link from "next/link";

import type { ContentBlock } from "@/lib/content/contracts";

function ActionLink({ href, label, quiet = false }: { href: string; label: string; quiet?: boolean }) {
  const className = quiet ? "text-link" : "button";
  const content = (
    <>
      {label}
      <span aria-hidden="true">↗</span>
    </>
  );

  if (!href.startsWith("/")) {
    return (
      <a className={className} href={href} rel={href.startsWith("http") ? "noreferrer" : undefined}>
        {content}
      </a>
    );
  }

  return (
    <Link className={className} href={href}>
      {content}
    </Link>
  );
}

export function ContentBlockView({ block }: { block: ContentBlock }) {
  switch (block.blockType) {
    case "hero":
      return (
        <section className="hero">
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
            <div className="hero-image">
              <Image
                src={block.image.src}
                alt={block.image.alt}
                width={block.image.width}
                height={block.image.height}
                priority
                sizes="(max-width: 760px) 88vw, 44vw"
              />
              <p>Whole person care, thoughtfully guided.</p>
            </div>
          </div>
        </section>
      );
    case "introduction":
      return (
        <section className="section intro-section">
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
        <section className="section card-section">
          <div className="shell">
            <p className="eyebrow">{block.eyebrow}</p>
            <h2>{block.heading}</h2>
            <div className="card-grid">
              {block.cards.map((card, index) => (
                <article key={card.title} className="content-card">
                  <span>0{index + 1}</span>
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                  {card.link ? <ActionLink {...card.link} quiet /> : null}
                </article>
              ))}
            </div>
          </div>
        </section>
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
  }
}
