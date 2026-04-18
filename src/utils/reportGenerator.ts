import jsPDF from "jspdf";
import {
  RiskAssessment,
  DroneAnalysisData,
  WeatherData,
} from "./riskCalculation";
import { formatReportTypeLabel } from "@/lib/crops";
import { analysisLevelHectares, fieldAreaHectares } from "./droneAreaDisplay";
import { renderDroneDataToDoc } from "./dronePdfGenerator";

export interface ReportData {
  assessmentId: string;
  farmDetails: {
    name: string;
    cropType: string;
    area: number;
    location: string;
    farmerName: string;
  };
  dronePdfs: Array<{
    pdfType: string;
    droneAnalysisData?: DroneAnalysisData;
  }>;
  weatherData?: WeatherData;
  comprehensiveNotes: string;
  riskAssessment: RiskAssessment;
  reportGeneratedAt: Date;
}

// ─── Palette ────────────────────────────────────────────────────────────────
type RGB = [number, number, number];

const C: Record<string, RGB> = {
  forest: [13, 74, 42],
  leaf: [22, 101, 52],
  sage: [45, 134, 83],
  mint: [232, 245, 238],
  cream: [250, 250, 247],
  white: [255, 255, 255],
  charcoal: [28, 28, 30],
  slate: [74, 85, 104],
  mist: [226, 232, 240],
  amber: [217, 119, 6],
  amberLite: [254, 243, 199],
  sky: [37, 99, 235],
  rose: [220, 38, 38],
  roseLite: [254, 226, 226],
  emerald: [5, 150, 105],
  emeraldLite: [209, 250, 229],
  accentGreen: [74, 222, 128],
  softGreen: [167, 243, 208],
};

// ─── Low-level colour helpers ────────────────────────────────────────────────
// IMPORTANT: jsPDF uses setDrawColor (not setStrokeColor) for line/border colour.

function setFill(doc: jsPDF, rgb: RGB) {
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
}

/** Sets the stroke/border colour. Uses setDrawColor — setStrokeColor does NOT exist in jsPDF. */
function setDraw(doc: jsPDF, rgb: RGB) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
}

function setTxt(doc: jsPDF, rgb: RGB) {
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
}

/** Draw a rounded rectangle with optional fill and/or stroke. */
function rRect(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fillRgb?: RGB,
  strokeRgb?: RGB,
  lw = 0.4,
) {
  if (fillRgb) setFill(doc, fillRgb);
  if (strokeRgb) {
    setDraw(doc, strokeRgb);
    doc.setLineWidth(lw);
  }
  const style = fillRgb && strokeRgb ? "FD" : fillRgb ? "F" : "D";
  doc.roundedRect(x, y, w, h, r, r, style);
}

/** Draw a filled pill label centred at (cx, cy). */
function pill(
  doc: jsPDF,
  label: string,
  cx: number,
  cy: number,
  fillRgb: RGB,
  labelRgb: RGB,
  fontSize = 8,
  hPad = 4,
  vPad = 1.5,
) {
  doc.setFontSize(fontSize);
  doc.setFont("helvetica", "bold");
  const tw = doc.getTextWidth(label);
  const pw = tw + hPad * 2;
  const ph = fontSize * 0.45 + vPad * 2;
  rRect(doc, cx - pw / 2, cy - ph / 2, pw, ph, ph / 2, fillRgb);
  setTxt(doc, labelRgb);
  doc.text(label, cx, cy + fontSize * 0.15, { align: "center" });
}

// ─── Arc via cubic bezier ────────────────────────────────────────────────────
// jsPDF has no built-in arc method; we approximate with bezier segments.

/**
 * Stroke an arc on doc.
 * Angles are in degrees, measured CCW from the positive-x axis (standard math).
 * Set draw colour + line width BEFORE calling.
 */
function strokeArc(
  doc: jsPDF,
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
) {
  const MAX_STEP = 90; // split into ≤90° segments for bezier accuracy
  let cur = startDeg;

  const pt = (deg: number) => ({
    x: cx + r * Math.cos((deg * Math.PI) / 180),
    y: cy - r * Math.sin((deg * Math.PI) / 180),
  });

  const start = pt(cur);
  doc.moveTo(start.x, start.y);

  while (cur < endDeg) {
    const next = Math.min(cur + MAX_STEP, endDeg);
    const span = next - cur;
    const alpha = (span * Math.PI) / 180 / 2;
    const bk = (4 / 3) * Math.tan(alpha);

    const a0 = (cur * Math.PI) / 180;
    const a3 = (next * Math.PI) / 180;
    const p0 = pt(cur);
    const p3 = pt(next);

    const p1 = {
      x: p0.x - bk * r * Math.sin(a0),
      y: p0.y - bk * r * Math.cos(a0),
    };
    const p2 = {
      x: p3.x + bk * r * Math.sin(a3),
      y: p3.y + bk * r * Math.cos(a3),
    };

    doc.curveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
    cur = next;
  }

  doc.stroke();
}

