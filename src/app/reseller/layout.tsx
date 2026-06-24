
import type { Metadata } from "next";
import Script from "next/script";
import "./../globals.css";
import ResellerHeader from "./components/reseller-header";
import Footer from "@/components/layout/footer";
import { Toaster } from "@/components/ui/toaster";
import BottomNav from "./components/reseller-bottom-nav";
import { CartProvider } from "@/hooks/use-cart";
import ResellerChatTrigger from "./components/reseller-chat-trigger";
import { FilterProvider } from "@/components/providers/reseller-filter-provider";

export const metadata: Metadata = {
  title: "Gogama Experience",
  description: "Your one-stop shop for everything.",
  icons: {
    icon: 'https://firebasestorage.googleapis.com/v0/b/orderflow-r7jsk.firebasestorage.app/o/ic_gogama_logo.png?alt=media&token=c7caf8ae-553a-4cf8-a4ae-bce1446b599c',
  },
};

export default function ResellerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const midtransClientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
  const midtransIsProduction = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true';
  const snapUrl = midtransIsProduction
    ? 'https://app.midtrans.com/snap/snap.js'
    : 'https://app.sandbox.midtrans.com/snap/snap.js';

  return (
    <CartProvider>
      <FilterProvider>
        <div className="relative flex min-h-dvh flex-col bg-background">
          <ResellerHeader />
          <main className="flex-1 pb-20 md:pb-0">{children}</main>
          <Footer />
          <BottomNav />
          <ResellerChatTrigger />
        </div>
        <Toaster />
        {midtransClientKey && (
          <Script
            src={snapUrl}
            data-client-key={midtransClientKey}
            strategy="lazyOnload"
          />
        )}
      </FilterProvider>
    </CartProvider>
  );
}
