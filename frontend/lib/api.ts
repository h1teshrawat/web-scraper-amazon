import axios from "axios";

export interface ProductResult {
  title: string;
  price: string;
  seller: string;
  asin: string;
  rating: string;
  ratings_count: string;
  best_sellers_rank: string;
  image_url: string;
  product_url: string;
  scraped_at: string;
}

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000",
  timeout: 100_000,
  headers: { "Content-Type": "application/json" },
});

export async function scrapeProduct(productUrl: string): Promise<ProductResult> {
  const response = await apiClient.post<ProductResult>("/api/v1/scrape", { product_url: productUrl });
  return response.data;
}

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<{ detail?: string }>(error)) {
    if (error.code === "ECONNABORTED") {
      return "The scrape took too long. Please try again in a moment.";
    }
    return error.response?.data?.detail ?? "Unable to reach the scraper. Check that the backend is running.";
  }
  return "An unexpected error occurred. Please try again.";
}
