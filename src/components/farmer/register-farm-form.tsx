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
import { useRegisterFarm } from "@/lib/api/hooks/useFarmer";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/** Must match `CropType` in starhawk-backend-agriplatform (farms/enums/crop-type.enum.ts). */
const CROP_TYPES = [
  "MAIZE",
  "BEANS",
  "RICE",
  "WHEAT",
  "SORGHUM",
  "POTATOES",
  "CASSAVA",
  "BANANAS",
  "COFFEE",
  "TEA",
  "OTHER",
] as const;

function parseCropTypeInput(raw: string): string | null {
  const compact = raw.trim().toUpperCase().replace(/\s+/g, "_");
  if ((CROP_TYPES as readonly string[]).includes(compact)) return compact;
  const firstWord = raw.trim().split(/\s+/)[0]?.toUpperCase() ?? "";
  if ((CROP_TYPES as readonly string[]).includes(firstWord)) return firstWord;
  return null;
}

function buildRegisterFarmSchema(minSelectable: Date) {
  return z
    .object({
      cropType: z.string().min(1, "Enter crop type"),
      sowingDate: z.date({
        required_error: "Choose a date",
        invalid_type_error: "Choose a date",
      }),
    })
    .refine((data) => !isBefore(startOfDay(data.sowingDate), startOfDay(minSelectable)), {
      message: "At least 14 days from today",
      path: ["sowingDate"],
    })
    .refine((data) => parseCropTypeInput(data.cropType) !== null, {
      message: "Not a supported crop",
      path: ["cropType"],
    });
}

export type RegisterFarmFormProps = {
  onSuccess?: () => void;
  className?: string;
};

export function RegisterFarmForm({ onSuccess, className }: RegisterFarmFormProps) {
  const { toast } = useToast();
  const registerFarm = useRegisterFarm();
  const [sowingCalendarOpen, setSowingCalendarOpen] = useState(false);

  const minSelectable = useMemo(() => startOfDay(addDays(new Date(), 14)), []);
  const schema = useMemo(() => buildRegisterFarmSchema(minSelectable), [minSelectable]);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      cropType: "",
    },
  });

  const onSubmit = (values: z.infer<typeof schema>) => {
    const cropType = parseCropTypeInput(values.cropType);
    if (!cropType) return;
    const sowingDate = format(values.sowingDate, "yyyy-MM-dd");
    registerFarm.mutate(
      { cropType, sowingDate },
      {
        onSuccess: () => {
          toast({ title: "Farm registered" });
          form.reset({ cropType: "" });
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
                <Input placeholder="maize, beans, rice…" autoComplete="off" {...field} />
              </FormControl>
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