// ─── Semantic colour helpers ──────────────────────────────────────────────────

function levelColors(level: string): { main: RGB; lite: RGB } {
  switch (level) {
    case "LOW":
      return { main: C.emerald, lite: C.emeraldLite };
    case "MODERATE":
      return { main: C.amber, lite: C.amberLite };
    case "HIGH":
      return { main: [234, 88, 12], lite: [255, 237, 213] };
    case "CRITICAL":
      return { main: C.rose, lite: C.roseLite };
    default:
      return { main: C.slate, lite: C.mist };
  }
}

function statusColors(status: string): { main: RGB; lite: RGB } {
  if (status === "Healthy") return { main: C.emerald, lite: C.emeraldLite };
  if (status === "At Risk") return { main: C.amber, lite: C.amberLite };
  if (status === "Critical") return { main: C.rose, lite: C.roseLite };
  return { main: C.slate, lite: C.mist };
}

function severityColor(severity: string): RGB {
  switch ((severity ?? "").toLowerCase()) {
    case "healthy":
      return C.emerald;
    case "low":
      return C.sky;
    case "moderate":
      return C.amber;
    case "high":
      return C.rose;
    default:
      return C.slate;
  }
}

function barColor(value: number): RGB {
  if (value <= 25) return C.emerald;
  if (value <= 50) return C.sky;
  if (value <= 75) return C.amber;
  return C.rose;
}

function cleanText(str: string): string {
  return str
    .replace(/[🚨⚠️🌦️🌱🌸🔴🟡🟢✅Øßþ]/g, "")
    .replace(/[\u{1F300}-\u{1FFFF}]/gu, "")
    .replace(/&[a-zA-Z0-9]+;/g, "")
    .trim();
}

/**
 * If location is raw "lat, lng" coordinates, format as "1.9607°S, 30.3567°E".
 * Otherwise returns the string unchanged.
 */
