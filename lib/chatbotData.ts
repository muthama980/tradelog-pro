export type FAQ = {
  question: string;
  answer: string;
};

export type FAQCategory = {
  label: string;
  icon: string;
  faqs: FAQ[];
};

export const chatbotData: FAQCategory[] = [
  {
    label: 'Getting Started',
    icon: 'Rocket',
    faqs: [
      {
        question: 'How do I sign up?',
        answer: 'Head to tradelogpro.xyz/signup and create your account. You get a free 4-day trial with full access — no credit card required.'
      },
      {
        question: 'What happens when my trial ends?',
        answer: 'After 4 days, you\'ll be redirected to the trial expired page. Subscribe to Core ($19/mo), Pro ($25/mo), or Elite ($40/mo) to continue using all features.'
      },
      {
        question: 'How do I log my first trade?',
        answer: 'Go to Journal in the sidebar, click "Add Trade", fill in your symbol, direction, entry/exit prices, and optionally tag your strategy, emotion, and any mistakes. Hit Save and you\'re done!'
      },
      {
        question: 'Is my data secure?',
        answer: 'Yes. We use Supabase with row-level security, encrypted sensitive fields, CSRF protection, rate limiting, and brute-force protection. Your trading data is private and secure.'
      },
    ]
  },
  {
    label: 'Trade Journal',
    icon: 'BookOpen',
    faqs: [
      {
        question: 'How do I edit or delete a trade?',
        answer: 'Click any trade in your Journal to expand it — you\'ll see Edit and Delete buttons. For bulk actions, use the checkboxes to select multiple trades, then click Bulk Delete.'
      },
      {
        question: 'What are strategy tags?',
        answer: 'Strategy tags label each trade with the setup you used (breakout, scalp, trend-follow, etc.). Analytics then shows P&L by strategy so you see which setups actually make money.'
      },
      {
        question: 'What are emotion tags?',
        answer: 'Tag how you felt during each trade — confident, fearful, FOMO, revenge, calm. Your Analytics will reveal which emotional states lead to your best and worst trades.'
      },
      {
        question: 'What are mistake tags?',
        answer: 'Common errors like "moved stop loss", "oversized position", "no setup", "revenge trade". Track these to see exactly which mistakes cost you the most money over time.'
      },
      {
        question: 'What are trading sessions?',
        answer: 'Sessions group trades by time window: Asian, London, New York, or custom. Session analytics show which trading windows are most profitable for you.'
      },
    ]
  },
  {
    label: 'Connections',
    icon: 'Link',
    faqs: [
      {
        question: 'How do I connect Binance?',
        answer: 'Go to Connections → Crypto → Binance API. Create a read-only API key on Binance (we only need read access — we can\'t trade or withdraw). Paste your API Key and Secret, then connect.'
      },
      {
        question: 'How do I import trades from CSV?',
        answer: 'Go to Connections, pick your market, choose CSV Import, then drag and drop your file. We support Binance, Bybit, and MetaTrader CSV formats. Preview your trades before confirming.'
      },
      {
        question: 'How do I connect my MT4/MT5 broker?',
        answer: 'Go to Connections → Forex/Stocks/Futures → Connect Broker. Select your broker (Exness, XM, IC Markets, etc.), enter your account number and server. Auto-sync is rolling out — you\'ll be notified when it\'s live.'
      },
      {
        question: 'Which exchanges are supported?',
        answer: 'Crypto: Binance, Coinbase, Kraken, OKX (API + CSV). Forex/Stocks/Futures: MetaTrader 4/5 CSV, plus broker connections for Exness, XM, Vantage, WinPro, IC Markets, Pepperstone, FXTM, Deriv, FBS. More coming soon.'
      },
    ]
  },
  {
    label: 'Analytics',
    icon: 'BarChart3',
    faqs: [
      {
        question: 'How do I read my analytics?',
        answer: 'Analytics shows P&L over time, win rate, profit factor, average win vs loss, and breakdowns by strategy, emotion, mistake, and session. The more trades you log with tags, the more useful it becomes.'
      },
      {
        question: 'Why is my analytics empty?',
        answer: 'You need at least a few trades with tags to see meaningful data. Log 5-10 trades with strategy and emotion tags to start seeing patterns.'
      },
    ]
  },
  {
    label: 'AI Coach',
    icon: 'Brain',
    faqs: [
      {
        question: 'What is the AI Coach?',
        answer: 'The AI Coach analyzes your journal weekly and gives personalized insights — patterns in wins/losses, emotional tendencies, strategy performance, and recommendations. Available on the Pro plan ($25/mo).'
      },
      {
        question: 'How often does it update?',
        answer: 'New weekly report every Monday based on your recent activity. The more consistently you journal, the better the coaching insights.'
      },
    ]
  },
  {
    label: 'Billing & Plans',
    icon: 'CreditCard',
    faqs: [
      {
        question: 'What are the pricing plans?',
        answer: 'Core: $19/mo (journal + basic analytics). Pro: $25/mo (full analytics + AI Coach). Elite: $40/mo (portfolio tracker — coming soon). All plans include a free 4-day trial.'
      },
      {
        question: 'What payment methods are accepted?',
        answer: 'Credit/debit cards via Lemon Squeezy, PayPal, and cryptocurrency. M-Pesa support coming soon.'
      },
      {
        question: 'How do I upgrade my plan?',
        answer: 'Go to Settings → Billing in your dashboard. Choose your plan and complete payment. Your upgrade is instant.'
      },
      {
        question: 'How do I cancel?',
        answer: 'Go to Settings → Billing and manage your subscription through the Lemon Squeezy portal. Your access continues until the end of your billing period.'
      },
    ]
  },
  {
    label: 'Contact Support',
    icon: 'Mail',
    faqs: [
      {
        question: 'I need to talk to a human',
        answer: 'No problem! Reach us at tradelogpro.xyz/contact or email us directly. We typically respond within 24 hours.'
      },
      {
        question: 'I found a bug',
        answer: 'Please report it through the Feedback page in your dashboard (Sidebar → Feedback) or via our contact page. Include what happened, what you expected, and any screenshots if possible.'
      },
      {
        question: 'I have a feature request',
        answer: 'We\'d love to hear it! Use the Feedback page in your dashboard or contact us. We prioritize features based on what our users actually need.'
      },
    ]
  },
];
