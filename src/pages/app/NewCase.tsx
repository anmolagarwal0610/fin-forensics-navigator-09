import { useState, useEffect } from "react";
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
        
        // If we have a source result URL, navigate to upload with add files mode
        if (sourceResultUrl) {
          const params = new URLSearchParams({
            addFiles: 'true',
            sourceResultUrl: sourceResultUrl
          });
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
    return <div className="p-6">Loading...</div>;
  }

  return (
    <form onSubmit={onSubmit}>
      {!hasAccess && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Subscription Limit Reached</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              You have {pagesRemaining} pages remaining. Upgrade your plan to continue creating cases.
            </span>
            <Button asChild size="sm" className="ml-4">
              <Link to="/pricing">
                <Zap className="mr-2 h-4 w-4" />
                Upgrade Now
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {sourceCaseName && sourceResultUrl && (
        <Alert className="mb-6 border-primary/50 bg-primary/5">
          <Info className="h-4 w-4 text-primary" />
          <AlertTitle className="text-primary font-semibold">Creating from Existing Case</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            <p>This new case will include files from "{sourceCaseName}". After creating the case, you can add or remove files before running the analysis.</p>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{sourceCaseName ? "New Case from Existing" : "New Case"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Case name" disabled={!hasAccess} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Optional details" disabled={!hasAccess} />
          </div>
          <div className="space-y-2">
            <Label>Tags</Label>
            <TagInput value={tags} onChange={setTags} placeholder="Type a tag and press Enter" />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <ColorPicker value={color} onChange={setColor} />
          </div>
          <div className="pt-2">
            <Button type="submit" disabled={submitting || !hasAccess}>
              {submitting ? "Creating…" : "Create Case"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
