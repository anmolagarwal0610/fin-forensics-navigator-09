
import { motion } from "framer-motion";
import { FileText, Upload, ExternalLink, MoreVertical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import StatusBadge from "./StatusBadge";
import { useNavigate } from "react-router-dom";

type Props = {
  id: string;
  name: string;
  color_hex: string;
  tags: string[];
  status: 'Active' | 'Processing' | 'Ready' | 'Archived';
  updated_at: string;
  index: number;
};

export default function ModernCaseCard(props: Props) {
  const navigate = useNavigate();

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: props.index * 0.03, duration: 0.3 }}
      className="w-full"
    >
      <Card className="w-full min-h-[140px] group hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-pointer rounded-2xl shadow-sm">
        <CardContent className="p-4 md:p-5 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span
                className="inline-block h-3 w-3 rounded-full border"
                style={{ backgroundColor: props.color_hex, borderColor: 'rgba(255,255,255,0.2)' }}
                aria-hidden
              />
              <h3 
                className="font-semibold text-base truncate cursor-pointer"
                onClick={() => navigate(`/app/cases/${props.id}`)}
                title={props.name}
              >
                {props.name}
              </h3>
            </div>
            <StatusBadge status={props.status} />
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1 mb-4 min-h-[24px]">
            {props.tags?.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[13px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium"
                title={tag}
              >
                {tag}
              </span>
            ))}
            {props.tags?.length > 3 && (
              <span className="text-[13px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                +{props.tags.length - 3}
              </span>
            )}
          </div>

          {/* File count and updated */}
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span>3 files</span>
            </div>
            <span>Updated {formatTimeAgo(props.updated_at)}</span>
          </div>

          {/* Progress bar for Processing status */}
          {props.status === "Processing" && (
            <div className="mb-4">
              <Progress value={65} className="h-1" />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between mt-auto">
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/app/cases/${props.id}/upload`);
                }}
                className="h-8 px-3 text-[13px] font-medium"
              >
                <Upload className="h-4 w-4 mr-1" />
                Upload
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/app/cases/${props.id}`);
                }}
                className="h-8 px-3 text-[13px] font-medium"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Open
              </Button>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Archive</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
