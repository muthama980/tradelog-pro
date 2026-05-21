import dynamic from 'next/dynamic';
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
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
