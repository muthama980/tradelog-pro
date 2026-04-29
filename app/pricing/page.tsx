import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Pricing from '@/components/landing/Pricing';
import FAQ from '@/components/landing/FAQ';

export default function PricingPage() {
  return (
    <>
      <Navbar />
      <main className="pt-20">
        <Pricing standalone />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
