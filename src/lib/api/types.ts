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
  data: T[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
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
  name: string;
  area: number;
  cropType: string;
  sowingDate?: string;
  location: FarmLocation;
  locationName?: string;
  boundary: FarmBoundary;
  status: string;
  eosdaFieldId?: string;
  createdAt: string;
  updatedAt: string;
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
