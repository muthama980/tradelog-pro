'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ChevronDown, ChevronRight, SearchX, HelpCircle, BookOpen,
  Plug, BarChart3, Brain, CreditCard, PlayCircle, MessageCircle,
} from 'lucide-react';

// ─── Data ─────────────────────────────────────────────────────────────────────

interface HelpItem { q: string; a: string; }
interface HelpSection { id: string; title: string; icon: React.ElementType; items: HelpItem[]; }

const SECTIONS: HelpSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: PlayCircle,
    items: [
      {
        q: 'How do I log my first trade?',
        a: 'Go to Journal in the sidebar. Click "Add Trade". Fill in the symbol, direction (long/short), entry price, position size, and any notes. Click Save. You can also tag your strategy, emotion, and any mistakes for deeper analytics later.',
      },
      {
        q: 'What happens during my free trial?',
        a: 'You get full access to all Core features for 4 days, no credit card required. When your trial ends, you\'ll be prompted to subscribe to continue using the dashboard.',
      },
      {
        q: 'How do I upgrade my plan?',
        a: 'Go to Settings in the sidebar, then click the Billing section. You can upgrade to Core ($19/mo), Pro ($25/mo), or Elite ($40/mo when available). We accept cards via Lemon Squeezy, PayPal, and crypto payments.',
      },
    ],
  },
  {
    id: 'journal',
    title: 'Trade Journal',
    icon: BookOpen,
    items: [
      {
        q: 'How do I edit or delete a trade?',
        a: 'In the Journal page, click on any trade row to expand it. You\'ll see Edit and Delete buttons. You can also select multiple trades using the checkboxes and use Bulk Delete.',
      },
      {
        q: 'What are strategy tags?',
        a: 'Strategy tags let you label each trade with the setup you used (e.g. breakout, mean-reversion, scalp, trend-follow). The Analytics page then shows your P&L broken down by strategy so you can see which setups actually make money.',
      },
      {
        q: 'What are emotion tags?',
        a: 'Before or after each trade, tag your emotional state (e.g. confident, fearful, FOMO, revenge, calm). Analytics will reveal which emotional states correlate with your best and worst trades.',
      },
      {
        q: 'What are mistake tags?',
        a: 'Tag common errors like "moved stop loss", "oversized", "no setup", "revenge trade". Over time you\'ll see exactly which mistakes cost you the most money.',
      },
      {
        q: 'What are trading sessions?',
        a: 'Sessions group your trades by time window: Asian, London, New York, or custom. Session analytics show which trading windows are most profitable for you.',
      },
    ],
  },
  {
    id: 'connections',
    title: 'Connections & Imports',
    icon: Plug,
    items: [
      {
        q: 'How do I connect my Binance account?',
        a: 'Go to Connections in the sidebar. Select Crypto, then click Binance API. Follow the on-screen instructions to create a read-only API key on Binance, then paste your API Key and Secret Key. We only request read access — we cannot trade or withdraw from your account.',
      },
      {
        q: 'How do I import trades from a CSV?',
        a: 'Go to Connections, select your market (Crypto, Forex, Stocks, or Futures), then choose the CSV Import option. Drag and drop your file or click to browse. We support Binance, Bybit, and MetaTrader CSV formats. You\'ll see a preview before confirming the import.',
      },
      {
        q: 'How do I connect my MT4/MT5 broker?',
        a: 'Go to Connections, select Forex (or Stocks/Futures). Choose "Connect Broker" and select your broker (Exness, XM, IC Markets, etc.). Enter your account number, select your broker server, and connect. Trade sync is being rolled out — you\'ll be notified when auto-sync is live for your broker.',
      },
      {
        q: 'Which exchanges and brokers are supported?',
        a: 'Crypto: Binance, Coinbase, Kraken, OKX (API + CSV). Forex/Stocks/Futures: MetaTrader 4/5 CSV import, plus broker connections for Exness, XM, Vantage, WinPro, IC Markets, Pepperstone, FXTM, Deriv, FBS. More coming soon.',
      },
    ],
  },
  {
    id: 'analytics',
    title: 'Analytics',
    icon: BarChart3,
    items: [
      {
        q: 'How do I read my analytics?',
        a: 'The Analytics page shows your trading performance across multiple dimensions: P&L over time (equity curve), win rate, profit factor, average win vs average loss, and breakdowns by strategy, emotion, mistake, and session. The more trades you log, the more accurate and useful your analytics become.',
      },
      {
        q: 'Why is my analytics page empty?',
        a: 'Analytics require at least a few trades to display meaningful data. Log 5–10 trades with strategy and emotion tags to start seeing patterns.',
      },
    ],
  },
  {
    id: 'ai-coach',
    title: 'AI Coach',
    icon: Brain,
    items: [
      {
        q: 'What is the AI Coach?',
        a: 'The AI Coach analyzes your trading journal data weekly and provides personalized insights: patterns in your winning and losing trades, emotional tendencies, strategy performance, and specific recommendations to improve. Available on the Pro plan ($25/mo).',
      },
      {
        q: 'How often does the AI Coach update?',
        a: 'The coach generates a new weekly report every Monday based on your recent trading activity. The more consistently you journal, the better the insights.',
      },
    ],
  },
  {
    id: 'billing',
    title: 'Account & Billing',
    icon: CreditCard,
    items: [
      {
        q: 'How do I change my password?',
        a: 'Go to Settings in the sidebar. Under the Account section you can update your password.',
      },
      {
        q: 'How do I cancel my subscription?',
        a: 'Go to Settings > Billing. You can manage or cancel your subscription through the Lemon Squeezy customer portal. Your access continues until the end of your current billing period.',
      },
      {
        q: 'What payment methods do you accept?',
        a: 'We accept credit/debit cards (via Lemon Squeezy), PayPal, and cryptocurrency payments.',
      },
    ],
  },
];

