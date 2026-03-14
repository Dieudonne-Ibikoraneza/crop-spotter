import jsPDF from "jspdf";
import {
  RiskAssessment,
  DroneAnalysisData,
  WeatherData,
} from "./riskCalculation";

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

export class ComprehensiveReportGenerator {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number;

  constructor() {
    this.doc = new jsPDF("p", "mm", "a4");
    this.pageWidth = this.doc.internal.pageSize.getWidth(); // 210
    this.pageHeight = this.doc.internal.pageSize.getHeight(); // 297
    this.margin = 14;
  }

  private addHeader(title: string, subtitle?: string): number {
    // Header background
    this.doc.setFillColor(248, 250, 252);
    this.doc.rect(0, 0, this.pageWidth, 25, "F");

    // Title
    this.doc.setFontSize(16);
    this.doc.setFont("helvetica", "bold");
    this.doc.setTextColor(22, 101, 52);
    this.doc.text(title, this.margin, 17);

    // Subtitle
    if (subtitle) {
      this.doc.setFontSize(10);
      this.doc.setFont("helvetica", "normal");
      this.doc.setTextColor(100, 100, 100);
      this.doc.text(subtitle, this.margin, 22);
    }

    return 30; // Return Y position after header
  }

  private addSection(title: string, y: number): number {
    // Section header
    this.doc.setFillColor(22, 101, 52);
    this.doc.rect(this.margin, y, this.pageWidth - 2 * this.margin, 8, "F");

    this.doc.setFontSize(11);
    this.doc.setFont("helvetica", "bold");
    this.doc.setTextColor(255, 255, 255);
    this.doc.text(title, this.margin + 5, y + 5.5);

    return y + 15; // Return Y position after section
  }

  private addRiskScorecard(riskAssessment: RiskAssessment, y: number): number {
    const cardWidth = (this.pageWidth - 2 * this.margin) / 2;

    // Risk Score Card
    this.doc.setFillColor(255, 255, 255);
    this.doc.setDrawColor(22, 101, 52);
    this.doc.setLineWidth(0.5);
    this.doc.rect(this.margin, y, cardWidth - 5, 40, "D");

    // Risk Score - Center the text properly
    this.doc.setFontSize(24);
    this.doc.setFont("helvetica", "bold");
    const riskColor = this.getRiskColor(riskAssessment.level);
    this.doc.setTextColor(...riskColor);
    const scoreText = riskAssessment.score.toString();
    const scoreWidth = this.doc.getTextWidth(scoreText);
    this.doc.text(
      scoreText,
      this.margin + (cardWidth - 5) / 2 - scoreWidth / 2,
      y + 20,
    );

    // Risk Level - Center the text properly
    this.doc.setFontSize(12);
    const levelText = riskAssessment.level;
    const levelWidth = this.doc.getTextWidth(levelText);
    this.doc.text(
      levelText,
      this.margin + (cardWidth - 5) / 2 - levelWidth / 2,
      y + 30,
    );

    // Field Status Card
    this.doc.rect(this.margin + cardWidth + 5, y, cardWidth - 5, 40, "D");

    this.doc.setFontSize(11);
    this.doc.setFont("helvetica", "bold");
    this.doc.setTextColor(0, 0, 0);
    this.doc.text("Field Status", this.margin + cardWidth + 10, y + 15);

    this.doc.setFontSize(16);
    const statusColor = this.getStatusColor(riskAssessment.fieldStatus);
    this.doc.setTextColor(...statusColor);
    const statusText = riskAssessment.fieldStatus;
    const statusWidth = this.doc.getTextWidth(statusText);
    this.doc.text(
      statusText,
      this.margin + cardWidth + 5 + (cardWidth - 5) / 2 - statusWidth / 2,
      y + 28,
    );

    return y + 50;
  }

  private addRiskComponents(riskAssessment: RiskAssessment, y: number): number {
    const components = [
      {
        name: "Crop Health",
        value: riskAssessment.components.cropHealth,
        icon: "🌿",
      },
      {
        name: "Weather Risk",
        value: riskAssessment.components.weather,
        icon: "🌦️",
      },
      {
        name: "Growth Stage",
        value: riskAssessment.components.growthStage,
        icon: "🌱",
      },
      {
        name: "Flowering",
        value: riskAssessment.components.flowering,
        icon: "🌸",
      },
    ];

    const barWidth = (this.pageWidth - 2 * this.margin) / 4 - 10;

    components.forEach((component, index) => {
      const x = this.margin + index * (barWidth + 10);

      // Bar background
      this.doc.setFillColor(240, 240, 240);
      this.doc.rect(x, y, barWidth, 6, "F");

      // Bar fill
      const fillWidth = (component.value / 100) * barWidth;
      const barColor = this.getBarColor(component.value);
      this.doc.setFillColor(...barColor);
      this.doc.rect(x, y, fillWidth, 6, "F");

      // Label
      this.doc.setFontSize(8);
      this.doc.setFont("helvetica", "normal");
      this.doc.setTextColor(0, 0, 0);
      this.doc.text(component.icon, x + barWidth / 2 - 10, y - 3, {
        align: "center",
      });
      this.doc.text(component.name, x + barWidth / 2, y - 3, {
        align: "center",
      });

      // Value
      this.doc.setFontSize(10);
      this.doc.setFont("helvetica", "bold");
      this.doc.text(`${component.value}%`, x + barWidth / 2, y + 12, {
        align: "center",
      });
    });

    return y + 25;
  }

