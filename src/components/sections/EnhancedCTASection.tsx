import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Zap } from "lucide-react";
const EnhancedCTASection = () => {
  return <section className="py-20 relative overflow-hidden">
      {/* Gradient Background with overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/80 via-primary/80 to-accent/80" />
      <div className="absolute inset-0 bg-background/10" />
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        {/* Floating shapes */}
        {Array.from({
        length: 6
      }).map((_, i) => <motion.div key={i} className="absolute opacity-20" style={{
        left: `${20 + i * 15}%`,
        top: `${10 + i % 2 * 60}%`
      }} animate={{
        y: [-20, 20, -20],
        rotate: [0, 180, 360],
        scale: [1, 1.1, 1]
      }} transition={{
        duration: 8 + i * 2,
        repeat: Infinity,
        ease: "easeInOut",
        delay: i * 0.5
      }}>
            <div className="w-16 h-16 border-2 border-accent-foreground/30 rounded-lg rotate-45" />
          </motion.div>)}
        
        {/* Sparkle effects */}
        {Array.from({
        length: 20
      }).map((_, i) => <motion.div key={`sparkle-${i}`} className="absolute" style={{
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`
      }} animate={{
        opacity: [0, 1, 0],
        scale: [0, 1, 0]
      }} transition={{
        duration: 2,
        delay: Math.random() * 5,
        repeat: Infinity,
        repeatDelay: 3 + Math.random() * 2
      }}>
            <Sparkles className="w-4 h-4 text-accent-foreground/40" />
          </motion.div>)}
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
        <motion.div initial={{
        y: 50,
        opacity: 0
      }} whileInView={{
        y: 0,
        opacity: 1
      }} transition={{
        duration: 0.8
      }} viewport={{
        once: true
      }}>
          {/* Badge */}
          <motion.div className="inline-flex items-center space-x-2 bg-accent-foreground/10 backdrop-blur-sm rounded-full px-6 py-2 mb-8" whileHover={{
          scale: 1.05
        }} transition={{
          duration: 0.2
        }}>
            <Zap className="w-4 h-4 text-accent-foreground" />
            <span className="text-sm font-medium text-accent-foreground">
              Transform Your Investigations Today
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h2 className="text-4xl lg:text-6xl font-bold mb-6 text-white drop-shadow-lg" initial={{
          y: 30,
          opacity: 0
        }} whileInView={{
          y: 0,
          opacity: 1
        }} transition={{
          duration: 0.8,
          delay: 0.2
        }} viewport={{
          once: true
        }}>
            Ready to accelerate your{" "}
            <motion.span className="inline-block text-white" animate={{
            textShadow: ["0 0 0px rgba(255,255,255,0.8)", "0 0 15px rgba(255,255,255,1)", "0 0 0px rgba(255,255,255,0.8)"]
          }} transition={{
            duration: 2,
            repeat: Infinity
          }}>
              investigations?
            </motion.span>
          </motion.h2>

          {/* Description */}
          <motion.p className="text-xl mb-10 max-w-3xl mx-auto text-white/95 leading-relaxed drop-shadow-md" initial={{
          y: 30,
          opacity: 0
        }} whileInView={{
          y: 0,
          opacity: 1
        }} transition={{
          duration: 0.8,
          delay: 0.4
        }} viewport={{
          once: true
        }}>
            Join leading forensic accountants and investigators who trust FinNavigator 
            for their most critical cases. Experience the power of AI-driven financial analysis.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div className="flex flex-col sm:flex-row gap-4 justify-center items-center" initial={{
          y: 30,
          opacity: 0
        }} whileInView={{
          y: 0,
          opacity: 1
        }} transition={{
          duration: 0.8,
          delay: 0.6
        }} viewport={{
          once: true
        }}>
            <Link to="/signup">
              <motion.div whileHover={{
              scale: 1.05
            }} whileTap={{
              scale: 0.95
            }}>
                <Button size="lg" variant="secondary" className="min-w-[200px] h-14 text-lg font-semibold group bg-white hover:bg-white/90 shadow-lg text-[#3883b8]">
                  Start Free Trial
                  <motion.div className="ml-2" animate={{
                  x: [0, 5, 0]
                }} transition={{
                  duration: 1.5,
                  repeat: Infinity
                }}>
                    <ArrowRight className="w-5 h-5" />
                  </motion.div>
                </Button>
              </motion.div>
            </Link>

            <Link to="/contact">
              <motion.div whileHover={{
              scale: 1.05
            }} whileTap={{
              scale: 0.95
            }}>
                <Button size="lg" variant="outline" className="min-w-[200px] h-14 text-lg font-semibold border-white/50 text-white hover:bg-white/10 hover:border-white/70 shadow-lg">
                  Contact Sales
                </Button>
              </motion.div>
            </Link>
          </motion.div>

          {/* Trust indicators */}
          <motion.div className="mt-12 flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-8 text-white/80" initial={{
          y: 30,
          opacity: 0
        }} whileInView={{
          y: 0,
          opacity: 1
        }} transition={{
          duration: 0.8,
          delay: 0.8
        }} viewport={{
          once: true
        }}>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
              <span className="text-sm font-medium">Free 14-day trial</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
              <span className="text-sm font-medium">No credit card required</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
              <span className="text-sm font-medium">Cancel anytime</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>;
};
export default EnhancedCTASection;