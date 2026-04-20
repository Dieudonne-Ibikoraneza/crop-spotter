import jsPDF from "jspdf";
import { Claim, ClaimAssessment } from "@/lib/api/services/claims";
import { renderDroneDataToDoc } from "./dronePdfGenerator";
import { formatReportTypeLabel } from "@/lib/crops";

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
  primary: [59, 130, 246],
};

function setFill(doc: jsPDF, rgb: RGB) {
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
}

function setDraw(doc: jsPDF, rgb: RGB) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
}

function setTxt(doc: jsPDF, rgb: RGB) {
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
}

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

export class ClaimReportGenerator {
  private doc: jsPDF;
  private W: number;
  private H: number;
  private M: number;
  private CW: number;

  constructor() {
    this.doc = new jsPDF("p", "mm", "a4");
    this.W = this.doc.internal.pageSize.getWidth();
    this.H = this.doc.internal.pageSize.getHeight();
    this.M = 15;
    this.CW = this.W - 2 * this.M;
  }

  private drawHeader(claimId: string) {
    const { doc, W, M } = this;
    setFill(doc, C.forest);
    doc.rect(0, 0, W, 25, "F");

    setTxt(doc, C.white);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Claim Assessment Report", M, 12);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    setTxt(doc, C.mist);
    doc.text(`Claim ID: ${claimId}  \u00B7  Finalized Report`, M, 18);

    // Mini Logo
    setFill(doc, C.white);
    doc.circle(W - M - 5, 12, 6, "F");
    setTxt(doc, C.forest);
    doc.setFontSize(6);
    doc.text("SH", W - M - 5, 12.5, { align: "center" });
  }

  private drawFooter(page: number) {
    const { doc, W, H, M } = this;
    const totalPages = doc.getNumberOfPages();
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold"); 
    doc.setTextColor(60, 60, 60);
    doc.text("STARHAWK\u2122 Claim Audit System \u00B7 Confidential", W / 2, H - 7, { align: "center" });
    doc.text(`Page ${page}`, W - M, H - 7, { align: "right" });
  }

  private drawSectionHeader(title: string, y: number): number {
    const { doc, M, CW } = this;
    rRect(doc, M, y, CW, 8, 2, C.forest);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    setTxt(doc, C.white);
    doc.text(title.toUpperCase(), M + 5, y + 5.5);
    return y + 12;
  }

  // --- Data Extraction Helpers ---
  private getVal(obj: any, keys: string[]): number {
    for (const key of keys) {
      const v = obj?.[key];
      if (v != null && v !== "") return Number(v);
    }
    return 0;
  }

  private getStr(obj: any, keys: string[], fallback = ""): string {
    for (const key of keys) {
      const v = obj?.[key];
      if (
        v != null &&
        v !== "" &&
        v !== "null" &&
        v !== "undefined" &&
        String(v).trim().toLowerCase() !== "null" &&
        String(v).trim().toLowerCase() !== "undefined"
      ) {
        return String(v).trim();
      }
    }
    return fallback;
  }

  private getArr(obj: any, keys: string[]): string[] {
    for (const key of keys) {
      const v = obj?.[key];
      if (Array.isArray(v)) return v;
    }
    return [];
  }

