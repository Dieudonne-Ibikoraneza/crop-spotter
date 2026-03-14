// Risk calculation utilities for crop assessment

export interface RiskAssessment {
  score: number;
  level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  components: {
    cropHealth: number;
    weather: number;
    growthStage: number;
    flowering: number;
  };
  recommendations: string[];
  fieldStatus: 'Healthy' | 'At Risk' | 'Critical';
  weatherRisk: string;
  cropHealth: string;
}

export interface DroneAnalysisData {
  report?: {
    detected_analysis_type?: string;
    survey_date?: string;
    provider?: string;
  };
  field?: {
    crop?: string;
    growing_stage?: string;
    area_hectares?: number;
  };
  weed_analysis?: {
    total_area_hectares?: number;
    total_area_percent?: number;
    levels?: Array<{
      level: string;
      severity: string;
      percentage: number;
      area_hectares: number;
    }>;
  };
}

export interface WeatherData {
  temperature?: number;
  humidity?: number;
  rainfall?: number;
  droughtRisk?: string;
  heatStress?: string;
  floodRisk?: string;
}

// Growth stage risk mapping
const GROWTH_STAGE_RISK: Record<string, number> = {
  'BBCH 10-19': 80,  // Emergence - high risk
  'BBCH 20-29': 60,  // Tillering - medium risk  
  'BBCH 30-39': 40,  // Stem elongation - low-medium risk
  'BBCH 40-49': 30,  // Booting - low risk
  'BBCH 50-59': 25,  // Heading - very low risk
  'BBCH 60-69': 35,  // Flowering - low risk
  'BBCH 70-79': 45,  // Fruit development - medium risk
  'BBCH 80-89': 70,  // Ripening - high risk
};

// Severity risk mapping
const SEVERITY_RISK: Record<string, number> = {
  'healthy': 0,
  'low': 20,
  'moderate': 50,
  'high': 80,
  'critical': 100,
};

export const calculateCropHealthRisk = (droneData: DroneAnalysisData): number => {
  const weedAnalysis = droneData?.weed_analysis;
  if (!weedAnalysis?.levels) return 50; // Default medium risk

  // Calculate stress percentage from high/moderate severity levels
  const stressLevels = weedAnalysis.levels.filter(level => 
    level.severity === 'high' || level.severity === 'moderate'
  );
  
  const totalStressPercentage = stressLevels.reduce((sum, level) => 
    sum + level.percentage, 0
  );

  return Math.min(100, totalStressPercentage);
};

export const calculateGrowthStageRisk = (growingStage?: string): number => {
  if (!growingStage) return 50; // Default medium risk
  
  // Find matching stage range
  for (const [stage, risk] of Object.entries(GROWTH_STAGE_RISK)) {
    const [min, max] = stage.split('-').map(s => parseInt(s.replace('BBCH ', '')));
    const currentStage = parseInt(growingStage.replace('BBCH ', ''));
    if (currentStage >= min && currentStage <= max) {
      return risk;
    }
  }
  
  return 50; // Default if no match found
};

export const calculateFloweringRisk = (floweringData: DroneAnalysisData): number => {
  const weedAnalysis = floweringData?.weed_analysis;
  if (!weedAnalysis?.levels) return 0;

  // Check for uneven flowering (risk factor)
  const fullFlowering = weedAnalysis.levels.find(l => l.level === 'Full Flowering');
  const noFlowering = weedAnalysis.levels.find(l => l.level === 'No Flowering');
  
  if (fullFlowering && noFlowering) {
    // Uneven flowering indicates stress
    return Math.max(fullFlowering.percentage, noFlowering.percentage);
  }
  
  return 0;
};

export const calculateWeatherRisk = (weatherData?: WeatherData): number => {
  if (!weatherData) return 30; // Default low-medium risk

  let riskScore = 0;
  
  // Drought risk
  if (weatherData.droughtRisk === 'High') riskScore += 40;
  else if (weatherData.droughtRisk === 'Moderate') riskScore += 20;
  
  // Heat stress
  if (weatherData.heatStress === 'High') riskScore += 30;
  else if (weatherData.heatStress === 'Moderate') riskScore += 15;
  
  // Flood risk
  if (weatherData.floodRisk === 'High') riskScore += 30;
  else if (weatherData.floodRisk === 'Moderate') riskScore += 15;
  
  return Math.min(100, riskScore);
};