function formatLocation(loc: unknown): string {
  if (!loc) return "N/A";
  
  if (typeof loc === "object" && loc !== null) {
    const obj = loc as any;
    if (obj.coordinates && Array.isArray(obj.coordinates) && obj.coordinates.length >= 2) {
      const lng = obj.coordinates[0];
      const lat = obj.coordinates[1];
      const latDir = lat >= 0 ? "N" : "S";
      const lngDir = lng >= 0 ? "E" : "W";
      return `${Math.abs(lat).toFixed(4)}\u00B0${latDir}, ${Math.abs(lng).toFixed(4)}\u00B0${lngDir}`;
    }
    return "N/A";
  }

  const strLoc = String(loc);
  const m = strLoc.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) return strLoc;
  const lat = parseFloat(m[1]);
  const lng = parseFloat(m[2]);
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}\u00B0${latDir}, ${Math.abs(lng).toFixed(4)}\u00B0${lngDir}`;
}

// ════════════════════════════════════════════════════════════════════════════
// ComprehensiveReportGenerator — drop-in replacement, same public API
// ════════════════════════════════════════════════════════════════════════════
export class ComprehensiveReportGenerator {
  private doc: jsPDF;
  private W: number; // page width  (mm)
  private H: number; // page height (mm)
  private M: number; // margin      (mm)
  private CW: number; // content width

  constructor() {
    this.doc = new jsPDF("p", "mm", "a4");
    this.W = this.doc.internal.pageSize.getWidth();
    this.H = this.doc.internal.pageSize.getHeight();
    this.M = 14;
    this.CW = this.W - 2 * this.M;
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  private drawFooter(pageNum: number) {
    const { doc, W, H, M } = this;
    doc.setFontSize(8);
    setTxt(doc, C.slate);
    doc.text(`STARHAWK\u2122 Crop Assessment System  \u00B7  Confidential`, W / 2, H - 8, { align: "center" });
    doc.text(`Page ${pageNum}`, W - M, H - 8, { align: "right" });
  }

  // ── Page header (pages 2+) ────────────────────────────────────────────────
  private drawPageHeader(subtitle: string) {
    const { doc, W, M } = this;
    setFill(doc, C.forest);
    doc.rect(0, 0, W, 15, "F");

    setTxt(doc, C.white);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("STARHAWK\u2122 Crop Assessment", M, 8);

    doc.setFont("helvetica", "normal");
    setTxt(doc, C.accentGreen);
    doc.setFontSize(8);
    doc.text(subtitle, W - M, 8, { align: "right" });
  }

  // ── Header (monitoring style) ──────────────────────────────────────────
  private drawHeader(title: string, subtitle?: string) {
    const { doc, W, M } = this;
    setFill(doc, C.forest);
    doc.rect(0, 0, W, 25, "F");

    setTxt(doc, C.white);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(title, M, 12);

    if (subtitle) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      setTxt(doc, C.accentGreen);
      doc.text(subtitle, M, 18);
    }

    // Logo placeholder
    setFill(doc, C.accentGreen);
    doc.circle(W - M - 5, 12, 6, "F");
    setTxt(doc, C.forest);
    doc.setFontSize(6);
    doc.text("SH", W - M - 5, 12.5, { align: "center" });
  }

  // ── Section divider ───────────────────────────────────────────────────────
  private drawSection(title: string, y: number): number {
    const { doc, M, CW } = this;
    rRect(doc, M, y, CW, 8, 3, C.forest);
    rRect(doc, M, y, 3.5, 8, 2, C.sage); // left accent stripe
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "bold");
    setTxt(doc, C.white);
    doc.text(title.toUpperCase(), M + 7, y + 5.3);
    return y + 13;
  }

  // ── Info grid ─────────────────────────────────────────────────────────────
  private drawInfoGrid(items: Array<[string, string]>, y: number): number {
    const { doc, M, CW } = this;
    const cols = 2;
    const cw = CW / cols;
    const rh = 10;
    const rows = Math.ceil(items.length / cols);

    items.forEach(([key, val], i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = M + col * cw;
      const ry = y + row * rh;
      const bg = row % 2 === 0 ? C.mint : C.white;

      rRect(doc, x + 0.5, ry + 0.5, cw - 1, rh - 1, 2, bg, C.mist, 0.3);

      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      setTxt(doc, C.sage);
      doc.text(key.toUpperCase(), x + 3.5, ry + 4);

      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      setTxt(doc, C.charcoal);
      // Truncate value if too wide
      const maxW = cw - 7;
      let valStr = String(val);
      while (doc.getTextWidth(valStr) > maxW && valStr.length > 4) {
        valStr = valStr.slice(0, -1);
      }
      if (valStr !== String(val)) valStr = valStr.slice(0, -1) + "\u2026";
      doc.text(valStr, x + 3.5, ry + 8);
    });

    return y + rows * rh + 4;
  }

  // ── Score dial ────────────────────────────────────────────────────────────
  private drawScoreDial(risk: RiskAssessment, cx: number, cy: number, r = 18) {
    const { doc } = this;
    const { main: mainCol } = levelColors(risk.level);

    // Semi-circle gauge: sweeps from left (180°) to right (0°) across the top.
    // strokeArc draws CCW so we go from 180° down to 0°.
    doc.setLineWidth(6);
    setDraw(doc, C.mist);
    strokeArc(doc, cx, cy, r, 0, 180); // full grey track (left → right, top arc)

    // Coloured portion: map score 0–100 → 0–180°, drawn from left side inward
    const fillAngle = (risk.score / 100) * 180;
    setDraw(doc, mainCol);
    strokeArc(doc, cx, cy, r, 180 - fillAngle, 180); // right-to-left fill

    doc.setLineWidth(0.4);

    // Centre circle
    rRect(doc, cx - 9, cy - 9, 18, 18, 9, C.white, C.mist, 0.6);

    // Score number
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    setTxt(doc, C.charcoal);
    doc.text(String(risk.score), cx, cy + 3, { align: "center" });

    // Level pill below
    pill(doc, risk.level, cx, cy + r + 6, mainCol, C.white, 8);

    // Caption
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    setTxt(doc, C.slate);
    doc.text("RISK SCORE", cx, cy + r + 13, { align: "center" });
  }

  // ── Status badge ──────────────────────────────────────────────────────────
  private drawStatusBadge(
    status: string,
    x: number,
    y: number,
    w: number,
    h: number,
  ) {
    const { doc } = this;
    const { main, lite } = statusColors(status);
    rRect(doc, x, y, w, h, 5, lite, main, 1.5);

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    setTxt(doc, C.slate);
    doc.text("FIELD STATUS", x + w / 2, y + h / 2 - 2.5, { align: "center" });

    doc.setFontSize(11);
    setTxt(doc, main);
    doc.text(status, x + w / 2, y + h / 2 + 4, { align: "center" });
  }

  // ── Metric bar ────────────────────────────────────────────────────────────
  private drawMetricBar(
    label: string,
    value: number,
    x: number,
    y: number,
    totalW: number,
  ): number {
    const { doc } = this;
    const BAR_X = x + 50;
    const BAR_W = totalW - 50 - 22;
    const BAR_H = 4;
    const BAR_Y = y + 2;
    const col = barColor(value);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    setTxt(doc, C.charcoal);
    doc.text(label, x, BAR_Y + 2.8);

    rRect(doc, BAR_X, BAR_Y, BAR_W, BAR_H, 2, C.mist);

    if (value > 0) {
      const fw = Math.max(BAR_W * (value / 100), BAR_H);
      rRect(doc, BAR_X, BAR_Y, fw, BAR_H, 2, col);
    }

    const valStr = `${value.toFixed(1)}%`;
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    const pw = doc.getTextWidth(valStr) + 4;
    rRect(doc, BAR_X + BAR_W + 2, BAR_Y - 0.5, pw, BAR_H + 1, 1.5, col);
    setTxt(doc, C.white);
    doc.text(valStr, BAR_X + BAR_W + 4, BAR_Y + 2.8);

    return y + 10;
  }

  // ── Recommendations ───────────────────────────────────────────────────────
  private drawRecommendations(recs: string[], y: number): number {
    const { doc, M, CW } = this;
    const rowH = 11;

    recs.forEach((rec, i) => {
      const ry = y + i * rowH;
      rRect(doc, M, ry, CW, rowH - 0.5, 2.5, i % 2 === 0 ? C.mint : C.white);

      // Numbered badge
      rRect(doc, M + 1.5, ry + 1.5, 7, 8, 2, C.leaf);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      setTxt(doc, C.white);
      doc.text(String(i + 1).padStart(2, "0"), M + 5, ry + 7, {
        align: "center",
      });

      // Text - show full recommendation without truncation
      const lines = doc.splitTextToSize(cleanText(rec), CW - 14) as string[];
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      setTxt(doc, C.slate);

      // Show all lines, not just the first one
      lines.forEach((line, lineIndex) => {
        if (lineIndex === 0) {
          doc.text(line, M + 11, ry + 7);
        } else {
          // Additional lines for longer recommendations
          doc.text(line, M + 11, ry + 7 + lineIndex * 4);
        }
      });
    });

    return y + recs.length * rowH + 10; // Increased spacing for longer text
  }

  // ── Drone analysis card ───────────────────────────────────────────────────
  private drawDroneCard(
    title: string,
    data: DroneAnalysisData,
    y: number,
  ): number {
    const { doc, M, CW } = this;
    const levels = data.weed_analysis?.levels ?? [];
    const cardH = 18 + levels.length * 10 + 4;

    rRect(doc, M, y, CW, cardH, 4, C.cream, C.mist, 0.6);

    // Title bar
    setFill(doc, C.leaf);
    doc.roundedRect(M, y, CW, 10, 4, 4, "F");
    doc.rect(M, y + 5, CW, 5, "F"); // square off bottom of title bar

    doc.setFontSize(9.5);
    doc.setFont("helvetica", "bold");
    setTxt(doc, C.white);
    doc.text(title, M + 5, y + 6.8);

    // Meta row
    const fieldHa = data.field
      ? fieldAreaHectares(data.field as Record<string, unknown>)
      : null;
    const meta = [
      `Crop: ${data.field?.crop ?? "N/A"}`,
      `Stage: ${data.field?.growing_stage ?? "N/A"}`,
      `Area: ${fieldHa != null ? `${fieldHa.toFixed(2)} ha` : "N/A"}`,
    ].join("   \u00B7   ");
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    setTxt(doc, C.slate);
    doc.text(meta, M + 5, y + 16);

    // Divider
    setDraw(doc, C.mist);
    doc.setLineWidth(0.4);
    doc.line(M + 4, y + 18, M + CW - 4, y + 18);

    // Stress level bars
    levels.forEach((level, i) => {
      const bY = y + 20 + i * 10;
      const BAR_X = M + 60;
      const BAR_W = CW - 60 - 28;
      const BAR_H = 4;
      const col = severityColor(level.severity);
      const pct = level.percentage ?? 0;

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      setTxt(doc, C.charcoal);
      doc.text(level.level, M + 4, bY + 3);

      rRect(doc, BAR_X, bY, BAR_W, BAR_H, 2, C.mist);
      if (pct > 0) {
        rRect(
          doc,
          BAR_X,
          bY,
          Math.max(BAR_W * (pct / 100), BAR_H),
          BAR_H,
          2,
          col,
        );
      }

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      setTxt(doc, C.slate);
      doc.text(`${pct.toFixed(2)}%`, BAR_X + BAR_W + 3, bY + 3);

      doc.setFont("helvetica", "normal");
      const haVal = analysisLevelHectares(level as Record<string, unknown>);
      const ha = haVal > 0 ? `${haVal.toFixed(2)} ha` : "\u2014";
      doc.text(ha, M + CW - 3, bY + 3, { align: "right" });
    });

    return y + cardH + 5;
  }

  // ── Assessor notes ────────────────────────────────────────────────────────
  private drawNotes(notes: string, y: number): number {
    const { doc, M, CW } = this;

    doc.setFontSize(8.5);
    const lines = doc.splitTextToSize(notes, CW - 12) as string[];
    const cardH = lines.length * 5 + 12;

    rRect(doc, M, y, CW, cardH, 4, C.mint, C.sage, 1);
    rRect(doc, M, y, 3, cardH, 2, C.sage); // left accent bar

    doc.setFont("helvetica", "normal");
    setTxt(doc, C.slate);
    doc.text(lines, M + 7, y + 7);

    return y + cardH + 5;
  }

  // ── Sign-off block ────────────────────────────────────────────────────────

  private drawSignOff(y: number, data: ReportData): number {
    const { doc, M, CW } = this;
    const cols = 2;
    const cw = CW / cols;
    const ch = 20;
    const labels = ["Assessor Name", "Date"];
    const values = [
      data.farmDetails.farmerName || "N/A", // Use farmer name as assessor
      data.reportGeneratedAt.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    ];

    labels.forEach((label, i) => {
      const x = M + i * cw;
      rRect(doc, x + 0.5, y, cw - 1, ch, 3, C.white, C.mist, 0.5);

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      setTxt(doc, C.leaf);
      doc.text(label, x + 4, y + 6);

      // Fill in the value directly (no signature line)
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      setTxt(doc, C.slate);
      doc.text(values[i], x + 4, y + 17);
    });

    return y + ch + 4;
  }
  private needsBreak(y: number, needed: number): boolean {
    return y + needed > this.H - 18;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PUBLIC: generateReport
  // ══════════════════════════════════════════════════════════════════════════
  public async generateReport(data: ReportData): Promise<Blob> {
    const { doc, M, CW, H } = this;
    let y = 35;
    let pageNum = 1;

    // ── PAGE 1: Farm Overview & Risk Summary ─────────────────────────────
    this.drawHeader(
      "Crop Risk Assessment Report",
      `${data.farmDetails.name} • ID: ${data.assessmentId}`,
    );

    // --- Farm Info Grid (monitoring style) ---
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    setTxt(doc, C.forest);
    doc.text("FARM CONTEXT", M, y);
    y += 6;

    const locationDisplay = formatLocation(data.farmDetails.location);
    const areaDisplay =
      typeof data.farmDetails.area === "number"
        ? `${data.farmDetails.area.toFixed(2)} ha`
        : `${data.farmDetails.area} ha`;

    const info = [
      ["Farmer", data.farmDetails.farmerName],
      ["Crop Type", data.farmDetails.cropType],
      ["Field Area", areaDisplay],
      ["Location", locationDisplay],
    ];

    info.forEach(([label, val], i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = M + col * (CW / 2);
      const ry = y + row * 12;

      doc.setFontSize(7);
      setTxt(doc, C.slate);
      doc.text(label.toUpperCase(), x, ry);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      setTxt(doc, C.charcoal);
      doc.text(String(val), x, ry + 5);
    });

    y += 25;

    // --- Risk Assessment Summary ---
    y = this.drawSection("Risk Assessment Summary", y);

    const levelDesc: Record<string, string> = {
      LOW: "The field is in good condition with minimal intervention required.",
      MODERATE:
        "The field shows stress indicators. Close monitoring is recommended.",
      HIGH: "Significant risks detected. Prompt agronomic intervention advised.",
      CRITICAL: "Critical conditions identified. Immediate action required.",
    };
    const blurb =
      `Assessment Result: ${levelDesc[data.riskAssessment.level] ?? ""} ` +
      `Composite risk score ${data.riskAssessment.score}/100 \u2014 ` +
      `${data.riskAssessment.level} risk. Field status: ${data.riskAssessment.fieldStatus}.`;
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    setTxt(doc, C.slate);
    const blurbLines = doc.splitTextToSize(blurb, CW - 2) as string[];
    doc.text(blurbLines, M + 1, y + 5);
    y += blurbLines.length * 5 + 8;

    // Score dial + field status badge — side by side
    const DIAL_R = 18;
    const DIAL_CX = M + 32;
    const DIAL_CY = y + DIAL_R + 8;
    const DIAL_BOTTOM = DIAL_CY + DIAL_R + 16;

    this.drawScoreDial(data.riskAssessment, DIAL_CX, DIAL_CY, DIAL_R);

    const BADGE_W = 54;
    const BADGE_H = 24;
    const BADGE_X = M + 74;
    const BADGE_Y = DIAL_CY - BADGE_H / 2;
    this.drawStatusBadge(
      data.riskAssessment.fieldStatus,
      BADGE_X,
      BADGE_Y,
      BADGE_W,
      BADGE_H,
    );

    y = DIAL_BOTTOM + 4;

    // Component bars
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    setTxt(doc, C.leaf);
    doc.text("Risk Component Breakdown", M, y);
    y += 5;

    [
      { name: "Crop Health", value: data.riskAssessment.components.cropHealth },
      { name: "Weather Risk", value: data.riskAssessment.components.weather },
      {
        name: "Growth Stage",
        value: data.riskAssessment.components.growthStage,
      },
      { name: "Flowering", value: data.riskAssessment.components.flowering },
    ].forEach(({ name, value }) => {
      y = this.drawMetricBar(name, value, M, y, CW);
    });
    y += 4;

    // ── Recommendations ───────────────────────────────────────────────────
    if (this.needsBreak(y, 50)) {
      this.drawFooter(pageNum++);
      doc.addPage();
      this.drawPageHeader("Recommendations");
      y = 20;
    }
    y = this.drawSection("Key Recommendations", y);
    y = this.drawRecommendations(data.riskAssessment.recommendations, y);

    // ── Notes ────────────────────────────────────────────────────────────
    if (data.comprehensiveNotes) {
      if (this.needsBreak(y, 40)) {
        this.drawFooter(pageNum++);
        doc.addPage();
        this.drawPageHeader("Assessor Notes");
        y = 20;
      }
      y = this.drawSection("Assessor Comprehensive Notes", y);
      y = this.drawNotes(data.comprehensiveNotes, y);
    }

    this.drawFooter(pageNum++);

    // ── DRONE ANALYSIS PAGES (Full Page Quality — matching monitoring) ───
    const validDrones = data.dronePdfs.filter((p) => p.droneAnalysisData);
    if (validDrones.length > 0) {
      for (const pdf of validDrones) {
        const endGenericPage = doc.getNumberOfPages();
        doc.addPage();

        // Render the complete Drone Report layout (full page, rich design)
        await renderDroneDataToDoc(
          doc,
          pdf.droneAnalysisData!,
          formatReportTypeLabel(pdf.pdfType),
          true,
        );

        const finalDronePage = doc.getNumberOfPages();

        // Add footer to all drone pages retrospectively
        for (let p = endGenericPage + 1; p <= finalDronePage; p++) {
          doc.setPage(p);
          this.drawFooter(pageNum++);
        }

        // Resync to last page
        doc.setPage(finalDronePage);
      }
    }

    // ── Sign-Off Page ───────────────────────────────────────────────────
    doc.addPage();
    this.drawPageHeader("Sign-Off");
    y = 20;

    y = this.drawSection("Report Sign-Off", y);
    this.drawSignOff(y, data);
    this.drawFooter(pageNum);

    // Prune trailing blank page if sign-off was short
    return new Blob([doc.output("blob")], { type: "application/pdf" });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PUBLIC: downloadReport
  // ══════════════════════════════════════════════════════════════════════════
  public downloadReport(data: ReportData, filename?: string): void {
    const defaultFilename =
      `crop-assessment-${data.farmDetails.name}-` +
      `${data.reportGeneratedAt.toISOString().split("T")[0]}.pdf`;

    this.generateReport(data).then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename ?? defaultFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }
}