  private addDroneAnalysis(
    dronePdfs: ReportData["dronePdfs"],
    y: number,
  ): number {
    console.log("addDroneAnalysis called with:", dronePdfs);

    if (!dronePdfs || !Array.isArray(dronePdfs)) {
      console.log("No drone PDFs data available");
      this.doc.setFontSize(10);
      this.doc.setFont("helvetica", "italic");
      this.doc.setTextColor(100, 100, 100);
      this.doc.text("No drone analysis data available", this.margin, y);
      return y + 20;
    }

    if (dronePdfs.length === 0) {
      console.log("Empty drone PDFs array");
      this.doc.setFontSize(10);
      this.doc.setFont("helvetica", "italic");
      this.doc.setTextColor(100, 100, 100);
      this.doc.text("No drone analysis data available", this.margin, y);
      return y + 20;
    }

    dronePdfs.forEach((pdf, index) => {
      console.log(`Processing PDF ${index}:`, pdf);

      if (!pdf.droneAnalysisData) {
        console.log(`PDF ${index} has no droneAnalysisData`);
        return;
      }

      const data = pdf.droneAnalysisData;
      const analysisType =
        pdf.pdfType === "plant_health"
          ? "Plant Health Analysis"
          : pdf.pdfType === "flowering"
            ? "Flowering Analysis"
            : `Analysis (${pdf.pdfType})`;

      // Analysis header
      this.doc.setFontSize(11);
      this.doc.setFont("helvetica", "bold");
      this.doc.setTextColor(22, 101, 52);
      this.doc.text(analysisType, this.margin, y);

      y += 8;

      // Field info
      if (data.field) {
        this.doc.setFontSize(9);
        this.doc.setFont("helvetica", "normal");
        this.doc.setTextColor(0, 0, 0);

        const fieldInfo = [
          `Crop: ${data.field.crop || "N/A"}`,
          `Growing Stage: ${data.field.growing_stage || "N/A"}`,
          `Area: ${data.field.area_hectares || "N/A"} hectares`,
        ];

        fieldInfo.forEach((info, i) => {
          this.doc.text(info, this.margin + 5, y + i * 4);
        });

        y += fieldInfo.length * 4 + 5;
      }

      // Weed analysis table
      if (
        data.weed_analysis?.levels &&
        Array.isArray(data.weed_analysis.levels)
      ) {
        this.doc.setFontSize(9);
        this.doc.setFont("helvetica", "bold");
        this.doc.text("Stress Level Analysis:", this.margin, y);
        y += 5;

        data.weed_analysis.levels.forEach((level, i) => {
          const severityColor = this.getSeverityColor(level.severity);
          this.doc.setTextColor(...severityColor);
          this.doc.setFont("helvetica", "normal");
          this.doc.text(
            `${level.level}: ${level.percentage}% (${level.area_hectares || "N/A"} ha)`,
            this.margin + 10,
            y + i * 4,
          );
        });

        y += data.weed_analysis.levels.length * 4 + 8;
      } else {
        console.log("No weed analysis levels found for PDF:", pdf.pdfType);
      }

      // Add spacing between analyses
      if (index < dronePdfs.length - 1) {
        y += 10;
      }
    });

    return y;
  }

  private addRecommendations(recommendations: string[], y: number): number {
    this.doc.setFontSize(10);
    this.doc.setFont("helvetica", "bold");
    this.doc.setTextColor(22, 101, 52);
    this.doc.text("Recommendations:", this.margin, y);
    y += 8;

    recommendations.forEach((rec, index) => {
      this.doc.setFontSize(9);
      this.doc.setFont("helvetica", "normal");
      this.doc.setTextColor(0, 0, 0);

      // Handle multi-line recommendations
      const lines = this.doc.splitTextToSize(
        rec,
        this.pageWidth - 2 * this.margin - 10,
      );
      lines.forEach((line, lineIndex) => {
        this.doc.text(line, this.margin + 10, y + index * 6 + lineIndex * 4);
      });
    });

    return y + recommendations.length * 6 + 10;
  }

