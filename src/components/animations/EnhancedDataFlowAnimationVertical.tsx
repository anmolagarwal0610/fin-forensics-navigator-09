import { motion } from "framer-motion";
import {
  FileText, Database, Receipt, Brain, TrendingUp, BarChart3, Zap,
} from "lucide-react";
import React from "react";

const EnhancedDataFlowAnimationVertical: React.FC = () => {
  const inputDocuments = [
    { icon: FileText, label: "Bank Statements", delay: 0 },
    { icon: Database, label: "Ledgers", delay: 0.2 },
    { icon: Receipt, label: "Transactions", delay: 0.4 },
    { icon: FileText, label: "Invoices", delay: 0.6 },
    { icon: Database, label: "Records", delay: 0.8 },
  ];

  // Vertical path strings
  const verticalInputPath = "M 200 80 Q 200 130 200 180";
  const verticalOutputPathGreen = "M 200 220 Q 200 260 200 300";
  const verticalOutputPathPurple = "M 200 220 Q 200 340 200 380";

  return (
    <div className="relative w-full h-[32rem] flex flex-col items-center overflow-hidden bg-gradient-to-b from-muted/20 to-accent/5 rounded-2xl px-4">
      {/* Grid Background */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px),linear-gradient(hsl(var(--border))_1px,transparent_1px)] bg-[size:20px_20px]" />
      </div>

      {/* Top Input Documents */}
      <div className="flex flex-col items-center space-y-3 mt-4 z-10">
        {inputDocuments.map((doc, i) => (
          <motion.div key={i} className="flex items-center space-x-3"
            initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            transition={{ delay: doc.delay }}>
            <div className="w-8 h-8 bg-card border border-accent/40 rounded-lg flex items-center justify-center">
              <doc.icon className="w-4 h-4 text-accent" />
            </div>
            <span className="text-xs font-medium text-center leading-tight">{doc.label}</span>
          </motion.div>
        ))}
      </div>

      {/* SVG for vertical lines and dots */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <linearGradient id="verticalInputTrail" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.18" />
            <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.55" />
          </linearGradient>
          <marker id="arrowGreenVertical" viewBox="0 0 10 10" refX="9" refY="5"
                  markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 Z" fill="hsl(var(--success))" />
          </marker>
          <marker id="arrowPurpleVertical" viewBox="0 0 10 10" refX="9" refY="5"
                  markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 Z" fill="hsl(var(--accent))" />
          </marker>
        </defs>

        {/* Input to brain trail */}
        <motion.path
          id="vp-top-in"
          d={verticalInputPath}
          stroke="url(#verticalInputTrail)"
          strokeWidth="2.5"
          fill="none"
          strokeDasharray="8 6"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.55 }}
          transition={{ duration: 0.9, delay: 0.6 }}
        />

        {/* Brain to outputs */}
        <motion.path 
          id="vp-bottom-out-green" 
          d={verticalOutputPathGreen}
          stroke="hsl(var(--success))" 
          strokeWidth="2" 
          fill="none"
          markerEnd="url(#arrowGreenVertical)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.8 }}
        />
        <motion.path 
          id="vp-bottom-out-purple" 
          d={verticalOutputPathPurple}
          stroke="hsl(var(--accent))" 
          strokeWidth="2" 
          fill="none"
          markerEnd="url(#arrowPurpleVertical)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 2.0 }}
        />

        {/* Moving dots on input path */}
        <circle r="2" fill="hsl(var(--accent))" opacity="0.75">
          <animateMotion dur="2.6s" repeatCount="indefinite" begin="0.6s">
            <mpath href="#vp-top-in" />
          </animateMotion>
        </circle>
        <circle r="2" fill="hsl(var(--accent))" opacity="0.6">
          <animateMotion dur="3.2s" repeatCount="indefinite" begin="1.3s">
            <mpath href="#vp-top-in" />
          </animateMotion>
        </circle>

        {/* Moving dots on green output path */}
        <circle r="2" fill="hsl(var(--success))" opacity="0.85">
          <animateMotion dur="2.4s" repeatCount="indefinite" begin="2.0s">
            <mpath href="#vp-bottom-out-green" />
          </animateMotion>
        </circle>
        <circle r="2" fill="hsl(var(--success))" opacity="0.6">
          <animateMotion dur="3.0s" repeatCount="indefinite" begin="2.8s">
            <mpath href="#vp-bottom-out-green" />
          </animateMotion>
        </circle>

        {/* Moving dots on purple output path */}
        <circle r="2" fill="hsl(var(--accent))" opacity="0.85">
          <animateMotion dur="2.6s" repeatCount="indefinite" begin="2.2s">
            <mpath href="#vp-bottom-out-purple" />
          </animateMotion>
        </circle>
        <circle r="2" fill="hsl(var(--accent))" opacity="0.6">
          <animateMotion dur="3.2s" repeatCount="indefinite" begin="3.0s">
            <mpath href="#vp-bottom-out-purple" />
          </animateMotion>
        </circle>
      </svg>

      {/* Central Brain */}
      <div className="relative z-10 flex items-center justify-center mt-8">
        <div className="relative w-32 h-32 bg-gradient-to-br from-primary via-accent to-success rounded-full flex items-center justify-center border-2 border-primary/30 shadow-[0_0_25px_rgba(58,134,255,0.3)]">
          <Brain className="w-[92%] h-[92%] text-primary-foreground" strokeWidth={0.3} />
          <div className="absolute left-[25%] top-1/2 -translate-y-1/2 text-xs font-semibold text-white/95">ML</div>
          <div className="absolute right-[25%] top-1/2 -translate-y-1/2 text-xs font-semibold text-white/95">AI</div>
        </div>

        {/* Engine badge */}
        <motion.div className="absolute -top-7 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}>
          <div className="text-xs font-medium text-slate-200/85 bg-slate-900/30 px-2 py-0.5 rounded-full border border-white/10 backdrop-blur-sm">
            Engine
          </div>
        </motion.div>
      </div>

      {/* Bottom Output Labels */}
      <div className="flex flex-col items-center space-y-6 mt-8 z-10">
        <div className="flex flex-col items-center">
          <BarChart3 className="w-5 h-5 text-success mb-1" />
          <span className="text-sm font-semibold text-center leading-tight">Actionable Insights</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-sm font-semibold text-center leading-tight mb-1">Graphs</span>
          <TrendingUp className="w-5 h-5 text-accent" />
        </div>
      </div>

      {/* Lightning symbol at bottom */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
        <Zap className="w-4 h-4 text-white" />
      </div>
    </div>
  );
};

export default EnhancedDataFlowAnimationVertical;