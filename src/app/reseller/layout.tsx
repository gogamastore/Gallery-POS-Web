
import type { Metadata } from "next";
import Script from "next/script";
import "./../globals.css";
import { Toaster } from "@/components/ui/toaster";
import { CartProvider } from "@/hooks/use-cart";
import ResellerShell from "./components/reseller-shell";
import { FilterProvider } from "@/components/providers/reseller-filter-provider";

export const metadata: Metadata = {
  title: "Gogama Store",
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
        <ResellerShell>{children}</ResellerShell>
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
