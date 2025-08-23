
import { motion } from "framer-motion";
import { FileText, Upload, Eye, CheckCircle } from "lucide-react";
import { useState } from "react";

interface ProcessStepProps {
  icon: React.ElementType;
  title: string;
  description: string;
  isActive: boolean;
  isCompleted: boolean;
  delay: number;
}

const ProcessStep = ({ icon: Icon, title, description, isActive, isCompleted, delay }: ProcessStepProps) => {
  return (
    <motion.div
      className="relative text-center"
      initial={{ y: 50, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, delay }}
      viewport={{ once: true }}
    >
      <motion.div
        className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 mx-auto relative ${
          isCompleted 
            ? 'bg-success shadow-elegant' 
            : isActive 
              ? 'bg-primary shadow-elegant' 
              : 'bg-muted'
        }`}
        animate={isActive ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {isCompleted ? (
          <CheckCircle className="w-10 h-10 text-success-foreground" />
        ) : (
          <Icon className={`w-10 h-10 ${
            isActive ? 'text-primary-foreground' : 'text-muted-foreground'
          }`} />
        )}
        
        {/* Animated Border */}
        {isActive && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-primary/50"
            animate={{ scale: [1, 1.2, 1], opacity: [1, 0, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </motion.div>
      
      <h3 className="text-xl font-semibold mb-3 text-foreground">{title}</h3>
      <p className="text-muted-foreground leading-relaxed max-w-xs mx-auto">
        {description}
      </p>
    </motion.div>
  );
};

const ProcessFlowAnimation = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const steps = [
    {
      icon: FileText,
      title: "Create Case",
      description: "Set up a new investigation case with relevant metadata and context."
    },
    {
      icon: Upload,
      title: "Upload Files",
      description: "Upload bank statements, ledgers, and financial documents for analysis."
    },
    {
      icon: Eye,
      title: "Get Results",
      description: "Review insights, persons of interest, and normalized activity scores."
    }
  ];

  // Auto-advance through steps
  React.useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => {
        const next = (prev + 1) % steps.length;
        if (prev === steps.length - 1) {
          setCompletedSteps([0, 1, 2]);
          setTimeout(() => {
            setCompletedSteps([]);
          }, 2000);
        }
        return next;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid md:grid-cols-3 gap-12 max-w-4xl mx-auto relative">
      {steps.map((step, index) => (
        <ProcessStep
          key={step.title}
          icon={step.icon}
          title={step.title}
          description={step.description}
          isActive={activeStep === index}
          isCompleted={completedSteps.includes(index)}
          delay={index * 0.2}
        />
      ))}

      {/* Connection Lines */}
      <svg className="absolute top-10 left-0 w-full h-20 pointer-events-none hidden md:block">
        <motion.line
          x1="25%"
          y1="50%"
          x2="41.5%"
          y2="50%"
          stroke="hsl(var(--border))"
          strokeWidth="2"
          strokeDasharray="5,5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
        />
        <motion.line
          x1="58.5%"
          y1="50%"
          x2="75%"
          y2="50%"
          stroke="hsl(var(--border))"
          strokeWidth="2"
          strokeDasharray="5,5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, delay: 0.7 }}
        />
      </svg>
    </div>
  );
};

export default ProcessFlowAnimation;
