import Link from "next/link";

export default function NotFound() {
  return (
    <section className="section not-found">
      <div className="shell narrow">
        <p className="eyebrow">Page not found</p>
        <h1>This page is not available.</h1>
        <p>The page may have moved, or it may not yet be part of the public site.</p>
        <Link className="button" href="/">
          Return home
        </Link>
      </div>
    </section>
  );
}
