
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

  const truncatedName = props.name.length > 24 ? props.name.substring(0, 24) + "..." : props.name;

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: props.index * 0.03, duration: 0.3 }}
        className="w-full"
      >
        <Card className="h-full group hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer border-0 shadow-sm bg-card">
          <CardContent className="p-4 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div
                  className="w-3 h-3 rounded-full border flex-shrink-0"
                  style={{ backgroundColor: props.color_hex }}
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <h3 
                      className="font-semibold text-sm leading-tight cursor-pointer truncate"
                      onClick={() => navigate(`/app/cases/${props.id}`)}
                    >
                      {truncatedName}
                    </h3>
                  </TooltipTrigger>
                  {props.name.length > 24 && (
                    <TooltipContent>
                      <p>{props.name}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </div>
              <StatusBadge status={props.status} />
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1 mb-3 min-h-[20px]">
              {props.tags?.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium truncate max-w-[80px]"
                  title={tag}
                >
                  {tag}
                </span>
              ))}
              {props.tags?.length > 2 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium cursor-help">
                      +{props.tags.length - 2}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1">
                      {props.tags.slice(2).map((tag) => (
                        <div key={tag}>{tag}</div>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* File count and updated */}
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
              <div className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                <span>3 files</span>
              </div>
              <span>{formatTimeAgo(props.updated_at)}</span>
            </div>

            {/* Progress bar for Processing status */}
            {props.status === "Processing" && (
              <div className="mb-3">
                <Progress value={65} className="h-1" />
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between mt-auto pt-2">
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/app/cases/${props.id}/upload`);
                  }}
                  className="h-7 px-2 text-xs font-medium"
                >
                  <Upload className="h-3 w-3 mr-1" />
                  Upload
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/app/cases/${props.id}`);
                  }}
                  className="h-7 px-2 text-xs font-medium"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Open
                </Button>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 w-7 p-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-3 w-3" />
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
    </TooltipProvider>
  );
}
