
import { motion } from "framer-motion";
import { FileText, Database, Receipt, Brain, TrendingUp, Users, Shield, CheckCircle, Zap } from "lucide-react";

const EnhancedDataFlowAnimation = () => {
  // Input documents with staggered animation
  const inputDocuments = [
    { icon: FileText, label: "Bank Statements", delay: 0, y: -40 },
    { icon: Database, label: "Ledgers", delay: 0.3, y: 0 },
    { icon: Receipt, label: "Transactions", delay: 0.6, y: 40 },
  ];

  // AI Processing indicators
  const processingNodes = Array.from({ length: 8 }, (_, i) => ({
    angle: (i * 45) * (Math.PI / 180),
    delay: 1.2 + (i * 0.1),
  }));

  // Output insights
  const outputs = [
    { icon: Users, label: "Key Persons", delay: 2.8, y: -30, color: "text-accent" },
    { icon: TrendingUp, label: "Money Flow", delay: 3.1, y: 10, color: "text-success" },
    { icon: Shield, label: "Risk Scores", delay: 3.4, y: 50, color: "text-warning" },
  ];

  return (
    <div className="relative w-full h-80 flex items-center justify-center overflow-hidden bg-gradient-to-br from-muted/20 to-accent/5 rounded-2xl">
      {/* Background grid pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px),linear-gradient(hsl(var(--border))_1px,transparent_1px)] bg-[size:20px_20px]" />
      </div>

      {/* Input Stage - Left Side */}
      <div className="absolute left-8 lg:left-16">
        {inputDocuments.map((doc, index) => (
          <motion.div
            key={`input-${index}`}
            className="absolute flex items-center space-x-3"
            style={{ top: `calc(50% + ${doc.y}px)` }}
            initial={{ x: -100, opacity: 0, scale: 0.8 }}
            animate={{ 
              x: 0, 
              opacity: [0, 1, 0.9],
              scale: [0.8, 1.1, 1]
            }}
            transition={{ 
              duration: 1.2, 
              delay: doc.delay,
              ease: "easeOut"
            }}
          >
            <div className="w-12 h-12 bg-card border-2 border-accent/30 rounded-lg flex items-center justify-center shadow-elegant">
              <doc.icon className="w-6 h-6 text-accent" />
            </div>
            <div className="hidden lg:block">
              <div className="text-sm font-medium text-foreground">{doc.label}</div>
              <div className="text-xs text-muted-foreground">Processing...</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Data Flow Lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {/* Input to AI flow */}
        <motion.path
          d="M 120 160 Q 200 140 280 160"
          stroke="url(#flowGradient1)"
          strokeWidth="3"
          fill="none"
          strokeDasharray="8,4"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.7 }}
          transition={{ duration: 1.5, delay: 1.0 }}
        />
        <motion.path
          d="M 120 200 Q 200 180 280 160"
          stroke="url(#flowGradient1)"
          strokeWidth="2"
          fill="none"
          strokeDasharray="6,3"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.5 }}
          transition={{ duration: 1.5, delay: 1.2 }}
        />
        <motion.path
          d="M 120 240 Q 200 220 280 160"
          stroke="url(#flowGradient1)"
          strokeWidth="2"
          fill="none"
          strokeDasharray="6,3"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.5 }}
          transition={{ duration: 1.5, delay: 1.4 }}
        />

        {/* AI to Output flow */}
        <motion.path
          d="M 320 160 Q 400 140 480 130"
          stroke="url(#flowGradient2)"
          strokeWidth="3"
          fill="none"
          strokeDasharray="8,4"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.8 }}
          transition={{ duration: 1.2, delay: 2.5 }}
        />
        <motion.path
          d="M 320 160 Q 400 160 480 170"
          stroke="url(#flowGradient2)"
          strokeWidth="3"
          fill="none"
          strokeDasharray="8,4"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.8 }}
          transition={{ duration: 1.2, delay: 2.7 }}
        />
        <motion.path
          d="M 320 160 Q 400 180 480 210"
          stroke="url(#flowGradient2)"
          strokeWidth="3"
          fill="none"
          strokeDasharray="8,4"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.8 }}
          transition={{ duration: 1.2, delay: 2.9 }}
        />

        <defs>
          <linearGradient id="flowGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.2" />
            <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="flowGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.8" />
            <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity="0.6" />
          </linearGradient>
        </defs>
      </svg>

      {/* Central AI Brain - Enhanced */}
      <motion.div
        className="relative z-10"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.6 }}
      >
        <div className="relative w-24 h-24 bg-gradient-to-br from-primary via-accent to-success rounded-full flex items-center justify-center shadow-strong">
          <Brain className="w-12 h-12 text-primary-foreground" />
          
          {/* Neural network rings */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-accent/40"
            animate={{ rotate: 360, scale: [1, 1.1, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute inset-2 rounded-full border border-success/30"
            animate={{ rotate: -360, scale: [1, 0.9, 1] }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          />

          {/* Processing nodes around the brain */}
          {processingNodes.map((node, i) => (
            <motion.div
              key={i}
              className="absolute w-3 h-3 bg-warning rounded-full"
              style={{
                top: '50%',
                left: '50%',
                transformOrigin: '0 0',
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [0, 1, 0.8, 1],
                opacity: [0, 1, 0.7, 0],
                x: Math.cos(node.angle) * 50,
                y: Math.sin(node.angle) * 50,
              }}
              transition={{
                duration: 2,
                delay: node.delay,
                repeat: Infinity,
                repeatDelay: 1,
                ease: "easeInOut"
              }}
            />
          ))}

          {/* Central processing indicator */}
          <motion.div
            className="absolute inset-4 rounded-full bg-accent/20"
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{ 
              duration: 2, 
              delay: 2,
              repeat: Infinity,
              ease: "easeInOut" 
            }}
          />
        </div>

        {/* AI Processing Labels */}
        <motion.div
          className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs font-medium text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.0 }}
        >
          <div className="text-accent">AI Processing</div>
          <div className="text-muted-foreground">ML Models Active</div>
        </motion.div>
      </motion.div>

      {/* Output Stage - Right Side */}
      <div className="absolute right-8 lg:right-16">
        {outputs.map((output, index) => (
          <motion.div
            key={`output-${index}`}
            className="absolute flex items-center space-x-3"
            style={{ top: `calc(50% + ${output.y}px)` }}
            initial={{ x: 100, opacity: 0, scale: 0.8 }}
            animate={{ 
              x: 0, 
              opacity: [0, 1, 1],
              scale: [0.8, 1.1, 1]
            }}
            transition={{ 
              duration: 1.0, 
              delay: output.delay,
              ease: "easeOut"
            }}
          >
            <div className="hidden lg:block text-right">
              <div className="text-sm font-medium text-foreground">{output.label}</div>
              <div className="text-xs text-success">Ready</div>
            </div>
            <div className="w-12 h-12 bg-card border-2 border-success/40 rounded-lg flex items-center justify-center shadow-elegant">
              <output.icon className={`w-6 h-6 ${output.color}`} />
            </div>
            <motion.div
              className="absolute -right-2 -top-2 w-6 h-6 bg-success/20 rounded-full flex items-center justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: output.delay + 0.3 }}
            >
              <CheckCircle className="w-4 h-4 text-success" />
            </motion.div>
          </motion.div>
        ))}
      </div>

      {/* Success Indicator */}
      <motion.div
        className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 3.8 }}
      >
        <Zap className="w-4 h-4 text-warning" />
        <span className="text-sm font-medium text-success">Analysis Complete</span>
        <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
      </motion.div>
    </div>
  );
};

export default EnhancedDataFlowAnimation;
