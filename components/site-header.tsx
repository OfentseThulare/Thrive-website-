"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";

import { BrandMark } from "./brand-mark";

const primaryLinks = [
  { href: "/about", label: "About Renny" },
  { href: "/services", label: "Services" },
  { href: "/approach", label: "Our approach" },
  { href: "/resources", label: "Resources" },
];

const focusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  const closeMenu = useCallback((restoreFocus = true) => {
    setMenuOpen(false);
    if (restoreFocus) requestAnimationFrame(() => menuButtonRef.current?.focus());
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    document.body.classList.add("mobile-menu-open");
    requestAnimationFrame(() => firstLinkRef.current?.focus());

    const desktopQuery = window.matchMedia("(min-width: 901px)");
    const closeAtDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) closeMenu(false);
    };
    desktopQuery.addEventListener("change", closeAtDesktop);

    return () => {
      document.body.classList.remove("mobile-menu-open");
      desktopQuery.removeEventListener("change", closeAtDesktop);
    };
  }, [closeMenu, menuOpen]);

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      return;
    }

    if (event.key !== "Tab") return;

    const focusableItems = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
    );
    const firstItem = focusableItems.at(0);
    const lastItem = focusableItems.at(-1);

    if (!firstItem || !lastItem) return;

    if (event.shiftKey && document.activeElement === firstItem) {
      event.preventDefault();
      lastItem.focus();
    } else if (!event.shiftKey && document.activeElement === lastItem) {
      event.preventDefault();
      firstItem.focus();
    }
  }

  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link className="brand" href="/" aria-label="Thrive Through Cancer home">
          <BrandMark />
          <span>
            <strong>Thrive Through Cancer</strong>
            <small>by Inheritance Academy</small>
          </span>
        </Link>
        <nav className="site-nav" aria-label="Primary navigation">
          {primaryLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
          <Link className="button button-small" href="/book">
            Book a session
          </Link>
        </nav>
        <button
          ref={menuButtonRef}
          className="menu-toggle"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation-dialog"
          aria-haspopup="dialog"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
      </div>

      <div className="mobile-menu" hidden={!menuOpen}>
        <button
          className="mobile-menu-backdrop"
          type="button"
          tabIndex={-1}
          aria-label="Close navigation menu"
          onClick={() => closeMenu()}
        />
        <div
          ref={dialogRef}
          id="mobile-navigation-dialog"
          className="mobile-menu-dialog"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          onKeyDown={handleDialogKeyDown}
        >
          <div className="mobile-menu-heading">
            <p>Explore Thrive Through Cancer</p>
            <button type="button" aria-label="Close navigation menu" onClick={() => closeMenu()}>
              <span aria-hidden="true">×</span>
            </button>
          </div>
          <nav aria-label="Mobile navigation">
            {primaryLinks.map((link, index) => (
              <Link
                key={link.href}
                ref={index === 0 ? firstLinkRef : undefined}
                href={link.href}
                onClick={() => closeMenu(false)}
              >
                <span>0{index + 1}</span>
                {link.label}
              </Link>
            ))}
            <Link className="button" href="/book" onClick={() => closeMenu(false)}>
              Book a session
            </Link>
          </nav>
          <p className="mobile-menu-note">Virtual cancer coaching and counselling support.</p>
        </div>
      </div>
    </header>
  );
}
