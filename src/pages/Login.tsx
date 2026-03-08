import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserCheck, Tractor, Shield, Leaf } from "lucide-react";
import { useLogin } from "@/lib/api";
import { ApiError } from "@/lib/api/types";
import { toast } from "sonner";

type UserRole = "assessor" | "farmer" | "admin" | null;

const Login = () => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>("");
  const navigate = useNavigate();

  const loginMutation = useLogin({
    onSuccess: (data) => {
      toast.success(`Welcome back! Logged in as ${data.role}`);
    },
    onError: (err: ApiError | Error) => {
      const message =
        err?.message || "Login failed. Please check your credentials.";
      setError(message);
      toast.error(message);
    },
  });

  const roles = [
    {
      id: "assessor" as const,
      title: "Field Assessor",
      description: "Conduct field assessments and risk analysis",
      icon: UserCheck,
    },
    {
      id: "farmer" as const,
      title: "Farmer",
      description: "View your fields and assessment reports",
      icon: Tractor,
    },
    {
      id: "admin" as const,
      title: "Administrator",
      description: "Manage policies, claims, and analytics",
      icon: Shield,
    },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!phoneNumber || !password) {
      setError("Please enter phone number and password");
      toast.error("Please enter phone number and password");
      return;
    }

    try {
      await loginMutation.mutateAsync({
        phoneNumber: phoneNumber,
        password: password,
      });
    } catch (err) {
      // Error is handled in onError callback
      console.error("Login error:", err);
    }
  };

  if (!selectedRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-6xl">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Leaf className="h-10 w-10 text-primary" />
              <h1 className="text-4xl font-bold text-gradient">
                AgriGuard Platform
              </h1>
            </div>
            <p className="text-muted-foreground text-lg">
              Advanced Agricultural Insurance & Risk Management
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {roles.map((role) => (
              <Card
                key={role.id}
                className="cursor-pointer card-hover border-2 hover:border-primary transition-all"
                onClick={() => setSelectedRole(role.id)}
              >
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 p-4 bg-primary/10 rounded-full w-fit">
                    <role.icon className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">{role.title}</CardTitle>
                  <CardDescription className="text-base">
                    {role.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="outline">
                    Select Role
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const selectedRoleData = roles.find((r) => r.id === selectedRole);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
            {selectedRoleData && (
              <selectedRoleData.icon className="h-6 w-6 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl">
            Sign In as {selectedRoleData?.title}
          </CardTitle>
          <CardDescription>
            Enter your credentials to access the portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="+250788123456"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter your phone number with country code
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSelectedRole(null);
                  setError("");
                }}
                className="flex-1"
                disabled={loginMutation.isPending}
              >
                Back
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Signing in..." : "Sign In"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
