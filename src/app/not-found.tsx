"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FileWarning } from "lucide-react"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-4">
      <FileWarning className="h-24 w-24 text-primary mb-6" />
      <h1 className="text-4xl font-bold text-foreground mb-2">404 - Halaman Tidak Ditemukan</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Maaf, halaman yang Anda cari tidak ada atau mungkin telah dipindahkan.
      </p>
      <div className="flex gap-4">
        <Button asChild>
          <Link href="/dashboard">Kembali ke Dashboard</Link>
        </Button>
         <Button variant="outline" asChild>
          <Link href="/reseller">Kembali ke Halaman Reseller</Link>
        </Button>
      </div>
    </div>
  )
}
