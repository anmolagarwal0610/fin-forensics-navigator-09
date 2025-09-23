import { AlertTriangle, Clock, FileX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface CaseStatusMessageProps {
  status: 'Timeout' | 'Failed';
  onRetry?: () => void;
  onContactSupport?: () => void;
}

export default function CaseStatusMessage({ status, onRetry, onContactSupport }: CaseStatusMessageProps) {
  if (status === 'Timeout') {
    return (
      <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-orange-900 dark:text-orange-100">
                Analysis Timeout
              </h3>
              <p className="text-orange-700 dark:text-orange-200 mt-1">
                The analysis took longer than expected to complete. This often happens with large files or many documents.
              </p>
              <p className="text-sm text-orange-600 dark:text-orange-300 mt-2">
                <strong>Suggestion:</strong> Try reducing the number of files uploaded or ensure files are reasonably sized.
              </p>
              {onRetry && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3 border-orange-200 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300"
                  onClick={onRetry}
                >
                  Try Again
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === 'Failed') {
    return (
      <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 dark:text-red-100">
                Analysis Failed
              </h3>
              <p className="text-red-700 dark:text-red-200 mt-1">
                An error occurred during the analysis process. Our team has been notified.
              </p>
              <div className="flex gap-2 mt-3">
                {onRetry && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-red-200 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300"
                    onClick={onRetry}
                  >
                    Retry Analysis
                  </Button>
                )}
                {onContactSupport && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-red-200 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300"
                    onClick={onContactSupport}
                  >
                    <FileX className="h-4 w-4 mr-2" />
                    Report Issue
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}