import { format } from "date-fns";
import { Loader2, Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BasicInfoTab } from "@/components/assessor/tabs/BasicInfoTab";
import { farmService } from "@/lib/api/services/assessor";

function getSeasonFromSowingDate(sowingDate?: string): string {
  if (!sowingDate) return "Season A";
  const date = new Date(sowingDate);
  if (Number.isNaN(date.getTime())) return "Season A";
  const month = date.getMonth();
  const year = date.getFullYear();
  if (month >= 8 || month <= 1) return `Season ${year} A`;
  if (month >= 2 && month <= 5) return `Season ${year} B`;
  return `Season ${year} C`;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farmId: string | null;
  /** Used when the farm payload has no `farmerName` yet */
  farmerNameHint?: string;
};

export function AdminFarmDetailDialog({
  open,
  onOpenChange,
  farmId,
  farmerNameHint,
}: Props) {
  const { data: fullFarm, isLoading } = useQuery({
    queryKey: ["farm", "admin-dialog", farmId],
    queryFn: () => farmService.getFarm(farmId!),
    enabled: open && !!farmId,
  });

  const farmerLabel =
    fullFarm?.farmerName?.trim() ||
    farmerNameHint?.trim() ||
    "Farmer";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="p-6 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Farm &amp; field details
          </DialogTitle>
          <DialogDescription>
            Read-only view (same layout as insurer and assessor portals).
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-6 bg-muted/10">
          {isLoading || !fullFarm ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <BasicInfoTab
              fieldId={fullFarm.id}
              farmerId={fullFarm.farmerId}
              fieldName={fullFarm.name || "N/A"}
              farmerName={farmerLabel}
              cropType={fullFarm.cropType || "N/A"}
              area={fullFarm.area || 0}
              season={getSeasonFromSowingDate(fullFarm.sowingDate)}
              location={fullFarm.locationName || "Unknown"}
              sowingDate={
                fullFarm.sowingDate
                  ? format(new Date(fullFarm.sowingDate), "PP")
                  : "N/A"
              }
              boundary={fullFarm.boundary as { type: string; coordinates: number[][][] }}
              locationCoords={fullFarm.location?.coordinates}
              showActions={false}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
