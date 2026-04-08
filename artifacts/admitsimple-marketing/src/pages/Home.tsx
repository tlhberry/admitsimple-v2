import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import PipelineSection from "@/components/PipelineSection";
import AiSection from "@/components/AiSection";
import ClaudeDataSafety from "@/components/ClaudeDataSafety";
import Security from "@/components/Security";
import Pricing from "@/components/Pricing";
import CtaSection from "@/components/CtaSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary/30 selection:text-primary-foreground">
      <Header />
      <main>
        <Hero />
        <Features />
        <PipelineSection />
        <AiSection />
        <ClaudeDataSafety />
        <Security />
        <Pricing />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
