/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
import { useParams, Link } from "react-router-dom";
import { format, addDays } from "date-fns";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Loader2,
  FileText,
  ShieldCheck,
  CloudRain,
  Wind,
  Droplets,
  Activity,
  ArrowRight,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Sprout,
  ImageIcon,
  Tractor,
  ExternalLink,
  ChevronRight,
  Mail,
  Briefcase,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  useAssessmentDetail,
  useApproveAssessment,
  useFarm,
  useRejectAssessment,
} from "@/lib/api/hooks/useAssessor";
import { useIssuePolicy, useMyPolicies } from "@/lib/api/hooks/usePolicies";
import { policyBlocksNewIssueForAssessment } from "@/lib/api/services/policies";
import { useFarmWeather } from "@/lib/api/hooks/useFarmer";
import { farmService } from "@/lib/api/services/assessor";
import type { Assessment } from "@/lib/api/services/assessor";
import { assessmentsKeys, farmsKeys } from "@/lib/api/queryKeys";
import type { UserProfile } from "@/lib/api/services/users";
import { DroneAnalysisView } from "@/components/assessor/DroneAnalysisView";
import { BasicInfoTab } from "@/components/assessor/tabs/BasicInfoTab";
import { StatusBadge } from "@/components/ui/status-badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { calculateOverallRisk } from "@/utils/riskCalculation";
import {
  dailyForecastPoints,
  openWeatherTempToCelsius,
  unwrapWeather,
} from "@/utils/weatherDisplay";

function embStr(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s || undefined;
}

function embeddedToUserProfile(embedded: Record<string, unknown>): UserProfile {
  const id = embStr(embedded._id) ?? embStr(embedded.id) ?? "";
  return {
    id,
    firstName: embStr(embedded.firstName) ?? "",
    lastName: embStr(embedded.lastName) ?? "",
    email: embStr(embedded.email) ?? "",
    phoneNumber: embStr(embedded.phoneNumber) ?? "",
    role: embStr(embedded.role) ?? "",
    active: embedded.active !== false,
    nationalId: embStr(embedded.nationalId),
    province: embStr(embedded.province),
    district: embStr(embedded.district),
    sector: embStr(embedded.sector),
    cell: embStr(embedded.cell),
    village: embStr(embedded.village),
    sex: embStr(embedded.sex),
    createdAt: embStr(embedded.createdAt) ?? "",
  };
}

