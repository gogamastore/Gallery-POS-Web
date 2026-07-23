"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ResellerHeader from "./reseller-header";
import ResellerSidebar from "./reseller-sidebar";
import BottomNav from "./reseller-bottom-nav";
import StorefrontTheme from "./storefront-theme";
import Footer from "@/components/layout/footer";
import StoreClosedOverlay from "@/components/reseller/store-closed-overlay";
import { useAuth } from "@/hooks/use-auth";
import { resolveVerificationStatus } from "@/lib/verification";

// Kerangka tampilan reseller yang responsif:
//  • Mobile  → bottom navigation bar.
//  • Tablet/PC → menu di samping kiri (sidebar) yang bisa disembunyikan
//    lewat tombol toggle di header.
export default function ResellerShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user } = useAuth();
  const router = useRouter();

  // Blokir pengguna yang login tapi emailnya belum diverifikasi
  // (mis. mengakses /reseller langsung via URL). Tamu tidak terpengaruh.
  useEffect(() => {
    if (!user) return;
    let active = true;
    resolveVerificationStatus(user)
      .then((status) => {
        if (active && status === "pending") router.replace("/verify-email");
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user, router]);

  return (
    <div className="storefront relative flex min-h-dvh flex-col bg-background text-foreground">
      <StorefrontTheme />
      <ResellerHeader onToggleSidebar={() => setSidebarOpen((o) => !o)} />
      <div className="flex flex-1">
        <ResellerSidebar open={sidebarOpen} />
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="flex-1 pb-20 md:pb-0">{children}</main>
          <Footer />
        </div>
      </div>
      <BottomNav />
      <StoreClosedOverlay />
    </div>
  );
}
