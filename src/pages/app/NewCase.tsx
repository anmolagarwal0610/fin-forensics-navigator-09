
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import TagInput from "@/components/app/TagInput";
import ColorPicker from "@/components/app/ColorPicker";
import { Button } from "@/components/ui/button";
import { createCase } from "@/api/cases";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export default function NewCase() {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [color, setColor] = useState("#3A86FF");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

  return (
    <form onSubmit={onSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>New Case</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Case name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Optional details" />
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
            <Button type="submit" disabled={submitting}>{submitting ? "Creating…" : "Create Case"}</Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
