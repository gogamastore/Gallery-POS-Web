
import type { Metadata } from "next";
import Script from "next/script";
import "./../globals.css";
import { Toaster } from "@/components/ui/toaster";
import { CartProvider } from "@/hooks/use-cart";
import ResellerShell from "./components/reseller-shell";
import PopupNotification from "./components/popup-notification";
import { FilterProvider } from "@/components/providers/reseller-filter-provider";

export const metadata: Metadata = {
  title: "Gogama Store",
  description: "Your one-stop shop for everything.",
  icons: {
    icon: 'https://firebasestorage.googleapis.com/v0/b/gallerypos.firebasestorage.app/o/favicon.ico?alt=media&token=dbfd687f-19e6-4bbc-8383-fbcf68c21aea',
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
          <PopupNotification />
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
