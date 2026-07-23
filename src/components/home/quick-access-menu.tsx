
"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { Building } from 'lucide-react';
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useEffect, useState } from "react";
import Image from "next/image";

interface Brand {
  id: string;
  name: string;
  logoUrl: string;
}


export default function QuickAccessMenu() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBrands = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "brands"), orderBy("name", "asc"));
            const querySnapshot = await getDocs(q);
            const fetchedData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Brand));
            setBrands(fetchedData);
        } catch (error) {
            console.error("Error fetching brands:", error);
        } finally {
            setLoading(false);
        }
    };
    fetchBrands();
  }, []);

  if (loading) {
      return (
           <section className="w-full py-6 md:py-10">
              <div className="container max-w-screen-2xl px-3 sm:px-4">
                  <div className="rounded-lg bg-primary/5 p-3 sm:p-4">
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-4">
                        {[...Array(8)].map((_, i) => (
                            <Card key={i} className="overflow-hidden group">
                                <div className="bg-muted aspect-square w-full animate-pulse"></div>
                            </Card>
                        ))}
                    </div>
                  </div>
              </div>
           </section>
      )
  }

  if (brands.length === 0) return null;

  return (
    <section className="w-full py-6 md:py-10">
      <div className="container max-w-screen-2xl px-3 sm:px-4">
        {/* Kontainer bernuansa sama dengan section Daftar Promo (bg-primary/5).
            Dibuat sebagai kotak membulat, bukan pita selebar layar, supaya
            tidak menyatu dengan pita Daftar Promo yang ada tepat di bawahnya. */}
        <div className="rounded-lg bg-primary/5 p-3 sm:p-4">
          <Carousel
            opts={{
              align: "start",
              dragFree: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-2">
              {brands.map((brand) => (
                <CarouselItem key={brand.id} className="basis-1/4 sm:basis-1/5 md:basis-1/6 lg:basis-[12%] pl-2">
                   <Link href={`/reseller/brands/${brand.id}`} className="group">
                    <Card className="h-full transition-all duration-300 hover:bg-primary/10 hover:shadow-md">
                      <CardContent className="flex flex-col items-center justify-center p-2 aspect-square">
                        <Image
                          src={brand.logoUrl}
                          alt={brand.name}
                          width={64}
                          height={64}
                          className="h-10 w-10 sm:h-12 sm:w-12 object-contain mb-2 transition-transform duration-300 group-hover:scale-110"
                        />
                        <span className="text-center text-[10px] sm:text-xs font-semibold font-headline leading-tight">
                          {brand.name}
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
      </div>
    </section>
  );
}
