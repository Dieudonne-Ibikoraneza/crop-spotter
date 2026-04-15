import { jsPDF } from "jspdf";
import { CropMonitoringRecord } from "@/lib/api/services/cropMonitoring";
import { formatReportTypeLabel } from "@/lib/crops";

// --- Palette ---
const C = {
  forest: [13, 74, 42] as [number, number, number],
  leaf: [22, 101, 52] as [number, number, number],
  sage: [45, 134, 83] as [number, number, number],
  mint: [232, 245, 238] as [number, number, number],
  cream: [250, 250, 247] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  charcoal: [28, 28, 30] as [number, number, number],
  slate: [74, 85, 104] as [number, number, number],
  mist: [226, 232, 240] as [number, number, number],
  accentGreen: [74, 222, 128] as [number, number, number],
};

const setFill = (doc: jsPDF, rgb: [number, number, number]) => doc.setFillColor(rgb[0], rgb[1], rgb[2]);
const setTxt = (doc: jsPDF, rgb: [number, number, number]) => doc.setTextColor(rgb[0], rgb[1], rgb[2]);
const rRect = (doc: jsPDF, x: number, y: number, w: number, h: number, r: number, fill?: [number, number, number]) => {
  if (fill) setFill(doc, fill);
  doc.roundedRect(x, y, w, h, r, r, fill ? "F" : "D");
};

export interface MonitoringReportData {
  farmName: string;
  farmerName: string;
  cropType: string;
  area: number;
  location: string;
  policyNumber: string;
  cycles: CropMonitoringRecord[];
}

export class MonitoringReportGenerator {
  private doc: jsPDF;
  private W: number;
  private H: number;
  private M: number;
  private CW: number;

  constructor() {
    this.doc = new jsPDF("p", "mm", "a4");
    this.W = this.doc.internal.pageSize.getWidth();
    this.H = this.doc.internal.pageSize.getHeight();
    this.M = 14;
    this.CW = this.W - 2 * this.M;
  }

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

  private drawFooter(pageNum: number) {
    const { doc, W, H, M } = this;
    doc.setFontSize(8);
    setTxt(doc, C.slate);
    doc.text(`STARHAWK™ Monitoring System  •  Confidential`, W / 2, H - 8, { align: "center" });
    doc.text(`Page ${pageNum}`, W - M, H - 8, { align: "right" });
  }

