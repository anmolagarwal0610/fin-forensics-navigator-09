
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

import { type CaseStatus } from "@/api/cases";

export default function StatusBadge({ status }: { status: CaseStatus }) {
  const map: Record<string, string> = {
    Active: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    Processing: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
    Review: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
    Ready: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    Archived: "bg-muted/60 text-muted-foreground",
    Failed: "bg-red-500/15 text-red-600 dark:text-red-400",
    Timeout: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
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
