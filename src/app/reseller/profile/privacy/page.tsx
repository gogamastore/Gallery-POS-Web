
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, Mail, Phone, ShieldQuestion } from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { id as dateFnsLocaleId } from "date-fns/locale";

const faqs = [
    {
        question: "Bagaimana cara menjadi reseller?",
        answer: "Anda dapat langsung mendaftar melalui halaman registrasi di aplikasi kami. Setelah pendaftaran berhasil, Anda dapat langsung login dan mulai berbelanja dengan harga reseller."
    },
    {
        question: "Bagaimana cara melacak pesanan saya?",
        answer: "Anda dapat melacak status pesanan Anda melalui menu 'Profil' > 'Riwayat Pesanan'. Status akan diperbarui secara real-time mulai dari 'Belum Proses', 'Dikemas', 'Dikirim', hingga 'Selesai'."
    },
    {
        question: "Berapa lama waktu pengiriman?",
        answer: "Waktu pengiriman bervariasi tergantung lokasi Anda dan jenis ekspedisi yang dipilih. Estimasi normal adalah 2-5 hari kerja untuk wilayah Jabodetabek dan bisa lebih lama untuk luar daerah."
    },
    {
        question: "Apa saja metode pembayaran yang diterima?",
        answer: "Saat ini kami menerima pembayaran melalui Transfer Bank dan COD (Cash on Delivery) untuk wilayah tertentu. Anda dapat melihat rekening tujuan saat melakukan checkout."
    },
];

export default function PrivacyPolicyPage() {
    const router = useRouter();
    const today = format(new Date(), "d MMMM yyyy", { locale: dateFnsLocaleId });

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 max-w-screen-lg">
       <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Kembali</span>
            </Button>
            <h1 className="text-3xl font-bold font-headline">Kebijakan Privasi & FAQ</h1>
       </div>
      
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <ShieldQuestion className="h-6 w-6 text-primary" />
            <CardTitle>Kebijakan Privasi – Gogama.Store</CardTitle>
          </div>
          <CardDescription>
            Terakhir diperbarui: {today}
          </CardDescription>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none text-foreground/80 leading-relaxed space-y-4">
            <p><strong>1. Pendahuluan</strong><br/>
            Selamat datang di Gogama.Store. Kami menghargai privasi Anda dan berkomitmen untuk melindungi data pribadi yang Anda berikan saat menggunakan aplikasi ini. Kebijakan ini menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi informasi Anda.</p>

            <p><strong>2. Informasi yang Kami Kumpulkan</strong><br/>
            Kami dapat mengumpulkan data berikut:<br/>
            - Informasi Akun: Nama, alamat email, nomor telepon, dan alamat pengiriman.<br/>
            - Data Transaksi: Riwayat pembelian, metode pembayaran (hanya data transaksi, bukan detail kartu).<br/>
            - Data Teknis: Alamat IP, jenis perangkat, sistem operasi, dan aktivitas penggunaan aplikasi.<br/>
            - Konten yang Diberikan Pengguna: Ulasan, komentar, atau pesan yang dikirimkan ke kami.</p>

            <p><strong>3. Penggunaan Informasi</strong><br/>
            Data yang dikumpulkan digunakan untuk:<br/>
            - Memproses pesanan dan pengiriman.<br/>
            - Memberikan dukungan pelanggan.<br/>
            - Mengirimkan informasi promo, penawaran khusus, atau pembaruan produk.<br/>
            - Meningkatkan keamanan dan pengalaman pengguna di aplikasi.</p>

            <p><strong>4. Perlindungan Data</strong><br/>
            Kami menerapkan langkah-langkah keamanan teknis dan administratif untuk melindungi data Anda, termasuk:<br/>
            - Enkripsi data selama transmisi.<br/>
            - Pembatasan akses hanya untuk staf yang berwenang.<br/>
            - Penyimpanan data di server dengan standar keamanan tinggi.</p>

            <p><strong>5. Pembagian Informasi</strong><br/>
            Kami tidak menjual atau membagikan data pribadi Anda kepada pihak ketiga, kecuali:<br/>
            - Diperlukan untuk memproses pesanan (contoh: jasa kurir).<br/>
            - Diminta oleh hukum atau peraturan yang berlaku.<br/>
            - Diperlukan untuk melindungi hak dan keamanan pengguna atau perusahaan.</p>

            <p><strong>6. Hak Pengguna</strong><br/>
            Anda berhak untuk:<br/>
            - Mengakses dan memperbarui data pribadi Anda.<br/>
            - Meminta penghapusan data sesuai hukum yang berlaku.<br/>
            - Menolak menerima promosi atau newsletter.</p>
            
            <p><strong>7. Cookie & Pelacakan</strong><br/>
            Aplikasi ini dapat menggunakan cookie atau teknologi serupa untuk:<br/>
            - Menyimpan preferensi pengguna.<br/>
            - Menganalisis perilaku penggunaan.<br/>
            Anda dapat menonaktifkan cookie melalui pengaturan perangkat, namun beberapa fitur mungkin tidak berfungsi optimal.</p>

            <p><strong>8. Perubahan Kebijakan</strong><br/>
            Kami dapat memperbarui kebijakan privasi ini dari waktu ke waktu. Perubahan akan diumumkan melalui aplikasi atau email sebelum berlaku.</p>
            
            <p><strong>9. Kontak</strong><br/>
            Jika Anda memiliki pertanyaan atau keluhan terkait kebijakan ini, silakan hubungi kami di:<br/>
            📧 official@gogama.store<br/>
            📱 +6289636052501</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Pertanyaan yang Sering Diajukan (FAQ)</CardTitle>
        </CardHeader>
        <CardContent>
            <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                        <AccordionTrigger>{faq.question}</AccordionTrigger>
                        <AccordionContent>
                           {faq.answer}
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </CardContent>
      </Card>

    </div>
  );
}
