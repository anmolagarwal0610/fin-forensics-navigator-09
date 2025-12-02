import { useState } from "react";
import { useAdminPasswordVerification } from "@/hooks/useAdminPasswordVerification";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Lock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface AdminPasswordVerifyProps {
  onSuccess: () => void;
  isLocked: boolean;
  lockedUntil: string | null;
}

const AdminPasswordVerify = ({ onSuccess, isLocked: initialLocked, lockedUntil: initialLockedUntil }: AdminPasswordVerifyProps) => {
  const [password, setPassword] = useState("");
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(initialLocked);
  const [lockedUntil, setLockedUntil] = useState(initialLockedUntil);
  const { isVerifying, verifyPassword } = useAdminPasswordVerification();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = await verifyPassword(password);

    if (result.success) {
      toast.success("Access granted");
      onSuccess();
    } else {
      if (result.locked) {
        setIsLocked(true);
        setLockedUntil(result.lockedUntil || null);
        toast.error("Account locked due to too many failed attempts");
      } else {
        setAttemptsRemaining(result.attemptsRemaining ?? null);
        toast.error(result.error || "Incorrect password");
      }
      setPassword("");
    }
  };

  const getLockoutMessage = () => {
    if (!lockedUntil) return "";
    const lockTime = new Date(lockedUntil);
    const now = new Date();
    const minutesRemaining = Math.ceil((lockTime.getTime() - now.getTime()) / 60000);
    return `Account locked. Try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}.`;
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
          <CardTitle className="text-2xl">Admin Access</CardTitle>
          <CardDescription>
            Enter the admin password to access the admin panel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLocked && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {getLockoutMessage()}
              </AlertDescription>
            </Alert>
          )}

          {!isLocked && attemptsRemaining !== null && attemptsRemaining < 3 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} remaining before lockout
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">
                <Lock className="h-4 w-4 inline mr-2" />
                Admin Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                disabled={isVerifying || isLocked}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isVerifying || isLocked}>
              {isVerifying ? "Verifying..." : "Access Admin Panel"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPasswordVerify;