import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FilePlus, FolderPlus, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AddFilesDialogProps {
  open: boolean;
  onClose: () => void;
  caseId: string;
  caseName: string;
  resultZipUrl: string;
}

export function AddFilesDialog({ open, onClose, caseId, caseName, resultZipUrl }: AddFilesDialogProps) {
  const navigate = useNavigate();

  const handleAddToExistingCase = () => {
    // Navigate to upload page with source result URL
    const params = new URLSearchParams({
      addFiles: 'true',
      sourceResultUrl: resultZipUrl
    });
    navigate(`/app/cases/${caseId}/upload?${params.toString()}`);
    onClose();
  };

  const handleCreateNewCase = () => {
    // Navigate to new case form with source parameters
    const params = new URLSearchParams({
      sourceCaseId: caseId,
      sourceCaseName: caseName,
      sourceResultUrl: resultZipUrl
    });
    navigate(`/app/cases/new?${params.toString()}`);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Add More Files</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Choose how you'd like to add more files to your analysis
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Option 1: Add to existing case */}
          <button
            onClick={handleAddToExistingCase}
            className="group relative flex items-start gap-4 p-4 rounded-lg border border-border bg-card hover:bg-accent/50 hover:border-primary/50 transition-all duration-200 text-left"
          >
            <div className="flex-shrink-0 p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <FilePlus className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                Add Files to This Case
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Add more documents to "{caseName}" and re-run the analysis. Previous results will be preserved.
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all self-center" />
          </button>

          {/* Option 2: Create new case */}
          <button
            onClick={handleCreateNewCase}
            className="group relative flex items-start gap-4 p-4 rounded-lg border border-border bg-card hover:bg-accent/50 hover:border-primary/50 transition-all duration-200 text-left"
          >
            <div className="flex-shrink-0 p-3 rounded-lg bg-secondary/50 text-secondary-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <FolderPlus className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                Add Files to New Case
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Create a new case with existing files plus new documents. Original case remains unchanged.
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all self-center" />
          </button>
        </div>

        <div className="flex justify-end pt-2 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
