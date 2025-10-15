/* src/components/animations/EnhancedDataFlowAnimationHorizontal.tsx */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  FileText,
  Database,
  Receipt,
  Brain,
  TrendingUp,
  BarChart3,
  Zap,
} from "lucide-react";

const EnhancedDataFlowAnimationHorizontal: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();

  // ---------- Normalized SVG space ----------
  const VB_W = 1000;
  const VB_H = 520;

  // Brain center + radius (for path math; the visible circle scales via CSS)
  const cx = 520;
  const cy = VB_H / 2;
  const brainR = 95;

  // Columns & control points (viewBox units)
  const LEFT_X = 140;
  const RIGHT_X = 775; // <— arrow tips end here
  const L_CTRL_X = 300;
  const R_CTRL_X = 700;

  // *** New: CSS position for right labels so they begin AFTER the arrow tip ***
  const rightLabelCssLeft = `${(RIGHT_X / VB_W) * 100}%`;
  const RIGHT_LABEL_GAP_PX = 12; // space between arrow tip and labels

  // Distinct entry/exit angles (keep multiple touch points on the circle)
  const leftAngles = useMemo(() => [-0.5, -0.2, 0.05, 0.32, 0.6], []);
  const rightAngles = useMemo(() => ({ top: -0.12, bottom: 0.18 }), []);

  const ptOnCircle = (a: number) => ({
    x: cx + brainR * Math.cos(a),
    y: cy + brainR * Math.sin(a),
  });

  // Left list Y anchors (roughly centered vertically)
  const leftListY = useMemo(() => {
    const start = cy - 120;
    const gap = 48;
    return [0, 1, 2, 3, 4].map((i) => start + i * gap);
  }, [cy]);

  const inputDocuments = [
    { icon: FileText, label: "Bank Statements", delay: 0.0 },
    { icon: Database, label: "Ledgers", delay: 0.15 },
    { icon: Receipt, label: "Transactions", delay: 0.3 },
    { icon: FileText, label: "Invoices", delay: 0.45 },
    { icon: Database, label: "Records", delay: 0.6 },
  ];

  // Build left curves
  type PathInfo = { id: string; d: string };
  const leftPaths: PathInfo[] = useMemo(() => {
    return leftAngles.map((ang, i) => {
      const end = ptOnCircle(ang);
      const ys = leftListY[i];
      const d = `M ${LEFT_X} ${ys} Q ${L_CTRL_X} ${
        ys + (end.y - ys) * 0.25
      } ${end.x} ${end.y}`;
      return { id: `lp-${i}`, d };
    });
  }, [leftAngles, leftListY]);

  // Build right curves (brain → right)
  const rightPaths: PathInfo[] = useMemo(() => {
    const top = ptOnCircle(rightAngles.top);
    const bot = ptOnCircle(rightAngles.bottom);
    return [
      {
        id: "rp-top",
        d: `M ${top.x} ${top.y} Q ${R_CTRL_X} ${top.y - 25} ${RIGHT_X} ${
          top.y - 20
        }`,
      },
      {
        id: "rp-bottom",
        d: `M ${bot.x} ${bot.y} Q ${R_CTRL_X} ${bot.y + 25} ${RIGHT_X} ${
          bot.y + 20
        }`,
      },
    ];
  }, [rightAngles]);

  // Durations proportional to path lengths (keeps speed natural)
  const leftRefs = useRef<(SVGPathElement | null)[]>([]);
  const rightRefs = useRef<Record<string, SVGPathElement | null>>({});
  const [leftDur, setLeftDur] = useState<number[]>([]);
  const [rightDur, setRightDur] = useState<Record<string, number>>({});

  useEffect(() => {
    const SPEED = 200; // viewBox units per second
    const l = leftRefs.current.map((p) => (p ? p.getTotalLength() : 500));
    setLeftDur(l.map((len) => Math.max(1.8, len / SPEED)));
    const r: Record<string, number> = {};
    Object.entries(rightRefs.current).forEach(([k, el]) => {
      const len = el ? el.getTotalLength() : 400;
      r[k] = Math.max(1.6, len / SPEED);
    });
    setRightDur(r);
  }, [leftPaths, rightPaths]);

  // Scalable sizes via clamp()
  const cls = {
    container:
      "relative w-full overflow-hidden rounded-2xl bg-gradient-to-br from-muted/20 to-accent/5",
    height: "h-[clamp(18rem,40vw,26rem)]",
    leftItemText:
      "text-[clamp(0.8rem,0.95vw,0.95rem)] font-medium",
    rightItemText:
      "text-[clamp(0.8rem,0.95vw,0.95rem)] font-semibold leading-tight",
    iconBox:
      "flex items-center justify-center rounded-lg bg-card border border-accent/40",
    iconBoxSize:
      "w-[clamp(2.25rem,2.8vw,2.6rem)] h-[clamp(2.25rem,2.8vw,2.6rem)]",
    iconSize:
      "w-[clamp(1.0rem,1.4vw,1.2rem)] h-[clamp(1.0rem,1.4vw,1.2rem)]",
  };

  return (
    <div className={`${cls.container} ${cls.height} flex items-center justify-center`}>
      {/* Grid */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px),linear-gradient(hsl(var(--border))_1px,transparent_1px)] bg-[size:20px_20px]" />
      </div>

      {/* Left items */}
      <div className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 flex flex-col gap-[clamp(0.5rem,1.5vh,1.1rem)]">
        {inputDocuments.map((doc, i) => (
          <motion.div
            key={i}
            className="flex items-center gap-3"
            initial={{ x: -60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: doc.delay }}
          >
            <div className={`${cls.iconBox} ${cls.iconBoxSize}`}>
              <doc.icon className={`${cls.iconSize} text-accent`} />
            </div>
            <span className={cls.leftItemText}>{doc.label}</span>
          </motion.div>
        ))}
      </div>

      {/* SVG */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="leftTrail" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.18" />
            <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.55" />
          </linearGradient>
          <marker
            id="arrowGreen"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0 0 L10 5 L0 10 Z" fill="hsl(var(--success))" />
          </marker>
          <marker
            id="arrowPurple"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0 0 L10 5 L0 10 Z" fill="hsl(var(--accent))" />
          </marker>
        </defs>

        {/* LEFT trails */}
        {leftPaths.map((p, i) => (
          <motion.path
            ref={(el) => (leftRefs.current[i] = el)}
            id={p.id}
            key={p.id}
            d={p.d}
            stroke="url(#leftTrail)"
            // strokeWidth={3} // input line thickness
            strokeWidth={Math.max(3, 1000 / VB_W)}
            fill="none"
            strokeDasharray="8 6"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.55 }}
            transition={{ duration: 0.9, delay: 0.6 + i * 0.12 }}
          />
        ))}

        {/* RIGHT arrows */}
        {rightPaths.map((p, i) => (
          <motion.path
            ref={(el) => (rightRefs.current[p.id] = el)}
            id={p.id}
            key={p.id}
            d={p.d}
            stroke={i === 0 ? "hsl(var(--success))" : "hsl(var(--accent))"}
            strokeWidth={2}
            fill="none"
            markerEnd={`url(#${i === 0 ? "arrowGreen" : "arrowPurple"})`}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.8 + i * 0.2 }}
          />
        ))}

        {/* Animated dots */}
        {!prefersReducedMotion && (
          <>
            {leftPaths.map((p, i) => (
              <g key={`ldots-${i}`}>
                <circle r="4" fill="hsl(var(--accent))">
                  <animate 
                    attributeName="opacity" 
                    from="0" 
                    to="0.75" 
                    begin={`${(0.8 + i * 0.15).toFixed(2)}s`}
                    dur="0.3s" 
                    fill="freeze"
                  />
                  <animateMotion
                    dur={`${(leftDur[i] ?? 2.8).toFixed(2)}s`}
                    repeatCount="indefinite"
                    begin={`${(0.8 + i * 0.15).toFixed(2)}s`}
                  >
                    <mpath href={`#${p.id}`} />
                  </animateMotion>
                </circle>
                <circle r="4" fill="hsl(var(--accent))">
                  <animate 
                    attributeName="opacity" 
                    from="0" 
                    to="0.6" 
                    begin={`${(1.6 + i * 0.2).toFixed(2)}s`}
                    dur="0.3s" 
                    fill="freeze"
                  />
                  <animateMotion
                    dur={`${(((leftDur[i] ?? 3.3) * 1.15)).toFixed(2)}s`}
                    repeatCount="indefinite"
                    begin={`${(1.6 + i * 0.2).toFixed(2)}s`}
                  >
                    <mpath href={`#${p.id}`} />
                  </animateMotion>
                </circle>
              </g>
            ))}

            <circle r="4" fill="hsl(var(--success))">
              <animate 
                attributeName="opacity" 
                from="0" 
                to="0.85" 
                begin="2s"
                dur="0.3s" 
                fill="freeze"
              />
              <animateMotion
                dur={`${(rightDur["rp-top"] ?? 2.4).toFixed(2)}s`}
                repeatCount="indefinite"
                begin="2s"
              >
                <mpath href="#rp-top" />
              </animateMotion>
            </circle>
            <circle r="4" fill="hsl(var(--success))">
              <animate 
                attributeName="opacity" 
                from="0" 
                to="0.6" 
                begin="2.8s"
                dur="0.3s" 
                fill="freeze"
              />
              <animateMotion
                dur={`${(((rightDur["rp-top"] ?? 2.4) * 1.25)).toFixed(2)}s`}
                repeatCount="indefinite"
                begin="2.8s"
              >
                <mpath href="#rp-top" />
              </animateMotion>
            </circle>

            <circle r="4" fill="hsl(var(--accent))">
              <animate 
                attributeName="opacity" 
                from="0" 
                to="0.85" 
                begin="2.2s"
                dur="0.3s" 
                fill="freeze"
              />
              <animateMotion
                dur={`${(rightDur["rp-bottom"] ?? 2.6).toFixed(2)}s`}
                repeatCount="indefinite"
                begin="2.2s"
              >
                <mpath href="#rp-bottom" />
              </animateMotion>
            </circle>
            <circle r="4" fill="hsl(var(--accent))">
              <animate 
                attributeName="opacity" 
                from="0" 
                to="0.6" 
                begin="3s"
                dur="0.3s" 
                fill="freeze"
              />
              <animateMotion
                dur={`${(((rightDur["rp-bottom"] ?? 2.6) * 1.23)).toFixed(2)}s`}
                repeatCount="indefinite"
                begin="3s"
              >
                <mpath href="#rp-bottom" />
              </animateMotion>
            </circle>
          </>
        )}
      </svg>

      {/* Brain circle */}
      <div className="relative z-10 flex items-center justify-center">
        <div
          className="relative rounded-full flex items-center justify-center border-2 border-primary/30 shadow-[0_0_25px_rgba(58,134,255,0.3)] bg-gradient-to-br from-primary via-accent to-success"
          style={{
            width: "clamp(9.5rem, 18vw, 11.5rem)",
            height: "clamp(9.5rem, 18vw, 11.5rem)",
          }}
        >
          <Brain
            className="w-[92%] h-[92%] text-primary-foreground"
            strokeWidth={0.3}
          />
          <div className="absolute left-[25%] top-1/2 -translate-y-1/2 text-[clamp(0.72rem,0.9vw,0.82rem)] font-semibold text-white/95">
            ML
          </div>
          <div className="absolute right-[25%] top-1/2 -translate-y-1/2 text-[clamp(0.72rem,0.9vw,0.82rem)] font-semibold text-white/95">
            AI
          </div>
        </div>

        {/* Engine badge (perfectly centered over the circle) */}
        <motion.div
          className="absolute -top-8 inset-x-0 flex justify-center"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
        >
          <div className="text-[12px] sm:text-[13px] font-medium text-slate-200/85 bg-slate-900/30 px-2.5 py-0.5 rounded-full border border-white/10 backdrop-blur-sm">
            Engine
          </div>
        </motion.div>

      </div>

      {/* RIGHT labels – begin AFTER the arrow tip */}
      <div
        className="absolute top-1/2 -translate-y-1/2 flex flex-col gap-[clamp(1.5rem,5vh,3.5rem)]"
        style={{ left: `calc(${rightLabelCssLeft} + ${RIGHT_LABEL_GAP_PX}px)` }}
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="w-[clamp(1.1rem,1.6vw,1.4rem)] h-[clamp(1.1rem,1.6vw,1.4rem)] text-success" />
        {/* Force two lines for better fit */}
          <span className={`${cls.rightItemText}`}>Actionable<br />Insights</span>
        </div>

        <div className="flex items-center gap-2 ml-[clamp(0.1rem,0.5vw,0.4rem)]">
          <TrendingUp className="w-[clamp(1.1rem,1.6vw,1.4rem)] h-[clamp(1.1rem,1.6vw,1.4rem)] text-accent" />
          <span className={cls.rightItemText}>Graphs</span>
        </div>
      </div>

      {/* Lightning */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{ top: "calc(50% + min(9.5rem,18vw) * 0.70)" }}
      >
        <Zap className="w-4 h-4 text-foreground" />
      </div>
    </div>
  );
};

export default EnhancedDataFlowAnimationHorizontal;
