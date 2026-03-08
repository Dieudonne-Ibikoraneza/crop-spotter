import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusType = "healthy" | "moderate" | "stress" | "active" | "pending" | "approved" | "rejected";

interface StatusBadgeProps {
  status: StatusType;
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
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Badge variant="outline" className={cn("border font-medium", config.color)}>
      {label || config.label}
    </Badge>
  );
}
