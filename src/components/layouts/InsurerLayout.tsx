import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  ShieldCheck,
  FileWarning,
  Users,
  BarChart3,
  Leaf,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { authService } from "@/lib/api/services/auth";

const InsurerLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const { user } = authService.getAuthStatus();

  const navigation = [
    { name: "Dashboard", href: "/insurer/dashboard", icon: Home },
    { name: "Requests", href: "/insurer/requests", icon: Leaf },
    { name: "Claims", href: "/insurer/claims", icon: FileWarning },
    { name: "Policies", href: "/insurer/policies", icon: ShieldCheck },
    { name: "Assessors", href: "/insurer/assessors", icon: Users },
    { name: "Reports", href: "/insurer/reports", icon: BarChart3 },
  ];

  const handleLogout = () => {
    authService.logout();
    navigate("/login", { replace: true });
  };

  const isActive = (href: string) => location.pathname === href;

  return (
    <div className="min-h-screen flex w-full bg-background">
      <aside
        className={cn(
          "bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 z-20",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
          <Link
            to="/insurer/dashboard"
            className={cn("flex items-center gap-2", collapsed && "justify-center")}
          >
            <Leaf className="h-8 w-8 text-primary shrink-0" />
            {!collapsed && (
              <div>
                <h1 className="text-xl font-bold text-sidebar-foreground">
                  Starhawk
                </h1>
                <p className="text-xs text-muted-foreground">Insurer Portal</p>
              </div>
            )}
          </Link>
        </div>

        <div className="p-2 border-b border-sidebar-border hidden md:block">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="w-full justify-center"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        <nav className="flex-1 p-2 space-y-1 mt-4">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link key={item.name} to={item.href} className="relative block group">
                {active && (
                  <div className="absolute left-0 top-1 bottom-1 w-1 bg-primary rounded-r" />
                )}
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full relative transition-all duration-200",
                    collapsed ? "justify-center px-2" : "justify-start gap-3",
                    active
                      ? "bg-primary/10 text-primary hover:bg-primary/20"
                      : "text-sidebar-foreground hover:bg-sidebar-border hover:text-sidebar-foreground",
                  )}
                  title={collapsed ? item.name : undefined}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 shrink-0",
                      active
                        ? "text-primary"
                        : "text-muted-foreground group-hover:text-sidebar-foreground",
                    )}
                  />
                  {!collapsed && <span className="font-medium">{item.name}</span>}
                </Button>
              </Link>
            );
          })}
        </nav>

        <div className={cn("p-4 border-t border-sidebar-border", collapsed && "p-2")}>
          {!collapsed && (
            <div className="flex items-center gap-3 mb-3 p-2 rounded-lg bg-muted/50">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0 border border-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-sidebar-foreground truncate">
                  {user?.email?.split("@")[0] || "Insurer"}
                </p>
                <p className="text-xs text-muted-foreground italic truncate">
                  Claims & policies
                </p>
              </div>
            </div>
          )}
          <Button
            variant="outline"
            onClick={handleLogout}
            className={cn(
              "w-full border-muted-foreground/20 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20",
              collapsed ? "justify-center px-2" : "justify-start gap-2",
            )}
            size="sm"
            title={collapsed ? "Logout" : undefined}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && "Logout"}
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6 shrink-0 md:hidden">
          <div className="flex items-center gap-2">
            <Leaf className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">Starhawk</span>
          </div>
          <Button variant="ghost" size="icon">
            <Menu className="h-6 w-6" />
          </Button>
        </header>

        <main className="flex-1 overflow-auto bg-muted/30">
          <div className="max-w-[1600px] mx-auto min-h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default InsurerLayout;

