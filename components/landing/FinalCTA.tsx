import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

export default function FinalCTA() {
  return (
    <section className="relative py-28 px-6 lg:px-10 overflow-hidden grid-bg">
      <div className="absolute inset-0 bg-gradient-to-b from-bg via-transparent to-bg pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-accent/[0.04] blur-3xl rounded-full" />

      <div className="max-w-4xl mx-auto text-center relative">
        <p className="mono-label mb-6">Get Started</p>

        <h2 className="text-4xl md:text-5xl font-bold leading-[1.1] tracking-tight text-text mb-6">
          The traders who keep records{' '}
          <span className="text-accent">become</span>{' '}
          the traders who keep money.
        </h2>

        <p className="text-text-muted text-lg max-w-xl mx-auto mb-10 leading-relaxed">
          Four days. No card. No commitment. Just a clean ledger and the truth about your trading.
        </p>

        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/signup" className="btn-primary group text-base">
            Start your trial
            <ArrowUpRight className="ml-2 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" size={18} />
          </Link>
          <Link href="/pricing" className="btn-secondary text-base">
            See pricing
          </Link>
        </div>
      </div>
    </section>
  );
}