export const getRiskLevel = (score: number): 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' => {
  if (score <= 25) return 'LOW';
  if (score <= 50) return 'MODERATE';
  if (score <= 75) return 'HIGH';
  return 'CRITICAL';
};

export const getFieldStatus = (riskLevel: string): 'Healthy' | 'At Risk' | 'Critical' => {
  switch (riskLevel) {
    case 'LOW':
    case 'MODERATE':
      return 'Healthy';
    case 'HIGH':
      return 'At Risk';
    case 'CRITICAL':
      return 'Critical';
    default:
      return 'Healthy';
  }
};

export const generateRecommendations = (riskAssessment: RiskAssessment): string[] => {
  const recommendations: string[] = [];
  
  // Crop health recommendations
  if (riskAssessment.components.cropHealth > 70) {
    recommendations.push("🚨 Immediate intervention required - high crop stress detected");
  } else if (riskAssessment.components.cropHealth > 50) {
    recommendations.push("⚠️ Monitor crop health closely - stress levels elevated");
  }
  
  // Weather recommendations
  if (riskAssessment.components.weather > 60) {
    recommendations.push("🌦️ Address weather-related risks - implement protective measures");
  } else if (riskAssessment.components.weather > 40) {
    recommendations.push("🌡️ Monitor weather conditions - adjust irrigation as needed");
  }
  
  // Growth stage recommendations
  if (riskAssessment.components.growthStage > 60) {
    recommendations.push("🌱 Critical growth stage - increased monitoring required");
  }
  
  // Flowering recommendations
  if (riskAssessment.components.flowering > 50) {
    recommendations.push("🌸 Check flowering uniformity - may affect yield potential");
  }
  
  // Overall recommendations based on risk level
  switch (riskAssessment.level) {
    case 'CRITICAL':
      recommendations.push("🔴 URGENT: Immediate action required to prevent crop loss");
      break;
    case 'HIGH':
      recommendations.push("🟡 HIGH RISK: Implement mitigation strategies within 48 hours");
      break;
    case 'MODERATE':
      recommendations.push("🟢 Continue monitoring with weekly assessments");
      break;
    case 'LOW':
      recommendations.push("✅ Maintain current practices with routine monitoring");
      break;
  }
  
  return recommendations;
};

export const calculateOverallRisk = (
  dronePdfs: Array<{ pdfType: string; droneAnalysisData?: DroneAnalysisData }>,
  weatherData?: WeatherData
): RiskAssessment => {
  const plantHealthData = dronePdfs.find(pdf => pdf.pdfType === 'plant_health');
  const floweringData = dronePdfs.find(pdf => pdf.pdfType === 'flowering');
  
  // Calculate component risks
  const cropHealthRisk = calculateCropHealthRisk(plantHealthData?.droneAnalysisData || {});
  const growthStageRisk = calculateGrowthStageRisk(plantHealthData?.droneAnalysisData?.field?.growing_stage);
  const floweringRisk = calculateFloweringRisk(floweringData?.droneAnalysisData || {});
  const weatherRisk = calculateWeatherRisk(weatherData);
  
  // Weighted average (adjust weights based on importance)
  const weights = {
    cropHealth: 0.4,    // Most important
    weather: 0.3,       // Second most important  
    growthStage: 0.2,    // Moderate importance
    flowering: 0.1      // Least important
  };
  
  const overallScore = Math.round(
    cropHealthRisk * weights.cropHealth +
    weatherRisk * weights.weather +
    growthStageRisk * weights.growthStage +
    floweringRisk * weights.flowering
  );
  
  const riskLevel = getRiskLevel(overallScore);
  const fieldStatus = getFieldStatus(riskLevel);
  
  const components = {
    cropHealth: cropHealthRisk,
    weather: weatherRisk,
    growthStage: growthStageRisk,
    flowering: floweringRisk
  };
  
  const recommendations = generateRecommendations({
    score: overallScore,
    level: riskLevel,
    components,
    recommendations: [],
    fieldStatus,
    weatherRisk: `${weatherRisk}/100`,
    cropHealth: `${100 - cropHealthRisk}%` // Invert for "health" percentage
  });
  
  return {
    score: overallScore,
    level: riskLevel,
    components,
    recommendations,
    fieldStatus,
    weatherRisk: `${weatherRisk}/100`,
    cropHealth: `${100 - cropHealthRisk}%`
  };
};
