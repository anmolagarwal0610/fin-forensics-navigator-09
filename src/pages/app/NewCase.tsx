import { useState } from "react";
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
import { useNavigate, Link } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { AlertCircle, Zap } from "lucide-react";

export default function NewCase() {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [color, setColor] = useState("#3A86FF");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { hasAccess, pagesRemaining, loading: subLoading } = useSubscription();

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
        navigate(`/app/cases/${c.id}/upload`);
      })
      .catch((e) => {
        console.error(e);
        toast({ title: "Failed to create case" });
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

      <Card>
        <CardHeader>
          <CardTitle>New Case</CardTitle>
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
