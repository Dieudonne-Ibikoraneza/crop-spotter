import { jsPDF } from "jspdf";
import { CropMonitoringRecord } from "@/lib/api/services/cropMonitoring";
import { formatReportTypeLabel } from "@/lib/crops";
import { renderDroneDataToDoc } from "./dronePdfGenerator";

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
      const wxRaw = (cycle as any).weatherData;
      const weatherArray = (Array.isArray(wxRaw) ? wxRaw : (wxRaw?.data || wxRaw?.list || [])) as any[];
      const hasObservations = cycle.observations?.length && cycle.observations.length > 0;
      const hasNotes = !!cycle.notes;
      const hasDrone = cycle.droneAnalysisPdfs?.length && cycle.droneAnalysisPdfs.length > 0;
      const hasPhotos = cycle.photoUrls?.length && cycle.photoUrls.length > 0;
      const hasWeather = weatherArray.length > 0;

      if (!hasObservations && !hasNotes && !hasDrone && !hasPhotos && !hasWeather) {
        continue;
      }

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
      
      const status = cycle.status === "COMPLETED" ? "Completed" : "In Progress";
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

      // Weather Data (First 6 entries for summary)
      if (weatherArray.length > 0) {
        if (y > H - 30) { this.drawFooter(pageNum++); doc.addPage(); y = 20; }
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        setTxt(doc, C.slate);
        doc.text("Weather Forecast Logs:", M + 2, y);
        y += 4;
        
        const wBlockW = (CW - 10) / 3;
        const uniformHeight = 24; // Fixed height to precisely fit all icon rows
        let wx = M + 2;
        let wy = y;
        
        weatherArray.slice(0, 6).forEach((entry, idx) => {
          if (idx === 3) {
            // New row
            wx = M + 2;
            wy += uniformHeight + 3;
            // Protect against row clipping
            if (wy > H - uniformHeight - 10) {
                this.drawFooter(pageNum++);
                doc.addPage();
                wy = 20;
            }
          }

          const dt = entry.dt ? new Date(entry.dt * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit" }) : "";
          const desc = entry.weather?.[0]?.description || "";
          const temp = entry.main?.temp ? (entry.main.temp - 273.15).toFixed(1) : "N/A";
          const hum = entry.main?.humidity ?? "N/A";
          const windSpeed = entry.wind?.speed ?? "N/A";
          const rain = entry.rain?.["3h"] || entry.rain?.["1h"] || 0;

          rRect(doc, wx, wy, wBlockW - 2, uniformHeight, 2, C.mist);
          
          doc.setFontSize(7);
          doc.setFont("helvetica", "bold");
          setTxt(doc, C.charcoal);
          doc.text(`${dt}`, wx + 2, wy + 5);
          
          doc.setFont("helvetica", "normal");
          doc.text(`${desc.charAt(0).toUpperCase() + desc.slice(1)}`, wx + 2, wy + 9);
          
          // Row 1: Temp & Hum
          setTxt(doc, [239, 68, 68]); doc.text(`T`, wx + 2, wy + 14); // red-500
          setTxt(doc, C.charcoal); doc.text(`${temp}°C`, wx + 6, wy + 14);
          
          setTxt(doc, [59, 130, 246]); doc.text(`H`, wx + wBlockW/2 - 2, wy + 14); // blue-500
          setTxt(doc, C.charcoal); doc.text(`${hum}%`, wx + wBlockW/2 + 2, wy + 14);
          
          // Row 2: Wind & Rain
          setTxt(doc, [100, 116, 139]); doc.text(`W`, wx + 2, wy + 19); // slate-500
          setTxt(doc, C.charcoal); doc.text(`${windSpeed} m/s`, wx + 6, wy + 19);
          
          if (rain > 0) {
             doc.setFont("helvetica", "bold");
             doc.setTextColor(37, 99, 235); // blue-600
             doc.text(`R: ${rain} mm`, wx + wBlockW/2 - 2, wy + 19);
          } else {
             doc.setFont("helvetica", "normal");
             doc.setTextColor(160, 160, 160); // muted gray
             doc.text(`No Rain`, wx + wBlockW/2 - 2, wy + 19);
          }
          
          wx += wBlockW;
        });
        
        y = wy + uniformHeight + 6;
      }

          // Drone Reports (Full Page Quality)
          if (cycle.droneAnalysisPdfs?.length) {
            for (const pdf of cycle.droneAnalysisPdfs) {
              if (pdf.droneAnalysisData) {
                // Close out the current monitoring page
                this.drawFooter(pageNum++);
                const endGenericPage = doc.getNumberOfPages();
                doc.addPage();
                y = 20;

                // Render the complete Drone Report layout
                await renderDroneDataToDoc(doc, pdf.droneAnalysisData, formatReportTypeLabel(pdf.pdfType), true);

                const finalDronePage = doc.getNumberOfPages();
                
                // Add the Monitoring Generator footer retrospectively
                for (let p = endGenericPage + 1; p <= finalDronePage; p++) {
                  doc.setPage(p);
                  this.drawFooter(pageNum++);
                }

                // Resync cursor back to the end and start a new generic monitoring page
                doc.setPage(finalDronePage);
                doc.addPage();
                y = 20;
              }
            }
          }

      // Photos Grid (Compact)
      if (cycle.photoUrls?.length) {
        if (y > H - 40) { this.drawFooter(pageNum++); doc.addPage(); y = 20; }
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

      // Clean up spacing
      y += 5;
    }

    // If the generator ended immediately on a new page (e.g. after a Drone Report appended it conditionally)
    // we prune the blank page automatically to save PDF logic bloat.
    if (y <= 25 && doc.getNumberOfPages() > 1) {
      doc.deletePage(doc.getNumberOfPages());
      doc.setPage(doc.getNumberOfPages());
      // The previous page already has its footer!
      return new Blob([doc.output("blob")], { type: "application/pdf" });
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
