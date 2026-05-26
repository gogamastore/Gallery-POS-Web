"use client"

import * as React from "react"
import { 
  BrainCircuit, 
  Sparkles, 
  TrendingUp, 
  Target, 
  Lightbulb, 
  RefreshCw,
  Loader2,
  ChevronRight,
  FileText
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { generateAISalesAndMarketInsights, type AISalesAndMarketInsightsOutput } from "@/ai/flows/ai-sales-and-market-insights-flow"
import { Badge } from "@/components/ui/badge"

const mockHistoricalData = `
Penjualan 3 bulan terakhir:
- Januari: Rp 450jt (Produk Terlaris: Beras Premium, Gula Pasir)
- Februari: Rp 520jt (Produk Terlaris: Minyak Goreng, Terigu)
- Maret: Rp 480jt (Produk Terlaris: Beras Premium, Susu UHT)

Stok saat ini:
- Beras Premium: 120 unit (Tinggi)
- Minyak Goreng: 45 unit (Menipis)
- Gula Pasir: 15 unit (Sangat Menipis)

Feedback Reseller:
- Permintaan produk organik meningkat.
- Keluhan waktu pengiriman di daerah Jawa Barat.
- Reseller menantikan promo bundling Ramadhan.
`

export default function AIInsightsPage() {
  const [loading, setLoading] = React.useState(false)
  const [insights, setInsights] = React.useState<AISalesAndMarketInsightsOutput | null>(null)
  const [progress, setProgress] = React.useState(0)

  const handleGenerate = async () => {
    setLoading(true)
    setProgress(10)
    setInsights(null)
    
    try {
      // Simulate progress for UI feedback
      const timer = setInterval(() => {
        setProgress((prev) => (prev >= 90 ? 90 : prev + 10))
      }, 500)

      const result = await generateAISalesAndMarketInsights({
        historicalData: mockHistoricalData
      })
      
      clearInterval(timer)
      setProgress(100)
      setInsights(result)
    } catch (error) {
      console.error("Failed to generate insights:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-primary rounded-2xl p-8 text-white shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="z-10 flex-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-md">
              <BrainCircuit className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Nexus AI Analyst</h1>
          </div>
          <p className="text-white/80 text-lg max-w-2xl">
            Gunakan kekuatan AI untuk menganalisis data pasar dan penjualan Anda. Dapatkan rekomendasi strategis untuk meningkatkan efisiensi bisnis grosir Anda.
          </p>
        </div>
        <div className="z-10">
          <Button 
            onClick={handleGenerate} 
            disabled={loading}
            className="bg-accent hover:bg-accent/90 text-primary-foreground font-bold h-14 px-8 rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95"
          >
            {loading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-5 w-5" />
            )}
            {loading ? "Menganalisis..." : "Hasilkan Wawasan AI"}
          </Button>
        </div>
      </div>

      {loading && (
        <Card className="border-dashed border-2 animate-pulse">
          <CardContent className="py-12 flex flex-col items-center justify-center gap-6">
            <div className="w-full max-w-md space-y-2">
              <p className="text-center text-muted-foreground font-medium">Memproses data historis dan tren pasar...</p>
              <Progress value={progress} className="h-2 bg-secondary" />
            </div>
          </CardContent>
        </Card>
      )}

      {insights && !loading && (
        <div className="grid gap-6 animate-in slide-in-from-bottom-8 duration-700">
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-none shadow-md bg-white hover:shadow-lg transition-all">
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Tren Penjualan</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  {insights.salesTrends}
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md bg-white hover:shadow-lg transition-all">
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <Target className="h-5 w-5 text-emerald-500" />
                <CardTitle className="text-lg">Permintaan Produk</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  {insights.productDemand}
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md bg-white hover:shadow-lg transition-all">
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                <CardTitle className="text-lg">Peluang Pasar</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  {insights.marketOpportunities}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-xl bg-white overflow-hidden">
            <div className="bg-primary/5 p-6 border-b">
              <CardTitle className="flex items-center gap-2 text-primary">
                <FileText className="h-5 w-5" />
                Rekomendasi Strategis AI
              </CardTitle>
            </div>
            <CardContent className="p-0">
              <div className="divide-y">
                {insights.recommendations.map((rec, i) => (
                  <div key={i} className="flex gap-4 p-6 hover:bg-secondary/20 transition-colors group">
                    <div className="bg-primary/10 text-primary font-bold w-8 h-8 rounded-full flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-all">
                      {i + 1}
                    </div>
                    <p className="text-foreground/80 leading-relaxed font-medium">
                      {rec}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Button variant="outline" className="text-muted-foreground hover:text-primary flex items-center gap-2" onClick={handleGenerate}>
              <RefreshCw className="h-4 w-4" />
              Perbarui Analisis
            </Button>
          </div>
        </div>
      )}

      {!insights && !loading && (
        <div className="py-20 flex flex-col items-center justify-center text-center gap-4">
          <div className="bg-secondary p-6 rounded-full">
            <BrainCircuit className="h-12 w-12 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Belum ada wawasan AI</h3>
            <p className="text-muted-foreground max-w-xs mx-auto">
              Klik tombol di atas untuk memulai analisis cerdas berdasarkan data bisnis Anda.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}