import { Check, X } from 'lucide-react';

const COMPARISON = [
  { feature: 'Crypto-native (BTC, ETH, DeFi, futures)', us: true,   tradervue: false,      edgewonk: false, sheet: false },
  { feature: 'AI pattern recognition coach',            us: true,   tradervue: false,      edgewonk: false, sheet: false },
  { feature: 'Global payment methods',                  us: true,   tradervue: true,       edgewonk: true,  sheet: false },
  { feature: 'Mobile-first interface',                  us: true,   tradervue: false,      edgewonk: false, sheet: 'partial' },
  { feature: 'Strategy & emotional tagging',            us: true,   tradervue: 'partial',  edgewonk: true,  sheet: false },
  { feature: 'CSV broker import',                       us: true,   tradervue: true,       edgewonk: true,  sheet: false },
  { feature: 'Starting price',                          us: '$19',  tradervue: '$29',      edgewonk: '$169/yr', sheet: 'Free' },
];

function Cell({ v }: { v: boolean | string }) {
  if (v === true)      return <Check className="text-accent mx-auto" size={17} strokeWidth={2.5} />;
  if (v === false)     return <X className="text-text-dim/40 mx-auto" size={17} strokeWidth={2} />;
  if (v === 'partial') return <div className="w-2.5 h-2.5 rounded-full bg-text-dim/30 mx-auto" />;
  return <span className="font-mono text-sm text-text-muted">{v}</span>;
}

export default function Comparison() {
  return (
    <section className="relative py-24 px-6 lg:px-10 bg-bg-surface">
      <div className="max-w-6xl mx-auto">
        <div className="mb-14">
          <p className="mono-label mb-4">How We Compare</p>
          <h2 className="text-3xl md:text-4xl font-bold text-text tracking-tight max-w-xl">
            Built for the markets{' '}
            <span className="text-text-muted font-medium">they forgot.</span>
          </h2>
          <p className="mt-4 text-text-muted text-sm leading-relaxed max-w-2xl">
            Tradervue and Edgewonk were built fifteen years ago for American stock traders. The market has changed. The tools haven't.
          </p>
        </div>

        <div className="card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-bg-elevated">
                  <th className="text-left p-5 font-mono text-[10px] tracking-widest text-text-dim uppercase">Capability</th>
                  <th className="p-5 font-mono text-[10px] tracking-widest uppercase">
                    <span className="text-accent">TradeLog Pro</span>
                  </th>
                  <th className="p-5 font-mono text-[10px] tracking-widest text-text-dim uppercase">Tradervue</th>
                  <th className="p-5 font-mono text-[10px] tracking-widest text-text-dim uppercase">Edgewonk</th>
                  <th className="p-5 font-mono text-[10px] tracking-widest text-text-dim uppercase">Spreadsheet</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr key={i} className={`border-b border-border/50 ${i % 2 === 0 ? 'bg-bg-surface/50' : ''}`}>
                    <td className="p-5 text-sm text-text-muted">{row.feature}</td>
                    <td className="p-5 text-center bg-accent/[0.03]"><Cell v={row.us} /></td>
                    <td className="p-5 text-center"><Cell v={row.tradervue} /></td>
                    <td className="p-5 text-center"><Cell v={row.edgewonk} /></td>
                    <td className="p-5 text-center"><Cell v={row.sheet} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-5 mono-label text-center tracking-wider">
          ● full support · ○ partial · ✕ not available
        </p>
      </div>
    </section>
  );
}
