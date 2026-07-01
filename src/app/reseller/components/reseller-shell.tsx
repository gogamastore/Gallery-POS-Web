"use client";

import { useState } from "react";
import ResellerHeader from "./reseller-header";
import ResellerSidebar from "./reseller-sidebar";
import BottomNav from "./reseller-bottom-nav";
import Footer from "@/components/layout/footer";

// Kerangka tampilan reseller yang responsif:
//  • Mobile  → bottom navigation bar.
//  • Tablet/PC → menu di samping kiri (sidebar) yang bisa disembunyikan
//    lewat tombol toggle di header.
export default function ResellerShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="relative flex min-h-dvh flex-col bg-background">
      <ResellerHeader onToggleSidebar={() => setSidebarOpen((o) => !o)} />
      <div className="flex flex-1">
        <ResellerSidebar open={sidebarOpen} />
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="flex-1 pb-20 md:pb-0">{children}</main>
          <Footer />
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
