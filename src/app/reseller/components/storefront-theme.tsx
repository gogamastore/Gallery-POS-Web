"use client";

import { useEffect } from "react";

// Menempelkan class `storefront` pada <html> selama pengguna berada di
// area reseller. Shell reseller sudah memakai class yang sama supaya isi
// halaman langsung benar sejak render pertama; class di <html> ini
// dibutuhkan agar elemen yang di-portal ke <body> (dropdown, select,
// toast) ikut memakai tema light + warna merek, bukan tema dashboard.
export default function StorefrontTheme() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("storefront");
    return () => root.classList.remove("storefront");
  }, []);

  return null;
}
