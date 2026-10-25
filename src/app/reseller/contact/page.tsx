"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card } from "@/components/ui/card";
import { Loader2, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { ContactIcon } from "@/components/contact-profile-icon";
import {
  DEFAULT_CONTACT_ITEMS,
  groupContactItems,
  sanitizeContactItems,
  type ContactItem,
} from "@/lib/contact-profile";

export default function ResellerContactPage() {
  const [items, setItems] = useState<ContactItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "contact_profile"));
        const data = snap.exists() ? sanitizeContactItems(snap.data().items) : [];
        setItems(data.length > 0 ? data : DEFAULT_CONTACT_ITEMS);
      } catch (e) {
        console.error("Gagal memuat kontak:", e);
        setItems(DEFAULT_CONTACT_ITEMS);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const groups = groupContactItems(items);

  return (
    <div className="bg-muted/40 min-h-[80vh]">
      <div className="container max-w-screen-md mx-auto py-8 md:py-12 animate-in fade-in-0 duration-500">
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/reseller/profile"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border hover:bg-muted"
            aria-label="Kembali"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-headline">Hubungi Kami</h1>
            <p className="text-sm text-muted-foreground">Kontak &amp; akun official toko.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : groups.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">Belum ada kontak tersedia.</Card>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <section key={group.section} className="space-y-2">
                <h2 className="font-semibold text-sm text-muted-foreground px-1">{group.section}</h2>
                <div className="space-y-2">
                  {group.items.map((item, i) => (
                    <a
                      key={`${item.url}-${i}`}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <ContactIcon type={item.type} className="h-5 w-5" />
                      </span>
                      <span className="font-medium">{item.label}</span>
                    </a>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
