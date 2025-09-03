import React, { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FileText, Database, Receipt, Brain, TrendingUp, BarChart3, Zap } from "lucide-react";

/* ---------------- geometry helpers ---------------- */
type Pt = { x: number; y: number };
const clamp = (min: number, v: number, max: number) => Math.max(min, Math.min(max, v));

const centerTop = (host: HTMLElement, el?: HTMLElement | null): Pt => {
  const r = el?.getBoundingClientRect(); const hc = host.getBoundingClientRect();
  if (!r) return { x: host.clientWidth / 2, y: 0 };
  return { x: r.left - hc.left + r.width / 2, y: r.top - hc.top };
};
const centerBottom = (host: HTMLElement, el?: HTMLElement | null): Pt => {
  const r = el?.getBoundingClientRect(); const hc = host.getBoundingClientRect();
  if (!r) return { x: host.clientWidth / 2, y: 0 };
  return { x: r.left - hc.left + r.width / 2, y: r.bottom - hc.top };
};

/** gentle curve from input tile to brain (control kept under tile so labels aren’t crossed) */
const inputCurve = (from: Pt, to: Pt) => {
  const dy = Math.max(24, to.y - from.y);
  const bend = clamp(40, dy * 0.45, 90);
  const cx = from.x; const cy = from.y + bend;
  return `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`;
};
/** gentle downward curve from brain to output label */
const outputCurve = (from: Pt, to: Pt) => {
  const controlY = from.y + (to.y - from.y) * 0.6;
  const controlX = (from.x + to.x) / 2;
  return `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`;
};

