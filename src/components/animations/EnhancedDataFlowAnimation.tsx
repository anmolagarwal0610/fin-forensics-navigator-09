import { motion } from "framer-motion";
import { FileText, Database, Receipt, Brain, TrendingUp, BarChart3, Zap } from "lucide-react";
const EnhancedDataFlowAnimation = () => {
  // Input documents with staggered animation - more data streams
  const inputDocuments = [{
    icon: FileText,
    label: "Bank Statements",
    delay: 0,
    y: -60
  }, {
    icon: Database,
    label: "Ledgers",
    delay: 0.2,
    y: -20
  }, {
    icon: Receipt,
    label: "Transactions",
    delay: 0.4,
    y: 20
  }, {
    icon: FileText,
    label: "Invoices",
    delay: 0.6,
    y: 60
  }, {
    icon: Database,
    label: "Records",
    delay: 0.8,
    y: 100
  }];

  // Output insights - simplified to 2 key outputs
  const outputs = [{
    icon: BarChart3,
    label: "Actionable Insights",
    delay: 2.8,
    y: -20,
    color: "text-success"
  }, {
    icon: TrendingUp,
    label: "Graphs",
    delay: 3.1,
    y: 20,
    color: "text-accent"
  }];
  return <div className="relative w-full h-80 lg:h-96 flex items-center justify-center overflow-hidden bg-gradient-to-br from-muted/20 to-accent/5 rounded-2xl">
      {/* Background grid pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px),linear-gradient(hsl(var(--border))_1px,transparent_1px)] bg-[size:20px_20px]" />
      </div>

      {/* Input Stage - Left Side on Desktop, Top on Mobile */}
      <div className="absolute left-4 lg:left-16 lg:top-auto top-8 flex lg:flex-col flex-row lg:space-y-4 space-x-4 lg:space-x-0">
        {inputDocuments.map((doc, index) => <motion.div key={`input-${index}`} className="flex lg:flex-row flex-col items-center lg:space-x-3 space-y-2 lg:space-y-0" style={{
        top: window.innerWidth >= 1024 ? `calc(20% + ${doc.y}px)` : 'auto',
        left: window.innerWidth < 1024 ? `${index * 80}px` : 'auto'
      }} initial={{
        x: window.innerWidth >= 1024 ? -100 : 0,
        y: window.innerWidth < 1024 ? -50 : 0,
        opacity: 0,
        scale: 0.8
      }} animate={{
        x: 0,
        y: 0,
        opacity: [0, 1, 0.9],
        scale: [0.8, 1.1, 1]
      }} transition={{
        duration: 1.2,
        delay: doc.delay,
        ease: "easeOut"
      }}>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-card border-2 border-accent/30 rounded-lg flex items-center justify-center shadow-elegant">
              <doc.icon className="w-4 h-4 lg:w-6 lg:h-6 text-accent" />
            </div>
            <div className="hidden xl:block">
              <div className="text-xs lg:text-sm font-medium text-foreground whitespace-nowrap">{doc.label}</div>
              
            </div>
          </motion.div>)}
      </div>

      {/* Data Flow Lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {/* Multiple Input to AI flows - showing data abundance */}
        {Array.from({
        length: 5
      }, (_, i) => <motion.path key={`input-flow-${i}`} d={`M ${80 + i * 20} ${140 + i * 40} Q ${180 + i * 10} ${160 + i * 20} 280 190`} stroke="url(#flowGradient1)" strokeWidth={3 - i * 0.3} fill="none" strokeDasharray={`${8 - i},${4 - i * 0.5}`} initial={{
        pathLength: 0,
        opacity: 0
      }} animate={{
        pathLength: 1,
        opacity: 0.6 - i * 0.1
      }} transition={{
        duration: 1.5,
        delay: 1.0 + i * 0.2
      }} />)}

        {/* AI to Output flows - only 2 clean outputs */}
        <motion.path d="M 320 180 Q 400 150 480 140" stroke="url(#flowGradient2)" strokeWidth="4" fill="none" strokeDasharray="10,5" initial={{
        pathLength: 0,
        opacity: 0
      }} animate={{
        pathLength: 1,
        opacity: 0.9
      }} transition={{
        duration: 1.2,
        delay: 2.5
      }} />
        <motion.path d="M 320 200 Q 400 220 480 200" stroke="url(#flowGradient2)" strokeWidth="4" fill="none" strokeDasharray="10,5" initial={{
        pathLength: 0,
        opacity: 0
      }} animate={{
        pathLength: 1,
        opacity: 0.9
      }} transition={{
        duration: 1.2,
        delay: 2.7
      }} />

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

      {/* Central AI Brain - Enhanced and More Complex */}
      <motion.div className="relative z-10 lg:static absolute top-1/2 left-1/2 lg:transform-none transform -translate-x-1/2 -translate-y-1/2" initial={{
      scale: 0,
      opacity: 0
    }} animate={{
      scale: 1,
      opacity: 1
    }} transition={{
      duration: 0.8,
      delay: 1.6
    }}>
        <div className="relative w-28 h-28 lg:w-32 lg:h-32 bg-gradient-to-br from-primary via-accent to-success rounded-full flex items-center justify-center shadow-strong border-4 border-primary/20">
          <Brain className="w-14 h-14 lg:w-16 lg:h-16 text-primary-foreground" />
          
          {/* Neural network rings - more complex */}
          <motion.div className="absolute inset-0 rounded-full border-2 border-accent/40" animate={{
          rotate: 360,
          scale: [1, 1.15, 1]
        }} transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear"
        }} />
          <motion.div className="absolute inset-2 rounded-full border border-success/30" animate={{
          rotate: -360,
          scale: [1, 0.85, 1]
        }} transition={{
          duration: 6,
          repeat: Infinity,
          ease: "linear"
        }} />
          <motion.div className="absolute inset-4 rounded-full border border-primary/25" animate={{
          rotate: 180,
          scale: [1, 1.1, 1]
        }} transition={{
          duration: 4,
          repeat: Infinity,
          ease: "linear"
        }} />

          {/* Central processing indicator with nested circles */}
          <motion.div className="absolute inset-6 rounded-full bg-accent/30 flex items-center justify-center" animate={{
          scale: [1, 1.3, 1],
          opacity: [0.4, 0.8, 0.4]
        }} transition={{
          duration: 3,
          delay: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}>
            <motion.div className="w-4 h-4 bg-warning rounded-full" animate={{
            scale: [0.5, 1, 0.5],
            opacity: [0.5, 1, 0.5]
          }} transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }} />
          </motion.div>
        </div>

        {/* AI/ML Labels integrated into the brain design */}
        <motion.div className="absolute -top-12 left-1/2 transform -translate-x-1/2 text-center" initial={{
        opacity: 0,
        y: 10
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        delay: 2.0
      }}>
          <div className="text-xs lg:text-sm font-bold text-accent bg-card/80 backdrop-blur-sm px-3 py-1 rounded-full border border-accent/20">
            AI Engine
          </div>
        </motion.div>
        
        <motion.div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 text-center" initial={{
        opacity: 0,
        y: -10
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        delay: 2.2
      }}>
          <div className="text-xs lg:text-sm font-bold text-primary bg-card/80 backdrop-blur-sm px-3 py-1 rounded-full border border-primary/20">
            ML Models
          </div>
        </motion.div>
      </motion.div>

      {/* Output Stage - Right Side on Desktop, Bottom on Mobile */}
      <div className="absolute right-4 lg:right-16 lg:bottom-auto bottom-8 flex lg:flex-col flex-row lg:space-y-6 space-x-6 lg:space-x-0">
        {outputs.map((output, index) => <motion.div key={`output-${index}`} className="flex lg:flex-row flex-col items-center lg:space-x-4 space-y-2 lg:space-y-0" style={{
        top: window.innerWidth >= 1024 ? `calc(35% + ${output.y}px)` : 'auto',
        right: window.innerWidth < 1024 ? `${index * 100}px` : 'auto'
      }} initial={{
        x: window.innerWidth >= 1024 ? 100 : 0,
        y: window.innerWidth < 1024 ? 50 : 0,
        opacity: 0,
        scale: 0.8
      }} animate={{
        x: 0,
        y: 0,
        opacity: [0, 1, 1],
        scale: [0.8, 1.1, 1]
      }} transition={{
        duration: 1.0,
        delay: output.delay,
        ease: "easeOut"
      }}>
            <div className="hidden xl:block lg:text-right text-center lg:order-1 order-2">
              <div className="text-xs lg:text-sm font-medium text-foreground whitespace-nowrap">{output.label}</div>
              
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-card border-2 border-success/40 rounded-lg flex items-center justify-center shadow-elegant lg:order-2 order-1 relative">
              <output.icon className={`w-4 h-4 lg:w-6 lg:h-6 ${output.color}`} />
              <motion.div className="absolute -right-1 -top-1 w-4 h-4 lg:w-5 lg:h-5 bg-success/30 rounded-full flex items-center justify-center border border-success/50" initial={{
            scale: 0
          }} animate={{
            scale: 1
          }} transition={{
            delay: output.delay + 0.3
          }}>
                <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
              </motion.div>
            </div>
          </motion.div>)}
      </div>

      {/* Success Indicator - Only Lightning */}
      <motion.div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center justify-center" initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      delay: 3.8
    }}>
        <motion.div className="w-8 h-8 bg-warning/20 rounded-full flex items-center justify-center" animate={{
        scale: [1, 1.2, 1],
        boxShadow: ["0 0 0 0 rgba(234, 179, 8, 0.4)", "0 0 0 10px rgba(234, 179, 8, 0)", "0 0 0 0 rgba(234, 179, 8, 0)"]
      }} transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }}>
          <Zap className="w-4 h-4 text-warning" />
        </motion.div>
      </motion.div>
    </div>;
};
export default EnhancedDataFlowAnimation;