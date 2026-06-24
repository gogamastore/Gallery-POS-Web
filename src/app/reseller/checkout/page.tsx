
"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  doc,
  getDoc,
  query,
  writeBatch,
} from "firebase/firestore";
import { db, functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Bike,
  Loader2,
  Package,
  ArrowLeft,
  Search,
  CheckCircle,
  RefreshCw,
  CreditCard,
  Banknote,
  MapPin,
  Truck,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

declare global {
  interface Window {
    snap?: {
      pay: (token: string, options: {
        onSuccess?: (result: unknown) => void;
        onPending?: (result: unknown) => void;
        onError?: (result: unknown) => void;
        onClose?: () => void;
      }) => void;
    };
  }
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);

// ── Types ──────────────────────────────────────────────────────────

interface BiteshipArea {
  id: string;
  name: string;
  postalCode?: string;
  adminName?: string;
}

interface BiteshipRate {
  courierId: string;
  courierName: string;
  courierServiceCode: string;
  serviceName: string;
  description: string;
  price: number;
  originalPrice: number;
  discount: number;
  minDay: number;
  maxDay: number;
  estimatedDelivery: string;
  available: boolean;
  logo?: string;
  category: string;
}

interface UserAddress {
  id: string;
  label: string;
  name: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
  isDefault: boolean;
  latitude?: number;
  longitude?: number;
  biteshipDestinationAreaId?: string;
  biteshipDestinationAreaName?: string;
}

// ── Firebase Functions ─────────────────────────────────────────────

const searchBiteshipAreaFn = httpsCallable<{ input: string }, { areas: BiteshipArea[] }>(functions, "searchBiteshipArea");
const getBiteshipRatesFn = httpsCallable<{
  destinationAreaId: string;
  items: { productId: string; name: string; price: number; quantity: number; weightGram: number }[];
  destinationLatitude?: number;
  destinationLongitude?: number;
}, { rates: BiteshipRate[] }>(functions, "getBiteshipRates");
const createMidtransTransactionFn = httpsCallable<{ orderId: string }, { token: string; redirectUrl: string }>(functions, "createMidtransTransaction");

// ── Helpers ────────────────────────────────────────────────────────

function groupRatesByCategory(rates: BiteshipRate[]) {
  const order = ["same_day", "next_day", "reguler", "cargo"];
  const labels: Record<string, string> = {
    same_day: "Same Day",
    next_day: "Next Day / Express",
    reguler: "Reguler",
    cargo: "Kargo",
  };
  const grouped: Record<string, BiteshipRate[]> = {};
  for (const rate of rates) {
    const cat = rate.category || "reguler";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(rate);
  }
  return order
    .filter((cat) => grouped[cat]?.length)
    .map((cat) => ({ category: cat, label: labels[cat] || cat, rates: grouped[cat] }));
}

// ── Main Component ─────────────────────────────────────────────────

export default function CheckoutPage() {
  const { cart, totalAmount, clearCart, totalItems } = useCart();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  // ── Delivery details ─────────────────────────────────────────────
  const [customerDetails, setCustomerDetails] = useState({
    name: "",
    address: "",
    whatsapp: "",
    city: "",
    postalCode: "",
    province: "",
    notes: "",
  });
  const [userAddresses, setUserAddresses] = useState<UserAddress[]>([]);
  const [isAddressLoading, setIsAddressLoading] = useState(true);

  // ── Delivery type ─────────────────────────────────────────────────
  const [deliveryType, setDeliveryType] = useState<"courier" | "pickup">("courier");

  // ── Koordinat GPS (dari alamat tersimpan, untuk GoSend/Grab/Paxel) ──
  const [addressCoords, setAddressCoords] = useState<{ lat: number; lng: number } | null>(null);

  // ── Biteship area search ──────────────────────────────────────────
  const [areaQuery, setAreaQuery] = useState("");
  const [areaResults, setAreaResults] = useState<BiteshipArea[]>([]);
  const [isSearchingArea, setIsSearchingArea] = useState(false);
  const [showAreaDropdown, setShowAreaDropdown] = useState(false);
  const [selectedArea, setSelectedArea] = useState<BiteshipArea | null>(null);
  const areaSearchRef = useRef<HTMLDivElement>(null);

  // ── Biteship rates ────────────────────────────────────────────────
  const [biteshipRates, setBiteshipRates] = useState<BiteshipRate[]>([]);
  const [isLoadingRates, setIsLoadingRates] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [selectedRate, setSelectedRate] = useState<BiteshipRate | null>(null);

  // ── Payment ───────────────────────────────────────────────────────
  const [paymentMethod, setPaymentMethod] = useState<"midtrans" | "cod">("midtrans");

  // ── Processing ────────────────────────────────────────────────────
  const [isProcessing, setIsProcessing] = useState(false);

  // ── Computed ──────────────────────────────────────────────────────
  const shippingFee = useMemo(() => {
    if (deliveryType === "pickup") return 0;
    return selectedRate?.price ?? 0;
  }, [deliveryType, selectedRate]);

  const grandTotal = useMemo(() => totalAmount + shippingFee, [totalAmount, shippingFee]);

  // ── Effects ───────────────────────────────────────────────────────

  // Load user data on mount
  useEffect(() => {
    if (authLoading || !user) return;
    (async () => {
      setIsAddressLoading(true);
      try {
        const addressesSnap = await getDocs(query(collection(db, `user/${user.uid}/addresses`)));
        const addresses = addressesSnap.docs.map(
          (d) => ({ id: d.id, ...d.data() } as UserAddress)
        );
        setUserAddresses(addresses);

        const defaultAddr = addresses.find((a) => a.isDefault) || addresses[0];
        if (defaultAddr) {
          applyAddress(defaultAddr);
          autoLoadRates(defaultAddr);
        } else {
          const userDoc = await getDoc(doc(db, "user", user.uid));
          if (userDoc.exists()) {
            const ud = userDoc.data();
            setCustomerDetails((prev) => ({
              ...prev,
              name: ud.name || user.displayName || "",
              whatsapp: ud.phone || ud.whatsapp || "",
              address: ud.address || "",
            }));
          }
        }
      } finally {
        setIsAddressLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  // Redirect if cart is empty
  useEffect(() => {
    if (!authLoading && cart.length === 0) {
      toast({ title: "Keranjang Kosong", variant: "destructive" });
      router.push("/reseller");
    }
  }, [cart, authLoading, router, toast]);

  // Close area dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (areaSearchRef.current && !areaSearchRef.current.contains(e.target as Node)) {
        setShowAreaDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto reset payment method when switching delivery type
  useEffect(() => {
    if (deliveryType === "courier" && paymentMethod === "cod") {
      setPaymentMethod("midtrans");
    }
  }, [deliveryType, paymentMethod]);

  // ── Helpers ───────────────────────────────────────────────────────

  function applyAddress(addr: UserAddress) {
    setCustomerDetails({
      name: addr.name,
      whatsapp: addr.phone,
      address: `${addr.address}, ${addr.city}, ${addr.province} ${addr.postalCode}`,
      city: addr.city,
      postalCode: addr.postalCode,
      province: addr.province,
      notes: "",
    });
    // Simpan koordinat GPS agar GoSend/Grab/Paxel bisa muncul
    if (addr.latitude != null && addr.longitude != null) {
      setAddressCoords({ lat: addr.latitude, lng: addr.longitude });
    } else {
      setAddressCoords(null);
    }
  }

  async function autoLoadRates(addr: UserAddress) {
    const coords = addr.latitude != null && addr.longitude != null
      ? { lat: addr.latitude, lng: addr.longitude }
      : null;

    // Fast path: alamat sudah punya biteshipDestinationAreaId
    if (addr.biteshipDestinationAreaId) {
      const area: BiteshipArea = {
        id: addr.biteshipDestinationAreaId,
        name: addr.biteshipDestinationAreaName || addr.city,
        adminName: addr.province,
      };
      setSelectedArea(area);
      setAreaQuery(area.name);
      await fetchRates(area.id, coords ?? undefined);
      return;
    }
    // Fallback: cari area berdasarkan nama kota
    if (addr.city && addr.city.length >= 3) {
      await searchAndAutoSelect(addr.city, addr.postalCode, coords ?? undefined);
    }
  }

  async function searchAndAutoSelect(
    cityQuery: string,
    postalCode?: string,
    coords?: { lat: number; lng: number }
  ) {
    const cleanCity = cityQuery
      .replace(/^(Kota |Kabupaten |Kab\. |Kab |Kec\. |Kec )/i, "")
      .trim();
    const queries = [
      postalCode && postalCode.length >= 3 ? postalCode : null,
      cleanCity,
      cityQuery,
    ].filter(Boolean) as string[];

    for (const q of queries) {
      try {
        setIsSearchingArea(true);
        const res = await searchBiteshipAreaFn({ input: q });
        if (res.data.areas?.length) {
          const area = res.data.areas[0];
          setSelectedArea(area);
          setAreaQuery(area.name);
          await fetchRates(area.id, coords);
          return;
        }
      } catch {
        // lanjut ke query berikutnya
      } finally {
        setIsSearchingArea(false);
      }
    }
    setRatesError(`Area tidak ditemukan untuk "${cityQuery}". Cari manual di bawah.`);
  }

  const fetchRates = useCallback(async (
    areaId: string,
    coords?: { lat: number; lng: number }
  ) => {
    if (!cart.length) return;
    setIsLoadingRates(true);
    setRatesError(null);
    setBiteshipRates([]);
    setSelectedRate(null);
    try {
      const items = cart.map((item) => ({
        productId: item.id,
        name: item.name,
        price: item.finalPrice,
        quantity: item.quantity,
        weightGram: 200,
      }));
      const payload: Parameters<typeof getBiteshipRatesFn>[0] = {
        destinationAreaId: areaId,
        items,
        ...(coords ? { destinationLatitude: coords.lat, destinationLongitude: coords.lng } : {}),
      };
      const res = await getBiteshipRatesFn(payload);
      setBiteshipRates(res.data.rates || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memuat tarif kurir.";
      setRatesError(msg);
    } finally {
      setIsLoadingRates(false);
    }
  }, [cart]);

  // ── Area search with debounce ────────────────────────────────────

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleAreaQueryChange(value: string) {
    setAreaQuery(value);
    setSelectedArea(null);
    setAreaResults([]);
    setBiteshipRates([]);
    setSelectedRate(null);
    setRatesError(null);

    if (value.length < 3) {
      setShowAreaDropdown(false);
      return;
    }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setIsSearchingArea(true);
      setShowAreaDropdown(true);
      try {
        const res = await searchBiteshipAreaFn({ input: value });
        setAreaResults(res.data.areas || []);
      } catch {
        setAreaResults([]);
      } finally {
        setIsSearchingArea(false);
      }
    }, 500);
  }

  function handleAreaSelect(area: BiteshipArea) {
    setSelectedArea(area);
    setAreaQuery(area.name);
    setShowAreaDropdown(false);
    setAreaResults([]);
    // Kirim koordinat tersimpan jika ada (dari alamat yang sedang aktif)
    fetchRates(area.id, addressCoords ?? undefined);
  }

  function handleAddressSelect(addressId: string) {
    const addr = userAddresses.find((a) => a.id === addressId);
    if (!addr) return;
    applyAddress(addr);
    setSelectedArea(null);
    setAreaQuery("");
    setBiteshipRates([]);
    setSelectedRate(null);
    setRatesError(null);
    autoLoadRates(addr);
  }

  // ── Place Order ───────────────────────────────────────────────────

  async function handlePlaceOrder() {
    if (!customerDetails.name || !customerDetails.address || !customerDetails.whatsapp) {
      toast({ title: "Data tidak lengkap", description: "Isi semua detail pengiriman.", variant: "destructive" });
      return;
    }
    if (deliveryType === "courier" && !selectedRate) {
      toast({ title: "Pilih layanan pengiriman", description: "Pilih kurir dan layanan terlebih dahulu.", variant: "destructive" });
      return;
    }
    if (deliveryType === "courier" && !selectedArea) {
      toast({ title: "Pilih area tujuan", description: "Cari dan pilih kota/kecamatan tujuan.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      const orderRef = doc(collection(db, "orders"));
      const now = new Date();

      const shippingMethodName = deliveryType === "pickup"
        ? "Ambil di Toko"
        : `${selectedRate!.courierName} ${selectedRate!.serviceName}`;

      const orderData: Record<string, unknown> = {
        customer: customerDetails.name,
        customerDetails: {
          name: customerDetails.name,
          address: customerDetails.address,
          whatsapp: customerDetails.whatsapp,
        },
        customerId: user?.uid || "guest",
        products: cart.map((item) => ({
          productId: item.id,
          name: item.name,
          price: item.finalPrice,
          quantity: item.quantity,
          imageUrl: item.image,
        })),
        productIds: cart.map((item) => item.id),
        subtotal: totalAmount,
        shippingFee,
        total: grandTotal,
        shippingMethod: shippingMethodName,
        paymentMethod,
        paymentStatus: "Unpaid",
        status: "Pending",
        stockUpdated: true,
        date: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
        stockUpdateTimestamp: now.toISOString(),
      };

      // Tambahkan data Biteship jika kurir
      if (deliveryType === "courier" && selectedRate && selectedArea) {
        orderData.destinationAreaId = selectedArea.id;
        orderData.biteshipCourierCode = selectedRate.courierId;
        orderData.biteshipServiceCode = selectedRate.courierServiceCode;
        orderData.biteshipCourierName = selectedRate.courierName;
        orderData.biteshipServiceName = selectedRate.serviceName;
      }

      const batch = writeBatch(db);
      batch.set(orderRef, orderData);

      // Notifikasi admin
      const notifRef = doc(collection(db, "notifications"));
      batch.set(notifRef, {
        title: "Pesanan Baru",
        body: `Pesanan baru sebesar ${formatCurrency(grandTotal)} dari ${customerDetails.name}.`,
        createdAt: serverTimestamp(),
        type: "new_order",
        relatedId: orderRef.id,
        isRead: false,
      });

      // Kurangi stok
      for (const item of cart) {
        const productRef = doc(db, "products", item.id);
        const productDoc = await getDoc(productRef);
        if (productDoc.exists()) {
          const currentStock = productDoc.data().stock || 0;
          batch.update(productRef, { stock: currentStock - item.quantity });
        }
      }

      await batch.commit();

      // COD → selesai langsung
      if (paymentMethod === "cod") {
        toast({ title: "Pesanan berhasil dibuat!", description: "Silakan ambil di toko." });
        clearCart();
        router.push("/reseller/orders");
        return;
      }

      // Midtrans → buat token + buka Snap
      const txResult = await createMidtransTransactionFn({ orderId: orderRef.id });
      const { token, redirectUrl } = txResult.data;

      clearCart();

      if (window.snap && token) {
        window.snap.pay(token, {
          onSuccess: () => {
            toast({ title: "Pembayaran berhasil!" });
            router.push("/reseller/orders");
          },
          onPending: () => {
            toast({ title: "Pembayaran menunggu konfirmasi." });
            router.push("/reseller/orders");
          },
          onError: () => {
            toast({ title: "Pembayaran gagal. Silakan coba lagi.", variant: "destructive" });
            router.push("/reseller/orders");
          },
          onClose: () => {
            toast({ title: "Pembayaran belum selesai. Selesaikan di halaman pesanan." });
            router.push("/reseller/orders");
          },
        });
      } else {
        // Fallback: buka halaman Midtrans di tab baru
        window.open(redirectUrl, "_blank");
        toast({ title: "Pesanan dibuat!", description: "Selesaikan pembayaran di tab yang terbuka." });
        router.push("/reseller/orders");
      }
    } catch (error) {
      console.error("Error placing order:", error);
      toast({ title: "Gagal Membuat Pesanan", description: "Terjadi kesalahan. Silakan coba lagi.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────

  if (cart.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const groupedRates = groupRatesByCategory(biteshipRates);
  const hasShipping = deliveryType === "pickup" || selectedRate !== null;

  return (
    <div className="container mx-auto px-4 py-8 pb-32 md:pb-8">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Kembali</span>
        </Button>
        <h1 className="text-3xl font-bold font-headline">Checkout</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Left Column ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* 1. Detail Pengiriman */}
          <Card>
            <CardHeader><CardTitle>1. Detail Pengiriman</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {isAddressLoading ? (
                <p className="text-sm text-muted-foreground">Memuat alamat...</p>
              ) : userAddresses.length > 0 ? (
                <div className="space-y-2">
                  <Label>Pilih Alamat Tersimpan</Label>
                  <Select onValueChange={handleAddressSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih dari alamat yang sudah disimpan" />
                    </SelectTrigger>
                    <SelectContent>
                      {userAddresses.map((addr) => (
                        <SelectItem key={addr.id} value={addr.id}>
                          <div className="flex flex-col">
                            <span className="font-semibold">{addr.label || addr.name}</span>
                            <span className="text-xs text-muted-foreground">{addr.address}, {addr.city}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground text-center">atau isi manual di bawah</p>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="name">Nama Penerima</Label>
                <Input id="name" value={customerDetails.name} onChange={(e) => setCustomerDetails((p) => ({ ...p, name: e.target.value }))} placeholder="Nama lengkap penerima" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">Nomor WhatsApp</Label>
                <Input id="whatsapp" value={customerDetails.whatsapp} onChange={(e) => setCustomerDetails((p) => ({ ...p, whatsapp: e.target.value }))} placeholder="Contoh: 081234567890" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Alamat Lengkap</Label>
                <Textarea id="address" value={customerDetails.address} onChange={(e) => setCustomerDetails((p) => ({ ...p, address: e.target.value }))} placeholder="Jalan, No. Rumah, RT/RW, Kelurahan, Kecamatan, Kota, Kode Pos" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Catatan (opsional)</Label>
                <Input id="notes" value={customerDetails.notes} onChange={(e) => setCustomerDetails((p) => ({ ...p, notes: e.target.value }))} placeholder="Petunjuk khusus untuk kurir" />
              </div>
            </CardContent>
          </Card>

          {/* 2. Pilih Pengiriman */}
          <Card>
            <CardHeader><CardTitle>2. Pilih Pengiriman</CardTitle></CardHeader>
            <CardContent className="space-y-4">

              {/* Opsi: Ambil di Toko */}
              <button
                type="button"
                onClick={() => setDeliveryType("pickup")}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-colors text-left",
                  deliveryType === "pickup" ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground/30"
                )}
              >
                <Bike className="h-6 w-6 shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold">Ambil di Toko</p>
                  <p className="text-sm text-muted-foreground">Gratis — ambil langsung di toko kami</p>
                </div>
                {deliveryType === "pickup" && <CheckCircle className="h-5 w-5 text-primary shrink-0" />}
              </button>

              {/* Opsi: Kirim via Kurir */}
              <button
                type="button"
                onClick={() => setDeliveryType("courier")}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-colors text-left",
                  deliveryType === "courier" ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground/30"
                )}
              >
                <Package className="h-6 w-6 shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold">Kirim via Kurir</p>
                  <p className="text-sm text-muted-foreground">JNE · J&T · SiCepat · Anteraja · dan lainnya</p>
                </div>
                {deliveryType === "courier" && <CheckCircle className="h-5 w-5 text-primary shrink-0" />}
              </button>

              {/* Biteship area search + rates (hanya jika kurir) */}
              {deliveryType === "courier" && (
                <div className="space-y-4 pt-2 border-t">
                  <div className="space-y-2" ref={areaSearchRef}>
                    <Label className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Cari Kota / Kecamatan Tujuan
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={areaQuery}
                        onChange={(e) => handleAreaQueryChange(e.target.value)}
                        onFocus={() => areaResults.length > 0 && setShowAreaDropdown(true)}
                        placeholder="Contoh: Jakarta Selatan, Bandung, Surabaya..."
                        className="pl-9 pr-9"
                      />
                      {(isSearchingArea) && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                      {selectedArea && (
                        <button
                          type="button"
                          onClick={() => { setSelectedArea(null); setAreaQuery(""); setBiteshipRates([]); setSelectedRate(null); }}
                          className="absolute right-3 top-1/2 -translate-y-1/2"
                        >
                          <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </button>
                      )}
                    </div>

                    {/* Dropdown hasil pencarian */}
                    {showAreaDropdown && areaResults.length > 0 && (
                      <div className="absolute z-50 w-full max-w-lg mt-1 bg-card border rounded-md shadow-lg max-h-56 overflow-y-auto">
                        {areaResults.map((area) => (
                          <button
                            key={area.id}
                            type="button"
                            onMouseDown={() => handleAreaSelect(area)}
                            className="w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b last:border-b-0"
                          >
                            <p className="font-medium text-sm">{area.name}</p>
                            {area.adminName && <p className="text-xs text-muted-foreground">{area.adminName}</p>}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Area terpilih */}
                    {selectedArea && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                          <CheckCircle className="h-4 w-4 shrink-0" />
                          <span>Tujuan: <strong>{selectedArea.name}</strong>{selectedArea.adminName ? `, ${selectedArea.adminName}` : ""}</span>
                        </div>
                        {addressCoords ? (
                          <p className="text-xs text-green-600 dark:text-green-500 pl-6">
                            📍 Koordinat GPS tersedia — GoSend & Grab akan muncul
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground pl-6">
                            Tanpa GPS — layanan instan (GoSend/Grab) tidak tersedia. Tambahkan lokasi peta di profil alamat.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Loading rates */}
                  {isLoadingRates && (
                    <div className="flex items-center gap-3 py-4 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-sm">Mengambil tarif kurir...</span>
                    </div>
                  )}

                  {/* Error rates */}
                  {ratesError && !isLoadingRates && (
                    <Alert variant="destructive">
                      <AlertDescription className="flex items-center justify-between gap-2">
                        <span className="text-sm">{ratesError}</span>
                        {selectedArea && (
                          <Button variant="outline" size="sm" onClick={() => fetchRates(selectedArea.id)}>
                            <RefreshCw className="h-3 w-3 mr-1" /> Coba lagi
                          </Button>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Daftar tarif kurir */}
                  {!isLoadingRates && biteshipRates.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{biteshipRates.length} layanan tersedia</span>
                      </div>
                      {groupedRates.map(({ category, label, rates }) => (
                        <div key={category}>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{label}</p>
                          <div className="space-y-2">
                            {rates.map((rate) => {
                              const isSelected = selectedRate?.courierId === rate.courierId && selectedRate?.courierServiceCode === rate.courierServiceCode;
                              return (
                                <button
                                  key={`${rate.courierId}-${rate.courierServiceCode}`}
                                  type="button"
                                  onClick={() => setSelectedRate(rate)}
                                  className={cn(
                                    "w-full flex items-center justify-between p-3 rounded-lg border-2 transition-colors text-left",
                                    isSelected ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground/30"
                                  )}
                                >
                                  <div className="flex items-center gap-3">
                                    {rate.logo ? (
                                      <Image src={rate.logo} alt={rate.courierName} width={36} height={20} className="object-contain" />
                                    ) : (
                                      <div className="w-9 h-5 bg-muted rounded flex items-center justify-center">
                                        <Truck className="h-3 w-3 text-muted-foreground" />
                                      </div>
                                    )}
                                    <div>
                                      <p className="font-semibold text-sm">{rate.courierName} <span className="font-normal">{rate.serviceName}</span></p>
                                      <p className="text-xs text-muted-foreground">{rate.estimatedDelivery}</p>
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    {rate.discount > 0 && (
                                      <p className="text-xs line-through text-muted-foreground">{formatCurrency(rate.originalPrice)}</p>
                                    )}
                                    <p className={cn("font-bold text-sm", isSelected && "text-primary")}>{formatCurrency(rate.price)}</p>
                                    {rate.discount > 0 && (
                                      <Badge variant="secondary" className="text-xs mt-0.5">Hemat {formatCurrency(rate.discount)}</Badge>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Belum ada rates tapi area sudah dipilih */}
                  {!isLoadingRates && !ratesError && selectedArea && biteshipRates.length === 0 && (
                    <p className="text-sm text-muted-foreground py-2">Tidak ada layanan kurir tersedia untuk area ini.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 3. Metode Pembayaran */}
          <Card>
            <CardHeader><CardTitle>3. Metode Pembayaran</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {/* Midtrans */}
              <button
                type="button"
                onClick={() => setPaymentMethod("midtrans")}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-colors text-left",
                  paymentMethod === "midtrans" ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20" : "border-muted hover:border-muted-foreground/30"
                )}
              >
                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0">
                  <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Bayar via Midtrans</p>
                  <p className="text-xs text-muted-foreground">GoPay · ShopeePay · QRIS · BCA/BNI/BRI VA · Indomaret · Alfamart · Kartu Kredit</p>
                </div>
                {paymentMethod === "midtrans" && <CheckCircle className="h-5 w-5 text-blue-500 shrink-0" />}
              </button>

              {paymentMethod === "midtrans" && (
                <div className="flex flex-wrap gap-1.5 pl-4">
                  {["GoPay", "ShopeePay", "QRIS", "BCA VA", "BNI VA", "BRI VA", "Mandiri", "Indomaret", "Alfamart", "Kartu Kredit"].map((m) => (
                    <Badge key={m} variant="outline" className="text-xs">{m}</Badge>
                  ))}
                </div>
              )}

              {/* COD — hanya untuk Ambil di Toko */}
              {deliveryType === "pickup" && (
                <button
                  type="button"
                  onClick={() => setPaymentMethod("cod")}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-colors text-left",
                    paymentMethod === "cod" ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-muted hover:border-muted-foreground/30"
                  )}
                >
                  <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center shrink-0">
                    <Banknote className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">COD — Bayar di Tempat</p>
                    <p className="text-xs text-muted-foreground">Siapkan uang pas saat pengambilan di toko</p>
                  </div>
                  {paymentMethod === "cod" && <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />}
                </button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right Column: Ringkasan ── */}
        <div className="hidden lg:block">
          <Card className="sticky top-20">
            <CardHeader><CardTitle>Ringkasan Pesanan</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Image src={item.image} alt={item.name} width={48} height={48} className="rounded-md object-cover shrink-0" />
                      <div>
                        <p className="font-medium text-sm leading-tight">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.quantity} × {formatCurrency(item.finalPrice)}</p>
                      </div>
                    </div>
                    <p className="text-sm font-medium shrink-0">{formatCurrency(item.finalPrice * item.quantity)}</p>
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal ({totalItems} item)</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Ongkos Kirim</span>
                  <span className={cn(!hasShipping && deliveryType === "courier" && "text-orange-500")}>
                    {deliveryType === "pickup" ? "Gratis" : selectedRate ? formatCurrency(shippingFee) : "Belum dipilih"}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total</span>
                  <span>{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                size="lg"
                onClick={handlePlaceOrder}
                disabled={isProcessing || !hasShipping}
              >
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isProcessing ? "Memproses..." : paymentMethod === "cod" ? "Buat Pesanan" : "Buat Pesanan & Bayar"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* ── Sticky Mobile Footer ── */}
      <div className="lg:hidden fixed bottom-16 left-0 w-full bg-card border-t p-3 shadow-lg z-40">
        <div className="container mx-auto px-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="font-bold text-lg text-primary">{formatCurrency(grandTotal)}</p>
            {!hasShipping && deliveryType === "courier" && (
              <p className="text-xs text-orange-500">Pilih kurir dulu</p>
            )}
          </div>
          <Button
            onClick={handlePlaceOrder}
            disabled={isProcessing || !hasShipping}
            className="shrink-0"
          >
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {paymentMethod === "cod" ? "Buat Pesanan" : "Bayar Sekarang"}
          </Button>
        </div>
      </div>
    </div>
  );
}
