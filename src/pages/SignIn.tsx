import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import DocumentHead from "@/components/common/DocumentHead";
import BackToLanding from "@/components/auth/BackToLanding";
import { Shield, Lock, ShieldCheck } from "lucide-react";

export default function SignIn() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Add timeout to prevent indefinite loading state
    const timeoutId = setTimeout(() => {
      setLoading(false);
      toast({
        title: t('errors.somethingWentWrong'),
        description: t('errors.tryAgain'),
        variant: "destructive"
      });
    }, 15000); // 15 second timeout
    
    try {
      // Check for existing session first
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      if (existingSession) {
        clearTimeout(timeoutId);
        navigate("/app/dashboard");
        return;
      }
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      clearTimeout(timeoutId);
      
      if (error) {
        toast({
          title: t('errors.error'),
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: t('auth.welcomeBack'),
          description: t('auth.signedInSuccess')
        });
        navigate("/app/dashboard");
      }
    } catch (error) {
      clearTimeout(timeoutId);
      toast({
        title: t('errors.error'),
        description: t('errors.somethingWentWrong'),
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
            <p className="mt-2 text-base md:text-lg text-muted-foreground font-mono">Your AI partner in financial forensics.</p>
            <div className="mt-4 flex items-center justify-center gap-6 text-muted-foreground">
              <Shield className="h-5 w-5 hover-scale" />
              <Lock className="h-5 w-5 hover-scale" />
              <ShieldCheck className="h-5 w-5 hover-scale" />
            </div>
          </div>

          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">{t('auth.signIn')}</CardTitle>
              <CardDescription>{t('auth.credentials')}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t('auth.email')}</Label>
                  <Input id="email" type="email" placeholder={t('auth.enterEmail')} value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t('auth.password')}</Label>
                  <Input id="password" type="password" placeholder={t('auth.enterPassword')} value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t('auth.signingIn') : t('auth.signIn')}
                </Button>
              </form>
              <div className="mt-6 text-center space-y-2">
                <Link to="/reset" className="text-sm text-muted-foreground hover:text-primary">
                  {t('auth.forgotPassword')}
                </Link>
                <div className="text-sm text-muted-foreground">
                  {t('auth.noAccount')} {""}
                  <Link to="/signup" className="text-primary hover:underline">
                    {t('auth.signUp')}
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
