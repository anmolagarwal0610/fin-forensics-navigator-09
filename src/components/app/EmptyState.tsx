import { motion } from "framer-motion";
import { Plus, Upload, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function EmptyState() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const steps = [
    {
      icon: Plus,
      titleKey: "common.createCase",
      descriptionKey: "common.startByCreating"
    },
    {
      icon: Upload,
      titleKey: "common.uploadFilesStep",
      descriptionKey: "common.addDocuments"
    },
    {
      icon: Clock,
      titleKey: "common.getResults",
      descriptionKey: "common.etaAnalysis"
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex items-center justify-center min-h-[400px]"
    >
      <Card className="max-w-2xl mx-auto text-center">
        <CardContent className="p-8">
          <h2 className="text-2xl font-semibold mb-2">{t('common.welcome')}</h2>
          <p className="text-muted-foreground mb-8">
            {t('common.getStartedDesc')}
          </p>

          {/* Steps */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.titleKey}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 + 0.2 }}
                className="flex flex-col items-center text-center"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <step.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">{t(step.titleKey)}</h3>
                <p className="text-sm text-muted-foreground">{t(step.descriptionKey)}</p>
              </motion.div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => navigate("/app/cases/new")}
              size="lg"
              className="min-w-[140px]"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('cases.newCase')}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/app/cases/new")}
              className="min-w-[140px]"
            >
              <Upload className="h-4 w-4 mr-2" />
              {t('common.uploadSampleData')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
