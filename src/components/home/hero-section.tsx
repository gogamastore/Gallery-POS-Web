
"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Button } from "../ui/button";
import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import Autoplay from "embla-carousel-autoplay";

interface Banner {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  buttonText: string;
  buttonLink: string;
  isActive: boolean;
  order: number;
}

export default function HeroSection() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchBanners() {
      setLoading(true);
      try {
        const q = query(collection(db, 'banners'), orderBy('order', 'asc'));
        const querySnapshot = await getDocs(q);
        const fetchedBanners = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Banner)).filter(banner => banner.isActive);
        setBanners(fetchedBanners);
      } catch (error) {
        console.error("Error fetching banners: ", error);
        toast({ variant: "destructive", title: "Gagal memuat banner." });
      } finally {
        setLoading(false);
      }
    }
    fetchBanners();
  }, [toast]);

  if (loading) {
    return (
       <section className="w-full pt-6 md:pt-10">
         <div className="container max-w-screen-2xl">
            <div className="bg-muted aspect-[2/1] md:h-[500px] w-full animate-pulse rounded-lg"></div>
         </div>
       </section>
    )
  }

  if (banners.length === 0) {
      return null;
  }

  return (
    <section className="w-full pt-6 md:pt-10">
      <div className="container max-w-screen-2xl">
        <Carousel 
            className="w-full" 
            opts={{ loop: true }}
            plugins={[
                Autoplay({
                  delay: 5000,
                  stopOnInteraction: true,
                }),
              ]}
            >
          <CarouselContent>
            {banners.map((banner, index) => (
              <CarouselItem key={index}>
                <Card className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="relative aspect-[2/1] md:h-[500px] w-full">
                        <Image
                            src={banner.imageUrl}
                            alt={banner.title}
                            fill
                            className="object-cover brightness-75"
                            priority={index === 0}
                        />
                        <div className="absolute inset-0 flex flex-col items-start justify-center p-6 md:p-16 text-white space-y-2 md:space-y-4">
                            <h2 className="text-2xl md:text-5xl font-bold font-headline leading-tight">
                                {banner.title}
                            </h2>
                            <p className="text-base md:text-2xl">{banner.description}</p>
                            <Button size="lg" className="font-headline text-sm md:text-lg mt-2 md:mt-4" asChild>
                                <Link href={banner.buttonLink || "#"}>{banner.buttonText}</Link>
                            </Button>
                        </div>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2" />
          <CarouselNext className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2" />
        </Carousel>
      </div>
    </section>
  );
}
