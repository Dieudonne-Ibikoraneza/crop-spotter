/** Resolve relative upload paths (e.g. `/uploads/...`) to absolute URLs for img/iframe/src. */
export function resolveUploadsUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  let baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";
  baseUrl = baseUrl.replace(/\/api\/v1\/?$/, "");
  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
}
