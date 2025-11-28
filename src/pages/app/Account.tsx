import { useState, useEffect } from "react";
import { motion } from "framer-motion";
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
        title: "Profile updated",
        description: "Your profile information has been saved.",
      });
      setIsEditing(false);
      refetchProfile();
    } catch (error: any) {
      toast({
        title: "Failed to update profile",
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
        title: "Invalid email",
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
        title: "Confirmation email sent",
        description: `A confirmation link has been sent to ${newEmail}. Please check your inbox and click the link to complete the email change.`,
      });
      setShowEmailChange(false);
      setNewEmail("");
    } catch (error: any) {
      toast({
        title: "Failed to change email",
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
        <h1 className="text-2xl md:text-3xl font-semibold">Account Settings</h1>
        
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
              {!isEditing ? (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveProfile} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {profileLoading ? (
              <div className="text-center py-4 text-muted-foreground">
                Loading profile...
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  {isEditing ? (
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  ) : (
                    <p className="text-sm">{profile?.full_name || "Not set"}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Organization Name</Label>
                  {isEditing ? (
                    <Input value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} />
                  ) : (
                    <p className="text-sm">{profile?.organization_name || "Not set"}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  {isEditing ? (
                    <Input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Optional" />
                  ) : (
                    <p className="text-sm">{profile?.phone_number || "Not set"}</p>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <div className="flex items-center gap-2">
                    <p className="text-sm flex-1">{user?.email}</p>
                    <Button variant="link" size="sm" onClick={() => setShowEmailChange(!showEmailChange)}>
                      Change Email
                    </Button>
                  </div>
                  
                  {showEmailChange && (
                    <div className="mt-3 p-4 rounded-lg bg-muted/50 space-y-3">
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4 mt-0.5" />
                        <p>A confirmation link will be sent to your new email address. The change will only take effect after you confirm.</p>
                      </div>
                      <div className="flex gap-2">
                        <Input 
                          type="email"
                          placeholder="Enter new email address" 
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                        />
                        <Button onClick={handleEmailChange} disabled={isSaving || !newEmail.trim()}>
                          {isSaving ? "Sending..." : "Send Confirmation"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Account Created</Label>
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
                Subscription & Usage
              </CardTitle>
              <Badge variant="outline" className="text-sm">
                {TIER_LABELS[tier]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <div className="text-center py-4 text-muted-foreground">
                Loading subscription details...
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
                      <p className="text-sm font-medium">Total Allocation</p>
                      <p className="text-2xl font-semibold mt-1">
                        {totalPages.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        pages per month
                      </p>
                    </div>
                  </div>

                  {expiresAt && (
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                      <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Renews On</p>
                        <p className="text-lg font-semibold mt-1">
                          {format(new Date(expiresAt), 'MMM dd, yyyy')}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Next billing date
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
                        <h4 className="font-semibold mb-1">Need More Pages?</h4>
                        <p className="text-sm text-muted-foreground">
                          Upgrade to a paid plan for higher monthly limits and priority support.
                        </p>
                      </div>
                      <Button asChild size="sm" variant="hero">
                        <Link to="/pricing">
                          <Zap className="mr-2 h-4 w-4" />
                          Upgrade
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
