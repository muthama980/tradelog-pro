'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

const LS_KEY = 'tradelog_onboarding_complete';

interface Step {
  target: string | null;
  title: string;
  body: string;
  cta?: string;
}

const STEPS: Step[] = [
  {
    target: null,
    title: 'Welcome to TradeLog Pro',
    body: "Let's take a quick tour of your trading dashboard. This will only take a minute.",
    cta: "Let's go",
  },
  {
    target: 'sidebar',
    title: 'Your Navigation',
    body: 'Use the sidebar to switch between your Journal, Analytics, AI Coach, Connections, and Settings. Everything you need is one click away.',
  },
  {
    target: 'journal',
    title: 'Trade Journal',
    body: 'This is where you log every trade. Add your entry/exit, tag your strategy, emotion, and mistakes. The more detail you add, the better your analytics and AI coaching will be.',
  },
  {
    target: 'analytics',
    title: 'Analytics Dashboard',
    body: 'See your performance broken down by strategy, emotion, session, and more. Your equity curve, win rate, profit factor — all calculated automatically from your journal.',
  },
  {
    target: 'connections',
    title: 'Connect Your Accounts',
    body: 'Import trades automatically from Binance, Coinbase, Kraken, or OKX via API. Or upload CSV files from MetaTrader, Bybit, and other platforms.',
  },
  {
    target: 'coach',
    title: 'AI Trading Coach',
    body: 'Get weekly AI-powered insights about your trading patterns, emotional tendencies, and strategy performance. Available on the Pro plan.',
  },
  {
    target: null,
    title: "You're ready to trade smarter",
    body: 'Start by logging your first trade in the Journal, or connect an exchange to import your history. You can always revisit this tour from the Help Center.',
    cta: 'Start Trading',
  },
];

interface Rect { left: number; top: number; width: number; height: number; }

function getVisibleRect(selector: string): Rect | null {
  const els = document.querySelectorAll<HTMLElement>(`[data-tour="${selector}"]`);
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.left >= 0 && r.top >= 0) {
      return { left: r.left, top: r.top, width: r.width, height: r.height };
    }
  }
  return null;
}

