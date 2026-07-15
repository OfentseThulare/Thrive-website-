import { ActionLink } from "@/components/action-link";
import type { ContentBlock } from "@/lib/content/contracts";
import type { ResolvedReusableEntry } from "@/lib/content/reusable";

type ReusableCollectionBlock = Extract<ContentBlock, { blockType: "reusable_collection" }>;

function formatEffectiveDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function ReusableEntryView({ entry }: { entry: ResolvedReusableEntry }) {
  switch (entry.entryType) {
    case "faq":
      return (
        <details className="reusable-faq">
          <summary>{entry.content.question}</summary>
          <p>{entry.content.answer}</p>
        </details>
      );
    case "resource":
      return (
        <article className="reusable-card reusable-resource">
          <p className="reusable-kind">Resource</p>
          <h3>{entry.content.title}</h3>
          <p>{entry.content.body}</p>
          {entry.content.href ? <ActionLink href={entry.content.href} label={`Open ${entry.content.title}`} quiet /> : null}
        </article>
      );
    case "credential":
      return (
        <article className="reusable-card reusable-credential">
          <div className="reusable-card-meta">
            <p className="reusable-kind">Credential</p>
            {entry.content.verificationStatus ? (
              <span className={`credential-status status-${entry.content.verificationStatus}`}>
                {entry.content.verificationStatus === "verified" ? "Verified" : "Verification pending"}
              </span>
            ) : null}
          </div>
          <h3>{entry.content.title}</h3>
          {entry.content.issuer ? <p className="credential-issuer">{entry.content.issuer}</p> : null}
          <p>{entry.content.body}</p>
        </article>
      );
    case "testimonial":
      return (
        <figure className="reusable-testimonial">
          <blockquote>
            <p>{entry.content.quote}</p>
          </blockquote>
          <figcaption>{entry.content.attribution}</figcaption>
        </figure>
      );
    case "pricing_note":
      return (
        <aside className="reusable-card reusable-pricing-note" aria-label={entry.content.title}>
          <p className="reusable-kind">Pricing note</p>
          <h3>{entry.content.title}</h3>
          <p>{entry.content.body}</p>
        </aside>
      );
    case "legal_notice":
      return (
        <article className="reusable-legal-notice">
          <p className="reusable-kind">Important information</p>
          <h3>{entry.content.title}</h3>
          {entry.content.effectiveDate ? (
            <p className="legal-effective-date">
              Effective from <time dateTime={entry.content.effectiveDate}>{formatEffectiveDate(entry.content.effectiveDate)}</time>
            </p>
          ) : null}
          {entry.content.body.map((paragraph, index) => <p key={`${entry.key}-${index}`}>{paragraph}</p>)}
        </article>
      );
    case "service":
      return (
        <article className="reusable-card reusable-service">
          <p className="reusable-kind">Service</p>
          <h3>{entry.content.title}</h3>
          <p>{entry.content.body}</p>
          {entry.content.href ? <ActionLink href={entry.content.href} label={`Explore ${entry.content.title}`} quiet /> : null}
        </article>
      );
    case "pricing":
      return (
        <article className="reusable-card reusable-price-card">
          <p className="price-duration">{entry.content.duration}</p>
          <h3>{entry.content.title}</h3>
          <p className="price">{entry.content.price}</p>
          <p>{entry.content.body}</p>
        </article>
      );
  }
}

export function ReusableCollectionView({
  block,
  entries,
}: {
  block: ReusableCollectionBlock;
  entries: readonly ResolvedReusableEntry[];
}) {
  if (entries.length === 0) return null;

  return (
    <section className={`section reusable-section tone-${block.tone}`}>
      <div className="shell">
        <div className="section-heading">
          {block.eyebrow ? <p className="eyebrow">{block.eyebrow}</p> : null}
          <h2>{block.heading}</h2>
          {block.introduction ? <p>{block.introduction}</p> : null}
        </div>
        <div className={`reusable-grid reusable-grid-${block.entryType}`}>
          {entries.map((entry) => <ReusableEntryView key={entry.key} entry={entry} />)}
        </div>
      </div>
    </section>
  );
}