// ─── Component ─────────────────────────────────────────────────────────────────

export default function HelpPage() {
  const [search, setSearch] = useState('');
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [openItem, setOpenItem] = useState<string | null>(null);

  const query = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!query) return null;
    return SECTIONS.map(section => ({
      ...section,
      items: section.items.filter(
        item =>
          item.q.toLowerCase().includes(query) ||
          item.a.toLowerCase().includes(query)
      ),
    })).filter(section => section.items.length > 0);
  }, [query]);

  function toggleSection(id: string) {
    setOpenSection(prev => (prev === id ? null : id));
    setOpenItem(null);
  }

  function toggleItem(key: string) {
    setOpenItem(prev => (prev === key ? null : key));
  }

  function handleStartTour() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tradelog_onboarding_complete');
      window.dispatchEvent(new CustomEvent('tradelog:restart-tour'));
    }
  }

  const displaySections = filtered ?? SECTIONS;
  const isSearching = query.length > 0;
  const noResults = isSearching && displaySections.length === 0;

  function renderItem(sectionId: string, item: HelpItem, index: number) {
    const key = `${sectionId}-${index}`;
    const isOpen = isSearching || openItem === key;
    const isMatch = isSearching;

    return (
      <div
        key={key}
        className={`border-b border-border last:border-0 ${isMatch ? 'border-l-2 border-l-accent/40' : ''}`}
      >
        <button
          onClick={() => !isSearching && toggleItem(key)}
          className={`w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors ${
            isSearching ? 'cursor-default' : 'hover:bg-bg-elevated/50'
          }`}
        >
          <ChevronRight
            size={14}
            className={`shrink-0 mt-0.5 transition-transform text-accent ${isOpen ? 'rotate-90' : ''}`}
          />
          <span className="font-medium text-text text-sm flex-1">{item.q}</span>
        </button>
        {isOpen && (
          <div className="px-4 pb-4 pl-11">
            <p className="text-text-muted text-sm leading-relaxed">{item.a}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-8 md:p-10 max-w-3xl">

      {/* Header */}
      <div className="mb-8">
        <p className="mono-label mb-2">Help Center</p>
        <h1 className="text-3xl font-bold text-text tracking-tight">Help Center</h1>
        <p className="text-text-muted mt-2 text-sm">
          Everything you need to get the most out of TradeLog Pro.
        </p>
      </div>

      {/* Start Tour card */}
      <div className="card rounded-xl p-5 mb-6 flex items-center gap-4"
        style={{ borderLeft: '3px solid #00D9FF' }}>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'rgba(0,217,255,0.1)', border: '1px solid rgba(0,217,255,0.2)' }}>
          <HelpCircle size={18} className="text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-text text-sm">Take the Tour</p>
          <p className="text-text-muted text-xs mt-0.5">
            New here? Take a quick guided tour of TradeLog Pro&apos;s features.
          </p>
        </div>
        <button onClick={handleStartTour} className="btn-primary text-sm whitespace-nowrap">
          Start Tour
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search help articles…"
          className="form-input pl-4 text-sm"
        />
      </div>

      {/* No results */}
      {noResults && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <SearchX size={28} className="text-text-dim" />
          <p className="text-text-muted text-sm">
            No results found. Try a different search term.
          </p>
        </div>
      )}

      {/* Sections */}
      {!noResults && (
        <div className="space-y-3">
          {displaySections.map(section => {
            const Icon = section.icon;
            const isExpanded = isSearching || openSection === section.id;

            return (
              <div key={section.id} className="card rounded-xl overflow-hidden">
                {/* Section header */}
                <button
                  onClick={() => !isSearching && toggleSection(section.id)}
                  className={`w-full flex items-center gap-3 px-5 py-4 text-left transition-colors ${
                    isSearching ? 'cursor-default' : 'hover:bg-bg-elevated'
                  } ${isExpanded ? 'bg-bg-elevated/60' : ''}`}
                >
                  <Icon size={16} className="text-accent shrink-0" strokeWidth={1.7} />
                  <span className="font-semibold text-text text-sm flex-1">{section.title}</span>
                  {!isSearching && (
                    <ChevronDown
                      size={15}
                      className={`text-text-dim transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  )}
                </button>

                {/* Items */}
                {isExpanded && (
                  <div className="border-t border-border">
                    {section.items.map((item, i) => renderItem(section.id, item, i))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Contact card */}
      <div className="card rounded-xl p-5 mt-8 flex items-center gap-4"
        style={{ borderLeft: '3px solid rgba(0,217,255,0.35)' }}>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-bg-elevated border border-border">
          <MessageCircle size={16} className="text-text-muted" strokeWidth={1.7} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-text text-sm">Still need help?</p>
          <p className="text-text-muted text-xs mt-0.5">
            Contact our support team and we&apos;ll get back to you.
          </p>
        </div>
        <Link href="/contact" className="btn-secondary text-sm whitespace-nowrap">
          Contact Us
        </Link>
      </div>

    </div>
  );
}
