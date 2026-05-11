'use client';

import { useEffect, useRef, useState } from 'react';
import { X, CreditCard, Bitcoin, Loader2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  planKey: string;
  planName: string;
  planPrice: string;
}

function PayPalLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M15.5 4H9.5L7 19h3l.6-4h2.4c3.5 0 6-2 6.5-5.5C19.9 6 18 4 15.5 4Z"
        fill="#003087"
      />
      <path
        d="M13.5 6.5H7.5L5 21.5h3l.6-4h2.4c3.5 0 6-2 6.5-5.5.2-1.4 0-2.6-.6-3.5-.8.3-1.8.5-2.9.5-.2 0-.3 0-.5 0Z"
        fill="#0070BA"
      />
    </svg>
  );
}

function LemonSqueezyLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#FFD700" />
      <text x="12" y="16" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#000">LS</text>
    </svg>
  );
}

type Method = {
  id: string;
  label: string;
  subtitle: string;
  renderIcon: () => React.ReactNode;
  endpoint: string;
};

const METHODS: Method[] = [
  {
    id: 'card',
    label: 'Card',
    subtitle: 'Credit or debit card — powered by Lemon Squeezy',
    renderIcon: () => <CreditCard size={22} className="text-accent" strokeWidth={1.7} />,
    endpoint: '/api/checkout',
  },
  {
    id: 'paypal',
    label: 'PayPal',
    subtitle: 'Pay with PayPal balance or linked card',
    renderIcon: () => <PayPalLogo />,
    endpoint: '/api/checkout-paypal',
  },
  {
    id: 'crypto',
    label: 'Crypto',
    subtitle: 'BTC, ETH, USDT, and 200+ coins',
    renderIcon: () => <Bitcoin size={22} className="text-accent" strokeWidth={1.7} />,
    endpoint: '/api/checkout-crypto',
  },
];

export default function PaymentMethodModal({ isOpen, onClose, planKey, planName, planPrice }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setLoading(null);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleSelect(method: Method) {
    setLoading(method.id);
    setError(null);

    try {
      const res = await fetch(method.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Checkout failed. Please try again.');
        setLoading(null);
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(null);
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="relative w-full max-w-md bg-bg-surface border border-border rounded-2xl p-7 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-text-dim hover:text-text transition"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div className="mb-6 pr-8">
          <p className="mono-label mb-2">How would you like to pay?</p>
          <h2 className="text-xl font-bold text-text">{planName} Plan</h2>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="font-mono text-3xl font-bold text-accent">{planPrice}</span>
            <span className="text-text-dim text-sm">/month</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 text-sm text-signal-red border border-signal-red/30 bg-signal-red/5 p-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {METHODS.map((m) => {
            const isLoading = loading === m.id;
            return (
              <button
                key={m.id}
                onClick={() => handleSelect(m)}
                disabled={!!loading}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all
                  border-border bg-bg hover:border-accent/60 hover:bg-bg-elevated active:scale-[0.99]
                  disabled:opacity-60 disabled:cursor-not-allowed
                  ${isLoading ? 'border-accent/40' : ''}
                `}
              >
                <div className="flex-shrink-0 p-2.5 rounded-lg bg-bg-elevated flex items-center justify-center">
                  {m.renderIcon()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-text text-sm">{m.label}</div>
                  <div className="text-text-dim text-xs mt-0.5">{m.subtitle}</div>
                </div>
                {isLoading && (
                  <Loader2 size={16} className="animate-spin text-accent flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        <p className="mt-6 mono-label text-center tracking-wider">
          Secured by Lemon Squeezy, PayPal & NOWPayments · Cancel anytime
        </p>
      </div>
    </div>
  );
}
