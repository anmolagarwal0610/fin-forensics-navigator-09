
import { Badge } from "@/components/ui/badge";

export default function StatusBadge({ status }: { status: 'Active' | 'Processing' | 'Ready' | 'Archived' }) {
  const map: Record<string, string> = {
    Active: "bg-primary/10 text-primary",
    Processing: "bg-muted text-foreground",
    Ready: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    Archived: "bg-muted/60 text-muted-foreground",
  };
  return <Badge className={map[status] ?? ""}>{status}</Badge>;
}
