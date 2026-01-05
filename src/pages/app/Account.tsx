import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription, TIER_LIMITS, TIER_LABELS } from "@/hooks/useSubscription";
import { UsageIndicator } from "@/components/app/UsageIndicator";
import ChangePassword from "@/components/auth/ChangePassword";
import { format } from "date-fns";
import { CreditCard, Calendar, FileText, Zap, User, Pencil, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Account() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { tier, pagesRemaining, expiresAt, loading } = useSubscription();
  const { toast } = useToast();
  const totalPages = TIER_LIMITS[tier];
  const pagesUsed = totalPages - pagesRemaining;

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [showEmailChange, setShowEmailChange] = useState(false);

  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, organization_name, phone_number")
        .eq("user_id", user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setOrganizationName(profile.organization_name || "");
      setPhoneNumber(profile.phone_number || "");
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          organization_name: organizationName.trim(),
          phone_number: phoneNumber.trim() || null,
        })
        .eq("user_id", user?.id);

      if (error) throw error;

      await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim(),
          organization_name: organizationName.trim(),
          phone_number: phoneNumber.trim() || null,
        }
      });

      toast({
        title: t('account.profileUpdated'),
        description: t('account.profileSaved'),
      });
      setIsEditing(false);
      refetchProfile();
    } catch (error: any) {
      toast({
        title: t('errors.error'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEmailChange = async () => {
    if (!newEmail.trim()) return;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast({
        title: t('errors.error'),
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ 
        email: newEmail.trim() 
      });

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: `${t('account.emailConfirmationNote')}`,
      });
      setShowEmailChange(false);
      setNewEmail("");
    } catch (error: any) {
      toast({
        title: t('errors.error'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <h1 className="text-2xl md:text-3xl font-semibold">{t('account.title')}</h1>
        
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {t('account.profile')}
              </CardTitle>
              {!isEditing ? (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  {t('account.editProfile')}
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} disabled={isSaving}>
                    {t('account.cancel')}
                  </Button>
                  <Button size="sm" onClick={handleSaveProfile} disabled={isSaving}>
                    {isSaving ? t('account.saving') : t('account.saveChanges')}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {profileLoading ? (
              <div className="text-center py-4 text-muted-foreground">
                {t('account.loadingProfile')}
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>{t('auth.fullName')}</Label>
                  {isEditing ? (
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  ) : (
                    <p className="text-sm">{profile?.full_name || t('account.notSet')}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>{t('auth.organizationName')}</Label>
                  {isEditing ? (
                    <Input value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} />
                  ) : (
                    <p className="text-sm">{profile?.organization_name || t('account.notSet')}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>{t('auth.phoneNumber')}</Label>
                  {isEditing ? (
                    <Input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder={t('auth.optional')} />
                  ) : (
                    <p className="text-sm">{profile?.phone_number || t('account.notSet')}</p>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>{t('account.emailAddress')}</Label>
                  <div className="flex items-center gap-2">
                    <p className="text-sm flex-1">{user?.email}</p>
                    <Button variant="link" size="sm" onClick={() => setShowEmailChange(!showEmailChange)}>
                      {t('account.changeEmail')}
                    </Button>
                  </div>
                  
                  {showEmailChange && (
                    <div className="mt-3 p-4 rounded-lg bg-muted/50 space-y-3">
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4 mt-0.5" />
                        <p>{t('account.emailConfirmationNote')}</p>
                      </div>
                      <div className="flex gap-2">
                        <Input 
                          type="email"
                          placeholder={t('account.enterNewEmail')} 
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                        />
                        <Button onClick={handleEmailChange} disabled={isSaving || !newEmail.trim()}>
                          {isSaving ? t('auth.sending') : t('account.sendConfirmation')}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">{t('account.accountCreated')}</Label>
                  <p className="text-sm">{user?.created_at ? format(new Date(user.created_at), 'MMM dd, yyyy') : 'N/A'}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {t('account.subscription')}
              </CardTitle>
              <Badge variant="outline" className="text-sm">
                {TIER_LABELS[tier]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <div className="text-center py-4 text-muted-foreground">
                {t('account.loadingSubscription')}
              </div>
            ) : (
              <>
                {/* Usage Indicator */}
                <UsageIndicator 
                  tier={tier}
                  pagesUsed={pagesUsed}
                  className="mb-6"
                />

                {/* Subscription Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                    <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">{t('account.totalAllocation')}</p>
                      <p className="text-2xl font-semibold mt-1">
                        {totalPages.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {expiresAt 
                          ? `Total pages until ${format(new Date(expiresAt), 'MMM dd, yyyy')}`
                          : t('account.pagesPerMonth')
                        }
                      </p>
                    </div>
                  </div>

                  {expiresAt && (
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                      <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Subscription Expires</p>
                        <p className="text-lg font-semibold mt-1">
                          {format(new Date(expiresAt), 'MMM dd, yyyy')}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Contact admin to renew
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Upgrade CTA for Free Tier */}
                {tier === 'free' && (
                  <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-semibold mb-1">{t('account.needMorePages')}</h4>
                        <p className="text-sm text-muted-foreground">
                          {t('account.upgradeDescription')}
                        </p>
                      </div>
                      <Button asChild size="sm" variant="hero">
                        <Link to="/pricing">
                          <Zap className="mr-2 h-4 w-4" />
                          {t('account.upgrade')}
                        </Link>
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <ChangePassword />
      </motion.div>
    </motion.div>
  );
}