  private addComprehensiveNotes(notes: string, y: number): number {
    this.doc.setFontSize(10);
    this.doc.setFont("helvetica", "bold");
    this.doc.setTextColor(22, 101, 52);
    this.doc.text("Assessor Notes:", this.margin, y);
    y += 8;

    this.doc.setFontSize(9);
    this.doc.setFont("helvetica", "normal");
    this.doc.setTextColor(0, 0, 0);

    const lines = this.doc.splitTextToSize(
      notes,
      this.pageWidth - 2 * this.margin - 10,
    );
    lines.forEach((line, index) => {
      this.doc.text(line, this.margin + 10, y + index * 4);
    });

    return y + lines.length * 4 + 10;
  }

  private addFooter(pageNumber: number, totalPages: number): void {
    const footerY = this.pageHeight - 10;

    this.doc.setFontSize(8);
    this.doc.setFont("helvetica", "normal");
    this.doc.setTextColor(150, 150, 150);

    this.doc.text(
      `Page ${pageNumber} of ${totalPages}`,
      this.pageWidth / 2,
      footerY,
      { align: "center" },
    );
    this.doc.text(
      `Generated on ${new Date().toLocaleDateString()}`,
      this.margin,
      footerY,
    );
    this.doc.text(
      "STARHAWK Crop Assessment Report",
      this.pageWidth - this.margin,
      footerY,
      { align: "right" },
    );
  }

  private getRiskColor(level: string): [number, number, number] {
    switch (level) {
      case "LOW":
        return [34, 197, 94];
      case "MODERATE":
        return [59, 130, 246];
      case "HIGH":
        return [251, 146, 60];
      case "CRITICAL":
        return [239, 68, 68];
      default:
        return [107, 114, 128];
    }
  }

  private getStatusColor(status: string): [number, number, number] {
    switch (status) {
      case "Healthy":
        return [34, 197, 94];
      case "At Risk":
        return [251, 146, 60];
      case "Critical":
        return [239, 68, 68];
      default:
        return [107, 114, 128];
    }
  }

  private getBarColor(value: number): [number, number, number] {
    if (value <= 25) return [34, 197, 94];
    if (value <= 50) return [59, 130, 246];
    if (value <= 75) return [251, 146, 60];
    return [239, 68, 68];
  }

  private getSeverityColor(severity: string): [number, number, number] {
    switch (severity.toLowerCase()) {
      case "healthy":
        return [34, 197, 94];
      case "low":
        return [59, 130, 246];
      case "moderate":
        return [251, 146, 60];
      case "high":
        return [239, 68, 68];
      default:
        return [107, 114, 128];
    }
  }

  private checkPageBreak(requiredHeight: number, currentY: number): boolean {
    return currentY + requiredHeight > this.pageHeight - 30;
  }

  public async generateReport(data: ReportData): Promise<Blob> {
    console.log("Generating report with data:", data);

    let currentY = 0;
    let pageNumber = 1;

    // PAGE 1: Executive Summary
    currentY = this.addHeader(
      "Crop Risk Assessment Report",
      `${data.farmDetails.name} - ${data.farmDetails.cropType}`,
    );

    currentY = this.addSection("Risk Assessment Summary", currentY);
    currentY = this.addRiskScorecard(data.riskAssessment, currentY);
    currentY = this.addRiskComponents(data.riskAssessment, currentY);

    currentY = this.addSection("Key Recommendations", currentY);
    currentY = this.addRecommendations(
      data.riskAssessment.recommendations,
      currentY,
    );

    this.addFooter(pageNumber, 2);

    // PAGE 2: Detailed Analysis
    this.doc.addPage();
    pageNumber++;
    currentY = 0;

    currentY = this.addHeader("Detailed Analysis");
    currentY = this.addSection("Drone Analysis Results", currentY);
    currentY = this.addDroneAnalysis(data.dronePdfs, currentY);

    currentY = this.addSection("Assessor Comprehensive Notes", currentY);
    currentY = this.addComprehensiveNotes(data.comprehensiveNotes, currentY);

    this.addFooter(pageNumber, 2);

    return new Blob([this.doc.output("blob")], { type: "application/pdf" });
  }

  public downloadReport(data: ReportData, filename?: string): void {
    const defaultFilename = `crop-assessment-${data.farmDetails.name}-${new Date().toISOString().split("T")[0]}.pdf`;
    const finalFilename = filename || defaultFilename;

    this.generateReport(data).then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = finalFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }
}
