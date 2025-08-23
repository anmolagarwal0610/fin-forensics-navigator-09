/* src/components/animations/EnhancedDataFlowAnimation.tsx */
import { motion } from "framer-motion";
import {
  FileText, Database, Receipt, Brain, TrendingUp, BarChart3, Zap,
} from "lucide-react";
import React from "react";

const EnhancedDataFlowAnimation: React.FC = () => {
  const inputDocuments = [
    { icon: FileText, label: "Bank Statements", delay: 0, y: -60 },
    { icon: Database, label: "Ledgers", delay: 0.2, y: -20 },
    { icon: Receipt, label: "Transactions", delay: 0.4, y: 20 },
    { icon: FileText, label: "Invoices", delay: 0.6, y: 60 },
    { icon: Database, label: "Records", delay: 0.8, y: 100 },
  ];

  // Path strings (used for both visible lines and dot motion)
  const leftPaths = Array.from({ length: 5 }).map((_, i) => {
    const yBase = 150 + i * 28;
    return `M ${120 + i * 6} ${yBase} Q ${220 + i * 12} ${yBase - 8} 340 190`;
  });
  const rightTopPath = `M 380 185 Q 440 168 500 165`;   // Insights (green)
  const rightBottomPath = `M 380 205 Q 440 222 500 225`; // Graphs (purple)

  return (
    <div className="relative w-full h-80 lg:h-96 flex items-center justify-center overflow-hidden bg-gradient-to-br from-muted/20 to-accent/5 rounded-2xl">
      {/* Grid */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px),linear-gradient(hsl(var(--border))_1px,transparent_1px)] bg-[size:20px_20px]" />
      </div>

      {/* Left items */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col space-y-4">
        {inputDocuments.map((doc, i) => (
          <motion.div key={i} className="flex items-center space-x-3"
            initial={{ x: -60, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
            transition={{ delay: doc.delay }}>
            <div className="w-10 h-10 bg-card border border-accent/40 rounded-lg flex items-center justify-center">
              <doc.icon className="w-5 h-5 text-accent" />
            </div>
            <span className="text-sm font-medium">{doc.label}</span>
          </motion.div>
        ))}
      </div>

      {/* --- SVG: visible lines + DOTS that follow those lines --- */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <linearGradient id="leftTrail" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.18" />
            <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.55" />
          </linearGradient>
          <marker id="arrowGreen" viewBox="0 0 10 10" refX="9" refY="5"
                  markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 Z" fill="hsl(var(--success))" />
          </marker>
          <marker id="arrowPurple" viewBox="0 0 10 10" refX="9" refY="5"
                  markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 Z" fill="hsl(var(--accent))" />
          </marker>
        </defs>

        {/* LEFT trails (with IDs) */}
        {leftPaths.map((d, i) => (
          <motion.path
            id={`lp-${i}`}
            key={`lp-${i}`}
            d={d}
            stroke="url(#leftTrail)"
            strokeWidth="4"
            fill="none"
            strokeDasharray="8 6"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.55 }}
            transition={{ duration: 0.9, delay: 0.6 + i * 0.12 }}
          />
        ))}

        {/* RIGHT arrows (with IDs) */}
        <motion.path id="rp-top" d={rightTopPath}
          stroke="hsl(var(--success))" strokeWidth="2" fill="none"
          markerEnd="url(#arrowGreen)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.8 }}
        />
        <motion.path id="rp-bottom" d={rightBottomPath}
          stroke="hsl(var(--accent))" strokeWidth="2" fill="none"
          markerEnd="url(#arrowPurple)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 2.0 }}
        />

        {/* DOT RUNNERS — follow the actual paths via animateMotion */}
        {/* Left → Brain (accent-blue dots) */}
        {leftPaths.map((_, i) => (
          <g key={`ldots-${i}`}>
            <circle r="2" fill="hsl(var(--accent))" opacity="0.75"
                    filter="url(#)"><animateMotion
              dur={`${2.8 + i * 0.2}s`} repeatCount="indefinite" begin={`${0.8 + i * 0.15}s`}>
              <mpath xlinkHref={`#lp-${i}`} href={`#lp-${i}`} />
            </animateMotion></circle>
            <circle r="2" fill="hsl(var(--accent))" opacity="0.6">
              <animateMotion dur={`${3.3 + i * 0.25}s`} repeatCount="indefinite" begin={`${1.6 + i * 0.2}s`}>
                <mpath xlinkHref={`#lp-${i}`} href={`#lp-${i}`} />
              </animateMotion>
            </circle>
          </g>
        ))}

        {/* Brain → Right (green for Insights, purple for Graphs) */}
        {/* Top path dots (green) */}
        <circle r="2" fill="hsl(var(--success))" opacity="0.85">
          <animateMotion dur="2.4s" repeatCount="indefinite" begin="2s">
            <mpath xlinkHref="#rp-top" href="#rp-top" />
          </animateMotion>
        </circle>
        <circle r="2" fill="hsl(var(--success))" opacity="0.6">
          <animateMotion dur="3s" repeatCount="indefinite" begin="2.8s">
            <mpath xlinkHref="#rp-top" href="#rp-top" />
          </animateMotion>
        </circle>

        {/* Bottom path dots (purple/accent) */}
        <circle r="2" fill="hsl(var(--accent))" opacity="0.85">
          <animateMotion dur="2.6s" repeatCount="indefinite" begin="2.2s">
            <mpath xlinkHref="#rp-bottom" href="#rp-bottom" />
          </animateMotion>
        </circle>
        <circle r="2" fill="hsl(var(--accent))" opacity="0.6">
          <animateMotion dur="3.2s" repeatCount="indefinite" begin="3s">
            <mpath xlinkHref="#rp-bottom" href="#rp-bottom" />
          </animateMotion>
        </circle>
      </svg>

      {/* CENTER brain */}
      <div className="relative z-10 flex items-center justify-center">
        <div className="relative w-44 h-44 bg-gradient-to-br from-primary via-accent to-success rounded-full flex items-center justify-center border-2 border-primary/30 shadow-[0_0_25px_rgba(58,134,255,0.3)]">
          <Brain className="w-[92%] h-[92%] text-primary-foreground" strokeWidth={0.3} />
          <div className="absolute left-[25%] top-1/2 -translate-y-1/2 text-[13px] font-semibold text-white/95">ML</div>
          <div className="absolute right-[25%] top-1/2 -translate-y-1/2 text-[13px] font-semibold text-white/95">AI</div>
        </div>

        {/* Engine badge (close to circle) */}
        <motion.div className="absolute -top-8 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}>
          <div className="text-[12px] font-medium text-slate-200/85 bg-slate-900/30 px-2.5 py-0.5 rounded-full border border-white/10 backdrop-blur-sm">
            Engine
          </div>
        </motion.div>
      </div>

      {/* RIGHT labels */}
      <div className="absolute right-10 top-1/2 -translate-y-1/2 flex flex-col space-y-14">
        <div className="flex flex-col items-center">
          <BarChart3 className="w-6 h-6 text-success mb-1" />
          <span className="text-sm font-semibold whitespace-nowrap">Actionable Insights</span>
        </div>
        <div className="flex flex-col items-center ml-6">
          <span className="text-sm font-semibold whitespace-nowrap mb-1">Graphs</span>
          <TrendingUp className="w-6 h-6 text-accent" />
        </div>
      </div>

      {/* Lightning – static white, smaller */}
      <div className="absolute left-1/2 -translate-x-1/2" style={{ top: "calc(50% + 118px)" }}>
        <div className="flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
      </div>
    </div>
  );
};

export default EnhancedDataFlowAnimation;
