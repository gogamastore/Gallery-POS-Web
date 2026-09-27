
"use client";

import HeroSection from "@/components/home/hero-section";
import QuickAccessMenu from "@/components/home/quick-access-menu";
import FlashSaleSection from "@/components/home/flash-sale";
import WhatsappVerificationPopup from "./components/whatsapp-verification-popup";

export default function Home() {
  return (
    <div className="flex flex-col gap-4 animate-in fade-in-0 duration-500">
      <WhatsappVerificationPopup />
      <HeroSection />
      <QuickAccessMenu />
      <FlashSaleSection />
    </div>
  );
}
