import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="relative border-t border-border bg-bg">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="col-span-2">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-7 h-7 bg-accent rounded-[3px] flex items-center justify-center">
                <span className="font-mono text-[9px] font-black text-bg tracking-[-0.05em]">TLP</span>
              </div>
              <span className="font-bold text-base text-text">TradeLog<span className="text-accent">Pro</span></span>
            </div>
            <p className="text-sm text-text-muted max-w-sm leading-relaxed">
              The professional trading journal. Built for traders who treat the markets like a craft, not a casino.
            </p>
            <p className="mt-5 font-mono text-[11px] tracking-widest text-accent uppercase">
              For traders worldwide
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="mono-label mb-4">Product</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/#features"  className="text-text-muted hover:text-accent transition">Features</Link></li>
              <li><Link href="/pricing"    className="text-text-muted hover:text-accent transition">Pricing</Link></li>
              <li><Link href="/coach"      className="text-text-muted hover:text-accent transition">AI Coach</Link></li>
              <li><Link href="/dashboard" className="text-text-muted hover:text-accent transition">Dashboard</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mono-label mb-4">Company</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/blog"     className="text-text-muted hover:text-accent transition">Blog</Link></li>
              <li><Link href="/quotes"  className="text-text-muted hover:text-accent transition">Daily Edge</Link></li>
              <li><Link href="/contact" className="text-text-muted hover:text-accent transition">Contact</Link></li>
              <li><Link href="/login"   className="text-text-muted hover:text-accent transition">Sign in</Link></li>
              <li><Link href="/signup"  className="text-text-muted hover:text-accent transition">Start free trial</Link></li>
              <li><a href="mailto:support@tradelog.xyz" className="text-text-muted hover:text-accent transition">support@tradelog.xyz</a></li>
            </ul>
          </div>
        </div>

        <div className="divider my-10" />

        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="font-mono text-xs text-text-dim tracking-wider">
            © {new Date().getFullYear()} TradeLog Pro. All rights reserved.
          </p>
          <p className="text-xs text-text-dim">
            Trading involves risk. This is a journal — not financial advice.
          </p>
        </div>
      </div>
    </footer>
  );
}
