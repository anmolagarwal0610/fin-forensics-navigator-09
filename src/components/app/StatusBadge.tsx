
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

export default function StatusBadge({ status }: { status: 'Active' | 'Processing' | 'Ready' | 'Archived' }) {
  const map: Record<string, string> = {
    Active: "bg-primary/10 text-primary",
    Processing: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
    Ready: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    Archived: "bg-muted/60 text-muted-foreground",
  };

  return (
    <Badge className={`${map[status] ?? ""} flex items-center gap-1.5`}>
      {status === "Processing" && (
        <motion.span
          className="w-1.5 h-1.5 bg-current rounded-full"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ 
            duration: 1.2, 
            repeat: Infinity, 
            ease: "easeInOut"
          }}
        />
      )}
      {status}
    </Badge>
  );
}
