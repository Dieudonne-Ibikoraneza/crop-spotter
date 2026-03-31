import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import AssessorLayout from "./components/layouts/AssessorLayout";
import Dashboard from "./pages/assessor/Dashboard";
import RiskAssessment from "./pages/assessor/RiskAssessment";
import CropMonitoring from "./pages/assessor/CropMonitoring";
import LossAssessment from "./pages/assessor/LossAssessment";
import FieldDetail from "./pages/assessor/FieldDetail";
import FieldProcessing from "./pages/assessor/FieldProcessing";
import FarmerLayout from "./components/layouts/FarmerLayout";
import FarmerDashboard from "./pages/farmer/Dashboard";
import FarmerFarms from "./pages/farmer/Farms";
import FarmerFarmDetail from "./pages/farmer/FarmDetail";
import FarmerClaims from "./pages/farmer/Claims";
import FarmerClaimDetail from "./pages/farmer/ClaimDetail";
import FarmerInsurance from "./pages/farmer/Insurance";
import FarmerHealthReports from "./pages/farmer/HealthReports";
import InsurerLayout from "./components/layouts/InsurerLayout";
import InsurerDashboard from "./pages/insurer/Dashboard";
import InsurerClaims from "./pages/insurer/Claims";
import InsurerPolicies from "./pages/insurer/Policies";
import InsurerAssessors from "./pages/insurer/Assessors";
import InsurerReports from "./pages/insurer/Reports";
import ProtectedRoute from "./components/auth/ProtectedRoute";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true, // Refetch when window regains focus
      refetchOnMount: true, // Refetch when component mounts
      staleTime: 1000 * 60, // Consider data stale after 1 minute
      gcTime: 1000 * 60 * 5, // Keep unused data in cache for 5 minutes
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          
          {/* Assessor Portal */}
          <Route path="/assessor" element={<AssessorLayout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="risk-assessment" element={<RiskAssessment />} />
            <Route path="risk-assessment/:farmerId" element={<RiskAssessment />} />
            <Route path="risk-assessment/:farmerId/:fieldId" element={<RiskAssessment />} />
            <Route path="crop-monitoring" element={<CropMonitoring />} />
            <Route path="crop-monitoring/:farmerId" element={<CropMonitoring />} />
            <Route path="crop-monitoring/:farmerId/:fieldId" element={<CropMonitoring />} />
            <Route path="loss-assessment" element={<LossAssessment />} />
            <Route path="loss-assessment/:farmerId/:fieldId" element={<LossAssessment />} />
            <Route path="field/:id" element={<FieldDetail />} />
            <Route path="field-processing" element={<FieldProcessing />} />
          </Route>
          
          {/* Farmer Portal */}
          <Route 
            path="/farmer" 
            element={
              <ProtectedRoute allowedRole="FARMER">
                <FarmerLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<FarmerDashboard />} />
            <Route path="farms/:id" element={<FarmerFarmDetail />} />
            <Route path="farms" element={<FarmerFarms />} />
            <Route path="insurance" element={<FarmerInsurance />} />
            <Route path="claims" element={<FarmerClaims />} />
            <Route path="claims/:id" element={<FarmerClaimDetail />} />
            <Route path="health" element={<FarmerHealthReports />} />
          </Route>

          {/* Insurer Portal (mock UI) */}
          <Route
            path="/insurer"
            element={
              <ProtectedRoute allowedRole="INSURER">
                <InsurerLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<InsurerDashboard />} />
            <Route path="claims" element={<InsurerClaims />} />
            <Route path="policies" element={<InsurerPolicies />} />
            <Route path="assessors" element={<InsurerAssessors />} />
            <Route path="reports" element={<InsurerReports />} />
          </Route>

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
