import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusType = "healthy" | "moderate" | "stress" | "active" | "pending" | "approved" | "rejected" | "submitted";

interface StatusBadgeProps {
  /** API may send values outside the narrow union; unknown values still render with a sensible fallback. */
  status: StatusType | string;
  label?: string;
}

const statusConfig = {
  healthy: { color: "bg-success/10 text-success border-success/20", label: "Healthy" },
  moderate: { color: "bg-warning/10 text-warning border-warning/20", label: "Moderate" },
  stress: { color: "bg-destructive/10 text-destructive border-destructive/20", label: "Stress" },
  active: { color: "bg-info/10 text-info border-info/20", label: "Active" },
  pending: { color: "bg-warning/10 text-warning border-warning/20", label: "Pending" },
  approved: { color: "bg-success/10 text-success border-success/20", label: "Approved" },
  rejected: { color: "bg-destructive/10 text-destructive border-destructive/20", label: "Rejected" },
  submitted: { color: "bg-blue-100 text-blue-700 border-blue-200", label: "Submitted" },
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const normalizedStatus = String(status || "").toLowerCase() as keyof typeof statusConfig;
  const config = statusConfig[normalizedStatus] || { 
    color: "bg-muted text-muted-foreground border-border", 
    label: String(status || "Unknown") 
  };
  
  return (
    <Badge variant="outline" className={cn("border font-medium", config.color)}>
      {label || config.label}
    </Badge>
  );
}
