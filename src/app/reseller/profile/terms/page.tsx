
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { id as dateFnsLocaleId } from "date-fns/locale";

export default function TermsOfServicePage() {
    const router = useRouter();
    const today = format(new Date(), "d MMMM yyyy", { locale: dateFnsLocaleId });

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 max-w-screen-lg">
       <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Kembali</span>
            </Button>
            <h1 className="text-3xl font-bold font-headline">Persyaratan Layanan</h1>
       </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary" />
            <CardTitle>Persyaratan Layanan – Manafidh Store</CardTitle>
          </div>
          <CardDescription>
            Terakhir diperbarui: {today}
          </CardDescription>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none text-foreground/80 leading-relaxed space-y-4">
            <p><strong>1. Penerimaan Ketentuan</strong><br/>
            Selamat datang di Manafidh Store. Dengan mengakses, mendaftar, atau menggunakan aplikasi dan situs Manafidh Store (selanjutnya disebut &quot;Layanan&quot;), Anda menyatakan telah membaca, memahami, dan menyetujui untuk terikat pada Persyaratan Layanan ini. Jika Anda tidak menyetujui sebagian atau seluruh ketentuan, mohon untuk tidak menggunakan Layanan.</p>

            <p><strong>2. Definisi</strong><br/>
            - &quot;Kami/Penyedia&quot; merujuk pada Manafidh Store sebagai pengelola Layanan.<br/>
            - &quot;Pengguna/Anda&quot; merujuk pada setiap orang yang mengakses atau menggunakan Layanan, termasuk reseller dan pembeli.<br/>
            - &quot;Produk&quot; merujuk pada barang yang ditawarkan untuk dijual melalui Layanan.</p>

            <p><strong>3. Akun Pengguna</strong><br/>
            - Untuk bertransaksi, Anda perlu membuat akun dengan data yang benar, akurat, dan terkini.<br/>
            - Anda bertanggung jawab menjaga kerahasiaan kata sandi serta seluruh aktivitas yang terjadi pada akun Anda.<br/>
            - Kami berhak menangguhkan atau menutup akun yang terindikasi melanggar ketentuan ini atau melakukan penyalahgunaan.</p>

            <p><strong>4. Penggunaan Layanan</strong><br/>
            - Layanan disediakan untuk keperluan pembelian produk secara sah.<br/>
            - Harga reseller yang ditampilkan ditujukan untuk pengguna terdaftar sesuai kebijakan kami.<br/>
            - Anda setuju untuk tidak menyalahgunakan Layanan, termasuk melakukan pemesanan fiktif, manipulasi harga/promo, atau tindakan yang merugikan Penyedia maupun pengguna lain.</p>

            <p><strong>5. Produk, Harga &amp; Ketersediaan</strong><br/>
            - Deskripsi, gambar, harga, dan ketersediaan produk dapat berubah sewaktu-waktu tanpa pemberitahuan terlebih dahulu.<br/>
            - Kami berupaya menampilkan informasi seakurat mungkin, namun tidak menjamin bebas dari kesalahan penulisan atau tampilan.<br/>
            - Promosi (termasuk promo dengan batas pembelian tertentu) berlaku selama periode dan syarat yang ditetapkan, serta selama stok tersedia.</p>

            <p><strong>6. Pemesanan &amp; Pembayaran</strong><br/>
            - Pesanan dianggap sah setelah Anda menyelesaikan proses checkout dan melakukan pembayaran sesuai metode yang tersedia.<br/>
            - Kami berhak menolak atau membatalkan pesanan apabila terjadi kesalahan harga, kehabisan stok, atau dugaan kecurangan.<br/>
            - Pembayaran diproses melalui penyedia pembayaran pihak ketiga; kami tidak menyimpan detail kartu/kredensial pembayaran Anda.</p>

            <p><strong>7. Pengiriman</strong><br/>
            - Pengiriman dilakukan melalui jasa ekspedisi/metode yang dipilih saat checkout.<br/>
            - Estimasi waktu pengiriman bersifat perkiraan dan dapat dipengaruhi oleh faktor di luar kendali kami (mis. kondisi kurir, cuaca, atau lokasi tujuan).<br/>
            - Risiko atas produk beralih kepada Pengguna setelah produk diserahkan kepada jasa pengiriman.</p>

            <p><strong>8. Pembatalan, Penukaran &amp; Pengembalian Dana</strong><br/>
            - Permohonan pembatalan, penukaran, atau pengembalian dana mengikuti kebijakan yang berlaku dan harus diajukan melalui kanal resmi kami.<br/>
            - Produk yang dikembalikan harus memenuhi syarat (mis. belum digunakan, kemasan utuh, disertai bukti pembelian), kecuali untuk produk cacat/salah kirim.<br/>
            - Pengembalian dana (bila disetujui) diproses sesuai metode dan tenggat yang wajar.</p>

            <p><strong>9. Kewajiban &amp; Larangan Pengguna</strong><br/>
            Anda setuju untuk tidak:<br/>
            - Memberikan informasi palsu atau menyesatkan.<br/>
            - Menggunakan Layanan untuk tujuan melanggar hukum.<br/>
            - Mengganggu keamanan, integritas, atau kinerja sistem Layanan.<br/>
            - Memperbanyak, menjual kembali, atau mengeksploitasi Layanan tanpa izin tertulis dari kami.</p>

            <p><strong>10. Hak Kekayaan Intelektual</strong><br/>
            Seluruh konten pada Layanan, termasuk logo, merek, teks, gambar, dan perangkat lunak, merupakan milik Manafidh Store atau pemberi lisensinya dan dilindungi hukum. Anda tidak diperkenankan menggunakannya tanpa izin tertulis.</p>

            <p><strong>11. Batasan Tanggung Jawab</strong><br/>
            Sepanjang diizinkan oleh hukum yang berlaku, Layanan disediakan &quot;sebagaimana adanya&quot;. Kami tidak bertanggung jawab atas kerugian tidak langsung, insidental, atau konsekuensial yang timbul dari penggunaan Layanan, kecuali kewajiban yang tidak dapat dikesampingkan menurut hukum.</p>

            <p><strong>12. Perubahan Ketentuan</strong><br/>
            Kami dapat memperbarui Persyaratan Layanan ini dari waktu ke waktu. Perubahan berlaku sejak dipublikasikan pada halaman ini. Penggunaan Layanan secara berkelanjutan setelah perubahan berarti Anda menyetujui ketentuan yang diperbarui.</p>

            <p><strong>13. Hukum yang Berlaku</strong><br/>
            Persyaratan Layanan ini diatur dan ditafsirkan berdasarkan hukum Republik Indonesia. Setiap sengketa akan diupayakan diselesaikan secara musyawarah terlebih dahulu.</p>

            <p><strong>14. Kontak</strong><br/>
            Jika Anda memiliki pertanyaan terkait Persyaratan Layanan ini, silakan hubungi kami:<br/>
            🏢 Manafidh Store<br/>
            📧 [official@manafidh.store]<br/>
            📱 [6289636052501]<br/>
            📍 [Jalan Borong Raya nomor 100, Makassar, Sulawesi Selatan, 90234]</p>
        </CardContent>
      </Card>

    </div>
  );
}
