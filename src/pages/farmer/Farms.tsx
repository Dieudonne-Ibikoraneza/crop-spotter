import { useState } from "react";
import { Link } from "react-router-dom";
import { Leaf, MapPin, Plus, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFarmerFarms } from "@/lib/api/hooks/useFarmer";
import { RegisterFarmDialog } from "@/components/farmer/register-farm-dialog";

const FarmerFarms = () => {
  const [registerOpen, setRegisterOpen] = useState(false);
  const { data, isLoading, error } = useFarmerFarms();
  const farms = data?.items ?? [];

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center min-h-[320px] items-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-destructive">
        Could not load farms. {error instanceof Error ? error.message : ""}
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-5xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">My farms</h1>
          <p className="text-muted-foreground mt-1">Land parcels linked to your account.</p>
        </div>
        <Button
          type="button"
          className="shadow-lg shadow-primary/15 w-fit"
          onClick={() => setRegisterOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Register new farm
        </Button>
      </div>
      <RegisterFarmDialog open={registerOpen} onOpenChange={setRegisterOpen} />

      {farms.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-16 text-center">
          <Leaf className="h-14 w-14 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground mb-6">You have not registered any farms yet.</p>
          <Button type="button" onClick={() => setRegisterOpen(true)}>
            <Sprout className="h-4 w-4 mr-2" />
            Register your first farm
          </Button>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {farms.map((farm) => (
            <li key={farm.id}>
              <Link
                to={`/farmer/farms/${farm.id}`}
                className="block rounded-xl border border-border/60 bg-card p-5 shadow-sm hover:border-primary/30 hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-semibold text-lg">{farm.name?.trim() || "Pending name"}</h2>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      {farm.locationName || "Location after mapping"}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {farm.status}
                  </Badge>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded-md bg-muted px-2 py-0.5">{farm.cropType}</span>
                  {farm.area != null && !Number.isNaN(Number(farm.area)) && (
                    <span>{Number(farm.area).toFixed(1)} ha</span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FarmerFarms;
