import { motion } from "framer-motion";
import { GitBranch } from "lucide-react";

export default function TraceLoader() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6">
      {/* Animated logo */}
      <div className="relative">
        {/* Outer pulse ring */}
        <motion.div
          className="absolute inset-0 rounded-full bg-accent/20"
          animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          style={{ width: 80, height: 80, margin: "auto", top: -10, left: -10 }}
        />
        {/* Inner pulse ring */}
        <motion.div
          className="absolute inset-0 rounded-full bg-primary/15"
          animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
          style={{ width: 60, height: 60, margin: "auto", top: 0, left: 0 }}
        />
        {/* Core icon */}
        <motion.div
          className="relative z-10 w-[60px] h-[60px] rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        >
          <GitBranch className="h-7 w-7 text-primary" />
        </motion.div>
      </div>

      {/* Animated trail lines */}
      <div className="flex items-center gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-accent"
            animate={{
              y: [0, -8, 0],
              opacity: [0.3, 1, 0.3],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Text */}
      <motion.p
        className="text-sm text-muted-foreground font-medium"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        Tracing money flow...
      </motion.p>
    </div>
  );
}
