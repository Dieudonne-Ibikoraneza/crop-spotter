// User Roles
export type UserRole =
  | "ADMIN"
  | "FARMER"
  | "ASSESSOR"
  | "INSURER"
  | "GOVERNMENT";

// Login Request
export interface LoginRequest {
  phoneNumber: string;
  password: string;
}

// Login Response
export interface LoginResponse {
  token: string;
  userId: string;
  role: UserRole;
  email: string;
  phoneNumber: string;
  firstLoginRequired: boolean;
}

// User Profile
export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  nationalId?: string;
  role: UserRole;
  province?: string;
  district?: string;
  sector?: string;
  cell?: string;
  village?: string;
  sex?: string;
  active: boolean;
  firstLoginRequired: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Farmer Profile
export interface FarmerProfile {
  id: string;
  userId: string;
  farmProvince?: string;
  farmDistrict?: string;
  farmSector?: string;
  farmCell?: string;
  farmVillage?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Assessor Profile
export interface AssessorProfile {
  id: string;
  userId: string;
  specialization?: string;
  experienceYears?: number;
  profilePhotoUrl?: string;
  bio?: string;
  address?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Insurer Profile
export interface InsurerProfile {
  id: string;
  userId: string;
  companyName?: string;
  contactPerson?: string;
  website?: string;
  address?: string;
  companyDescription?: string;
  licenseNumber?: string;
  registrationDate?: string;
  companyLogoUrl?: string;
  bio?: string;
  profilePictureUrl?: string;
  province?: string;
  district?: string;
  sector?: string;
  cell?: string;
  village?: string;
  officialEmail?: string;
  officialPhone?: string;
  specializations?: string[];
  socialMedia?: {
    twitter?: string;
    linkedin?: string;
    facebook?: string;
    instagram?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

// Full User with Profile
export interface UserWithProfile extends UserProfile {
  farmerProfile?: FarmerProfile;
  assessorProfile?: AssessorProfile;
  insurerProfile?: InsurerProfile;
}

// API Error
export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
}

// Pagination
export interface PaginatedResponse<T> {
  items: T[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
}

export interface PaginatedRequest {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
}

// Farm Types for Assessor Dashboard
export interface FarmFarmerId {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
}

export interface FarmLocation {
  type: string;
  coordinates: number[];
}

export interface FarmBoundary {
  type: string;
  coordinates: number[][][];
}

export interface Farm {
  id: string;
  farmerId: string;
  farmerName?: string;
  /** Set after assessor completes KML upload for PENDING registrations */
  name?: string;
  area?: number;
  cropType: string;
  sowingDate?: string;
  location?: FarmLocation;
  locationName?: string;
  /** Present after KML / geometry is registered */
  boundary?: FarmBoundary;
  status: string;
  eosdaFieldId?: string;
  preferredInsurerId?: string;
  preferredInsurerName?: string;
  insurerId?: string;
  insurerName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InsuranceRequest {
  _id: string;
  farmId: string | { _id: string };
  farmerId?: string | { _id: string };
  status: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Farmer with Farms (for Assessor Dashboard)
export interface FarmerWithFarms {
  id: string;
  email: string;
  phoneNumber: string;
  nationalId: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  active: boolean;
  firstLoginRequired: boolean;
  province: string;
  district: string;
  sector: string;
  cell: string;
  village: string;
  sex: string;
  farmerProfile: FarmerProfile;
  farms: Farm[];
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalFarms: number;
  activePolicies: number;
  pendingClaims: number;
  /** NDVI average (0–1) when available; null avoids duplicate monitoring API calls (see farm rows) */
  averageHealth: number | null;
}

export interface MonitoringRecord {
  id: string;
  farmId: string;
  policyId: string;
  monitoredAt: string;
  currentNdvi?: number;
  ndviTrend?: number;
  weatherAlerts?: string[];
  thresholdsExceeded: boolean;
  alertSent: boolean;
}

export interface MonitoringAlert {
  id: string;
  farmId: string;
  farmName: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  createdAt: string;
  read: boolean;
}

export interface WeatherForecastDataPoint {
  dt: number;
  main: {
    temp: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
  };
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
  wind: {
    speed: number;
    deg: number;
  };
  clouds: {
    all: number;
  };
  rain?: {
    '1h'?: number;
    '3h'?: number;
  };
}

export interface WeatherForecastResponse {
  field_id: string;
  data: WeatherForecastDataPoint[];
}
