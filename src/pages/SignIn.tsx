import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import DocumentHead from "@/components/common/DocumentHead";
import BackToLanding from "@/components/auth/BackToLanding";
import { Shield, Lock, ShieldCheck } from "lucide-react";
export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const {
        error
      } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) {
        toast({
          title: "Error signing in",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Welcome back!",
          description: "You have been signed in successfully."
        });
        navigate("/app/dashboard");
      }
    } catch (error) {
      toast({
        title: "Error signing in",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <DocumentHead title="Sign In - FinNavigator" description="Securely sign in to FinNavigator — Your AI partner in financial forensics" />
      <div className="min-h-screen flex items-center justify-center bg-background relative px-4">
        <BackToLanding />

        <div className="w-full max-w-3xl mx-auto">
          {/* Brand + tagline above the login box */}
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">FinNavigator</h1>
            <p className="mt-2 text-base md:text-lg text-muted-foreground">Your AI partner in financial forensics.</p>
            <div className="mt-4 flex items-center justify-center gap-6 text-muted-foreground">
              <Shield className="h-5 w-5 hover-scale" />
              <Lock className="h-5 w-5 hover-scale" />
              <ShieldCheck className="h-5 w-5 hover-scale" />
            </div>
          </div>

          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
              <CardDescription>Enter your credentials to access your account</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
              <div className="mt-6 text-center space-y-2">
                <Link to="/reset" className="text-sm text-muted-foreground hover:text-primary">
                  Forgot your password?
                </Link>
                <div className="text-sm text-muted-foreground">
                  Don't have an account? {""}
                  <Link to="/signup" className="text-primary hover:underline">
                    Sign up
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}