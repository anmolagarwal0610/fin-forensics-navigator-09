
import { motion } from "framer-motion";
import { Plus, Upload, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function EmptyState() {
  const navigate = useNavigate();

  const steps = [
    {
      icon: Plus,
      title: "Create Case",
      description: "Start by creating a new case"
    },
    {
      icon: Upload,
      title: "Upload Files",
      description: "Add your documents and data"
    },
    {
      icon: Clock,
      title: "Get Results",
      description: "ETA ~24 hours for analysis"
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
          <h2 className="text-2xl font-semibold mb-2">Welcome to FinNavigator</h2>
          <p className="text-muted-foreground mb-8">
            Get started by creating your first case and uploading documents for analysis.
          </p>

          {/* Steps */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 + 0.2 }}
                className="flex flex-col items-center text-center"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <step.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
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
              New Case
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/app/cases/new")}
              className="min-w-[140px]"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Sample Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
