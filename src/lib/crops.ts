export const BACKEND_CROP_TYPES = [
  "MAIZE",
  "BEANS",
  "RICE",
  "WHEAT",
  "SORGHUM",
  "POTATOES",
  "CASSAVA",
  "BANANAS",
  "COFFEE",
  "TEA",
  "OTHER",
] as const;

export type BackendCropType = (typeof BACKEND_CROP_TYPES)[number];

export function isBackendCropType(value: string): value is BackendCropType {
  return (BACKEND_CROP_TYPES as readonly string[]).includes(value);
}

export function normalizeCropTypeInput(raw: string): BackendCropType | null {
  const compact = raw.trim().toUpperCase().replace(/\s+/g, "_");
  if (isBackendCropType(compact)) return compact;
  const firstWord = raw.trim().split(/\s+/)[0]?.toUpperCase() ?? "";
  if (isBackendCropType(firstWord)) return firstWord;
  return null;
}

/** Title-case snake_case API enums (loss events, claim types, statuses, etc.). */
export function formatBackendEnumLabel(value?: string | null): string {
  if (!value) return "—";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatCropTypeLabel(cropType?: string | null): string {
  if (!cropType) return "N/A";
  return formatBackendEnumLabel(cropType);
}

export function formatReportTypeLabel(reportType?: string | null): string {
  if (!reportType) return "Analysis Report";
  return reportType
    .replace(/\.pdf$/i, "")
    .replace(/[-_]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export const CROP_HARVEST_DURATION_MONTHS: Record<string, number> = {
  RICE: 4,
  MAIZE: 3.5,
  BEANS: 3,
  WHEAT: 4,
  SORGHUM: 4,
  POTATOES: 3.5,
  CASSAVA: 9,
  BANANAS: 10,
  COFFEE: 9,
  TEA: 6,
  OTHER: 3,
};

export function getRequiredMonitoringCycles(cropType: string | null | undefined): number {
  if (!cropType) return 3; // Default to 3 if unknown
  const normalized = cropType.toUpperCase();
  const duration = CROP_HARVEST_DURATION_MONTHS[normalized] ?? CROP_HARVEST_DURATION_MONTHS["OTHER"];
  return Math.max(1, Math.ceil(duration));
}
