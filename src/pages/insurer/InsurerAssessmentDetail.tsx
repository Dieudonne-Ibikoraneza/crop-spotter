/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
import { useParams, Link, useNavigate } from "react-router-dom";
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
  Download,
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import { InsurerBasicInfoTab as BasicInfoTab } from "@/components/insurer/tabs/InsurerBasicInfoTab";
import { StatusBadge } from "@/components/ui/status-badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { calculateOverallRisk } from "@/utils/riskCalculation";
import {
  dailyForecastPoints,
  openWeatherTempToCelsius,
  unwrapWeather,
} from "@/utils/weatherDisplay";
import { formatReportTypeLabel } from "@/lib/crops";
import { generateDroneDataPDF } from "@/utils/dronePdfGenerator";
import { ComprehensiveReportGenerator } from "@/utils/reportGenerator";

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
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: assessment, isLoading, error } = useAssessmentDetail(id);
  const { data: insurerPolicies } = useMyPolicies();
  const issuePolicyMutation = useIssuePolicy();
  const approveMutation = useApproveAssessment();
  const rejectMutation = useRejectAssessment();


  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

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
    enabled: !!farmId,
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
        pdfType: r.pdfType || "report",
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

  const [isDownloadingAssessment, setIsDownloadingAssessment] = useState(false);

  const handleGenerateAssessmentReport = async () => {
    if (!assessment) return;

    setIsDownloadingAssessment(true);
    try {
      const reportGenerator = new ComprehensiveReportGenerator();
      const reportData = {
        assessmentId: assessment._id || id || "",
        farmDetails: {
          name: fullFarm?.name || (assessment.farmId as any)?.name || "Field",
          cropType: fullFarm?.cropType || (assessment.farmId as any)?.cropType || "—",
          area: fullFarm?.area || (assessment.farmId as any)?.area || 0,
          location: fullFarm?.locationName || (assessment.farmId as any)?.locationName || "—",
          farmerName: [assessment.farmerId?.firstName, assessment.farmerId?.lastName].filter(Boolean).join(" ").trim() || (farmRecord as any)?.farmerName || "—",
        },
        dronePdfs: pdfReports.map((pdf) => ({
          pdfType: pdf.pdfType,
          droneAnalysisData: pdf.droneAnalysisData,
        })),
        weatherData: forecastDays as unknown as any,
        comprehensiveNotes: assessment.comprehensiveNotes,
        riskAssessment: computedRisk as unknown as any,
        reportGeneratedAt: new Date(),
      };
      
      await reportGenerator.downloadReport(reportData);
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate assessment report");
    } finally {
      setIsDownloadingAssessment(false);
    }
  };

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
          <div
            onClick={() => {
              const pId = blockingPolicyForIssue._id || blockingPolicyForIssue.policyNumber;
              if (pId) {
                navigate(`/insurer/policies?policyId=${pId}`);
              }
            }}
          >
            <Badge
              variant="outline"
              className="py-1.5 px-4 bg-primary/5 border-primary/20 text-primary font-mono text-sm cursor-pointer hover:bg-primary/10 transition-colors"
            >
              Policy: {blockingPolicyForIssue.policyNumber || "N/A"}
              <span className="ml-2 opacity-70 border-l border-primary/30 pl-2 font-sans text-xs">
                {String(blockingPolicyForIssue.status).toUpperCase() === "PENDING_ACCEPTANCE"
                  ? "Pending Acceptance"
                  : "Active Coverage"}
              </span>
            </Badge>
          </div>
        )}
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="basic" className="gap-2">📋 Basic Info</TabsTrigger>
          <TabsTrigger value="weather" className="gap-2">🌦️ Weather</TabsTrigger>
          <TabsTrigger value="drone" className="gap-2">🛸 Drone Analysis</TabsTrigger>
          <TabsTrigger value="overview" className="gap-2">🕒 Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="mt-0 space-y-8">
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

          {farmDialogLoading || !fullFarm ? (
            <div className="flex h-64 items-center justify-center border rounded-xl bg-muted/10">
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
              assessorElement={
                <button
                  type="button"
                  className="p-0 border-none bg-transparent hover:underline text-primary font-medium cursor-pointer"
                  onClick={() => setAssessorSheetOpen(true)}
                >
                  {[assessor?.firstName, assessor?.lastName].filter(Boolean).join(" ").trim() || "Assessor Profile"}
                </button>
              }
            />
          )}


        </TabsContent>

        <TabsContent value="weather" className="mt-0">
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
        </TabsContent>

        <TabsContent value="overview" className="mt-0 space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/30 p-4 rounded-xl border border-primary/10 mb-8">
            <div>
              <h2 className="text-xl font-bold text-primary">Assessment Documentation</h2>
              <p className="text-sm text-muted-foreground">
                Download the comprehensive risk assessment and field documentation.
              </p>
            </div>
            <Button
              onClick={handleGenerateAssessmentReport}
              disabled={isDownloadingAssessment}
              className="bg-primary hover:bg-primary/90 text-white gap-2 h-11 px-6 shadow-md transition-all active:scale-95"
            >
              {isDownloadingAssessment ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-5 w-5" />
              )}
              {isDownloadingAssessment ? "Generating..." : "Export assessment report"}
            </Button>
          </div>

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


        </TabsContent>

        <TabsContent value="drone" className="mt-0 space-y-8">
          {pdfReports.length > 0 ? (
            <div className="space-y-6">
              {pdfReports.map((report) => (
                <Card key={report.key} className="overflow-hidden border-primary/20">
                  <CardHeader className="pb-3 border-b border-border/50 bg-muted/10">
                    <div className="flex items-start justify-between flex-wrap gap-4">
                      <div className="space-y-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="capitalize">
                            {formatReportTypeLabel(report.pdfType)}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-xs bg-green-50 text-green-700 border-green-200 ml-2"
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Processed
                          </Badge>
                        </CardTitle>
                        <p className="text-xs text-muted-foreground font-normal ml-6">
                          {report.extractedAt
                            ? `Extracted ${format(new Date(report.extractedAt), "PPP p")}`
                            : "Recently processed"}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isDownloading}
                          className="gap-2 shrink-0 bg-background"
                          onClick={async () => {
                            setIsDownloading(true);
                            try {
                              await generateDroneDataPDF(
                                report.droneAnalysisData as any,
                                formatReportTypeLabel(report.pdfType),
                              );
                              toast.success("Report downloaded successfully");
                            } catch (error) {
                              toast.error("Failed to generate PDF report");
                            } finally {
                              setIsDownloading(false);
                            }
                          }}
                        >
                          {isDownloading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                          <span className="hidden sm:inline">Download</span>
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <DroneAnalysisView
                      data={report.droneAnalysisData}
                      pdfType={report.pdfType}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-16 w-16 bg-muted/30 rounded-full flex items-center justify-center mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground opacity-50" />
                </div>
                <h3 className="text-lg font-bold text-muted-foreground">No Drone Analysis Yet</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-md">
                  This field assessment does not have any attached static drone reports or machine learning extracted pdf analyses.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Sheet open={assessorSheetOpen} onOpenChange={setAssessorSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto z-[9999]">
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