  private async urlToBase64(url: string): Promise<string | null> {
    try {
      if (url.startsWith("data:")) return url;

      let proxyUrl = url;
      if (!url.startsWith("http")) {
        const baseUrl = (import.meta.env.VITE_API_URL || window.location.origin).replace("/api/v1", "");
        proxyUrl = `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
      }

      const response = await fetch(proxyUrl);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn("Failed to convert image to base64:", url, e);
      return null;
    }
  }

  public async generateFullReport(data: MonitoringReportData): Promise<Blob> {
    const { doc, M, CW, H } = this;
    let y = 35;
    let pageNum = 1;

    this.drawHeader("Full Monitoring Report", `${data.farmName} • Policy ${data.policyNumber}`);
    
    // --- Farm Info Grid ---
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    setTxt(doc, C.forest);
    doc.text("FARM CONTEXT", M, y);
    y += 6;

    const info = [
      ["Farmer", data.farmerName],
      ["Crop Type", formatReportTypeLabel(data.cropType)],
      ["Field Area", `${data.area} hectares`],
      ["Location", data.location],
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

    // --- Monitoring Timeline ---
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    setTxt(doc, C.forest);
    doc.text("TIMELINE & LOGS", M, y);
    y += 8;

    for (const cycle of data.cycles) {
      if (y > H - 40) {
        this.drawFooter(pageNum++);
        doc.addPage();
        y = 20;
      }

      // Cycle Header
      rRect(doc, M, y, CW, 10, 2, C.mint);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      setTxt(doc, C.leaf);
      
      const cycleDate = cycle.monitoringDate ? new Date(cycle.monitoringDate).toLocaleDateString() : "Pending";
      doc.text(`Cycle #${cycle.monitoringNumber} - ${cycleDate}`, M + 4, y + 6.5);
      
      const status = cycle.status || "In Progress";
      doc.setFontSize(7);
      const sw = doc.getTextWidth(status) + 6;
      rRect(doc, M + CW - sw - 4, y + 2, sw, 6, 3, C.white);
      setTxt(doc, C.sage);
      doc.text(status, M + CW - sw / 2 - 4, y + 6, { align: "center" });

      y += 15;

      // Observations
      if (cycle.observations?.length) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        setTxt(doc, C.slate);
        doc.text("Key Observations:", M + 2, y);
        y += 5;
        
        doc.setFont("helvetica", "normal");
        cycle.observations.forEach(obs => {
          doc.text(`• ${obs}`, M + 4, y);
          y += 5;
        });
        y += 2;
      }

      // Notes
      if (cycle.notes) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        setTxt(doc, C.slate);
        doc.text("Detailed Notes:", M + 2, y);
        y += 5;
        
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(cycle.notes, CW - 10);
        doc.text(lines, M + 4, y);
        y += lines.length * 4 + 4;
      }

      // Drone Reports (Summary)
      if (cycle.droneAnalysisPdfs?.length) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        setTxt(doc, C.slate);
        doc.text("Drone Analysis Reports:", M + 2, y);
        y += 5;

        for (const pdf of cycle.droneAnalysisPdfs) {
          if (y > H - 60) {
            this.drawFooter(pageNum++);
            doc.addPage();
            y = 20;
          }

          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          setTxt(doc, C.leaf);
          doc.text(`> ${formatReportTypeLabel(pdf.pdfType)}`, M + 4, y);
          y += 5;

          // If it has a map image, render at medium scale
          if (pdf.droneAnalysisData?.map_image) {
            try {
              const map = pdf.droneAnalysisData.map_image;
              const mapBase64 = map.data ? `data:image/${map.format || "png"};base64,${map.data}` : (map.url ? await this.urlToBase64(map.url) : null);
              
              if (mapBase64) {
                const mapW = CW * 0.6; // 60% of page width (medium scale)
                const mapH = 45;
                const format = mapBase64.includes("png") ? "PNG" : "JPEG";
                doc.addImage(mapBase64, format, M + (CW - mapW) / 2, y, mapW, mapH);
                y += mapH + 6;
              }
            } catch (e) {
              console.error("Error adding map to PDF:", e);
            }
          }

          // Summary stats (e.g. stress percentage)
          if (pdf.droneAnalysisData?.analysis?.total_area_percent) {
             doc.setFontSize(7);
             doc.setFont("helvetica", "normal");
             setTxt(doc, C.charcoal);
             doc.text(`Impact Area: ${pdf.droneAnalysisData.analysis.total_area_percent.toFixed(1)}%`, M + 8, y);
             y += 4;
          }
        }
        y += 4;
      }

      // Photos Grid (Compact)
      if (cycle.photoUrls?.length) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        setTxt(doc, C.slate);
        doc.text("Field Photos:", M + 2, y);
        y += 4;
        
        const photoW = (CW - 10) / 3;
        const photoH = 30;
        let px = M + 2;
        
        for (const url of cycle.photoUrls.slice(0, 6)) {
          const base64 = await this.urlToBase64(url);
          if (base64) {
             try {
                // Determine format from data URL if possible
                const format = base64.includes("png") ? "PNG" : "JPEG";
                doc.addImage(base64, format, px, y, photoW - 2, photoH);
             } catch (e) {
                console.error("Error adding image to PDF:", e);
             }
          }
          px += photoW;
          if (px > M + CW - 5) {
            px = M + 2;
            y += photoH + 2;
          }
        }
        if (px !== M + 2) y += photoH + 4;
        else y += 2;
      }

      // Weather (if available in cycle data)
      if ((cycle as any).weatherData) {
         // ... (Add weather summary if needed)
      }

      y += 5; // spacing between cycles
    }

    this.drawFooter(pageNum);
    return new Blob([doc.output("blob")], { type: "application/pdf" });
  }

  public async downloadFullReport(data: MonitoringReportData) {
    const blob = await this.generateFullReport(data);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `monitoring-report-${data.farmName.toLowerCase().replace(/\s+/g, "-")}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
