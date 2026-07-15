import type { ProductResult } from "@/lib/api";

export interface SearchHistoryItem {
  result: ProductResult;
  saved_at: string;
}

const HISTORY_KEY = "sociomonkey-search-history";
const HISTORY_LIMIT = 10;

function isProductResult(value: unknown): value is ProductResult {
  if (!value || typeof value !== "object") {
    return false;
  }
  return [
    "title",
    "price",
    "seller",
    "asin",
    "rating",
    "ratings_count",
    "best_sellers_rank",
    "image_url",
    "product_url",
    "scraped_at",
  ].every((field) => typeof (value as Record<string, unknown>)[field] === "string");
}

function isSearchHistoryItem(value: unknown): value is SearchHistoryItem {
  return Boolean(value && typeof value === "object" && isProductResult((value as Record<string, unknown>).result) && typeof (value as Record<string, unknown>).saved_at === "string");
}

export function getSearchHistory(): SearchHistoryItem[] {
  try {
    const storedHistory = window.localStorage.getItem(HISTORY_KEY);
    if (!storedHistory) {
      return [];
    }
    const history: unknown = JSON.parse(storedHistory);
    return Array.isArray(history) ? history.filter(isSearchHistoryItem) : [];
  } catch {
    return [];
  }
}

export function saveSearchHistory(result: ProductResult): SearchHistoryItem[] {
  const nextItem: SearchHistoryItem = { result, saved_at: new Date().toISOString() };
  const history = getSearchHistory().filter((item) => item.result.product_url !== result.product_url);
  const nextHistory = [nextItem, ...history].slice(0, HISTORY_LIMIT);
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
  } catch {
    return history;
  }
  return nextHistory;
}

export function clearSearchHistory(): void {
  try {
    window.localStorage.removeItem(HISTORY_KEY);
  } catch {
    return;
  }
}
