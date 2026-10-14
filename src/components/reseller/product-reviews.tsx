"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Star } from "lucide-react";

interface Review {
  id: string;
  userName: string;
  anonymous: boolean;
  rating: number;
  comment: string;
  imageUrls: string[];
  createdAt?: Timestamp;
}

function displayName(name: string, anonymous: boolean) {
  const n = (name || "").trim();
  if (!anonymous) return n || "Pengguna";
  if (!n) return "Pengguna";
  if (n.length <= 2) return `${n[0]}***`;
  return `${n.slice(0, 2)}***${n.slice(-1)}`;
}

function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          style={{ width: size, height: size }}
          className={i < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}
        />
      ))}
    </div>
  );
}

/**
 * Bagian "Ulasan Pembeli" di halaman detail produk web reseller. Membaca
 * koleksi `reviews` (difilter productId) + rata-rata dari agregat produk
 * (ratingAvg/ratingCount yang dijaga Cloud Function).
 */
export default function ProductReviews({
  productId,
  ratingAvg = 0,
  ratingCount = 0,
}: {
  productId: string;
  ratingAvg?: number;
  ratingCount?: number;
}) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!productId) return;
    let active = true;
    setLoading(true);
    getDocs(
      query(
        collection(db, "reviews"),
        where("productId", "==", productId),
        orderBy("createdAt", "desc"),
        fbLimit(20),
      ),
    )
      .then((snap) => {
        if (!active) return;
        setReviews(
          snap.docs.map((d) => {
            const x = d.data();
            return {
              id: d.id,
              userName: String(x.userName ?? ""),
              anonymous: x.anonymous === true,
              rating: Number(x.rating ?? 0),
              comment: String(x.comment ?? ""),
              imageUrls: Array.isArray(x.imageUrls) ? (x.imageUrls as string[]) : [],
              createdAt: x.createdAt as Timestamp | undefined,
            };
          }),
        );
      })
      .catch(() => active && setReviews([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [productId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Ulasan Pembeli</h2>
        {ratingCount > 0 && (
          <div className="flex items-center gap-1.5 text-sm">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span className="font-bold">{ratingAvg.toFixed(1)}</span>
            <span className="text-muted-foreground">· {ratingCount} ulasan</span>
          </div>
        )}
      </div>

      {loading ? (
        <p className="py-4 text-sm text-muted-foreground">Memuat ulasan…</p>
      ) : reviews.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">Belum ada ulasan untuk produk ini.</p>
      ) : (
        <div className="divide-y">
          {reviews.map((r) => (
            <div key={r.id} className="py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {displayName(r.userName, r.anonymous).charAt(0).toUpperCase()}
                </div>
                <span className="flex-1 text-sm font-semibold">{displayName(r.userName, r.anonymous)}</span>
                {r.createdAt && (
                  <span className="text-xs text-muted-foreground">
                    {r.createdAt.toDate().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                )}
              </div>
              <div className="mt-1">
                <Stars rating={r.rating} size={14} />
              </div>
              {r.comment && <p className="mt-1.5 text-sm text-foreground/90">{r.comment}</p>}
              {r.imageUrls.length > 0 && (
                <div className="mt-2 flex gap-2 overflow-x-auto">
                  {r.imageUrls.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt=""
                      className="h-16 w-16 shrink-0 rounded-md object-cover"
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
