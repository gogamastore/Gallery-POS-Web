"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { db, functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
  writeBatch,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  PlusCircle,
  Trash2,
  ArrowLeft,
  Home,
  User,
  Phone,
  MapPin,
  Edit2,
  CheckCircle2,
  Search,
  Navigation,
  X,
  AlertCircle,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useRouter } from "next/navigation";
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

// ── Types ──────────────────────────────────────────────────────────

interface BiteshipArea {
  id: string;
  name: string;
  postalCode: string;
  adminName: string;
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

type AddressForm = Omit<UserAddress, "id">;

const emptyForm = (): AddressForm => ({
  label: "",
  name: "",
  address: "",
  phone: "",
  city: "",
  province: "",
  postalCode: "",
  isDefault: false,
  latitude: undefined,
  longitude: undefined,
  biteshipDestinationAreaId: undefined,
  biteshipDestinationAreaName: undefined,
});

// ── Firebase Function (authenticated Biteship search) ──────────────

const searchBiteshipAreaFn = httpsCallable<
  { input: string },
  { areas: BiteshipArea[] }
>(functions, "searchBiteshipArea");

// ── MapPicker (sub-component, hanya render saat sheet terbuka) ──────

interface MapPickerProps {
  initialLat?: number;
  initialLng?: number;
  onLocationPicked: (lat: number, lng: number) => void;
}

function MapPicker({ initialLat, initialLng, onLocationPicked }: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Load Google Maps weekly channel (production stable, tidak perlu beta/mapId)
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;

    (async () => {
      try {
        const { setOptions, importLibrary } = await import("@googlemaps/js-api-loader");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (setOptions as any)({
          key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
          version: "weekly",
        });
        await importLibrary("maps");
        if (!cancelled) setMapLoaded(true);
      } catch (e) {
        console.error("Gagal memuat Google Maps:", e);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // Init map setelah library siap
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || mapInstanceRef.current) return;

    const center = {
      lat: initialLat ?? -5.1640848,
      lng: initialLng ?? 119.4686043,
    };

    const map = new google.maps.Map(mapRef.current, {
      center,
      zoom: initialLat ? 17 : 13,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
    mapInstanceRef.current = map;

    // google.maps.Marker (production, tidak perlu mapId)
    const marker = new google.maps.Marker({
      map,
      position: center,
      draggable: true,
      title: "Lokasi Anda",
    });
    markerRef.current = marker;

    // Klik peta → pindah pin
    map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      marker.setPosition({ lat, lng });
      onLocationPicked(lat, lng);
    });

    // Drag pin selesai → update koordinat
    marker.addListener("dragend", () => {
      const pos = marker.getPosition();
      if (!pos) return;
      onLocationPicked(pos.lat(), pos.lng());
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded]);

  const goToMyLocation = () => {
    if (!navigator.geolocation) return;
    setIsGeocoding(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        mapInstanceRef.current?.panTo({ lat, lng });
        mapInstanceRef.current?.setZoom(17);
        markerRef.current?.setPosition({ lat, lng });
        onLocationPicked(lat, lng);
        setIsGeocoding(false);
      },
      () => setIsGeocoding(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <div ref={mapRef} className="w-full h-64 rounded-lg border bg-muted" />
        {!mapLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted rounded-lg gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Memuat peta...</p>
          </div>
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={goToMyLocation}
        disabled={isGeocoding || !mapLoaded}
      >
        {isGeocoding ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Navigation className="mr-2 h-4 w-4" />
        )}
        Gunakan Lokasi Saya Sekarang
      </Button>
    </div>
  );
}

// ── Main Page Component ────────────────────────────────────────────

export default function AddressPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);
  const [form, setForm] = useState<AddressForm>(emptyForm());
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  // Biteship area search
  const [areaQuery, setAreaQuery] = useState("");
  const [areaResults, setAreaResults] = useState<BiteshipArea[]>([]);
  const [isSearchingArea, setIsSearchingArea] = useState(false);
  const [showAreaDropdown, setShowAreaDropdown] = useState(false);
  const areaRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch addresses ─────────────────────────────────────────────

  const fetchAddresses = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const q = query(
        collection(db, `user/${user.uid}/addresses`),
        orderBy("created_at", "desc")
      );
      const snap = await getDocs(q);
      setAddresses(snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserAddress)));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) fetchAddresses();
  }, [user, authLoading, fetchAddresses]);

  // Close area dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (areaRef.current && !areaRef.current.contains(e.target as Node)) {
        setShowAreaDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Sheet helpers ───────────────────────────────────────────────

  function openAddSheet() {
    setEditingAddress(null);
    setForm(emptyForm());
    setAreaQuery("");
    setAreaResults([]);
    setSheetOpen(true);
  }

  function openEditSheet(addr: UserAddress) {
    setEditingAddress(addr);
    setForm({
      label: addr.label,
      name: addr.name,
      address: addr.address,
      phone: addr.phone,
      city: addr.city,
      province: addr.province,
      postalCode: addr.postalCode,
      isDefault: addr.isDefault,
      latitude: addr.latitude,
      longitude: addr.longitude,
      biteshipDestinationAreaId: addr.biteshipDestinationAreaId,
      biteshipDestinationAreaName: addr.biteshipDestinationAreaName,
    });
    setAreaQuery(addr.biteshipDestinationAreaName || "");
    setAreaResults([]);
    setSheetOpen(true);
  }

  function closeSheet() {
    setSheetOpen(false);
    setEditingAddress(null);
    setForm(emptyForm());
    setAreaQuery("");
    setAreaResults([]);
  }

  // ── Reverse geocoding (koordinat → alamat) ──────────────────────

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setIsReverseGeocoding(true);
    try {
      const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}&language=id&result_type=street_address|sublocality|locality`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.status === "OK" && data.results.length > 0) {
        const comps = data.results[0].address_components as Array<{
          long_name: string; types: string[];
        }>;

        let streetNum = "", route = "", sublocality = "", locality = "";
        let city = "", province = "", postalCode = "";

        for (const c of comps) {
          if (c.types.includes("street_number")) streetNum = c.long_name;
          if (c.types.includes("route")) route = c.long_name;
          if (c.types.includes("sublocality_level_1") || c.types.includes("sublocality")) sublocality = c.long_name;
          if (c.types.includes("locality")) locality = c.long_name;
          if (c.types.includes("administrative_area_level_2")) city = c.long_name;
          if (c.types.includes("administrative_area_level_1")) province = c.long_name;
          if (c.types.includes("postal_code")) postalCode = c.long_name;
        }

        const fullAddress = [
          route ? `${route}${streetNum ? ` No.${streetNum}` : ""}` : "",
          sublocality,
          locality,
        ].filter(Boolean).join(", ");

        setForm((prev) => ({
          ...prev,
          address: fullAddress || prev.address,
          city: city || locality || prev.city,
          province: province || prev.province,
          postalCode: postalCode || prev.postalCode,
        }));

        // Auto-search Biteship area dari kode pos
        if (postalCode) autoSearchBiteshipArea(postalCode);
      }
    } catch (e) {
      console.error("Reverse geocode error:", e);
    } finally {
      setIsReverseGeocoding(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handler saat user klik/pilih lokasi di peta ─────────────────

  const handleLocationPicked = useCallback(
    (lat: number, lng: number) => {
      setForm((prev) => ({ ...prev, latitude: lat, longitude: lng }));
      reverseGeocode(lat, lng);
    },
    [reverseGeocode]
  );

  // ── Biteship area: auto-search dari kode pos ────────────────────

  async function autoSearchBiteshipArea(postalCode: string) {
    try {
      const res = await searchBiteshipAreaFn({ input: postalCode });
      const areas = res.data.areas || [];
      if (areas.length === 1) {
        selectArea(areas[0]);
      } else if (areas.length > 1) {
        setAreaResults(areas);
        setAreaQuery(postalCode);
        setShowAreaDropdown(true);
      }
    } catch {
      // silent — user bisa cari manual
    }
  }

  // ── Biteship area: manual search dengan debounce ────────────────

  function handleAreaQueryChange(value: string) {
    setAreaQuery(value);
    if (!value) {
      setForm((prev) => ({
        ...prev,
        biteshipDestinationAreaId: undefined,
        biteshipDestinationAreaName: undefined,
      }));
      setAreaResults([]);
      setShowAreaDropdown(false);
      return;
    }
    if (value.length < 3) { setShowAreaDropdown(false); return; }
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

  function selectArea(area: BiteshipArea) {
    setAreaQuery(area.name);
    setShowAreaDropdown(false);
    setAreaResults([]);
    setForm((prev) => ({
      ...prev,
      biteshipDestinationAreaId: area.id,
      biteshipDestinationAreaName: area.name,
      postalCode: prev.postalCode || area.postalCode || "",
    }));
  }

  function clearArea() {
    setAreaQuery("");
    setForm((prev) => ({
      ...prev,
      biteshipDestinationAreaId: undefined,
      biteshipDestinationAreaName: undefined,
    }));
  }

  // ── Save ───────────────────────────────────────────────────────

  async function handleSave() {
    if (!user) return;
    const required: (keyof AddressForm)[] = ["label", "name", "phone", "address", "city", "province", "postalCode"];
    for (const f of required) {
      if (!form[f]) {
        toast({
          title: "Data tidak lengkap",
          description: `Field "${f}" wajib diisi.`,
          variant: "destructive",
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const data: Record<string, unknown> = {
        label: form.label,
        name: form.name,
        phone: form.phone,
        address: form.address,
        city: form.city,
        province: form.province,
        postalCode: form.postalCode,
        isDefault: form.isDefault,
        updated_at: serverTimestamp(),
      };

      if (form.latitude != null && form.longitude != null) {
        data.latitude = form.latitude;
        data.longitude = form.longitude;
      }
      if (form.biteshipDestinationAreaId) {
        data.biteshipDestinationAreaId = form.biteshipDestinationAreaId;
        data.biteshipDestinationAreaName = form.biteshipDestinationAreaName ?? "";
      }

      // Reset isDefault pada alamat lain jika ini dijadikan default
      if (form.isDefault) {
        const batch = writeBatch(db);
        for (const addr of addresses) {
          if (addr.id !== editingAddress?.id && addr.isDefault) {
            batch.update(doc(db, `user/${user.uid}/addresses`, addr.id), { isDefault: false });
          }
        }
        await batch.commit();
      }

      if (editingAddress) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await updateDoc(doc(db, `user/${user.uid}/addresses`, editingAddress.id), data as any);
        toast({ title: "Alamat berhasil diperbarui" });
      } else {
        await addDoc(collection(db, `user/${user.uid}/addresses`), {
          ...data,
          created_at: serverTimestamp(),
        });
        toast({ title: "Alamat baru berhasil disimpan" });
      }

      closeSheet();
      fetchAddresses();
    } catch (err) {
      console.error(err);
      toast({ title: "Gagal menyimpan alamat", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────

  async function handleDelete(addressId: string) {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `user/${user.uid}/addresses`, addressId));
      toast({ title: "Alamat berhasil dihapus" });
      fetchAddresses();
    } catch {
      toast({ title: "Gagal menghapus alamat", variant: "destructive" });
    }
  }

  // ── Guards ─────────────────────────────────────────────────────

  if (authLoading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!user) { router.replace("/login"); return null; }

  const hasCoords = form.latitude != null && form.longitude != null;
  const hasBiteshipArea = !!form.biteshipDestinationAreaId;

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold font-headline">Alamat Saya</h1>
      </div>

      {/* Address list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Buku Alamat</CardTitle>
            <CardDescription>Kelola alamat pengiriman untuk checkout yang lebih cepat.</CardDescription>
          </div>
          <Button onClick={openAddSheet}>
            <PlusCircle className="mr-2 h-4 w-4" />Tambah
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Memuat alamat...</p>
          ) : addresses.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed rounded-lg text-muted-foreground">
              <Home className="mx-auto h-10 w-10 mb-3 opacity-40" />
              <p>Belum ada alamat tersimpan.</p>
              <Button variant="link" onClick={openAddSheet}>Tambah alamat pertama</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {addresses.map((addr) => (
                <div key={addr.id} className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold">{addr.label}</p>
                      {addr.isDefault && <Badge>Utama</Badge>}
                      {addr.latitude != null ? (
                        <Badge variant="outline" className="text-xs text-green-600 border-green-400">📍 GPS</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-orange-500 border-orange-400">Tanpa GPS</Badge>
                      )}
                      {addr.biteshipDestinationAreaId ? (
                        <Badge variant="outline" className="text-xs text-blue-600 border-blue-400">✓ Ongkir Siap</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">Ongkir Manual</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => openEditSheet(addr)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Hapus Alamat?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Alamat <strong>{addr.label}</strong> akan dihapus permanen.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(addr.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Hapus
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p className="flex items-center gap-2"><User className="h-3.5 w-3.5 shrink-0" />{addr.name}</p>
                    <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 shrink-0" />{addr.phone}</p>
                    <p className="flex items-center gap-2">
                      <Home className="h-3.5 w-3.5 shrink-0" />
                      {addr.address}, {addr.city}, {addr.province} {addr.postalCode}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Add/Edit Sheet ── */}
      <Sheet open={sheetOpen} onOpenChange={(open) => !open && closeSheet()}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingAddress ? "Ubah Alamat" : "Tambah Alamat Baru"}</SheetTitle>
            <SheetDescription>
              Pin lokasi di peta untuk mengisi data otomatis.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 py-6">

            {/* ── Langkah 1: Pilih Lokasi di Peta ── */}
            <section className="space-y-3">
              <h3 className="font-semibold text-sm">
                Langkah 1: Tentukan Lokasi di Peta
              </h3>

              {/* Map hanya dirender saat sheet terbuka */}
              {sheetOpen && (
                <MapPicker
                  initialLat={form.latitude}
                  initialLng={form.longitude}
                  onLocationPicked={handleLocationPicked}
                />
              )}

              {/* Status koordinat + reverse geocode */}
              <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-3">
                <div className="flex items-center gap-2">
                  {hasCoords ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium">
                    {hasCoords ? "Koordinat tersimpan" : "Belum ada koordinat"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {isReverseGeocoding && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />Mencari alamat...
                    </span>
                  )}
                  {hasCoords && (
                    <Badge variant="default" className="bg-green-600 text-xs font-mono">
                      {form.latitude?.toFixed(5)}, {form.longitude?.toFixed(5)}
                    </Badge>
                  )}
                </div>
              </div>
            </section>

            {/* ── Langkah 2: Data Alamat ── */}
            <section className="space-y-4">
              <h3 className="font-semibold text-sm">
                Langkah 2: Lengkapi Data Alamat
                {isReverseGeocoding && (
                  <span className="text-xs font-normal text-muted-foreground ml-2">(mengisi otomatis...)</span>
                )}
              </h3>

              <div className="space-y-1.5">
                <Label htmlFor="label">Label Alamat <span className="text-destructive">*</span></Label>
                <Input id="label" value={form.label} onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))} placeholder="Contoh: Rumah, Kantor, Toko" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name">Nama Penerima <span className="text-destructive">*</span></Label>
                <Input id="name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Nama lengkap penerima" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Nomor Telepon / WhatsApp <span className="text-destructive">*</span></Label>
                <Input id="phone" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} placeholder="628xxxxxxxxxx" inputMode="tel" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address">Alamat Lengkap <span className="text-destructive">*</span></Label>
                <Textarea id="address" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} placeholder="Jalan, No. Rumah, RT/RW, Kelurahan, Kecamatan" rows={3} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="city">Kota <span className="text-destructive">*</span></Label>
                  <Input id="city" value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} placeholder="Makassar" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="province">Provinsi <span className="text-destructive">*</span></Label>
                  <Input id="province" value={form.province} onChange={(e) => setForm((p) => ({ ...p, province: e.target.value }))} placeholder="Sulawesi Selatan" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="postalCode">Kode Pos <span className="text-destructive">*</span></Label>
                <Input id="postalCode" value={form.postalCode} onChange={(e) => setForm((p) => ({ ...p, postalCode: e.target.value }))} placeholder="90234" inputMode="numeric" />
              </div>
            </section>

            {/* ── Langkah 3: Area Ongkir Biteship ── */}
            <section className="space-y-3">
              <h3 className="font-semibold text-sm">
                Langkah 3: Area Ongkir
                <span className="text-muted-foreground font-normal ml-1">(otomatis dari peta)</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Pilih area agar tarif kurir tampil instan saat checkout.
              </p>

              <div className="relative" ref={areaRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={areaQuery}
                    onChange={(e) => handleAreaQueryChange(e.target.value)}
                    onFocus={() => areaResults.length > 0 && setShowAreaDropdown(true)}
                    placeholder="Cari kecamatan / kota / kode pos..."
                    className="pl-9 pr-9"
                  />
                  {isSearchingArea && (
                    <Loader2 className="absolute right-9 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  {hasBiteshipArea && (
                    <button type="button" onClick={clearArea} className="absolute right-3 top-1/2 -translate-y-1/2">
                      <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </button>
                  )}
                </div>

                {showAreaDropdown && areaResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-card border rounded-md shadow-lg max-h-52 overflow-y-auto">
                    {areaResults.map((area) => (
                      <button
                        key={area.id}
                        type="button"
                        onMouseDown={() => selectArea(area)}
                        className="w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b last:border-b-0"
                      >
                        <p className="font-medium text-sm">{area.name}</p>
                        {area.adminName && <p className="text-xs text-muted-foreground">{area.adminName}</p>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {hasBiteshipArea ? (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                  <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">{form.biteshipDestinationAreaName}</p>
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Belum dipilih — ongkir perlu dicari manual saat checkout. Pin lokasi di peta untuk otomatis mengisi ini.
                  </AlertDescription>
                </Alert>
              )}
            </section>

            {/* ── Default toggle ── */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium text-sm">Jadikan Alamat Utama</p>
                <p className="text-xs text-muted-foreground">Dipilih otomatis saat checkout</p>
              </div>
              <Switch
                checked={form.isDefault}
                onCheckedChange={(v) => setForm((p) => ({ ...p, isDefault: v }))}
              />
            </div>

            {/* ── Save Button ── */}
            <Button className="w-full" size="lg" onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingAddress ? "Simpan Perubahan" : "Simpan Alamat"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
