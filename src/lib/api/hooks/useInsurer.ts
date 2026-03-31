import { useQuery } from "@tanstack/react-query";
import { insurerService } from "../services/insurer";
import { queryKeys } from "../queryKeys";

export const useInsurerDashboard = () => {
  return useQuery({
    queryKey: queryKeys.insurer.dashboard(),
    queryFn: () => insurerService.getDashboardStats(),
  });
};

export const useInsurerReports = () => {
  return useQuery({
    queryKey: queryKeys.insurer.reports(),
    queryFn: () => insurerService.getReports(),
  });
};
