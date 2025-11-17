import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

const ResetConfirm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [tokenVerified, setTokenVerified] = useState(false);

  // Extract token from URL (supports both query params and hash)
  const recoveryToken = searchParams.get('token') || 
                        searchParams.get('recovery_token') ||
                        window.location.hash.match(/token=([^&]*)/)?.[1];
  const recoveryType = searchParams.get('type') || 'recovery';

  useEffect(() => {
    if (!recoveryToken) {
      toast({
        title: "Invalid reset link",
        description: "The password reset link is invalid or has expired.",
        variant: "destructive"
      });
      setTimeout(() => navigate('/reset'), 3000);
    }
  }, [recoveryToken, navigate]);

  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({ 
        title: "Passwords don't match", 
        description: "Please make sure both passwords are the same",
        variant: "destructive"
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({ 
        title: "Password too short", 
        description: "Password must be at least 6 characters",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      // Verify the OTP token and update password in one step
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: recoveryToken!,
        type: recoveryType as 'recovery',
      });

      if (verifyError) {
        toast({ 
          title: "Invalid or expired link", 
          description: "This reset link has expired or been used. Please request a new one.",
          variant: "destructive"
        });
        setTimeout(() => navigate('/reset'), 2000);
        return;
      }

      setTokenVerified(true);

      // Now update the password
      const { error: updateError } = await supabase.auth.updateUser({ 
        password: newPassword 
      });
      
      if (updateError) {
        toast({ 
          title: "Update failed", 
          description: updateError.message,
          variant: "destructive"
        });
        return;
      }
      
      toast({ 
        title: "Password updated successfully", 
        description: "You can now sign in with your new password"
      });

      setTimeout(() => {
        navigate('/signin');
      }, 2000);
    } catch (error) {
      console.error("Password reset error:", error);
      toast({ 
        title: "An error occurred", 
        description: "Please try again or request a new reset link",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!recoveryToken) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md shadow-elegant">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Invalid Reset Link</CardTitle>
            <CardDescription>
              This password reset link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link to="/reset">
              <Button variant="cta" className="w-full">
                Request New Reset Link
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-bold text-foreground hover:text-accent transition-colors">
            FinNavigator
          </Link>
          <p className="mt-2 text-sm text-muted-foreground font-mono">
            Your partner in financial forensics
          </p>
        </div>

        <Card className="shadow-elegant">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl">Set Your New Password</CardTitle>
            <CardDescription>
              Your identity has been verified. Enter your new password below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerifyAndReset} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  minLength={6}
                />
              </div>

              <Button type="submit" variant="cta" className="w-full" disabled={loading}>
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground">
                Having trouble? <Link to="/reset" className="text-accent hover:text-accent-hover font-medium">Request a new link</Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetConfirm;
