import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import ProductShowcase from '@/components/landing/ProductShowcase';
import Comparison from '@/components/landing/Comparison';
import QuoteSection from '@/components/landing/QuoteSection';
import Pricing from '@/components/landing/Pricing';
import FAQ from '@/components/landing/FAQ';
import FinalCTA from '@/components/landing/FinalCTA';

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
