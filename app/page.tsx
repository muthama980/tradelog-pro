import dynamic from 'next/dynamic';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';

const ProductShowcase = dynamic(() => import('@/components/landing/ProductShowcase'));
const Comparison      = dynamic(() => import('@/components/landing/Comparison'));
const QuoteSection    = dynamic(() => import('@/components/landing/QuoteSection'));
const Pricing         = dynamic(() => import('@/components/landing/Pricing'));
const FAQ             = dynamic(() => import('@/components/landing/FAQ'));
const FinalCTA        = dynamic(() => import('@/components/landing/FinalCTA'));

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Features />
        <ProductShowcase />
        <Comparison />
        <QuoteSection />
        <Pricing />
        <FAQ />

        {/* Affiliate CTA */}
        <section className="max-w-5xl mx-auto px-6 lg:px-10 pb-8">
          <div className="flex items-center justify-between gap-4 bg-bg-surface border border-border rounded-xl px-6 py-4 flex-wrap">
            <p className="text-sm text-text-muted">
              <span className="text-text font-medium">Are you a content creator?</span>{' '}
              Earn up to 36% recurring commission with our affiliate program.
            </p>
            <Link
              href="/affiliates"
              className="text-sm font-medium text-accent hover:underline whitespace-nowrap flex items-center gap-1"
            >
              Learn more →
            </Link>
          </div>
        </section>

        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
