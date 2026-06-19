"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, MapPin, Search, CheckCircle2, Store, AlertCircle } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BiteshipArea {
  id: string;
  name: string;
  postalCode: number;
  adminName: string;
}

interface StoreSettings {
  // Informasi toko
  storeName: string;
  storePhone: string;
  storeEmail: string;

  // Alamat lengkap
  address: string;
  city: string;
  province: string;
  postalCode: string;

  // Koordinat GPS
  latitude: number | null;
  longitude: number | null;

  // Biteship origin
  biteshipOriginAreaId: string;
  biteshipOriginAreaName: string;

  updatedAt?: Date;
}

const defaultSettings: StoreSettings = {
  storeName: "Gogama Store",
  storePhone: "6289636052501",
  storeEmail: "",
  address: "",
  city: "",
  province: "",
  postalCode: "",
  latitude: null,
  longitude: null,
  biteshipOriginAreaId: "",
  biteshipOriginAreaName: "",
};

// ─── Komponen Utama ───────────────────────────────────────────────────────────

export default function StoreAddressPage() {
  const [settings, setSettings] = useState<StoreSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  // Google Maps
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isGeocodingReverse, setIsGeocodingReverse] = useState(false);

  // Biteship area search
  const [areaSearchQuery, setAreaSearchQuery] = useState("");
  const [areaResults, setAreaResults] = useState<BiteshipArea[]>([]);
  const [isSearchingArea, setIsSearchingArea] = useState(false);
  const [showAreaDropdown, setShowAreaDropdown] = useState(false);
  const areaSearchRef = useRef<HTMLDivElement>(null);

  // ── Load data dari Firestore ─────────────────────────────────────────────
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const docRef = doc(db, "settings", "store");
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setSettings({ ...defaultSettings, ...snap.data() as StoreSettings });
        }
      } catch (e) {
        console.error("Error loading store settings:", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  // ── Load Google Maps — @googlemaps/js-api-loader v2.x functional API ────
  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadMap = async () => {
      try {
        const { setOptions, importLibrary } = await import("@googlemaps/js-api-loader");

        // v2.x: pakai setOptions() untuk set API key, bukan Loader class
        setOptions({
          key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
          version: "beta",
        });

        // Load library yang dibutuhkan
        await importLibrary("maps");
        await importLibrary("marker");

        setMapLoaded(true);
      } catch (e) {
        console.error("Gagal memuat Google Maps:", e);
      }
    };

    loadMap();
  }, []);

  // ── Inisialisasi peta setelah Maps API siap ──────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || mapInstanceRef.current) return;

    const defaultCenter = {
      lat: settings.latitude ?? -5.1640848,
      lng: settings.longitude ?? 119.4686043,
    };

    const map = new google.maps.Map(mapRef.current, {
      center: defaultCenter,
      zoom: 16,
      mapId: "gogama_store_map",
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    mapInstanceRef.current = map;

    const marker = new google.maps.marker.AdvancedMarkerElement({
      map,
      position: defaultCenter,
      title: "Lokasi Toko",
    });
    markerRef.current = marker;

    map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      marker.position = { lat, lng };
      setSettings((prev) => ({ ...prev, latitude: lat, longitude: lng }));
      reverseGeocode(lat, lng);
    });
  }, [mapLoaded]);

  // ── Reverse geocoding: koordinat → alamat ───────────────────────────────
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setIsGeocodingReverse(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=id&result_type=street_address|sublocality|locality`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.status === "OK" && data.results.length > 0) {
        const components = data.results[0].address_components as Array<{
          long_name: string;
          types: string[];
        }>;

        let streetNumber = "";
        let route = "";
        let sublocality = "";
        let locality = "";
        let city = "";
        let province = "";
        let postalCode = "";

        for (const c of components) {
          if (c.types.includes("street_number")) streetNumber = c.long_name;
          if (c.types.includes("route")) route = c.long_name;
          if (c.types.includes("sublocality_level_1") || c.types.includes("sublocality"))
            sublocality = c.long_name;
          if (c.types.includes("locality")) locality = c.long_name;
          if (c.types.includes("administrative_area_level_2")) city = c.long_name;
          if (c.types.includes("administrative_area_level_1")) province = c.long_name;
          if (c.types.includes("postal_code")) postalCode = c.long_name;
        }

        const streetParts = [
          route ? `${route}${streetNumber ? ` No.${streetNumber}` : ""}` : "",
          sublocality,
          locality,
        ].filter(Boolean);
        const fullAddress = streetParts.join(", ");
        const resolvedCity = city || locality;

        setSettings((prev) => ({
          ...prev,
          address: fullAddress || prev.address,
          city: resolvedCity || prev.city,
          province: province || prev.province,
          postalCode: postalCode || prev.postalCode,
        }));

        // Auto-search Biteship area dari kode pos
        if (postalCode) {
          await searchBiteshipAreaByQuery(postalCode);
        }
      }
    } catch (e) {
      console.error("Reverse geocode error:", e);
    } finally {
      setIsGeocodingReverse(false);
    }
  }, []);

  // ── Cari area Biteship ───────────────────────────────────────────────────
  const searchBiteshipAreaByQuery = async (query: string) => {
    if (query.length < 3) return;
    setIsSearchingArea(true);
    try {
      const res = await fetch(
        `https://api.biteship.com/v1/maps/areas?countries=ID&input=${encodeURIComponent(query)}&type=single`,
        {
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_BITESHIP_API_KEY}`,
          },
        }
      );
      const data = await res.json();
      if (data.success && data.areas?.length > 0) {
        setAreaResults(
          data.areas.map((a: Record<string, unknown>) => ({
            id: a.id as string,
            name: a.name as string,
            postalCode: a.postal_code as number,
            adminName: [
              a.administrative_division_level_1_name,
              a.administrative_division_level_2_name,
            ]
              .filter(Boolean)
              .join(", "),
          }))
        );
        setShowAreaDropdown(true);

        // Auto-pilih jika hanya 1 hasil
        if (data.areas.length === 1) {
          selectBiteshipArea({
            id: data.areas[0].id,
            name: data.areas[0].name,
            postalCode: data.areas[0].postal_code,
            adminName: [
              data.areas[0].administrative_division_level_1_name,
              data.areas[0].administrative_division_level_2_name,
            ]
              .filter(Boolean)
              .join(", "),
          });
        }
      }
    } catch (e) {
      console.error("Biteship area search error:", e);
    } finally {
      setIsSearchingArea(false);
    }
  };

  const selectBiteshipArea = (area: BiteshipArea) => {
    setSettings((prev) => ({
      ...prev,
      biteshipOriginAreaId: area.id,
      biteshipOriginAreaName: area.name,
      postalCode: area.postalCode.toString() || prev.postalCode,
    }));
    setAreaSearchQuery(area.name);
    setShowAreaDropdown(false);
    setAreaResults([]);
  };

  // ── Tombol lokasi saya ───────────────────────────────────────────────────
  const goToMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      mapInstanceRef.current?.panTo({ lat, lng });
      mapInstanceRef.current?.setZoom(17);
      if (markerRef.current) {
        markerRef.current.position = { lat, lng };
      }
      setSettings((prev) => ({ ...prev, latitude: lat, longitude: lng }));
      reverseGeocode(lat, lng);
    });
  };

  // ── Simpan ke Firestore ──────────────────────────────────────────────────
  const handleSave = async () => {
    if (!settings.biteshipOriginAreaId) {
      alert("Pilih Area Biteship terlebih dahulu sebelum menyimpan.");
      return;
    }

    setIsSaving(true);
    setSaveStatus("idle");
    try {
      await setDoc(
        doc(db, "settings", "store"),
        {
          ...settings,
          updatedAt: new Date(),
        },
        { merge: true }
      );
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (e) {
      console.error("Error saving store settings:", e);
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasCoordinates = settings.latitude !== null && settings.longitude !== null;
  const hasBiteshipArea = !!settings.biteshipOriginAreaId;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alamat Toko</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Atur alamat dan koordinat toko sebagai titik asal pengiriman Biteship.
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} size="lg">
          {isSaving ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</>
          ) : (
            <><Store className="mr-2 h-4 w-4" /> Simpan Pengaturan</>
          )}
        </Button>
      </div>

      {/* Status alert */}
      {saveStatus === "success" && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            Pengaturan toko berhasil disimpan!
          </AlertDescription>
        </Alert>
      )}
      {saveStatus === "error" && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            Gagal menyimpan. Coba lagi.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kiri: Peta Google Maps */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Pilih Lokasi Toko di Peta
            </CardTitle>
            <CardDescription>
              Klik pada peta untuk menentukan titik koordinat toko Anda.
              Alamat akan terisi otomatis.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Peta */}
            <div className="relative">
              <div
                ref={mapRef}
                className="w-full h-80 rounded-lg border bg-muted"
              />
              {!mapLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
              {isGeocodingReverse && (
                <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm flex items-center gap-2 shadow">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Mencari alamat...
                </div>
              )}
            </div>

            {/* Tombol Lokasi Saya */}
            <Button
              variant="outline"
              className="w-full"
              onClick={goToMyLocation}
            >
              <MapPin className="mr-2 h-4 w-4" />
              Gunakan Lokasi Saya Sekarang
            </Button>

            {/* Status koordinat */}
            <div className="rounded-lg bg-muted px-4 py-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status Koordinat</span>
                {hasCoordinates ? (
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Tersedia
                  </Badge>
                ) : (
                  <Badge variant="secondary">Belum dipilih</Badge>
                )}
              </div>
              {hasCoordinates && (
                <p className="text-xs text-muted-foreground font-mono">
                  {settings.latitude?.toFixed(6)}, {settings.longitude?.toFixed(6)}
                </p>
              )}
            </div>

            {/* Status Biteship Area */}
            <div className="rounded-lg bg-muted px-4 py-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Biteship Origin Area</span>
                {hasBiteshipArea ? (
                  <Badge variant="default" className="bg-blue-600">
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Terset
                  </Badge>
                ) : (
                  <Badge variant="secondary">Belum dipilih</Badge>
                )}
              </div>
              {hasBiteshipArea && (
                <>
                  <p className="text-xs text-muted-foreground">
                    {settings.biteshipOriginAreaName}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {settings.biteshipOriginAreaId}
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Kanan: Form data toko */}
        <div className="space-y-6">
          {/* Informasi Toko */}
          <Card>
            <CardHeader>
              <CardTitle>Informasi Toko</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nama Toko</Label>
                <Input
                  value={settings.storeName}
                  onChange={(e) => setSettings((p) => ({ ...p, storeName: e.target.value }))}
                  placeholder="Gogama Store"
                />
              </div>
              <div className="space-y-2">
                <Label>Nomor WhatsApp / Telepon</Label>
                <Input
                  value={settings.storePhone}
                  onChange={(e) => setSettings((p) => ({ ...p, storePhone: e.target.value }))}
                  placeholder="628xxxxxxxxxx"
                />
              </div>
              <div className="space-y-2">
                <Label>Email Toko</Label>
                <Input
                  type="email"
                  value={settings.storeEmail}
                  onChange={(e) => setSettings((p) => ({ ...p, storeEmail: e.target.value }))}
                  placeholder="toko@example.com"
                />
              </div>
            </CardContent>
          </Card>

          {/* Alamat Toko */}
          <Card>
            <CardHeader>
              <CardTitle>Alamat Toko</CardTitle>
              <CardDescription>
                Terisi otomatis dari peta. Bisa diedit manual.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Alamat Lengkap</Label>
                <Input
                  value={settings.address}
                  onChange={(e) => setSettings((p) => ({ ...p, address: e.target.value }))}
                  placeholder="Jl. Borong Raya No.100"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Kota</Label>
                  <Input
                    value={settings.city}
                    onChange={(e) => setSettings((p) => ({ ...p, city: e.target.value }))}
                    placeholder="Makassar"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Provinsi</Label>
                  <Input
                    value={settings.province}
                    onChange={(e) => setSettings((p) => ({ ...p, province: e.target.value }))}
                    placeholder="Sulawesi Selatan"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Kode Pos</Label>
                <Input
                  value={settings.postalCode}
                  onChange={(e) => setSettings((p) => ({ ...p, postalCode: e.target.value }))}
                  placeholder="90234"
                />
              </div>
            </CardContent>
          </Card>

          {/* Biteship Area Search */}
          <Card>
            <CardHeader>
              <CardTitle>Biteship Origin Area</CardTitle>
              <CardDescription>
                Area ID ini digunakan sebagai titik asal semua pengiriman.
                Terisi otomatis dari kode pos, atau cari manual.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative" ref={areaSearchRef}>
                <Label className="mb-2 block">Cari Kecamatan / Kode Pos</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      value={areaSearchQuery}
                      onChange={(e) => {
                        setAreaSearchQuery(e.target.value);
                        setShowAreaDropdown(false);
                      }}
                      placeholder="Contoh: Manggala atau 90234"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          searchBiteshipAreaByQuery(areaSearchQuery);
                        }
                      }}
                    />
                    {isSearchingArea && (
                      <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => searchBiteshipAreaByQuery(areaSearchQuery)}
                    disabled={isSearchingArea}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>

                {/* Dropdown hasil pencarian */}
                {showAreaDropdown && areaResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {areaResults.map((area) => (
                      <button
                        key={area.id}
                        className="w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b last:border-b-0"
                        onClick={() => selectBiteshipArea(area)}
                      >
                        <div className="font-medium text-sm">{area.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {area.adminName} · {area.postalCode}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Area yang terpilih */}
              {hasBiteshipArea && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-800">
                      Area Terpilih
                    </span>
                  </div>
                  <p className="text-sm text-blue-700">{settings.biteshipOriginAreaName}</p>
                  <p className="text-xs font-mono text-blue-600 bg-blue-100 rounded px-2 py-1">
                    {settings.biteshipOriginAreaId}
                  </p>
                  <p className="text-xs text-blue-500">
                    Area ID ini akan digunakan sebagai BITESHIP_ORIGIN_AREA_ID
                  </p>
                </div>
              )}

              {/* Panduan set Firebase Secrets */}
              {hasBiteshipArea && hasCoordinates && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs space-y-1">
                    <p className="font-semibold">Update Firebase Secrets dengan nilai berikut:</p>
                    <code className="block bg-muted rounded px-2 py-1 mt-1">
                      BITESHIP_ORIGIN_AREA_ID = {settings.biteshipOriginAreaId}
                    </code>
                    <code className="block bg-muted rounded px-2 py-1">
                      BITESHIP_ORIGIN_LATITUDE = {settings.latitude}
                    </code>
                    <code className="block bg-muted rounded px-2 py-1">
                      BITESHIP_ORIGIN_LONGITUDE = {settings.longitude}
                    </code>
                    <code className="block bg-muted rounded px-2 py-1">
                      BITESHIP_ORIGIN_ADDRESS = {settings.address}, {settings.city}
                    </code>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