export default function OnboardingTour() {
  const router = useRouter();
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [visible, setVisible] = useState(false);

  const complete = useCallback(() => {
    localStorage.setItem(LS_KEY, 'true');
    setActive(false);
  }, []);

  const startTour = useCallback(() => {
    setStep(0);
    setActive(true);
  }, []);

  // Check localStorage on mount
  useEffect(() => {
    if (localStorage.getItem(LS_KEY) !== 'true') {
      // Small delay so sidebar elements are rendered
      const t = setTimeout(() => setActive(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  // Listen for restart event from Help Center
  useEffect(() => {
    const handler = () => startTour();
    window.addEventListener('tradelog:restart-tour', handler);
    return () => window.removeEventListener('tradelog:restart-tour', handler);
  }, [startTour]);

  // Update rect when step or active changes
  useEffect(() => {
    if (!active) return;
    const target = STEPS[step]?.target;
    if (!target) {
      setRect(null);
      return;
    }
    const update = () => setRect(getVisibleRect(target));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [active, step]);

  // Fade animation between steps
  useEffect(() => {
    if (!active) return;
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, [active, step]);

  if (!active) return null;

  const current = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;
  const PAD = 8; // spotlight padding around element

  function goNext() {
    if (isLast) {
      complete();
      router.push('/dashboard/journal');
    } else {
      setStep(s => s + 1);
    }
  }

  function goBack() {
    if (!isFirst) setStep(s => s - 1);
  }

  // ── Tooltip positioning ──────────────────────────────────────────────────────

  let tooltipStyle: React.CSSProperties;

  if (!rect) {
    // Centered modal for steps with no target
    tooltipStyle = {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '100%',
      maxWidth: 400,
    };
  } else {
    // Position to the right of the highlighted element; fall back to below on narrow screens
    const tooltipW = 340;
    const tooltipH = 220;
    const rightSpace = window.innerWidth - (rect.left + rect.width + PAD);
    const placeRight = rightSpace >= tooltipW + 24;

    if (placeRight) {
      const rawTop = rect.top + rect.height / 2 - tooltipH / 2;
      const clampedTop = Math.max(16, Math.min(rawTop, window.innerHeight - tooltipH - 16));
      tooltipStyle = {
        position: 'fixed',
        top: clampedTop,
        left: rect.left + rect.width + PAD + 16,
        width: tooltipW,
      };
    } else {
      // Place below
      const rawLeft = rect.left + rect.width / 2 - tooltipW / 2;
      const clampedLeft = Math.max(16, Math.min(rawLeft, window.innerWidth - tooltipW - 16));
      tooltipStyle = {
        position: 'fixed',
        top: Math.min(rect.top + rect.height + PAD + 12, window.innerHeight - tooltipH - 16),
        left: clampedLeft,
        width: tooltipW,
      };
    }
  }

  return (
    <>
      {/* Dark overlay with spotlight cutout */}
      <svg
        className="fixed inset-0 pointer-events-none"
        style={{ width: '100vw', height: '100vh', zIndex: 49 }}
      >
        <defs>
          <mask id="tour-spotlight" maskUnits="userSpaceOnUse">
            <rect x="0" y="0" width="9999" height="9999" fill="white" />
            {rect && (
              <rect
                x={rect.left - PAD}
                y={rect.top - PAD}
                width={rect.width + PAD * 2}
                height={rect.height + PAD * 2}
                rx="10"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0" y="0" width="9999" height="9999"
          fill="rgba(10,10,11,0.82)"
          mask="url(#tour-spotlight)"
        />
      </svg>

      {/* Click-blocker (prevents background interactions, passes through to tooltip) */}
      <div className="fixed inset-0" style={{ zIndex: 49 }} aria-hidden />

      {/* Glow border around highlighted element */}
      {rect && (
        <div
          className="fixed pointer-events-none rounded-xl"
          style={{
            zIndex: 50,
            left: rect.left - PAD,
            top: rect.top - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: '0 0 0 2px rgba(0,217,255,0.5), 0 0 20px rgba(0,217,255,0.2)',
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        style={{
          ...tooltipStyle,
          zIndex: 51,
          opacity: visible ? 1 : 0,
          transform: tooltipStyle.transform
            ? `${tooltipStyle.transform} translateY(${visible ? '0px' : '10px'})`
            : `translateY(${visible ? '0px' : '10px'})`,
          transition: 'opacity 0.25s ease, transform 0.25s ease',
        }}
      >
        <div className="card rounded-xl p-6 shadow-2xl" style={{ background: 'var(--bg-surface)' }}>
          {/* Close / skip */}
          <button
            onClick={complete}
            className="absolute top-4 right-4 text-text-dim hover:text-text transition-colors"
            aria-label="Skip tour"
          >
            <X size={15} />
          </button>

          {/* Title */}
          <p className="font-semibold text-text text-base pr-6 mb-2">{current.title}</p>
          <p className="text-text-muted text-sm leading-relaxed mb-5">{current.body}</p>

          {/* Step dots */}
          <div className="flex items-center gap-1.5 mb-5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all"
                style={{
                  width: i === step ? 16 : 6,
                  height: 6,
                  background: i === step ? '#00D9FF' : 'var(--border-strong)',
                }}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3">
            {!isFirst && (
              <button onClick={goBack} className="btn-secondary text-sm px-4">
                Back
              </button>
            )}
            <button onClick={goNext} className="btn-primary text-sm flex-1 justify-center">
              {current.cta ?? (isLast ? 'Start Trading' : 'Next')}
            </button>
          </div>

          {/* Skip link (first step only) */}
          {isFirst && (
            <div className="mt-3 text-center">
              <button
                onClick={complete}
                className="text-xs text-text-dim hover:text-text-muted transition-colors"
              >
                Skip tour
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
