import { useTranslation } from "react-i18next";
import { AlertTriangle, Clock, Ticket } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface CaseStatusMessageProps {
  status: 'Timeout' | 'Failed';
  onRetry?: () => void;
  caseId?: string;
  caseName?: string;
}

export default function CaseStatusMessage({ status, onRetry, caseId, caseName }: CaseStatusMessageProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  if (status === 'Timeout') {
    return (
      <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-orange-900 dark:text-orange-100">
                {t('caseStatus.analysisTimeout')}
              </h3>
              <p className="text-orange-700 dark:text-orange-200 mt-1">
                {t('caseStatus.timeoutDescription')}
              </p>
              <p className="text-sm text-orange-600 dark:text-orange-300 mt-2">
                <strong>{t('caseStatus.timeoutSuggestion')}</strong>
              </p>
              {onRetry && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3 border-orange-200 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300"
                  onClick={onRetry}
                >
                  {t('caseStatus.tryAgain')}
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
                {t('caseStatus.analysisFailed')}
              </h3>
              <p className="text-red-700 dark:text-red-200 mt-1">
                {t('caseStatus.failedDescription')}
              </p>
              <div className="flex gap-2 mt-3">
                {onRetry && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-red-200 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300"
                    onClick={onRetry}
                  >
                    {t('caseStatus.retryAnalysis')}
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-red-200 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300"
                  onClick={() => navigate('/app/support/raise-ticket')}
                >
                  <Ticket className="h-4 w-4 mr-2" />
                  {t('caseStatus.raiseTicket')}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}