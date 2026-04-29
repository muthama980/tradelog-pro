'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { href: '/#features',   label: 'Product' },
    { href: '/pricing',     label: 'Pricing' },
    { href: '/coach',       label: 'AI Coach' },
    { href: '/blog',        label: 'Blog' },
    { href: '/quotes',      label: 'Daily Edge' },
  ];

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-bg/90 backdrop-blur-xl border-b border-border'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 bg-accent rounded-[4px] flex items-center justify-center shrink-0">
            <span className="font-mono text-[11px] font-black text-bg tracking-[-0.05em]">TLP</span>
          </div>
          <span className="font-sans font-bold text-base text-text tracking-tight">
            TradeLog<span className="text-accent">Pro</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-7">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="nav-link font-mono text-[11px] uppercase tracking-widest text-text-muted hover:text-text transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Auth CTAs */}
        <div className="hidden lg:flex items-center gap-3">
          <Link href="/login" className="font-mono text-[11px] uppercase tracking-widest text-text-dim hover:text-text-muted transition px-3 py-2">
            Sign in
          </Link>
          <Link href="/signup" className="btn-primary text-sm">
            Start free trial
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="lg:hidden text-text p-2"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-border bg-bg-surface/95 backdrop-blur-xl">
          <nav className="px-6 py-6 flex flex-col gap-4">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="font-mono text-[11px] uppercase tracking-widest text-text-muted hover:text-text py-2 transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <div className="divider my-2" />
            <Link href="/login" className="text-text-dim py-2 font-mono text-[11px] uppercase tracking-widest" onClick={() => setMobileOpen(false)}>
              Sign in
            </Link>
            <Link href="/signup" className="btn-primary w-full justify-center" onClick={() => setMobileOpen(false)}>
              Start free trial
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
