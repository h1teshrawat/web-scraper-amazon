import type { ProductResult } from "@/lib/api";

export type ExportFormat = "csv" | "json";

const CSV_HEADERS: Array<keyof ProductResult> = [
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
];

function escapeCsv(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function downloadFile(content: string, fileName: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

export function exportProduct(result: ProductResult, format: ExportFormat): void {
  const timestamp = result.scraped_at.replaceAll(/[:.]/g, "-");
  const fileName = `amazon-product-${result.asin}-${timestamp}.${format}`;

  if (format === "json") {
    downloadFile(JSON.stringify(result, null, 2), fileName, "application/json;charset=utf-8");
    return;
  }

  const row = CSV_HEADERS.map((field) => escapeCsv(result[field]));
  downloadFile(`${CSV_HEADERS.join(",")}\n${row.join(",")}\n`, fileName, "text/csv;charset=utf-8");
}

export async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    const textArea = document.createElement("textarea");
    textArea.value = value;
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.append(textArea);
    textArea.select();
    const copied = document.execCommand("copy");
    textArea.remove();
    return copied;
  }
}
