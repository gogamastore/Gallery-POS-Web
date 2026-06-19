
'use server';

/**
 * @fileOverview An AI-powered tool that analyzes historical sales data for a specific product
 * to forecast demand and suggest optimal stock levels. This flow now performs data analysis
 * in code before passing the results to the AI for interpretation.
 *
 * - suggestOptimalStockLevels - A function that handles the stock level suggestion process.
 * - SuggestOptimalStockLevelsInput - The input type for the suggestOptimalStockLevels function.
 * - SuggestOptimalStockLevelsOutput - The return type for the suggestOptimalStockLevels function.
 */

import {ai} from '@/ai/genkit';
import {parse, differenceInDays, format} from 'date-fns';
import { SuggestOptimalStockLevelsInput, SuggestOptimalStockLevelsInputSchema, SuggestOptimalStockLevelsOutput, SuggestOptimalStockLevelsOutputSchema, AnalysisResultSchema, AnalysisResult } from '@/ai/schemas/stock-suggestion-schemas';
import { z } from 'zod';

// SECTION: Data Analysis Function

/**
 * Performs a statistical analysis of sales data.
 * This is a regular TypeScript function called by the flow.
 * @param input The sales data and product info.
 * @returns An object containing the analysis results.
 */
function analyzeSalesData(input: SuggestOptimalStockLevelsInput): AnalysisResult {
    const { salesData } = input;
    if (!salesData || salesData.length === 0) {
        return { totalSold: 0, salesTrend: "no_data", peakDays: [], averageDailySales: 0 };
    }

    const totalSold = salesData.reduce((sum, item) => sum + item.quantity, 0);

    const salesByDay: Record<string, number> = {};
    salesData.forEach(item => {
        salesByDay[item.orderDate] = (salesByDay[item.orderDate] || 0) + item.quantity;
    });
    
    const sortedDays = Object.keys(salesByDay).sort();
    const firstDay = parse(sortedDays[0], 'yyyy-MM-dd', new Date());
    const lastDay = parse(sortedDays[sortedDays.length - 1], 'yyyy-MM-dd', new Date());
    const periodInDays = differenceInDays(lastDay, firstDay) + 1;
    const averageDailySales = periodInDays > 0 ? totalSold / periodInDays : 0;

    // Simplified trend analysis
    let salesTrend = "stable";
    if (sortedDays.length > 1) {
        const firstHalfTotal = sortedDays.slice(0, Math.floor(sortedDays.length / 2)).reduce((sum, day) => sum + salesByDay[day], 0);
        const secondHalfTotal = sortedDays.slice(Math.floor(sortedDays.length / 2)).reduce((sum, day) => sum + salesByDay[day], 0);
        if (secondHalfTotal > firstHalfTotal * 1.2) salesTrend = "increasing";
        if (secondHalfTotal < firstHalfTotal * 0.8) salesTrend = "decreasing";
    }
    
    // Find peak sales days
    const peakDays = Object.entries(salesByDay)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([day, quantity]) => `${format(parse(day, 'yyyy-MM-dd', new Date()), 'dd MMM')}: ${quantity} units`);

    return {
        totalSold,
        salesTrend,
        peakDays,
        averageDailySales,
    };
}


// SECTION: Main AI Flow
const SuggestionOnlySchema = z.object({
      suggestion: z.object({
        nextPeriodStock: z.number().describe("The suggested total stock quantity for the next 30-day period. This should be a whole number."),
        safetyStock: z.number().describe("The recommended safety stock or buffer quantity. This should be a whole number."),
      }),
      reasoning: z
        .string()
        .describe('The detailed AI reasoning behind the stock level suggestion, explaining how the analysis led to the recommendation.'),
});


const suggestStockFlow = ai.defineFlow(
  {
    name: 'suggestOptimalStockLevelsFlow',
    inputSchema: SuggestOptimalStockLevelsInputSchema,
    outputSchema: SuggestOptimalStockLevelsOutputSchema,
  },
  async (input) => {
    
    // Step 1: Perform data analysis using our TypeScript function.
    const analysisResult = analyzeSalesData(input);

    // Step 2: Pass the analysis results to the AI for interpretation and suggestion.
    const llmResponse = await ai.generate({
      prompt: `Anda adalah seorang AI ahli manajemen inventaris.
        Tugas Anda adalah memberikan saran tingkat stok berdasarkan hasil analisis data penjualan historis yang sudah dihitung sebelumnya.

        Berikut adalah situasi untuk produk "{{productName}}":
        - Stok Saat Ini: ${input.currentStock}
        - Periode Analisis: ${input.analysisPeriod}

        Berikut adalah ringkasan analisis yang sudah dihitung:
        - Total Unit Terjual: ${analysisResult.totalSold}
        - Rata-rata Penjualan Harian: ${analysisResult.averageDailySales.toFixed(2)}
        - Tren Penjualan: "${analysisResult.salesTrend}"
        - Hari Penjualan Puncak: ${analysisResult.peakDays.join(', ') || 'N/A'}

        Berdasarkan *hanya* pada analisis ini, tugas Anda adalah:
        1.  **Formulasikan saran stok:**
            -   **Saran Stok Periode Berikutnya (nextPeriodStock):** Hitung jumlah unit spesifik untuk stok selama periode 30 hari. Gunakan rumus: (rata-rata penjualan harian * 30) + stok pengaman. Bulatkan ke angka utuh terdekat.
            -   **Stok Pengaman (safetyStock):** Rekomendasikan jumlah buffer. Patokan yang baik adalah 25% dari proyeksi penjualan 30 hari (rata-rata penjualan harian * 30), tetapi sesuaikan berdasarkan tren penjualan (misalnya, persentase lebih tinggi untuk 'meningkat', lebih rendah untuk 'menurun'). Bulatkan ke angka utuh terdekat.
        2.  **Berikan Alasan:** Tulis penjelasan langkah-demi-langkah yang jelas untuk saran Anda dalam Bahasa Indonesia. Sebutkan bagaimana rata-rata penjualan dan tren dari analisis memengaruhi angka akhir Anda.
        
        Kembalikan HANYA saran dan alasan dalam format JSON yang diperlukan.`,
      model: 'googleai/gemini-2.0-flash',
      context: {
        productName: input.productName,
      },
      output: {
        schema: SuggestionOnlySchema,
      },
    });

    const output = llmResponse.output;
    if (!output) {
      throw new Error("AI failed to generate a valid stock suggestion.");
    }
    
    // Step 3: Combine the AI's suggestion with the original analysis result.
    return {
        productName: input.productName,
        suggestion: output.suggestion,
        reasoning: output.reasoning,
        analysis: analysisResult,
    };
  }
);


/**
 * Public-facing function to call the Genkit flow.
 * @param input The input data for the AI flow.
 * @returns A promise that resolves to the AI's suggestion.
 */
export async function suggestOptimalStockLevels(
  input: SuggestOptimalStockLevelsInput
): Promise<SuggestOptimalStockLevelsOutput> {
  return suggestStockFlow(input);
}
