"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Star, Trash2, MessageSquareText } from "lucide-react";

interface Review {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  userName: string;
  anonymous: boolean;
  rating: number;
  comment: string;
  imageUrls: string[];
  createdAt?: Timestamp;
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`}
        />
      ))}
    </div>
  );
}

export default function AdminReviewsPage() {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, "reviews"), orderBy("createdAt", "desc"), fbLimit(100)),
      );
      setReviews(
        snap.docs.map((d) => {
          const x = d.data();
          return {
            id: d.id,
            productId: String(x.productId ?? ""),
            productName: String(x.productName ?? "(produk)"),
            productImage: String(x.productImage ?? ""),
            userName: String(x.userName ?? ""),
            anonymous: x.anonymous === true,
            rating: Number(x.rating ?? 0),
            comment: String(x.comment ?? ""),
            imageUrls: Array.isArray(x.imageUrls) ? (x.imageUrls as string[]) : [],
            createdAt: x.createdAt as Timestamp | undefined,
          };
        }),
      );
    } catch (error) {
      console.error("Gagal memuat ulasan:", error);
      toast({ variant: "destructive", title: "Gagal memuat ulasan" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, "reviews", id));
      setReviews((prev) => prev.filter((r) => r.id !== id));
      toast({ title: "Ulasan dihapus", description: "Rata-rata rating produk diperbarui otomatis." });
    } catch (error) {
      console.error("Gagal menghapus ulasan:", error);
      toast({ variant: "destructive", title: "Gagal menghapus ulasan" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold md:text-2xl">Ulasan Pembeli</h1>
        <p className="text-sm text-muted-foreground">
          Ulasan terbaru dari pembeli. Hapus ulasan yang tidak pantas — rata-rata rating produk
          akan diperbarui otomatis.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ulasan Terbaru</CardTitle>
          <CardDescription>Menampilkan hingga 100 ulasan terbaru.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed py-12 text-center text-muted-foreground">
              <MessageSquareText className="mx-auto mb-2 h-10 w-10" />
              <p>Belum ada ulasan dari pembeli.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="flex gap-3 rounded-lg border p-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                    {r.productImage ? (
                      <img src={r.productImage} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{r.productName}</p>
                        <div className="mt-0.5 flex items-center gap-2">
                          <Stars rating={r.rating} />
                          <span className="text-xs text-muted-foreground">
                            oleh {r.anonymous ? "Anonim" : r.userName || "Pengguna"}
                          </span>
                        </div>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            disabled={deletingId === r.id}
                          >
                            {deletingId === r.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Hapus ulasan ini?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Ulasan untuk <span className="font-semibold">{r.productName}</span> akan
                              dihapus permanen dan rata-rata rating produk diperbarui. Aksi ini tidak
                              dapat diurungkan.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(r.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Ya, Hapus
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    {r.comment && <p className="mt-1 text-sm text-foreground/90">{r.comment}</p>}
                    {r.imageUrls.length > 0 && (
                      <div className="mt-2 flex gap-2 overflow-x-auto">
                        {r.imageUrls.map((url, i) => (
                          <img key={i} src={url} alt="" className="h-14 w-14 shrink-0 rounded-md object-cover" />
                        ))}
                      </div>
                    )}
                    {r.createdAt && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {r.createdAt.toDate().toLocaleString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
