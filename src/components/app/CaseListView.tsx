
import { FileText, Upload, ExternalLink, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import StatusBadge from "./StatusBadge";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCaseFiles } from "@/api/cases";
import type { CaseRecord } from "@/api/cases";

interface CaseListViewProps {
  cases: CaseRecord[];
}

export default function CaseListView({ cases }: CaseListViewProps) {
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

  // Hook to get file counts for all cases
  const useFileCounts = (caseIds: string[]) => {
    return useQuery({
      queryKey: ['case-file-counts', caseIds],
      queryFn: async () => {
        const fileCounts: Record<string, number> = {};
        
        await Promise.all(
          caseIds.map(async (caseId) => {
            try {
              const files = await getCaseFiles(caseId);
              fileCounts[caseId] = files.length;
            } catch (error) {
              console.error(`Error fetching files for case ${caseId}:`, error);
              fileCounts[caseId] = 0;
            }
          })
        );
        
        return fileCounts;
      },
      enabled: caseIds.length > 0,
    });
  };

  const { data: fileCounts = {} } = useFileCounts(cases.map(c => c.id));

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Case</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead>Files</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cases.map((caseItem) => (
            <TableRow
              key={caseItem.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => navigate(`/app/cases/${caseItem.id}`)}
            >
              <TableCell>
                <div className="flex items-center gap-3">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: caseItem.color_hex }}
                    aria-hidden
                  />
                  <span className="font-medium">{caseItem.name}</span>
                </div>
              </TableCell>
              <TableCell>
                <StatusBadge status={caseItem.status} />
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {caseItem.tags?.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                  {caseItem.tags?.length > 2 && (
                    <span className="text-xs text-muted-foreground">
                      +{caseItem.tags.length - 2}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  <span>{fileCounts[caseItem.id] || 0} files</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatTimeAgo(caseItem.updated_at)}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/app/cases/${caseItem.id}/upload`);
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/app/cases/${caseItem.id}`);
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Archive</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
