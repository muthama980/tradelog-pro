import { createClient } from '@/lib/supabase/server';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { CopyLinkButton } from '@/components/blog/ShareButtons';

export const revalidate = 60;

const CATEGORY_LABEL: Record<string, string> = {
  news: 'Market News', strategy: 'Strategy', psychology: 'Psychology',
  product: 'Product', 'market-recap': 'Recap',
};

export default async function BlogPage() {
  const supabase = createClient();
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('published', true)
    .order('published_at', { ascending: false });

  const featured = posts?.[0];
  const rest = posts?.slice(1) || [];

  return (
    <>
      <Navbar />
      <main className="pt-28 pb-20 px-6 lg:px-10 bg-bg">
        <div className="max-w-7xl mx-auto">
          <div className="mb-14">
            <p className="mono-label mb-4">The Journal</p>
            <h1 className="text-4xl md:text-5xl font-bold text-text tracking-tight leading-[1.08]">
              Writing for traders<br />
              <span className="text-text-muted font-medium">who read.</span>
            </h1>
            <p className="mt-5 text-text-muted max-w-xl leading-relaxed">
              Strategy, psychology, market structure, and the occasional deep dive.
              Updated weekly. No clickbait, no signal-selling.
            </p>
          </div>

          {!posts || posts.length === 0 ? (
            <p className="text-text-dim py-12 text-center font-mono text-sm">No posts yet — first one is coming Monday.</p>
          ) : (
            <>
              {featured && (
                <div className="relative card rounded-xl overflow-hidden mb-10 group transition">
                  <Link href={`/blog/${featured.slug}`} className="block">
                    <div className="grid md:grid-cols-2 gap-0">
                      <div className="flex flex-col justify-center p-8 md:p-10">
                        <div className="flex items-center gap-3 mb-5">
                          <span className="font-mono text-[10px] tracking-widest text-accent uppercase border border-accent/30 px-2 py-1 rounded">
                            {CATEGORY_LABEL[featured.category] || featured.category}
                          </span>
                          <span className="mono-label">{featured.read_minutes} min read</span>
                        </div>
                        <h2 className="font-bold text-2xl md:text-3xl leading-tight text-text mb-4 group-hover:text-accent transition">
                          {featured.title}
                        </h2>
                        <p className="text-text-muted leading-relaxed mb-6 text-sm">{featured.excerpt}</p>
                        <span className="inline-flex items-center gap-2 font-mono text-[11px] tracking-widest text-accent uppercase">
                          Read article <ArrowUpRight size={13} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </span>
                      </div>
                      <div className="hidden md:flex items-center justify-center bg-bg-elevated border-l border-border p-10">
                        <div className="font-mono text-8xl font-black text-text-dim/20 tabular leading-none">
                          {String(rest.length + 1).padStart(2, '0')}
                        </div>
                      </div>
                    </div>
                  </Link>
                  <div className="absolute top-3 right-3">
                    <CopyLinkButton slug={featured.slug} />
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rest.map((p: any) => (
                  <div key={p.id} className="relative card rounded-xl group transition flex flex-col">
                    <Link href={`/blog/${p.slug}`} className="flex flex-col flex-1 p-6">
                      <div className="flex items-center gap-3 mb-5">
                        <span className="font-mono text-[10px] tracking-widest text-accent uppercase">
                          {CATEGORY_LABEL[p.category] || p.category}
                        </span>
                        <div className="h-px flex-1 bg-border" />
                        <span className="mono-label">{p.read_minutes} min</span>
                      </div>
                      <h3 className="font-bold text-lg leading-tight text-text mb-3 group-hover:text-accent transition">
                        {p.title}
                      </h3>
                      <p className="text-sm text-text-muted leading-relaxed flex-1 mb-5">{p.excerpt}</p>
                      <div className="flex items-center justify-between">
                        <span className="mono-label">
                          {new Date(p.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <ArrowUpRight size={14} className="text-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </div>
                    </Link>
                    <div className="absolute top-3 right-3">
                      <CopyLinkButton slug={p.slug} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
