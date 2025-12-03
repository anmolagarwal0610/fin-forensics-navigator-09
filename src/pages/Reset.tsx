
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const Reset = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'request' | 'update'>('request');
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Detect password recovery mode
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setMode('update');
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-confirm`
      });
      
      if (error) {
        toast({ 
          title: "Reset failed", 
          description: error.message 
        });
        return;
      }
      
      setIsSubmitted(true);
    } catch (error) {
      console.error("Password reset error:", error);
      toast({ title: "An error occurred during password reset" });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
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
      const { error } = await supabase.auth.updateUser({ 
        password: newPassword 
      });
      
      if (error) {
        toast({ 
          title: "Update failed", 
          description: error.message,
          variant: "destructive"
        });
        return;
      }
      
      toast({ 
        title: "Password updated successfully", 
        description: "You can now sign in with your new password"
      });

      // Redirect to signin after 2 seconds
      setTimeout(() => {
        navigate('/signin');
      }, 2000);
    } catch (error) {
      console.error("Password update error:", error);
      toast({ 
        title: "An error occurred", 
        description: "Please try again or request a new reset link",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Password update mode
  if (mode === 'update') {
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
                <Lock className="h-8 w-8" />
              </div>
              <CardTitle className="text-2xl">Set new password</CardTitle>
              <CardDescription>
                Enter your new password below
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordUpdate} className="space-y-6">
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
                  {loading ? "Updating..." : "Update password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Email sent confirmation
  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link to="/" className="text-2xl font-bold text-foreground hover:text-accent transition-colors">
              FinNavigator
            </Link>
          </div>

          <Card className="shadow-elegant">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-success text-success-foreground rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="h-8 w-8" />
              </div>
              <CardTitle className="text-2xl">Check your email</CardTitle>
              <CardDescription>
                We've sent password reset instructions to {email}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                If you don't see the email in your inbox, check your spam folder. 
                The reset link will expire in 24 hours.
              </p>
              <div className="space-y-3">
                <Link to="/signin" className="w-full">
                  <Button variant="cta" className="w-full">
                    Back to sign in
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setIsSubmitted(false)}
                >
                  Try different email
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
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
            <CardTitle className="text-2xl">Reset your password</CardTitle>
            <CardDescription>
              Enter your email address and we'll send you instructions to reset your password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@organization.com"
                />
              </div>

              <Button type="submit" variant="cta" className="w-full" disabled={loading}>
                {loading ? "Sending..." : "Send reset instructions"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link
                to="/signin"
                className="inline-flex items-center text-sm text-accent hover:text-accent-hover font-medium transition-colors"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to sign in
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="text-accent hover:text-accent-hover font-medium transition-colors"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Reset;
