
import { z } from 'zod';

const SalesDataItemSchema = z.object({
  orderDate: z.string().describe('The date of the order in YYYY-MM-DD format.'),
  quantity: z.number().describe('The quantity of the product sold in that order.'),
});

export const SuggestOptimalStockLevelsInputSchema = z.object({
  productName: z.string().describe('The name of the product being analyzed.'),
  currentStock: z.number().describe('The current stock level of the product.'),
  salesData: z
    .array(SalesDataItemSchema)
    .describe(
      'An array of sales data objects for the product over a specific period.'
    ),
  analysisPeriod: z
    .string()
    .describe(
      'The time period of the sales data provided (e.g., "30 days", "90 days").'
    ),
});
export type SuggestOptimalStockLevelsInput = z.infer<
  typeof SuggestOptimalStockLevelsInputSchema
>;

export const AnalysisResultSchema = z.object({
    totalSold: z.number().describe('Total units sold during the period.'),
    salesTrend: z.string().describe('A brief description of the sales trend (e.g., "stable", "increasing", "seasonal", "sporadic").'),
    peakDays: z.array(z.string()).describe('Days or weeks with the highest sales.'),
    averageDailySales: z.number().describe('The average number of units sold per day.'),
});
export type AnalysisResult = z.infer<
  typeof AnalysisResultSchema
>;


export const SuggestOptimalStockLevelsOutputSchema = z.object({
  productName: z.string().describe('The name of the product analyzed.'),
  analysis: AnalysisResultSchema,
  suggestion: z.object({
    nextPeriodStock: z.number().describe('The suggested stock quantity for the next period (e.g., next month).'),
    safetyStock: z.number().describe('A recommended safety stock or buffer quantity.'),
  }),
  reasoning: z
    .string()
    .describe('The detailed AI reasoning behind the stock level suggestion, explaining how the analysis led to the recommendation.'),
});
export type SuggestOptimalStockLevelsOutput = z.infer<
  typeof SuggestOptimalStockLevelsOutputSchema
>;
