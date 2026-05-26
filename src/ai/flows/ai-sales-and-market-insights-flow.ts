'use server';
/**
 * @fileOverview A Genkit flow for generating AI-powered insights and recommendations on sales trends, product demand, and market opportunities based on historical data.
 *
 * - generateAISalesAndMarketInsights - A function that generates insights and recommendations.
 * - AISalesAndMarketInsightsInput - The input type for the generateAISalesAndMarketInsights function.
 * - AISalesAndMarketInsightsOutput - The return type for the generateAISalesAndMarketInsights function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AISalesAndMarketInsightsInputSchema = z.object({
  historicalData: z.string().describe(
    'Comprehensive historical data including sales records, product inventory levels, customer purchasing patterns, and market research, provided as a summarized string or JSON representation.'
  ),
});
export type AISalesAndMarketInsightsInput = z.infer<
  typeof AISalesAndMarketInsightsInputSchema
>;

const AISalesAndMarketInsightsOutputSchema = z.object({
  salesTrends: z.string().describe('Identified sales trends and patterns.'),
  productDemand: z.string().describe('Analysis of product demand and popularity.'),
  marketOpportunities: z.string().describe('Potential market opportunities and gaps.'),
  recommendations: z
    .array(z.string())
    .describe('Actionable recommendations for business improvement.'),
});
export type AISalesAndMarketInsightsOutput = z.infer<
  typeof AISalesAndMarketInsightsOutputSchema
>;

export async function generateAISalesAndMarketInsights(
  input: AISalesAndMarketInsightsInput
): Promise<AISalesAndMarketInsightsOutput> {
  return aiSalesAndMarketInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiSalesAndMarketInsightsPrompt',
  input: { schema: AISalesAndMarketInsightsInputSchema },
  output: { schema: AISalesAndMarketInsightsOutputSchema },
  prompt: `Anda adalah seorang analis bisnis AI ahli. Tugas Anda adalah menganalisis data historis yang diberikan untuk mengidentifikasi tren penjualan, permintaan produk, peluang pasar, dan memberikan rekomendasi yang dapat ditindaklanjuti untuk meningkatkan bisnis grosir.

Data Historis:
{{{historicalData}}}

Berdasarkan data di atas, berikan:
- Analisis tren penjualan (salesTrends)
- Analisis permintaan produk (productDemand)
- Identifikasi peluang pasar potensial (marketOpportunities)
- Daftar rekomendasi yang spesifik dan dapat ditindaklanjuti (recommendations) untuk meningkatkan strategi penjualan, manajemen inventaris, atau pengembangan produk.`,
});

const aiSalesAndMarketInsightsFlow = ai.defineFlow(
  {
    name: 'aiSalesAndMarketInsightsFlow',
    inputSchema: AISalesAndMarketInsightsInputSchema,
    outputSchema: AISalesAndMarketInsightsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