const EnhancedDataFlowAnimationVertical: React.FC = () => {
  const uid = useId(); // unique ids for markers when component repeats
  const containerRef = useRef<HTMLDivElement>(null);

  const rowInputsRef = useRef<HTMLDivElement>(null);
  const rowBrainRef  = useRef<HTMLDivElement>(null);
  const rowOutputsRef= useRef<HTMLDivElement>(null);

  const bankRef = useRef<HTMLDivElement>(null);
  const ledgRef = useRef<HTMLDivElement>(null);
  const txnRef  = useRef<HTMLDivElement>(null);
  const invRef  = useRef<HTMLDivElement>(null);

  const brainRef    = useRef<HTMLDivElement>(null);   // wrapper around the circle
  const leftOutRef  = useRef<HTMLDivElement>(null);
  const rightOutRef = useRef<HTMLDivElement>(null);

  const [paths, setPaths] = useState({ in: [] as string[], outL: "", outR: "", w: 0, h: 0 });
  const [sizes, setSizes] = useState({
    brain: 128,               // px, computed
    engineLeft: -56,          // px, computed
    zapBottom:  -26,          // px, computed (negative = below)
    strokeIn:  2.5,
    strokeOut: 2,
    marker:    6,
    gap:       8,
  });

  useLayoutEffect(() => {
    const c = containerRef.current; if (!c) return;

    const recompute = () => {
      const w = c.clientWidth;
      const h = c.clientHeight;

      // Scale the brain within bounds (keeps look but adapts to device)
      const brain = Math.round(clamp(112, Math.min(w, h) * 0.26, 160));
      // DPI-aware strokes/markers
      const strokeIn  = clamp(2.0, brain * 0.02, 3.0);
      const strokeOut = clamp(1.6, brain * 0.016, 2.6);
      const marker    = Math.round(strokeOut * 3.2);
      // label tip gap (prevents collisions on larger text scales)
      const gap       = Math.round(clamp(6, brain * 0.07, 12));
      // keep the same design positions but relative to brain size
      const engineLeft = -Math.round(brain * 0.55);
      const zapBottom  = -Math.round(brain * 0.20);

      // Force the brain wrapper to this size so anchors are correct
      if (brainRef.current) {
        brainRef.current.style.width = `${brain}px`;
        brainRef.current.style.height = `${brain}px`;
      }

      // anchors
      const brainTop = centerTop(c, brainRef.current);
      const brainBottomCenter = centerBottom(c, brainRef.current);
      const radius = brain / 2;
      const startOffset = radius * 0.38;
      const startLeft: Pt  = { x: brainBottomCenter.x - startOffset, y: brainBottomCenter.y - 1 };
      const startRight: Pt = { x: brainBottomCenter.x + startOffset, y: brainBottomCenter.y - 1 };

      // inputs (start slightly below each tile)
      const bump = 6;
      const sBank = centerBottom(c, bankRef.current); sBank.y += bump;
      const sLedg = centerBottom(c, ledgRef.current); sLedg.y += bump;
      const sTxn  = centerBottom(c, txnRef.current);  sTxn.y  += bump;
      const sInv  = centerBottom(c, invRef.current);  sInv.y  += bump;

      const inPaths = [
        inputCurve(sBank, brainTop),
        inputCurve(sLedg, brainTop),
        inputCurve(sTxn,  brainTop),
        inputCurve(sInv,  brainTop),
      ];

      // outputs: stop just above labels; lengths adapt dynamically
      const leftLabelTop  = centerTop(c, leftOutRef.current);
      const rightLabelTop = centerTop(c, rightOutRef.current);
      const leftEnd  = { x: leftLabelTop.x,  y: leftLabelTop.y  - gap };
      const rightEnd = { x: rightLabelTop.x, y: rightLabelTop.y - gap };

      const outL = outputCurve(startLeft, leftEnd);
      const outR = outputCurve(startRight, rightEnd);

      setSizes({ brain, engineLeft, zapBottom, strokeIn, strokeOut, marker, gap });
      setPaths({ in: inPaths, outL, outR, w, h });
    };

    // RAF-debounced observer (smooth during keyboard/address-bar changes)
    let raf = 0;
    const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(recompute); };

    const ro = new ResizeObserver(schedule);
    ro.observe(c);
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);
    // @ts-ignore
    document.fonts?.ready?.then(schedule).catch(() => {});
    schedule();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
    };
  }, []);

  // safe-area + responsive height (keeps your 38rem feel but adapts)
  const containerStyle: React.CSSProperties = {
    paddingTop: "max(12px, env(safe-area-inset-top))",
    paddingBottom: "max(12px, env(safe-area-inset-bottom))",
    paddingLeft: "max(12px, env(safe-area-inset-left))",
    paddingRight: "max(12px, env(safe-area-inset-right))",
    height: "min(38rem, 100svh)",
  };

  // unique ids for markers
  const gradId  = `vInTrail-${uid}`;
  const mkGreen = `vArrowGreen-${uid}`;
  const mkPurple= `vArrowPurple-${uid}`;

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-b from-muted/20 to-accent/5"
      style={containerStyle}
    >
      {/* Grid BG */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px),linear-gradient(hsl(var(--border))_1px,transparent_1px)] bg-[size:20px_20px]" />
      </div>

      {/* 36 / 35 / 29 rows — same design */}
      <div className="absolute inset-0 grid [grid-template-rows:0.36fr_0.35fr_0.29fr] px-4">
        {/* Inputs */}
        <div ref={rowInputsRef} className="flex items-end justify-center">
          <div className="w-full max-w-sm space-y-4 pb-1">
            {/* row A: centered (Bank, Ledgers) */}
            <div className="flex w-full justify-center gap-6">
              <motion.div
                ref={bankRef}
                className="flex items-center gap-2"
                initial={{ y: -12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.00 }}
              >
                <div className="w-8 h-8 bg-card border border-accent/40 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-accent" />
                </div>
                <span className="text-xs font-medium">Bank Statements</span>
              </motion.div>

              <motion.div
                ref={ledgRef}
                className="flex items-center gap-2"
                initial={{ y: -12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.06 }}
              >
                <div className="w-8 h-8 bg-card border border-accent/40 rounded-lg flex items-center justify-center">
                  <Database className="w-4 h-4 text-accent" />
                </div>
                <span className="text-xs font-medium">Ledgers</span>
              </motion.div>
            </div>

            {/* row B: split (Transactions left, Invoices right) */}
            <div className="flex w-full justify-between">
              <motion.div
                ref={txnRef}
                className="flex items-center gap-2"
                initial={{ y: -12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.12 }}
              >
                <div className="w-8 h-8 bg-card border border-accent/40 rounded-lg flex items-center justify-center">
                  <Receipt className="w-4 h-4 text-accent" />
                </div>
                <span className="text-xs font-medium">Transactions</span>
              </motion.div>

              <motion.div
                ref={invRef}
                className="flex items-center gap-2"
                initial={{ y: -12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.18 }}
              >
                <div className="w-8 h-8 bg-card border border-accent/40 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-accent" />
                </div>
                <span className="text-xs font-medium">Invoices</span>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Brain (same look). Engine left. Zap centered below circle. */}
        <div ref={rowBrainRef} className="relative flex items-center justify-center">
          <div ref={brainRef} className="relative" style={{ width: sizes.brain, height: sizes.brain }}>
            <div className="relative w-full h-full bg-gradient-to-br from-primary via-accent to-success rounded-full flex items-center justify-center border-2 border-primary/30 shadow-[0_0_25px_rgba(58,134,255,0.3)]">
              <Brain className="w-[92%] h-[92%] text-primary-foreground" strokeWidth={0.3} />
              <div className="absolute left-[25%] top-1/2 -translate-y-1/2 text-xs font-semibold text-white/95">ML</div>
              <div className="absolute right-[25%] top-1/2 -translate-y-1/2 text-xs font-semibold text-white/95">AI</div>
              <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: `${sizes.zapBottom}px` }}>
                <Zap className="w-4 h-4 text-foreground" />
              </div>
            </div>

            <motion.div
              className="absolute top-1/2 -translate-y-1/2"
              style={{ left: `${sizes.engineLeft}px` }}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9 }}
            >
              <div className="text-xs font-medium text-slate-200/85 bg-slate-900/30 px-2 py-0.5 rounded-full border border-white/10 backdrop-blur-sm">
                Engine
              </div>
            </motion.div>
          </div>
        </div>

        {/* Outputs (unchanged layout) */}
        <div ref={rowOutputsRef} className="flex items-start justify-between px-3 pt-8">
          <div ref={leftOutRef} className="flex flex-col items-center w-[46%]">
            <span className="text-sm font-semibold text-center leading-tight">Actionable Insights</span>
            <BarChart3 className="w-5 h-5 text-success mt-1" />
          </div>
          <div ref={rightOutRef} className="flex flex-col items-center w-[46%]">
            <span className="text-sm font-semibold text-center leading-tight">Graphs</span>
            <TrendingUp className="w-5 h-5 text-accent mt-1" />
          </div>
        </div>
      </div>

      {/* Arrows & Dots (sizes scale with brain / DPR; markers unique per instance) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" width={paths.w} height={paths.h}>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.18" />
            <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.55" />
          </linearGradient>
          <marker id={mkGreen} viewBox="0 0 10 10" refX="9" refY="5"
                  markerWidth={sizes.marker} markerHeight={sizes.marker} orient="auto">
            <path d="M0 0 L10 5 L0 10 Z" fill="hsl(var(--success))" />
          </marker>
          <marker id={mkPurple} viewBox="0 0 10 10" refX="9" refY="5"
                  markerWidth={sizes.marker} markerHeight={sizes.marker} orient="auto">
            <path d="M0 0 L10 5 L0 10 Z" fill="hsl(var(--accent))" />
          </marker>
        </defs>

        {paths.in.map((d, i) => (
          <g key={`vin-${i}`}>
            <motion.path
              id={`vin-${i}`}
              d={d}
              stroke={`url(#${gradId})`}
              strokeWidth={sizes.strokeIn}
              fill="none"
              strokeDasharray="8 6"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.55 }}
              transition={{ duration: 0.55, delay: 0.4 + i * 0.07 }}
            />
            <circle r="3" fill="hsl(var(--accent))" opacity="0.75">
              <animateMotion dur={`${1.5 + i * 0.12}s`} repeatCount="indefinite" begin={`${0.9 + i * 0.1}s`}>
                <mpath href={`#vin-${i}`} />
              </animateMotion>
            </circle>
            <circle r="3" fill="hsl(var(--accent))" opacity="0.6">
              <animateMotion dur={`${2.0 + i * 0.12}s`} repeatCount="indefinite" begin={`${1.5 + i * 0.1}s`}>
                <mpath href={`#vin-${i}`} />
              </animateMotion>
            </circle>
          </g>
        ))}

        <motion.path
          id="vout-left"
          d={paths.outL}
          stroke="hsl(var(--success))"
          strokeWidth={sizes.strokeOut}
          fill="none"
          markerEnd={`url(#${mkGreen})`}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.45, delay: 1.0 }}
        />
        <motion.path
          id="vout-right"
          d={paths.outR}
          stroke="hsl(var(--accent))"
          strokeWidth={sizes.strokeOut}
          fill="none"
          markerEnd={`url(#${mkPurple})`}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.45, delay: 1.05 }}
        />

        <circle r="3" fill="hsl(var(--success))" opacity="0.85">
          <animateMotion dur="1.5s" repeatCount="indefinite" begin="1.2s">
            <mpath href="#vout-left" />
          </animateMotion>
        </circle>
        <circle r="3" fill="hsl(var(--accent))" opacity="0.85">
          <animateMotion dur="1.6s" repeatCount="indefinite" begin="1.25s">
            <mpath href="#vout-right" />
          </animateMotion>
        </circle>
      </svg>
    </div>
  );
};

export default EnhancedDataFlowAnimationVertical;
