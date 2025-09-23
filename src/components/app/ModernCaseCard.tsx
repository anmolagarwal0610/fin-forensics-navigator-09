
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatusBadge from "./StatusBadge";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { getCaseFiles } from "@/api/cases";

type Props = {
  id: string;
  name: string;
  color_hex: string;
  tags: string[];
  status: import("@/api/cases").CaseStatus;
  updated_at: string;
  index: number;
};

export default function ModernCaseCard(props: Props) {
  const navigate = useNavigate();
  
  // Fetch actual file count for this case
  const { data: files = [] } = useQuery({
    queryKey: ['case-files', props.id],
    queryFn: () => getCaseFiles(props.id),
  });

  const handleClick = () => {
    navigate(`/app/cases/${props.id}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: props.index * 0.05, duration: 0.3 }}
    >
      <Card
        className="cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all duration-200 group"
        onClick={handleClick}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: props.color_hex }}
                aria-hidden
              />
              {props.name}
            </CardTitle>
            <StatusBadge status={props.status} />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-1 mb-2">
            {props.tags?.map((t) => (
              <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {t}
              </span>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {files.length} file{files.length !== 1 ? 's' : ''}
            </div>
            <div className="text-xs text-muted-foreground">
              {new Date(props.updated_at).toLocaleDateString()}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
