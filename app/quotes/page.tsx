import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import DailyQuote from '@/components/DailyQuote';

const ALL_QUOTES = [
  { text: "The market can stay irrational longer than you can stay solvent.", author: "John Maynard Keynes", era: "1936" },
  { text: "Risk comes from not knowing what you're doing.", author: "Warren Buffett", era: "1993" },
  { text: "The four most dangerous words in investing are: this time it's different.", author: "Sir John Templeton", era: "1933" },
  { text: "In trading, the impossible happens about twice a year.", author: "Henry Kaufman", era: "1986" },
  { text: "It's not whether you're right or wrong that's important — it's how much money you make when right and how much you lose when wrong.", author: "George Soros", era: "1992" },
  { text: "The trend is your friend until the end when it bends.", author: "Ed Seykota", era: "1989" },
  { text: "Be fearful when others are greedy, and greedy when others are fearful.", author: "Warren Buffett", era: "1986" },
  { text: "Markets are never wrong — opinions often are.", author: "Jesse Livermore", era: "1923" },
  { text: "There is nothing more important than your emotional balance.", author: "Jesse Livermore", era: "1940" },
  { text: "The goal of a successful trader is to make the best trades. Money is secondary.", author: "Alexander Elder", era: "1993" },
  { text: "If you can't take a small loss, sooner or later you will take the mother of all losses.", author: "Ed Seykota", era: "1989" },
  { text: "I'm only rich because I know when I'm wrong.", author: "George Soros", era: "1995" },
  { text: "Amateurs think about how much money they can make. Professionals think about how much money they could lose.", author: "Jack Schwager", era: "1989" },
  { text: "The stock market is a device for transferring money from the impatient to the patient.", author: "Warren Buffett", era: "2004" },
  { text: "Don't focus on making money; focus on protecting what you have.", author: "Paul Tudor Jones", era: "1987" },
];

export default function QuotesPage() {
  return (
    <>
      <Navbar />
      <main className="pt-28 pb-20 px-6 lg:px-10 bg-bg">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-16">
            <p className="mono-label mb-4">The Daily Edge · An Anthology</p>
            <h1 className="text-4xl md:text-5xl font-bold text-text tracking-tight leading-[1.08] max-w-3xl">
              Wisdom from the masters<br />
              <span className="text-text-muted font-medium">who built modern markets.</span>
            </h1>
            <p className="mt-5 text-text-muted max-w-xl leading-relaxed">
              A curated collection of sharp, practical truths from the traders, investors, and economists
              who shaped the markets we trade in today. A new one greets you each morning in the app.
            </p>
          </div>

          {/* Today's quote — featured */}
          <div className="card rounded-xl p-8 md:p-12 mb-16">
            <DailyQuote variant="feature" />
          </div>

          {/* Section header */}
          <div className="flex items-center gap-4 mb-10">
            <div className="h-px w-10 bg-accent/40" />
            <span className="mono-label tracking-widest">The Anthology</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Grid of all quotes */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border rounded-xl overflow-hidden">
            {ALL_QUOTES.map((q, i) => (
              <div
                key={i}
                className="bg-bg-surface p-7 hover:bg-bg-elevated transition-colors duration-300 flex flex-col"
              >
                <div className="flex items-start justify-between mb-5">
                  <div className="w-px h-6 bg-accent/60" />
                  <span className="font-mono text-[10px] tracking-widest text-text-dim tabular">
                    № {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <blockquote className="text-sm text-text-muted leading-relaxed flex-1 mb-6">
                  "{q.text}"
                </blockquote>
                <div className="flex items-center justify-between pt-4 border-t border-border/50">
                  <span className="font-mono text-[11px] tracking-widest text-accent uppercase">
                    {q.author}
                  </span>
                  <span className="font-mono text-[10px] text-text-dim tabular">{q.era}</span>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-20 text-center max-w-2xl mx-auto">
            <p className="font-bold text-2xl text-text mb-3">Reading wisdom is easy.</p>
            <p className="text-text-muted mb-8">Recording your own is the discipline.</p>
            <a href="/signup" className="btn-primary">Begin your trading journal</a>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