function ProfileFields({ profile }: { profile: UserProfile | null }) {
  if (!profile) {
    return (
      <p className="text-sm text-muted-foreground">
        No person details were populated on this assessment (only a user id may be present).
      </p>
    );
  }
  const p = profile;
  const rows: { label: string; value: string | undefined }[] = [
    { label: "Email", value: p.email || undefined },
    { label: "Phone", value: p.phoneNumber || undefined },
    { label: "National ID", value: p.nationalId },
    { label: "Province", value: p.province },
    { label: "District", value: p.district },
    { label: "Sector", value: p.sector },
    { label: "Cell", value: p.cell },
    { label: "Village", value: p.village },
    { label: "Sex", value: p.sex },
    { label: "Role", value: p.role || undefined },
    { label: "Status", value: p.active === false ? "Inactive" : p.active ? "Active" : undefined },
  ];
  if (p.createdAt) {
    rows.push({ label: "Record since", value: format(new Date(p.createdAt), "PPP") });
  }
  const shown = rows.filter((r) => r.value);
  if (shown.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No additional fields beyond name and contact on this assessment.</p>
    );
  }
  return (
    <div className="space-y-3 text-sm">
      {shown.map((r) => (
        <div key={r.label} className="flex justify-between gap-4 border-b border-border/60 pb-2 last:border-0">
          <span className="text-muted-foreground shrink-0">{r.label}</span>
          <span className="font-medium text-right break-words">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

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

function refId(ref: unknown): string {
  if (ref == null) return "";
  if (typeof ref === "string") return ref;
  if (typeof ref === "object" && "_id" in (ref as object)) {
    return String((ref as { _id: string })._id);
  }
  return "";
}

type NormalizedReport = {
  key: string;
  pdfType: string;
  extractedAt?: string;
  droneAnalysisData?: unknown;
};

function normalizeReports(assessment: Assessment): NormalizedReport[] {
  const fromPdfs = (assessment.droneAnalysisPdfs || []).map((p, i) => ({
    key: `pdf-${p._id || p.pdfType || i}`,
    pdfType: p.pdfType,
    extractedAt: p.uploadedAt,
    droneAnalysisData: p.droneAnalysisData ?? p.extractedData,
  }));
  const legacy = assessment.reports || [];
  const fromLegacy = legacy.map((r, i) => ({
    key: `legacy-${i}-${r.pdfType || "report"}`,
    pdfType: r.pdfType || "Analysis Report",
    extractedAt: r.extractedAt,
    droneAnalysisData: r.droneAnalysisData ?? (r as { extractedData?: unknown }).extractedData,
  }));
  return [...fromPdfs, ...fromLegacy];
}

const InsurerAssessmentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: assessment, isLoading, error } = useAssessmentDetail(id);
  const { data: insurerPolicies } = useMyPolicies();
  const issuePolicyMutation = useIssuePolicy();
  const approveMutation = useApproveAssessment();
  const rejectMutation = useRejectAssessment();

  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<NormalizedReport | null>(null);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isFarmDialogOpen, setIsFarmDialogOpen] = useState(false);
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);

  const [coverageLevel, setCoverageLevel] = useState<string>("STANDARD");
  const [startDate, setStartDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  );
  const [endDate, setEndDate] = useState<string>(
    format(addDays(new Date(), 365), "yyyy-MM-dd'T'HH:mm"),
  );

  const farmId = assessment ? refId(assessment.farmId) : "";

  const [assessorSheetOpen, setAssessorSheetOpen] = useState(false);

  const { data: farmRecord } = useFarm(farmId || undefined);

  const { data: fullFarm, isLoading: farmDialogLoading } = useQuery({
    queryKey: farmsKeys.detail(farmId),
    queryFn: () => farmService.getFarm(farmId),
    enabled: !!farmId && isFarmDialogOpen,
  });

  const today = format(new Date(), "yyyy-MM-dd");
  const sevenDaysLater = format(addDays(new Date(), 7), "yyyy-MM-dd");

  const { data: weatherData, isLoading: isWeatherLoading } = useFarmWeather(
    farmId || "",
    today,
    sevenDaysLater,
  );

  const forecastDays = useMemo(() => {
    const points = unwrapWeather(weatherData);
    return dailyForecastPoints(points);
  }, [weatherData]);

  const farmerNameShort = useMemo(() => {
    const f = assessment?.farmerId;
    if (f && typeof f === "object") {
      const n = [f.firstName, f.lastName].filter(Boolean).join(" ").trim();
      if (n) return n;
    }
    return farmRecord?.farmerName?.trim() || undefined;
  }, [assessment?.farmerId, farmRecord?.farmerName]);

  const pdfReports = useMemo(
    () => (assessment ? normalizeReports(assessment) : []),
    [assessment],
  );

  const computedRisk = useMemo(() => {
    if (!pdfReports.length) return null;
    try {
      const forCalc = pdfReports.map((r) => ({
        pdfType: (String(r.pdfType).toLowerCase().includes("flower")
          ? "flowering"
          : "plant_health") as "plant_health" | "flowering",
        droneAnalysisData: r.droneAnalysisData as object,
      }));
      return calculateOverallRisk(forCalc, undefined);
    } catch {
      return null;
    }
  }, [pdfReports]);

  const canApproveOrReject =
    assessment &&
    (assessment.status === "SUBMITTED" || assessment.status === "COMPLETED");

  const policyForThisAssessment = useMemo(() => {
    if (!insurerPolicies || !id) return undefined;
    return insurerPolicies.find((p) => refId(p.assessmentId) === id);
  }, [insurerPolicies, id]);

  const blockingPolicyForIssue =
    policyForThisAssessment && policyBlocksNewIssueForAssessment(policyForThisAssessment.status)
      ? policyForThisAssessment
      : undefined;

  const canIssuePolicy =
    !!assessment &&
    assessment.status === "APPROVED" &&
    !blockingPolicyForIssue;

  const checklist = useMemo(() => {
    if (!assessment) return [];
    const submitted =
      assessment.status === "SUBMITTED" ||
      assessment.status === "COMPLETED" ||
      assessment.status === "APPROVED";
    return [
      { label: "Assessment submitted by assessor", ok: submitted },
      { label: "Drone / PDF analyses attached", ok: pdfReports.length > 0 },
      { label: "Final report generated", ok: !!assessment.reportGenerated },
      {
        label: "Risk score recorded",
        ok:
          assessment.riskScore != null ||
          assessment.risk_score != null ||
          computedRisk != null,
      },
      { label: "Insurer approval", ok: assessment.status === "APPROVED" },
      {
        label: "Policy offer on file (pending farmer or active)",
        ok: !!blockingPolicyForIssue,
      },
    ];
  }, [assessment, pdfReports.length, computedRisk, blockingPolicyForIssue]);

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <div className="p-8 text-center text-red-500">
        Error loading assessment details. Please try again later.
      </div>
    );
  }

  const farm = typeof assessment.farmId === "object" ? assessment.farmId : null;
  const assessor = typeof assessment.assessorId === "object" ? assessment.assessorId : null;

  const displayRiskScore =
    assessment.riskScore ?? assessment.risk_score ?? computedRisk?.score ?? null;

  const handleIssuePolicy = async () => {
    if (!id || !startDate || !endDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await issuePolicyMutation.mutateAsync({
        assessmentId: id,
        coverageLevel,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      });
      toast.success("Policy issued — pending farmer acceptance before coverage is active.");
      setIsIssueModalOpen(false);
      await queryClient.invalidateQueries({ queryKey: assessmentsKeys.detail(id) });
      await queryClient.invalidateQueries({ queryKey: assessmentsKeys.all });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to issue policy");
    }
  };

  const handleApprove = async () => {
    if (!id) return;
    try {
      await approveMutation.mutateAsync(id);
      toast.success("Assessment approved");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to approve");
    }
  };

  const handleReject = async () => {
    if (!id) return;
    try {
      await rejectMutation.mutateAsync(id);
      toast.success("Assessment rejected");
      setRejectConfirmOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to reject");
    }
  };

  const openReportDialog = (report: NormalizedReport) => {
    setSelectedReport(report);
    setIsReportDialogOpen(true);
  };

  const farmerNameForFarm = farmerNameShort || fullFarm?.farmerName || "—";

  const farmIdForMap = fullFarm?.id ?? (fullFarm as { _id?: string } | undefined)?._id ?? farmId;

  const assessorProfileEmbedded = assessor
    ? embeddedToUserProfile(assessor as unknown as Record<string, unknown>)
    : null;

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" className="rounded-full">
            <Link to="/insurer/assessments">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-3xl font-extrabold tracking-tight">Assessment review</h1>
              <StatusBadge status={assessment.status} />
            </div>
            <p className="text-muted-foreground mt-1">
              {assessment.assessmentNumber || `ID: ${assessment._id}`} • Created{" "}
              {format(new Date(assessment.createdAt), "PPP")}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canApproveOrReject && (
            <>
              <Button
                variant="outline"
                className="gap-2 border-green-200 text-green-800 hover:bg-green-50"
                onClick={handleApprove}
                disabled={approveMutation.isPending}
              >
                {approveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Approve assessment
              </Button>
              <Button
                variant="outline"
                className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
                onClick={() => setRejectConfirmOpen(true)}
                disabled={rejectMutation.isPending}
              >
                <XCircle className="h-4 w-4" />
                Reject
              </Button>
            </>
          )}
          {canIssuePolicy && (
            <Button
              onClick={() => setIsIssueModalOpen(true)}
              className="gap-2 shadow-lg shadow-primary/20"
            >
              <ShieldCheck className="h-4 w-4" />
              Issue policy
            </Button>
          )}
        </div>
        {assessment.status === "APPROVED" && blockingPolicyForIssue && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Policy already on file: </span>
            {blockingPolicyForIssue.policyNumber}
            <span className="mx-1">—</span>
            {String(blockingPolicyForIssue.status).toUpperCase() === "PENDING_ACCEPTANCE"
              ? "Awaiting farmer acceptance."
              : "Active coverage."}{" "}
            <Link to="/insurer/policies" className="text-primary font-medium underline-offset-4 hover:underline">
              Open policies
            </Link>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="border-muted">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Pre-policy checklist
              </CardTitle>
              <CardDescription>
                Everything the insurer should verify before issuing coverage.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-3">
              {checklist.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm"
                >
                  {row.ok ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className={row.ok ? "font-medium" : "text-muted-foreground"}>{row.label}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-background to-primary/5">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Risk assessment summary
              </CardTitle>
              <CardDescription>
                From the assessor and drone analyses; aligns with the assessor risk workflow.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                    Risk score
                  </p>
                  <p className="text-2xl font-black text-primary">
                    {displayRiskScore != null ? String(displayRiskScore) : "N/A"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                    Field status
                  </p>
                  <p className="text-lg font-bold">
                    {computedRisk?.fieldStatus ?? "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                    Crop health
                  </p>
                  <p className="text-lg font-bold text-green-700 dark:text-green-400">
                    {computedRisk?.cropHealth ?? "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                    Assessed area
                  </p>
                  <p className="text-lg font-bold">{farm?.area != null ? `${farm.area} ha` : "N/A"}</p>
                </div>
              </div>

              {computedRisk && (
                <div className="rounded-lg border bg-background/80 p-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Weather risk (model)
                  </p>
                  <p className="text-sm font-medium">{computedRisk.weatherRisk}</p>
                  {computedRisk.recommendations?.length ? (
                    <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
                      {computedRisk.recommendations.slice(0, 5).map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              )}

              {(assessment.notes || assessment.comprehensiveNotes) && (
                <div className="space-y-2">
                  {assessment.comprehensiveNotes && (
                    <div className="p-4 rounded-lg bg-background border border-primary/10 text-sm leading-relaxed whitespace-pre-wrap">
                      <span className="font-semibold text-foreground block mb-1">Assessor notes</span>
                      {assessment.comprehensiveNotes}
                    </div>
                  )}
                  {assessment.notes && (
                    <div className="p-4 rounded-lg bg-muted/40 border text-sm italic">
                      {assessment.notes}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {assessment.observations && assessment.observations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Tractor className="h-5 w-5 text-primary" />
                  Field observations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {assessment.observations.map((obs, i) => (
                    <li key={i}>{obs}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {assessment.photoUrls && assessment.photoUrls.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-primary" />
                  Assessment photos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {assessment.photoUrls.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="aspect-video rounded-lg overflow-hidden border bg-muted"
                    >
                      <img src={url} alt="" className="h-full w-full object-cover hover:opacity-90 transition-opacity" />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CloudRain className="h-5 w-5 text-blue-500" />
                    Farm weather forecast
                  </CardTitle>
                  <CardDescription>Up to 7 days, one reading per day (around local midday).</CardDescription>
                </div>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  Live data
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {isWeatherLoading ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : forecastDays.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg">
                  No weather data available for this location.
                </div>
              ) : (
                <ScrollArea className="w-full whitespace-nowrap rounded-md">
                  <div className="flex w-max space-x-4 p-1">
                    {forecastDays.map((d, idx) => {
                      const tempC = openWeatherTempToCelsius(d.main.temp);
                      return (
                        <div
                          key={`${d.dt}-${idx}`}
                          className="w-[140px] p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors flex flex-col items-center gap-3"
                        >
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            {format(new Date(d.dt * 1000), "EEE, MMM d")}
                          </p>
                          <div className="p-2 rounded-full bg-blue-50">
                            <img
                              src={`https://openweathermap.org/img/wn/${d.weather[0]?.icon}@2x.png`}
                              alt={d.weather[0]?.description}
                              className="w-10 h-10"
                            />
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-black">{Math.round(tempC)}°C</p>
                            <p className="text-[10px] font-medium text-muted-foreground capitalize truncate max-w-[120px]">
                              {d.weather[0]?.description}
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-2 w-full pt-2 border-t text-[10px]">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Droplets className="h-3 w-3" />
                              {d.main.humidity}%
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground justify-end">
                              <Wind className="h-3 w-3" />
                              {Math.round(d.wind.speed * 10) / 10} m/s
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Assessment reports & PDF analyses
              </CardTitle>
              <CardDescription>Drone and satellite extracts (same data the assessor used).</CardDescription>
            </CardHeader>
            <CardContent>
              {pdfReports.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pdfReports.map((report) => (
                    <div
                      key={report.key}
                      className="group p-4 rounded-xl border border-primary/10 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer flex items-center gap-4"
                      onClick={() => openReportDialog(report)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") openReportDialog(report);
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate">{report.pdfType || "Analysis report"}</p>
                        <p className="text-xs text-muted-foreground">
                          {report.extractedAt
                            ? `Extracted ${format(new Date(report.extractedAt), "PPP")}`
                            : "Recently processed"}
                        </p>
                      </div>
                      <Button size="icon" variant="ghost" className="rounded-full" type="button">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-muted/20 rounded-xl border-2 border-dashed">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                  <p className="text-muted-foreground font-medium">No PDF analyses linked to this assessment yet.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Assessment timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium">{format(new Date(assessment.createdAt), "PPp")}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Last updated</span>
                <span className="font-medium">{format(new Date(assessment.updatedAt), "PPp")}</span>
              </div>
              {assessment.assignedAt && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Assigned to assessor</span>
                  <span className="font-medium">{format(new Date(assessment.assignedAt), "PPp")}</span>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Report generated (flag)</span>
                <Badge variant={assessment.reportGenerated ? "default" : "secondary"}>
                  {assessment.reportGenerated ? "Yes" : "No"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card
            role="button"
            tabIndex={0}
            className="cursor-pointer transition-colors hover:bg-muted/30 hover:border-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setAssessorSheetOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setAssessorSheetOpen(true);
              }
            }}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Assessor
                </CardTitle>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
              </div>
              <CardDescription className="text-xs">Tap for assessor details from this assessment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-500/15 flex items-center justify-center font-bold text-amber-900 dark:text-amber-200 text-sm">
                  {assessor?.firstName?.[0] || "?"}
                  {assessor?.lastName?.[0] || ""}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold truncate">
                    {[assessor?.firstName, assessor?.lastName].filter(Boolean).join(" ").trim() || "Assessor"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                    <Mail className="h-3 w-3 shrink-0" />
                    {assessor?.email || "Email not listed"}
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="text-[10px] font-normal">
                Assigned to this assessment
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Farm details
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="gap-1 shrink-0"
                onClick={() => setIsFarmDialogOpen(true)}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="font-bold text-lg">
                  {farm?.name ||
                    `Field #${farm && "_id" in farm ? String((farm as { _id: string })._id).substring(0, 6) : "N/A"}`}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  {farm?.cropType || "Various crops"}
                </p>
              </div>
              <Separator />
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location</span>
                  <span className="font-medium text-right">{farm?.locationName || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Size</span>
                  <span className="font-medium">{farm?.area != null ? `${farm.area} ha` : "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sowing date</span>
                  <span className="font-medium">
                    {farm?.sowingDate ? format(new Date(farm.sowingDate), "MMM d, yyyy") : "N/A"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Sheet open={assessorSheetOpen} onOpenChange={setAssessorSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 pr-8">
              <Briefcase className="h-5 w-5 text-primary" />
              Assessor profile
            </SheetTitle>
            <SheetDescription>Assessor as embedded on this assessment.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-full bg-amber-500/15 flex items-center justify-center font-bold text-amber-900 dark:text-amber-200 text-lg">
                {(assessorProfileEmbedded?.firstName?.[0] || "?").toUpperCase()}
                {(assessorProfileEmbedded?.lastName?.[0] || "").toUpperCase()}
              </div>
              <div>
                <p className="text-lg font-bold">
                  {[assessorProfileEmbedded?.firstName, assessorProfileEmbedded?.lastName].filter(Boolean).join(" ") ||
                    "—"}
                </p>
                {assessorProfileEmbedded?.email ? (
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    {assessorProfileEmbedded.email}
                  </p>
                ) : null}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Details from assessment
              </h4>
              <ProfileFields profile={assessorProfileEmbedded} />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent className="max-w-4xl h-[90vh] p-0 flex flex-col">
          <DialogHeader className="p-6 pb-2 border-b bg-muted/5 shrink-0">
            <DialogTitle className="text-2xl font-bold flex items-center gap-3 capitalize">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              {String(selectedReport?.pdfType || "Report").replace(/_/g, " ")} Details
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Analysis data extracted from uploaded drone report
            </p>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
            {selectedReport && (
              <DroneAnalysisView
                data={selectedReport.droneAnalysisData}
                pdfType={selectedReport.pdfType}
              />
            )}
          </div>

          <div className="p-4 border-t bg-muted/30 flex justify-end shrink-0">
            <Button variant="outline" onClick={() => setIsReportDialogOpen(false)}>
              Close Report
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isFarmDialogOpen} onOpenChange={setIsFarmDialogOpen}>
        <DialogContent className="max-w-4xl h-[90vh] p-0 flex flex-col overflow-hidden">
          <DialogHeader className="p-6 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Farm & field context
            </DialogTitle>
            <DialogDescription>
              Full registration details and map view for this field ({farmerNameForFarm}).
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 bg-muted/10">
            {farmDialogLoading || !fullFarm ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <BasicInfoTab
                fieldId={farmIdForMap}
                farmerId={refId(assessment.farmerId) || refId(fullFarm.farmerId)}
                fieldName={fullFarm.name || farm?.name || "Field"}
                farmerName={farmerNameForFarm}
                cropType={fullFarm.cropType || farm?.cropType || "—"}
                area={fullFarm.area ?? farm?.area ?? 0}
                season={getSeasonFromSowingDate(fullFarm.sowingDate || farm?.sowingDate)}
                location={fullFarm.locationName || farm?.locationName || "—"}
                sowingDate={
                  fullFarm.sowingDate || farm?.sowingDate
                    ? format(new Date(fullFarm.sowingDate || farm?.sowingDate!), "PP")
                    : "N/A"
                }
                boundary={fullFarm.boundary}
                locationCoords={fullFarm.location?.coordinates}
                showActions={false}
              />
            )}
          </div>
          <DialogFooter className="p-4 border-t">
            <Button variant="outline" onClick={() => setIsFarmDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isIssueModalOpen} onOpenChange={setIsIssueModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Issue insurance policy</DialogTitle>
            <DialogDescription>
              Only approved assessments can be bound. This creates a policy in pending status until the farmer accepts
              it in their portal; coverage becomes active after they acknowledge.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="coverage">Coverage level</Label>
              <Select value={coverageLevel} onValueChange={setCoverageLevel}>
                <SelectTrigger id="coverage" className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BASIC">Basic coverage</SelectItem>
                  <SelectItem value="STANDARD">Standard coverage</SelectItem>
                  <SelectItem value="PREMIUM">Premium coverage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start-date">Start date</Label>
                <Input
                  id="start-date"
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end-date">End date</Label>
                <Input
                  id="end-date"
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-11"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsIssueModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleIssuePolicy}
              disabled={issuePolicyMutation.isPending}
              className="gap-2"
            >
              {issuePolicyMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              Confirm & issue policy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={rejectConfirmOpen} onOpenChange={setRejectConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject this assessment?</AlertDialogTitle>
            <AlertDialogDescription>
              The farmer and assessor will see that this assessment was rejected. You can still review historical
              data on this page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleReject();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {rejectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reject assessment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default InsurerAssessmentDetail;
