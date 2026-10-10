
"use client";

import HeroSection from "@/components/home/hero-section";
import QuickAccessMenu from "@/components/home/quick-access-menu";
import FlashSaleSection from "@/components/home/flash-sale";
import WhatsappVerificationPopup from "./components/whatsapp-verification-popup";
import StorefrontHome from "@/components/storefront-builder/storefront-home";

function DefaultHome() {
  return (
    <div className="flex flex-col gap-4 animate-in fade-in-0 duration-500">
      <WhatsappVerificationPopup />
      <HeroSection />
      <QuickAccessMenu />
      <FlashSaleSection />
    </div>
  );
}
export default function Home() {
  // Bila admin sudah Publish susunan di App Builder (settings/app_layout),
  // beranda mengikuti susunan itu; jika belum, pakai DefaultHome.
  return <StorefrontHome fallback={<DefaultHome />} />;
}