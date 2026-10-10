"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Building, Loader2 } from "lucide-react";

interface Brand {
  id: string;
  name: string;
  logoUrl: string;
}

export default function AllBrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const snap = await getDocs(query(collection(db, "brands"), orderBy("name", "asc")));
        setBrands(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Brand)));
      } catch (error) {
        console.error("Gagal memuat brand:", error);
        toast({ variant: "destructive", title: "Gagal memuat brand" });
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  return (
    <div className="w-full py-6 md:py-8">
      <div className="container max-w-screen-2xl px-3 sm:px-4">
        <div className="mb-6 flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Kembali</span>
          </Button>
          <h1 className="text-xl font-bold md:text-2xl">Semua Brand</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : brands.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {brands.map((brand) => (
              <Link key={brand.id} href={`/reseller/brands/${brand.id}`}>
                <Card className="group flex h-full flex-col items-center gap-2 p-3 transition-shadow hover:shadow-md">
                  <div className="flex h-20 w-full items-center justify-center overflow-hidden rounded-md bg-muted/40 p-2">
                    {brand.logoUrl ? (
                      <Image
                        src={brand.logoUrl}
                        alt={brand.name}
                        width={100}
                        height={80}
                        className="h-full w-full object-contain transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <Building className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <span className="line-clamp-2 text-center text-sm font-medium">{brand.name}</span>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border-2 border-dashed py-16 text-center text-muted-foreground">
            <Building className="mx-auto mb-2 h-10 w-10" />
            <p>Belum ada brand.</p>
          </div>
        )}
      </div>
    </div>
  );
}
