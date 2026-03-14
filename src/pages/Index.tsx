import Header from "@/components/Header";
import Hero from "@/components/Hero";
import IntroSection from "@/components/IntroSection";
import ServicesSection from "@/components/ServicesSection";
import PricingSection from "@/components/Pricingsection";
import WhySection from "@/components/WhySection";
import AboutSection from "@/components/AboutSection";
import HowItWorksSection from "@/components/HowItWorksSection";
// import TestimonialsSection from "@/components/TestimonialsSection";
import FAQSection from "@/components/FAQSection";
import CTASection from "@/components/CTASection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";

const Index = () => (
  <>
    <Header />
    <Hero />
    <IntroSection />
    <ServicesSection />
    <PricingSection />
    <WhySection />
    <AboutSection />
    <HowItWorksSection />
    {/* <TestimonialsSection /> */}
    <FAQSection />
    <CTASection />
    <ContactSection />
    <Footer />
  </>
);

export default Index;
