import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";

interface DeleteCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  caseName: string;
}

export default function DeleteCaseModal({ isOpen, onClose, onConfirm, caseName }: DeleteCaseModalProps) {
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (confirmText.toLowerCase() !== "delete") {
      toast({
        title: "Invalid confirmation",
        description: "Please type 'delete' to confirm.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await onConfirm();
      setConfirmText("");
      onClose();
    } catch (error) {
      console.error("Error deleting case:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setConfirmText("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            Delete Case
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the case "{caseName}" and all associated data.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="confirm">
              Type <strong>delete</strong> to confirm
            </Label>
            <Input
              id="confirm"
              type="text"
              placeholder="Type 'delete' here"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="error" 
              disabled={loading || confirmText.toLowerCase() !== "delete"}
            >
              {loading ? "Deleting..." : "Delete Case"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}