
import { motion } from "framer-motion";
import { FileText, Database, Brain, TrendingUp, Users, Shield } from "lucide-react";

const DataFlowAnimation = () => {
  const documents = [
    { icon: FileText, delay: 0, x: -100, y: 50 },
    { icon: Database, delay: 0.2, x: -120, y: -30 },
    { icon: FileText, delay: 0.4, x: -80, y: 80 },
  ];

  const outputs = [
    { icon: TrendingUp, delay: 1.8, x: 100, y: -20 },
    { icon: Users, delay: 2.0, x: 120, y: 40 },
    { icon: Shield, delay: 2.2, x: 80, y: -60 },
  ];

  return (
    <div className="relative w-full h-64 flex items-center justify-center overflow-hidden">
      {/* Input Documents */}
      {documents.map((doc, index) => (
        <motion.div
          key={`input-${index}`}
          className="absolute"
          initial={{ x: doc.x - 50, y: doc.y, opacity: 0, scale: 0.8 }}
          animate={{ 
            x: -20, 
            y: doc.y * 0.3, 
            opacity: [0, 1, 0.8],
            scale: [0.8, 1, 0.9]
          }}
          transition={{ 
            duration: 1.5, 
            delay: doc.delay,
            ease: "easeOut"
          }}
        >
          <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center border border-accent/30">
            <doc.icon className="w-4 h-4 text-accent" />
          </div>
        </motion.div>
      ))}

      {/* Central Brain/AI Processing Unit */}
      <motion.div
        className="relative"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.6 }}
      >
        <div className="w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center relative overflow-hidden">
          <Brain className="w-10 h-10 text-primary-foreground" />
          
          {/* Neural Network Connections */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-accent/30"
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute inset-2 rounded-full border border-accent/20"
            animate={{ rotate: -360 }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          />
          
          {/* Processing Dots */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-accent rounded-full"
              style={{
                top: '50%',
                left: '50%',
                transformOrigin: '0 0',
              }}
              animate={{
                rotate: i * 60,
                scale: [0, 1, 0],
              }}
              transition={{
                duration: 2,
                delay: 1 + i * 0.1,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>
      </motion.div>

      {/* Output Insights */}
      {outputs.map((output, index) => (
        <motion.div
          key={`output-${index}`}
          className="absolute"
          initial={{ x: 20, y: output.y * 0.3, opacity: 0, scale: 0.8 }}
          animate={{ 
            x: output.x + 50, 
            y: output.y, 
            opacity: [0, 1, 1],
            scale: [0.8, 1.1, 1]
          }}
          transition={{ 
            duration: 1.2, 
            delay: output.delay,
            ease: "easeOut"
          }}
        >
          <div className="w-10 h-10 bg-success/20 rounded-lg flex items-center justify-center border border-success/30 shadow-elegant">
            <output.icon className="w-5 h-5 text-success" />
          </div>
        </motion.div>
      ))}

      {/* Connection Lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <motion.path
          d="M 100 130 Q 200 130 300 130"
          stroke="url(#gradient)"
          strokeWidth="2"
          fill="none"
          strokeDasharray="5,5"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.6 }}
          transition={{ duration: 2, delay: 1.2 }}
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.2" />
            <stop offset="50%" stopColor="hsl(var(--accent))" stopOpacity="0.8" />
            <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity="0.2" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

export default DataFlowAnimation;
