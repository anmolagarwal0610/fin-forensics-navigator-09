import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import TagInput from "@/components/app/TagInput";
import ColorPicker from "@/components/app/ColorPicker";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { createCase } from "@/api/cases";
import { toast } from "@/hooks/use-toast";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { AlertCircle, Zap, Info } from "lucide-react";

export default function NewCase() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const sourceCaseId = searchParams.get('sourceCaseId');
  const sourceCaseName = searchParams.get('sourceCaseName');
  const sourceResultUrl = searchParams.get('sourceResultUrl');
  
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [color, setColor] = useState("#3A86FF");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { hasAccess, pagesRemaining, loading: subLoading } = useSubscription();

  // Pre-fill name if creating from existing case
  useEffect(() => {
    if (sourceCaseName) {
      setName(`${sourceCaseName} (Extended)`);
    }
  }, [sourceCaseName]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasAccess) {
      toast({ 
        title: "Access Required", 
        description: "Please upgrade your subscription to create new cases.",
        variant: "destructive"
      });
      return;
    }

    if (!name.trim()) {
      toast({ title: "Name is required" });
      return;
    }

    setSubmitting(true);
    createCase({ name: name.trim(), description: desc.trim() || undefined, color_hex: color, tags })
      .then((c) => {
        toast({ title: "Case created." });
        
        // If we have a source case, navigate to upload with add files mode
        if (sourceCaseId) {
          const params = new URLSearchParams({
            addFiles: 'true',
            sourceCaseId: sourceCaseId, // Pass source case ID for secure storage fetch
          });
          if (sourceResultUrl) {
            params.set('sourceResultUrl', sourceResultUrl); // Legacy fallback
          }
          navigate(`/app/cases/${c.id}/upload?${params.toString()}`);
        } else {
          navigate(`/app/cases/${c.id}/upload`);
        }
      })
      .catch((e) => {
        console.error('Case creation error:', e);
        // Extract meaningful error message from Supabase/Postgres error
        const errorMessage = e?.message || e?.error?.message || "Failed to create case";
        const isPageLimitError = errorMessage.toLowerCase().includes('page limit') || 
                                  errorMessage.toLowerCase().includes('subscription');
        toast({ 
          title: "Failed to create case",
          description: isPageLimitError 
            ? errorMessage 
            : "Please try again or contact support.",
          variant: "destructive"
        });
      })
      .finally(() => setSubmitting(false));
  };

  if (subLoading) {
    return <div className="p-6">{t("common.loading")}</div>;
  }

  return (
    <form onSubmit={onSubmit}>
      {!hasAccess && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("newCase.subscriptionLimitReached")}</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              {t("newCase.pagesRemaining", { count: pagesRemaining })}
            </span>
            <Button asChild size="sm" className="ml-4">
              <Link to="/pricing">
                <Zap className="mr-2 h-4 w-4" />
                {t("newCase.upgradeNow")}
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {sourceCaseName && sourceResultUrl && (
        <Alert className="mb-6 border-primary/50 bg-primary/5">
          <Info className="h-4 w-4 text-primary" />
          <AlertTitle className="text-primary font-semibold">{t("newCase.creatingFromExisting")}</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            <p>{t("newCase.creatingFromExistingDesc", { caseName: sourceCaseName })}</p>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{sourceCaseName ? t("newCase.titleFromExisting") : t("newCase.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("newCase.name")}</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder={t("newCase.namePlaceholder")} disabled={!hasAccess} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">{t("newCase.description")}</Label>
            <Textarea id="desc" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={t("newCase.descriptionPlaceholder")} disabled={!hasAccess} />
          </div>
          <div className="space-y-2">
            <Label>{t("newCase.tags")}</Label>
            <TagInput value={tags} onChange={setTags} placeholder={t("newCase.tagsPlaceholder")} />
          </div>
          <div className="space-y-2">
            <Label>{t("newCase.color")}</Label>
            <ColorPicker value={color} onChange={setColor} />
          </div>
          <div className="pt-2">
            <Button type="submit" disabled={submitting || !hasAccess}>
              {submitting ? t("newCase.creating") : t("newCase.createCase")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
