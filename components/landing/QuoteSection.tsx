import DailyQuote from '@/components/DailyQuote';

export default function QuoteSection() {
  return (
    <section className="relative py-24 px-6 lg:px-10 bg-bg-surface">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-12 gap-10 items-start">
          <div className="md:col-span-3">
            <p className="mono-label mb-4">Section · 03</p>
            <h3 className="font-bold text-xl text-text leading-tight">
              The Daily Edge
            </h3>
            <p className="mt-3 text-sm text-text-muted leading-relaxed">
              A new piece of trading wisdom every morning. Curated from the masters who built modern markets.
            </p>
            <div className="divider mt-8" />
          </div>

          <div className="md:col-span-9">
            <DailyQuote variant="feature" />
          </div>
        </div>
      </div>
    </section>
  );
}
