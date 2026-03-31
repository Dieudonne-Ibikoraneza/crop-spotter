import {
  BarChart3,
  TrendingUp,
  Shield,
  FileWarning,
  PieChart as PieChartIcon,
  Download,
  Loader2,
  DollarSign,
  Briefcase,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useInsurerReports } from "@/lib/api/hooks/useInsurer";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";

const COLORS = [
  "#10b981",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
];

const InsurerReports = () => {
  const { data: reports, isLoading, error } = useInsurerReports();

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !reports) {
    return (
      <div className="p-8 text-center text-red-500">
        Error loading reports. Please try again later.
      </div>
    );
  }

  const { summary, regionalDistribution, monthlyTrends } = reports;

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Reports & Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive portfolio performance and risk metrics.
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => {
            toast.info("Generating report PDF...");
            setTimeout(() => {
              window.print();
            }, 500);
          }}
        >
          <Download className="h-4 w-4" />
          Export PDF
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Total Premium
                </p>
                <h3 className="text-2xl font-bold mt-1">
                  {summary.totalPremium.toLocaleString()} RWF
                </h3>
              </div>
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                <DollarSign className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Active Policies
                </p>
                <h3 className="text-2xl font-bold mt-1">
                  {summary.activePolicies}
                </h3>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Loss Ratio
                </p>
                <h3 className="text-2xl font-bold mt-1">
                  {summary.lossRatio}%
                </h3>
              </div>
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                <Activity className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Pending Claims
                </p>
                <h3 className="text-2xl font-bold mt-1">
                  {summary.pendingClaims}
                </h3>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                <FileWarning className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Growth Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Monthly Portfolio Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrends}>
                  <defs>
                    <linearGradient
                      id="colorPolicies"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f0f0f0"
                  />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="policies"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorPolicies)"
                    name="New Policies"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Regional Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-primary" />
              Regional Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={regionalDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {regionalDistribution.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Claims Comparison */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Claims Performance Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrends}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f0f0f0"
                  />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    cursor={{ fill: "#f8fafc" }}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Bar
                    dataKey="claims"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                    name="Claims Filed"
                    barSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Table or Detailed Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            Detailed Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                Portfolio
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Policies</span>
                  <span className="font-bold">{summary.totalPolicies}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Active</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {summary.activePolicies}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Pending Issuance</span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold">
                    {summary.totalPolicies - summary.activePolicies}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                Claims
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Claims</span>
                  <span className="font-bold">{summary.totalClaims}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Approved</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {summary.approvedClaims}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Rejected</span>
                  <span className="text-red-600 dark:text-red-400 font-bold">
                    {summary.rejectedClaims}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                Performance
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Avg. Premium</span>
                  <span className="font-bold">
                    {summary.totalPolicies > 0
                      ? Math.floor(
                          summary.totalPremium / summary.totalPolicies,
                        ).toLocaleString()
                      : 0}{" "}
                    RWF
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Loss Ratio</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {summary.lossRatio}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Settlement Rate</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {summary.totalClaims > 0
                      ? Math.floor(
                          (summary.approvedClaims / summary.totalClaims) * 100,
                        )
                      : 0}
                    %
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InsurerReports;