  public async generate(
    claim: Claim, 
    assessment: ClaimAssessment,
    dronePdfs: any[] = []
  ): Promise<void> {
    const { doc, M, CW } = this;
    this.drawHeader(claim._id);
    let y = 35;

    // --- Basic Claim Data ---
    y = this.drawSectionHeader("Claim Overview", y);
    
    // Grid Helper
    const drawGridRow = (label: string, value: string, x: number, y: number, w: number) => {
      doc.setFontSize(7);
      setTxt(doc, C.slate);
      doc.text(label.toUpperCase(), x, y);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      setTxt(doc, C.charcoal);
      doc.text(value || "N/A", x, y + 5);
    };

    const farm = typeof claim.farmId === "object" ? claim.farmId : { name: "N/A", cropType: "N/A", area: 0, locationName: "N/A" };
    const farmer = typeof claim.farmerId === "object" ? claim.farmerId : { firstName: "Unknown", lastName: "Farmer" };
    const policy = typeof claim.policyId === "object" ? claim.policyId : { policyNumber: "N/A", premiumAmount: 0 };

    drawGridRow("Farmer", `${farmer.firstName} ${farmer.lastName}`, M, y, CW / 2);
    drawGridRow("Farm Name", farm.name || "N/A", M + CW / 2, y, CW / 2);
    y += 15;
    drawGridRow("Crop Type", farm.cropType || "N/A", M, y, CW / 2);
    drawGridRow("Field Area", `${farm.area || 0} Ha`, M + CW / 2, y, CW / 2);
    y += 15;
    drawGridRow("Claim Status", claim.status, M, y, CW / 2);
    drawGridRow("Policy No.", policy.policyNumber || "N/A", M + CW / 2, y, CW / 2);
    y += 15;

    const checkPageBreak = (needed: number) => {
      if (y + needed > 275) {
        this.drawFooter(doc.getNumberOfPages());
        doc.addPage();
        y = 20;
        return true;
      }
      return false;
    };

    // --- Loss Metrics ---
    y = this.drawSectionHeader("Loss Quantification (NDVI Analysis)", y);
    
    // Defensive extraction
    const ndviB = this.getVal(assessment, ["ndviBefore", "ndvi_before"]);
    const ndviA = this.getVal(assessment, ["ndviAfter", "ndvi_after"]);
    const dmgA = this.getVal(assessment, ["damageArea", "damage_area", "estimatedDamageArea"]);
    const yldI = this.getVal(assessment, ["yieldImpact", "yield_impact", "impact_percentage"]);

    const metrics = [
      ["NDVI Before", ndviB.toFixed(2)],
      ["NDVI After", ndviA.toFixed(2)],
      ["Damage Area", `${dmgA.toFixed(2)} Ha`],
      ["Yield Impact", `${yldI.toFixed(1)}%`],
    ];

    metrics.forEach(([label, val], i) => {
      const x = M + (i % 2) * (CW / 2);
      const rowY = y + Math.floor(i / 2) * 12;
      drawGridRow(label, val, x, rowY, CW / 2);
    });
    y += 28;

    // --- Observations ---
    y = this.drawSectionHeader("Field Observations", y);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    setTxt(doc, C.charcoal);
    
    const obsArr = this.getArr(assessment, ["observations", "field_observations", "notes_list"]);
    if (obsArr.length > 0) {
      obsArr.forEach((obs) => {
        const lines = doc.splitTextToSize(`\u2022 ${obs}`, CW - 10) as string[];
        const needed = lines.length * 5;
        checkPageBreak(needed);
        doc.text(lines, M + 5, y);
        y += needed + 1;
      });
    } else {
      doc.text("No specific observations recorded.", M + 5, y);
      y += 10;
    }
    y += 5;

    // --- Weather Analysis ---
    checkPageBreak(30);
    y = this.drawSectionHeader("Weather Impact Analysis", y);
    const wthTxt = this.getStr(assessment, ["weatherImpactAnalysis", "weather_impact", "weather_notes"], "No weather analysis provided.");
    const weatherLines = doc.splitTextToSize(wthTxt, CW - 10) as string[];
    checkPageBreak(weatherLines.length * 5 + 5);
    doc.setTextColor(0, 0, 0); // Pure Black
    doc.setFont("helvetica", "normal"); // Ensure it's normal weight
    doc.text(weatherLines, M + 5, y);
    y += weatherLines.length * 5 + 10;

    // --- Executive Summary ---
    checkPageBreak(30);
    y = this.drawSectionHeader("Executive Summary", y);
    const summaryText = this.getStr(assessment, ["reportText", "report_text", "notes", "summary"], "No summary provided.");
    const summaryLines = doc.splitTextToSize(summaryText, CW - 10) as string[];
    checkPageBreak(summaryLines.length * 5 + 5);
    doc.setTextColor(0, 0, 0); // Pure Black
    doc.setFont("helvetica", "normal"); // Ensure it's normal weight
    doc.text(summaryLines, M + 5, y);
    y += summaryLines.length * 5 + 10;

    this.drawFooter(doc.getNumberOfPages());

    // --- Drone Report Appendix ---
    const validDrones = dronePdfs.filter(p => (p.droneAnalysisData || p.analysisData));
    if (validDrones.length > 0) {
      for (const pdf of validDrones) {
        doc.addPage();
        await renderDroneDataToDoc(
          doc, 
          pdf.droneAnalysisData || pdf.analysisData, 
          formatReportTypeLabel(pdf.pdfType),
          true, // skipFooter on drone pages as we handle it ourselves globally below
          {
            summary: this.getStr(assessment, ["reportText", "report_text", "notes", "summary"]),
            weather: this.getStr(assessment, ["weatherImpactAnalysis", "weather_impact", "weather_notes"])
          },
          false // showContext: false - Remove second summary from appendix
        );
      }
    }

    // --- GLOBAL FOOTER STAMPING ---
    // Stamp the footer on every page of the dossier
    const finalTotal = doc.getNumberOfPages();
    for (let i = 1; i <= finalTotal; i++) {
        doc.setPage(i);
        this.drawFooter(i);
    }

    doc.save(`Claim_Report_${claim._id}.pdf`);
  }
}
