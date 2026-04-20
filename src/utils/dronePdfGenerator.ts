import { jsPDF } from "jspdf";

export interface DroneAnalysisData {
  report?: {
    provider?: string;
    survey_date?: string;
    detected_analysis_type?: string;
    detected_report_type?: string;
    analysis_name?: string;
    type?: string;
  };
  field?: {
    crop?: string;
    growing_stage?: string;
    area_hectares?: number | string;
    area_acres?: number | string;
  };
  analysis?: any; // New format for stress/flowering levels
  weed_analysis?: any; // Legacy format
  stand_count_analysis?: any;
  rx_spraying_analysis?: any;
  zonation_analysis?: any;
  additional_info?: string;
  map_image?: {
    url?: string;
    data?: string;
    format?: string;
  };
}

// Fixed colors for level table/chart: row 0=green, row 1=yellow, row 2=red
export const LEVEL_COLORS = ["#00b159", "#f2b11c", "#ef495f"] as const;

export const getLevelColor = (index: number): string =>
  LEVEL_COLORS[index] ?? LEVEL_COLORS[0];

export const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : [0, 177, 89];
};

// Helper: draw pie chart on canvas and return data URL for PDF embedding
export const drawPieChartToDataUrl = (
  levels: { level?: string; name?: string; percentage?: number }[],
  colors: readonly string[] | string[],
  sizePx: number = 120,
): string => {
  const canvas = document.createElement("canvas");
  const dpr = 2;
  canvas.width = sizePx * dpr;
  canvas.height = sizePx * dpr;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.scale(dpr, dpr);
  const centerX = sizePx / 2;
  const centerY = sizePx / 2;
  const radius = sizePx / 2 - 8;
  const total = levels.reduce((sum, l) => sum + (l.percentage ?? 0), 0) || 1;
  let startAngle = -Math.PI / 2;
  levels.forEach((level, i) => {
    const value = level.percentage ?? 0;
    const sliceAngle = (value / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = colors[i] ?? "#888";
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.stroke();
    startAngle += sliceAngle;
  });
  return canvas.toDataURL("image/png");
};

const getAnalysisLabels = (
  type: string | undefined,
  name: string | undefined,
) => {
  const t = (type || name || "").toLowerCase();
  let left = "CROP MONITORING";
  let right = (name || type || "Analysis").toUpperCase() + " ANALYSIS";

  if (
    t.includes("stress") ||
    t.includes("flowering") ||
    t.includes("pest") ||
    t.includes("health")
  ) {
    left = "PLANT HEALTH MONITORING";
  }

  if (t.includes("flowering")) {
    right = "FLOWERING ESTIMATOR";
  } else if (t.includes("pest")) {
    right = "PEST DAMAGE ANALYSIS";
  } else if (t.includes("stand_count") || t.includes("count")) {
    left = "PLANT INVENTORY";
    right = "STAND COUNT ANALYSIS";
  }

  return { left, right };
};

const getLevels = (d: DroneAnalysisData) => {
  const a = d.analysis || d.weed_analysis;
  if (!a) return [];
  return a.levels ?? a.stress_levels ?? [];
};

const getTotalAreaStats = (d: DroneAnalysisData, isPlantStress: boolean) => {
  const a = d.analysis || d.weed_analysis;
  if (!a) return { ha: 0, pct: 0 };

  const levels = getLevels(d);
  const stressLevel = levels.find(
    (l: any) =>
      (l.level || l.name)?.toLowerCase().includes("stress") &&
      !(l.level || l.name)?.toLowerCase().includes("potential"),
  );

  const ha =
    stressLevel?.area_hectares ??
    a.total_area_hectares ??
    a.total_stress_area_hectares ??
    0;
  const pct =
    stressLevel?.percentage ??
    a.total_area_percent ??
    a.total_stress_percent ??
    0;

  return { ha, pct };
};

export const renderDroneDataToDoc = async (
  doc: jsPDF,
  d: DroneAnalysisData,
  pdfTypeLabel?: string,
  skipFooter: boolean = false,
  systemLabel: string = "Claim Audit System",
  assessmentContext?: {
    summary?: string;
    weather?: string;
  },
  showContext: boolean = false,
) => {
  const report = d.report ?? {};
  const field = d.field ?? {};
  const analysisType =
    report.detected_report_type || report.detected_analysis_type || report.type;
  const isPlantStressRelated =
    analysisType?.includes("stress") ||
    analysisType?.includes("flowering") ||
    analysisType?.includes("pest") ||
    analysisType?.includes("health");

  const { left: leftStrip, right: rightStrip } = getAnalysisLabels(
    analysisType,
    report.analysis_name,
  );

  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 14;
  const cropName = (field.crop ?? "N/A").toString();
  const headerCropText = `${report.type ?? "Crop Monitoring"} - ${cropName}`;

  const drawPageHeader = (startY: number, rowH: number = 20) => {
    doc.setFillColor(248, 250, 252);
    doc.rect(0, startY, W, rowH, "F");
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.3);
    doc.line(0, startY + rowH, W, startY + rowH);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(22, 101, 52);
    doc.text(report.provider ?? "STARHAWK", W - M, startY + 7, {
      align: "right",
    });
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.text(headerCropText, W - M, startY + 12, { align: "right" });
    doc.setFont("helvetica", "normal");
    if (report.survey_date) {
      doc.text(`Survey date: ${report.survey_date}`, W - M, startY + 17, {
        align: "right",
      });
    }
    return startY + rowH;
  };

  const ensureSpace = (currentY: number, requiredH: number): number => {
    if (currentY + requiredH > H - 15) {
      doc.addPage();
      return drawPageHeader(0, 20) + 10;
    }
    return currentY;
  };

  let y = drawPageHeader(0, 20);

  // DUAL TITLE STRIP
  doc.setFillColor(220, 252, 231);
  doc.rect(0, y, W / 2, 14, "F");
  doc.setTextColor(22, 101, 52);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(leftStrip, W / 4, y + 9, { align: "center" });
  doc.setFillColor(13, 110, 97);
  doc.rect(W / 2, y, W / 2, 14, "F");
  doc.setTextColor(255, 255, 255);
  doc.text(rightStrip, (W / 4) * 3, y + 9, { align: "center" });

  y += 14 + 8;

  // FIELD INFO BLOCK
  const infoMarginX = 8;
  const infoLeft = M + infoMarginX;
  const infoW = W - (M + infoMarginX) * 2;
  const infoH = 22;
  const green600 = { r: 22, g: 163, b: 74 };

  doc.setFillColor(255, 255, 255);
  doc.rect(infoLeft, y, infoW, infoH, "F");
  doc.setDrawColor(green600.r, green600.g, green600.b);
  doc.setLineWidth(0.53);
  doc.line(infoLeft, y + infoH, infoLeft + infoW, y + infoH);
  doc.line(infoLeft + infoW / 2, y, infoLeft + infoW / 2, y + infoH);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Crop:", infoLeft + 4, y + 8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text(cropName, infoLeft + 18, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Growing stage:", infoLeft + 4, y + 17);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text((field.growing_stage ?? "N/A").toString(), infoLeft + 32, y + 17);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Field area:", infoLeft + infoW / 2 + 4, y + 8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text(
    field.area_hectares != null
      ? `${Number(field.area_hectares).toFixed(2)} ha`
      : "N/A",
    infoLeft + infoW / 2 + 24,
    y + 8,
  );
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Analysis:", infoLeft + infoW / 2 + 4, y + 17);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text(
    (report.analysis_name ?? report.type ?? "N/A").toString(),
    infoLeft + infoW / 2 + 20,
    y + 17,
  );

    y += infoH + 8;

    // --- Add Claim Context (Priority Rendering) ---
    if (showContext && assessmentContext && (assessmentContext.summary || assessmentContext.weather)) {
      const drawSection = (title: string, content: string | null | undefined) => {
        if (!content || String(content).toLowerCase() === "null" || String(content).toLowerCase() === "undefined" || String(content).trim() === "") return;
        
        y = ensureSpace(y, 30);

        doc.setFillColor(13, 74, 42); // forest green
        doc.rect(M, y, W - M * 2, 7, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text(title.toUpperCase(), M + 5, y + 4.5);
        y += 10;

        // Black, normal-weight text for content
        doc.setTextColor(0, 0, 0); 
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        const lines = doc.splitTextToSize(String(content), W - M * 2 - 10) as string[];
        doc.text(lines, M + 5, y);
        y += lines.length * 5 + 10;
      };

      if (assessmentContext.weather) drawSection("Weather Impact Analysis", assessmentContext.weather);
      if (assessmentContext.summary) drawSection("Executive Summary", assessmentContext.summary);
      y += 4;
    }

    // SECTION 1: STRESS LEVELS (If available)
  const levels = getLevels(d);
  if (levels.length > 0) {
    y = ensureSpace(y, 80); // Ensure space for chart + some rows
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(34, 197, 94);
    doc.text("LEVEL DISTRIBUTION TABLE", W / 2 + M, y + 5, { align: "left" });
    y += 12;

    const pieSize = 58;
    const pieX = M + (W / 2 - 5 - M) / 2 - pieSize / 2;
    const pieY = y;
    const pieDataUrl = drawPieChartToDataUrl(levels, LEVEL_COLORS, 160);

    if (pieDataUrl) {
      doc.addImage(pieDataUrl, "PNG", pieX, pieY, pieSize, pieSize);
    }

    // Legend blocks below pie
    const blockH = 6;
    const blockW = 14;
    const blockGap = 2;
    const blockY = pieY + pieSize + 4;
    let blockX = pieX;
    levels.forEach((lv, i) => {
      const [r, g, b] = hexToRgb(getLevelColor(i));
      doc.setFillColor(r, g, b);
      doc.rect(blockX, blockY, blockW, blockH, "F");
      doc.setFontSize(6);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(
        `${(lv.percentage ?? 0).toFixed(1)}%`,
        blockX + blockW / 2,
        blockY + blockH - 1.5,
        { align: "center" },
      );
      blockX += blockW + blockGap;
    });

    // Table on the right
    const tableX = W / 2 + M;
    const tableW = W - tableX - M;
    const rowH = 9;
    doc.setFillColor(13, 110, 97);
    doc.rect(tableX, y, tableW, rowH, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5);
    doc.text("Status/Level", tableX + 2, y + 6);
    doc.text("%", tableX + tableW * 0.58, y + 6);
    doc.text("Hectare", tableX + tableW * 0.78, y + 6);
    y += rowH;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    levels.forEach((lv, i) => {
      const bg = i % 2 === 0 ? [255, 255, 255] : [245, 247, 245];
      doc.setFillColor(bg[0], bg[1], bg[2]);
      doc.rect(tableX, y, tableW, rowH, "F");
      const [r, g, b] = hexToRgb(getLevelColor(i));
      doc.setFillColor(r, g, b);
      doc.circle(tableX + 3, y + 5, 2, "F");
      doc.setTextColor(30, 30, 30);
      doc.text(lv.level ?? lv.name ?? "N/A", tableX + 7, y + 6);
      doc.text(
        `${(lv.percentage ?? 0).toFixed(2)}%`,
        tableX + tableW * 0.58,
        y + 6,
      );
      doc.text(
        `${(lv.area_hectares ?? 0).toFixed(2)}`,
        tableX + tableW * 0.78,
        y + 6,
      );
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.line(tableX, y + rowH, tableX + tableW, y + rowH);
      y += rowH;
    });

    // Stats Banner
    const stats = getTotalAreaStats(d, isPlantStressRelated);
    if (stats.ha > 0 || stats.pct > 0) {
      const bannerYRaw = Math.max(y, pieY + pieSize + 15) + 8;
      const bannerY = ensureSpace(bannerYRaw, 25);
      doc.setFillColor(34, 197, 94);
      doc.rect(0, bannerY, W, 20, "F");
      doc.setFillColor(22, 101, 52);
      doc.triangle(0, bannerY, 10, bannerY, 0, bannerY + 10, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(
        `Total ${report.analysis_name || "Affected Area"}:`,
        W / 2,
        bannerY + 6,
        { align: "center" },
      );
      doc.setFontSize(10);
      const dimText = `${stats.ha.toFixed(2)} ha =`;
      doc.text(dimText, W / 2 - 10, bannerY + 15, { align: "right" });
      doc.setFillColor(13, 110, 97);
      doc.rect(W / 2 - 4, bannerY + 10, 32, 8, "F");
      doc.text(`${Math.round(stats.pct)}% field`, W / 2 + 12, bannerY + 15.5, {
        align: "center",
      });
      y = bannerY + 28;
    } else {
      y += 10;
    }
  }

  // SECTION 2: STAND COUNT
  const sc = d.stand_count_analysis;
  const hasSC =
    sc && (sc.plants_counted != null || sc.average_plant_density != null);
  if (hasSC) {
    y = ensureSpace(y, 50);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(34, 197, 94);
    doc.text("STAND COUNT ANALYSIS RESULTS", M, y);
    y += 8;

    doc.setFillColor(250, 251, 250);
    doc.rect(M, y, W - M * 2, 28, "F");
    doc.setDrawColor(200, 210, 200);
    doc.rect(M, y, W - M * 2, 28, "S");

    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.text("Plants Counted:", M + 6, y + 8);
    doc.text("Avg Plant Density:", M + 6, y + 16);
    doc.text("Planned Plants:", M + 6, y + 24);
    doc.text("Difference:", W / 2 + 6, y + 8);
    doc.text("Difference Type:", W / 2 + 6, y + 16);

    doc.setTextColor(30, 30, 30);
    doc.setFont("helvetica", "bold");
    doc.text(sc.plants_counted?.toLocaleString() ?? "N/A", M + 50, y + 8);
    doc.text(
      `${sc.average_plant_density ?? "N/A"} ${sc.plant_density_unit ?? ""}`,
      M + 50,
      y + 16,
    );
    doc.text(sc.planned_plants?.toLocaleString() ?? "N/A", M + 50, y + 24);
    doc.text(
      `${sc.difference_percent ?? "N/A"}% (${sc.difference_plants?.toLocaleString() ?? ""})`,
      W / 2 + 50,
      y + 8,
    );
    doc.text(sc.difference_type ?? "N/A", W / 2 + 50, y + 16);

    y += 36;
  }

  // SECTION 3: RX SPRAYING
  const rx = d.rx_spraying_analysis;
  const hasRX =
    rx && (rx.pesticide_type != null || (rx.rates && rx.rates.length > 0));
  if (hasRX) {
    y = ensureSpace(y, 60);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(34, 197, 94);
    doc.text("PRESCRIPTION (RX) SPRAYING DATA", M, y);
    y += 8;

    doc.setFillColor(250, 251, 250);
    doc.rect(M, y, W - M * 2, 22, "F");
    doc.setDrawColor(220, 220, 220);
    doc.rect(M, y, W - M * 2, 22, "S");

    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");

    const col2 = W / 2;
    doc.text("Pesticide Type:", M + 4, y + 8);
    doc.text("Planned Date:", M + 4, y + 16);
    doc.text("Total Amount:", col2 + 4, y + 8);
    doc.text("Average Amount:", col2 + 4, y + 16);

    doc.setTextColor(30, 30, 30);
    doc.setFont("helvetica", "bold");
    doc.text(rx.pesticide_type || "N/A", M + 40, y + 8);
    doc.text(rx.planned_date || "N/A", M + 40, y + 16);
    doc.text(rx.total_pesticide_amount?.toString() || "N/A", col2 + 40, y + 8);
    doc.text(
      rx.average_pesticide_amount?.toString() || "N/A",
      col2 + 40,
      y + 16,
    );

    y += 30;
    if (rx.rates && rx.rates.length > 0) {
      doc.setFillColor(13, 110, 97);
      doc.rect(M, y, W - M * 2, 8, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7.5);
      doc.text("Zone Range", M + 2, y + 5.5);
      doc.text("Target Rate", M + 45, y + 5.5);
      doc.text("Area (ha)", M + 95, y + 5.5);
      doc.text("Percentage", M + 140, y + 5.5);
      y += 8;

      doc.setFontSize(8);
      const RX_COLORS = [
        [34, 197, 94], // green-500
        [163, 230, 53], // lime-400
        [250, 204, 21], // yellow-400
        [251, 146, 60], // orange-400
        [248, 113, 113], // red-400
        [220, 38, 38], // red-600
      ];

      rx.rates.forEach((rate: any, i: number) => {
        const bg = i % 2 === 0 ? [255, 255, 255] : [248, 249, 248];
        doc.setFillColor(bg[0], bg[1], bg[2]);
        doc.rect(M, y, W - M * 2, 8, "F");
        doc.setFont("helvetica", "normal");

        const label =
          rate.zone_range || rate.rate_range || rate.zone || rate.name || "N/A";
        const area = rate.area ?? rate.area_hectares ?? 0;
        const rateVal =
          rate.rate != null ? `${rate.rate} ${rate.rate_unit || ""}` : "N/A";

        const dotCol = RX_COLORS[i] || [156, 163, 175]; // fallback gray-400
        doc.setFillColor(dotCol[0], dotCol[1], dotCol[2]);
        doc.circle(M + 3.5, y + 4.2, 1.5, "F");

        doc.setTextColor(30, 30, 30);
        doc.text(label.toString(), M + 7, y + 5.5);
        doc.text(rateVal, M + 45, y + 5.5);
        doc.text(area.toString(), M + 95, y + 5.5);
        doc.text(`${rate.percentage}%`, M + 140, y + 5.5);

        doc.setDrawColor(230, 230, 230);
        doc.line(M, y + 8, W - M, y + 8);
        y += 8;
      });
    }
    y += 6;
  }

  // SECTION 4: ZONATION
  const zn = d.zonation_analysis;
  const hasZN =
    zn && (zn.num_zones != null || (zn.zones && zn.zones.length > 0));
  if (hasZN) {
    y = ensureSpace(y, 30);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(34, 197, 94);
    doc.text("ZONATION ANALYSIS", M, y);
    y += 8;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("Number of Zones:", M, y);
    doc.text("Tile Size:", W / 2, y);
    doc.setTextColor(30, 30, 30);
    doc.setFont("helvetica", "bold");
    doc.text(zn.num_zones?.toString() ?? "N/A", M + 30, y);
    doc.text(zn.tile_size ?? "N/A", W / 2 + 30, y);
    y += 12;
  }

  if (d.additional_info) {
    y = ensureSpace(y, 40);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Recommendations / Additional Information:", M, y);
    y += 4;
    doc.setFillColor(252, 252, 252);
    doc.rect(M, y, W - M * 2, 20, "F");
    doc.setDrawColor(220, 220, 220);
    doc.rect(M, y, W - M * 2, 20, "S");
    doc.setTextColor(80, 80, 80);
    const splitInfo = doc.splitTextToSize(d.additional_info, W - M * 2 - 6);
    doc.text(splitInfo, M + 3, y + 7);
    y += 28;
  }


  // PAGE 2: MAP IMAGE
  const mapImage = d.map_image;
  if (mapImage) {
    let imgDataUrl: string | null = null;
    if (mapImage.data) {
      imgDataUrl = `data:image/${mapImage.format || "png"};base64,${mapImage.data}`;
    } else if (mapImage.url) {
      try {
        const resp = await fetch(mapImage.url, { mode: "cors" });
        const blob = await resp.blob();
        imgDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.warn("Could not fetch map image for PDF:", e);
      }
    }

    if (imgDataUrl) {
      doc.addPage();
      const p2Header = drawPageHeader(0, 20);
      const imgW = W - M * 2;
      const imgH = H - p2Header - 40;
      const fmt =
        imgDataUrl.startsWith("data:image/jpeg") ||
        imgDataUrl.startsWith("data:image/jpg")
          ? "JPEG"
          : "PNG";
      doc.addImage(imgDataUrl, fmt, M, p2Header + 8, imgW, imgH);

      const legendLvs = levels.length > 0 ? levels : d.analysis?.levels || [];
      if (legendLvs.length > 0) {
        const legendY = p2Header + 8 + imgH + 8;
        const blockW = (W - M * 2) / legendLvs.length;
        legendLvs.forEach((lv: any, i: number) => {
          const [r, g, b] = hexToRgb(getLevelColor(i));
          doc.setFillColor(r, g, b);
          doc.rect(M + i * blockW, legendY, blockW - 2, 5, "F");
          doc.setTextColor(60, 60, 60);
          doc.setFontSize(7);
          doc.text(
            lv.level ?? lv.name ?? "",
            M + i * blockW + blockW / 2,
            legendY + 11,
            { align: "center" },
          );
        });
      }
    }
  }

  // --- FOOTER RENDERING (Standardized) ---
  if (!skipFooter) {
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(60, 60, 60);
      doc.text(`STARHAWK\u2122 ${systemLabel} \u00B7 Confidential`, W / 2, H - 7, {
        align: "center",
      });
      doc.text(`Page ${i}`, W - M, H - 7, { align: "right" });
    }
  }
};

export const generateDroneDataPDF = async (
  d: DroneAnalysisData,
  pdfTypeLabel?: string,
  systemLabel: string = "Claim Audit System",
  assessmentContext?: {
    summary?: string;
    weather?: string;
  },
  showContext: boolean = false,
) => {
  try {
    const doc = new jsPDF("p", "mm", "a4");
    await renderDroneDataToDoc(
      doc,
      d,
      pdfTypeLabel,
      false,
      systemLabel,
      assessmentContext,
      showContext,
    );

    const report = d.report ?? {};
    const dateStr = new Date().toISOString().split("T")[0];
    const fileName = `starhawk-analysis-${report.analysis_name?.toLowerCase().replace(/\s+/g, "-") || "report"}-${dateStr}.pdf`;
    doc.save(fileName);
    return true;
  } catch (err) {
    console.error("Failed to generate PDF:", err);
    throw err;
  }
};
