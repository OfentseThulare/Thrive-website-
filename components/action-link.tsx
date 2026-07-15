import Link from "next/link";

export function ActionLink({
  href,
  label,
  quiet = false,
}: {
  href: string;
  label: string;
  quiet?: boolean;
}) {
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
