import { createClient } from '@/lib/supabase/server';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ShareButtons } from '@/components/blog/ShareButtons';
import type { Metadata } from 'next';

export const revalidate = 60;

const CATEGORY_LABEL: Record<string, string> = {
  news: 'Market News', strategy: 'Strategy', psychology: 'Psychology',
  product: 'Product', 'market-recap': 'Recap',
};

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const supabase = createClient();
  const { data: post } = await supabase
    .from('posts')
    .select('title, excerpt, slug')
    .eq('slug', params.slug)
    .eq('published', true)
    .single();

  if (!post) return {};

  return {
    title: post.title + ' | TradeLog Pro',
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: 'https://tradelogpro.xyz/blog/' + post.slug,
      type: 'article',
      siteName: 'TradeLog Pro',
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
    },
  };
}

function renderMd(md: string) {
  const lines = md.split('\n');
  const blocks: React.ReactNode[] = [];
  let key = 0;
  let inList = false;
  let listItems: string[] = [];

  function flushList() {
    if (inList && listItems.length) {
      blocks.push(
        <ul key={key++} className="list-disc pl-6 my-5 space-y-2 text-text-muted">
          {listItems.map((li, i) => <li key={i}>{inline(li)}</li>)}
        </ul>
      );
    }
    inList = false;
    listItems = [];
  }

  function inline(text: string) {
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/);
    return parts.map((p, i) => {
      if (p.startsWith('**')) return <strong key={i} className="text-text font-bold">{p.slice(2, -2)}</strong>;
      if (p.startsWith('*'))  return <span key={i} className="text-accent font-medium">{p.slice(1, -1)}</span>;
      if (p.startsWith('`'))  return <code key={i} className="font-mono text-sm bg-bg-elevated px-1.5 py-0.5 rounded text-accent">{p.slice(1, -1)}</code>;
      return p;
    });
  }

  for (const line of lines) {
    if (line.startsWith('# ')) {
      flushList();
      blocks.push(<h1 key={key++} className="font-bold text-3xl md:text-4xl mt-12 mb-5 text-text">{line.slice(2)}</h1>);
    } else if (line.startsWith('## ')) {
      flushList();
      blocks.push(<h2 key={key++} className="font-bold text-2xl mt-10 mb-4 text-text">{line.slice(3)}</h2>);
    } else if (line.startsWith('### ')) {
      flushList();
      blocks.push(<h3 key={key++} className="font-bold text-xl mt-8 mb-3 text-text">{line.slice(4)}</h3>);
    } else if (/^[\-\*]\s/.test(line)) {
      inList = true;
      listItems.push(line.replace(/^[\-\*]\s/, ''));
    } else if (line.trim() === '') {
      flushList();
    } else {
      flushList();
      blocks.push(
        <p key={key++} className="text-text-muted leading-[1.85] my-5 text-base">
          {inline(line)}
        </p>
      );
    }
  }
  flushList();
  return blocks;
}

export default async function PostPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: post } = await supabase
    .from('posts')
    .select('*')
    .eq('slug', params.slug)
    .eq('published', true)
    .single();

  if (!post) notFound();

  return (
    <>
      <Navbar />
      <main className="pt-28 pb-20 px-6 lg:px-10 bg-bg">
        <article className="max-w-2xl mx-auto">
          <Link href="/blog" className="inline-flex items-center gap-2 font-mono text-[11px] tracking-widest text-text-dim hover:text-accent mb-12 uppercase transition">
            <ArrowLeft size={13} /> Back to Journal
          </Link>

          <div className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <span className="font-mono text-[10px] tracking-widest text-accent uppercase border border-accent/30 px-2 py-1 rounded">
                {CATEGORY_LABEL[post.category] || post.category}
              </span>
              <span className="mono-label">{post.read_minutes} min · {new Date(post.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>

            <h1 className="font-bold text-4xl md:text-5xl leading-[1.08] tracking-tight text-text mb-5">
              {post.title}
            </h1>

            {post.excerpt && (
              <p className="text-lg text-text-muted leading-relaxed">{post.excerpt}</p>
            )}

            <div className="divider mt-8" />
          </div>

          <div className="mb-10">
            <ShareButtons title={post.title} slug={post.slug} />
          </div>

          <div>{renderMd(post.body_md)}</div>

          <div className="divider my-14" />

          <div className="mb-10">
            <ShareButtons
              title={post.title}
              slug={post.slug}
              label="Found this useful? Share it with a fellow trader."
            />
          </div>

          <div className="text-center card rounded-xl p-8">
            <p className="font-bold text-lg text-text mb-2">Want this disciplined record-keeping in your own trading?</p>
            <p className="text-text-muted text-sm mb-6">Four days free. No credit card required.</p>
            <Link href="/signup" className="btn-primary">Begin 4-day trial</Link>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
