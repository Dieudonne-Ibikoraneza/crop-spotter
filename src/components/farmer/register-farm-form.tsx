import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addDays, format, isBefore, startOfDay } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { useRegisterFarm, farmerService } from "@/lib/api/hooks/useFarmer";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { BACKEND_CROP_TYPES, formatCropTypeLabel, normalizeCropTypeInput } from "@/lib/crops";

function buildRegisterFarmSchema(minSelectable: Date) {
  return z
    .object({
      cropType: z.string().min(1, "Enter crop type"),
      sowingDate: z.date({
        required_error: "Choose a date",
        invalid_type_error: "Choose a date",
      }),
      insurerId: z.string().optional(),
    })
    .refine((data) => !isBefore(startOfDay(data.sowingDate), startOfDay(minSelectable)), {
      message: "At least 14 days from today",
      path: ["sowingDate"],
    })
    .refine((data) => normalizeCropTypeInput(data.cropType) !== null, {
      message: "Not a supported crop",
      path: ["cropType"],
    });
}

export type RegisterFarmFormProps = {
  onSuccess?: () => void;
  initialInsurerId?: string;
  className?: string;
};

export function RegisterFarmForm({ onSuccess, initialInsurerId, className }: RegisterFarmFormProps) {
  const { toast } = useToast();
  const registerFarm = useRegisterFarm();
  const [sowingCalendarOpen, setSowingCalendarOpen] = useState(false);

  const minSelectable = useMemo(() => startOfDay(addDays(new Date(), 14)), []);
  const schema = useMemo(() => buildRegisterFarmSchema(minSelectable), [minSelectable]);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      cropType: "",
      insurerId: initialInsurerId || "none",
    },
  });

  const { data: insurersData, isLoading: isLoadingInsurers } = useQuery({
    queryKey: ["insurers"],
    queryFn: () => farmerService.getInsurers(),
  });

  const insurers = insurersData?.items || [];

  const onSubmit = (values: z.infer<typeof schema>) => {
    const cropType = normalizeCropTypeInput(values.cropType);
    if (!cropType) return;
    const sowingDate = format(values.sowingDate, "yyyy-MM-dd");
    const finalInsurerId = initialInsurerId ?? values.preferredInsurerId;
    registerFarm.mutate(
      { 
        cropType, 
        sowingDate, 
        insurerId: finalInsurerId === "none" ? undefined : finalInsurerId 
      },
      {
        onSuccess: () => {
          toast({ title: "Farm registered" });
          form.reset({ cropType: "", insurerId: initialInsurerId || "none" });
          form.resetField("sowingDate");
          onSuccess?.();
        },
        onError: (err: unknown) => {
          const message =
            err && typeof err === "object" && "message" in err
              ? String((err as { message: string }).message)
              : "Please try again.";
          toast({
            title: "Registration failed",
            description: message,
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={cn("space-y-6", className)}>
        <FormField
          control={form.control}
          name="cropType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Crop type</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. Maize, Beans, Rice"
                  autoComplete="off"
                  list="backend-crop-types"
                  {...field}
                />
              </FormControl>
              <datalist id="backend-crop-types">
                {BACKEND_CROP_TYPES.map((crop) => (
                  <option key={crop} value={formatCropTypeLabel(crop)} />
                ))}
              </datalist>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sowingDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Planned sowing date</FormLabel>
              <Popover open={sowingCalendarOpen} onOpenChange={setSowingCalendarOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground",
                      )}
                    >
                      {field.value ? format(field.value, "PPP") : "Pick a date"}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <p className="text-xs text-muted-foreground px-3 pt-3 pb-2 max-w-[min(100vw-2rem,18rem)]">
                    Choose a date at least 14 days from today.
                  </p>
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={(date) => {
                      field.onChange(date);
                      if (date) setSowingCalendarOpen(false);
                    }}
                    disabled={(date) => isBefore(startOfDay(date), minSelectable)}
                    fromDate={minSelectable}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        {!initialInsurerId && (
          <FormField
            control={form.control}
            name="insurerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preferred Insurer (Optional)</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingInsurers ? "Loading insurers..." : "Select an insurer"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">No preference</SelectItem>
                    {insurers.map((insurer: any) => (
                      <SelectItem key={insurer.id} value={insurer.id}>
                        {insurer.insurerProfile?.companyName || `${insurer.firstName} ${insurer.lastName}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <Button type="submit" className="w-full" disabled={registerFarm.isPending}>
          {registerFarm.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Submitting…
            </>
          ) : (
            "Submit registration"
          )}
        </Button>
      </form>
    </Form>
  );
}
