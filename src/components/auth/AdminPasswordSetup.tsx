import { useState } from "react";
import { useAdminPasswordVerification } from "@/hooks/useAdminPasswordVerification";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordStrength } from "@/components/PasswordStrength";
import { Shield, Lock } from "lucide-react";
import { toast } from "sonner";

interface AdminPasswordSetupProps {
  onSuccess: () => void;
}

const AdminPasswordSetup = ({ onSuccess }: AdminPasswordSetupProps) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { isVerifying, setPassword: submitPassword } = useAdminPasswordVerification();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    const result = await submitPassword(password);

    if (result.success) {
      toast.success("Admin password set successfully");
      onSuccess();
    } else {
      toast.error(result.error || "Failed to set password");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Set Admin Password</CardTitle>
          <CardDescription>
            This is your first time accessing the admin panel. Please set a secure password to protect admin access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">
                <Lock className="h-4 w-4 inline mr-2" />
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                disabled={isVerifying}
                required
              />
              <PasswordStrength password={password} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm admin password"
                disabled={isVerifying}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isVerifying}>
              {isVerifying ? "Setting up..." : "Set Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPasswordSetup;