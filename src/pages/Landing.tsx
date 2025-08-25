import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, FileSearch, TrendingUp, Shield, Users, Zap, Brain } from "lucide-react";
import { motion } from "framer-motion";
import DocumentHead from "@/components/common/DocumentHead";
import ResponsiveDataFlowAnimation from "@/components/animations/ResponsiveDataFlowAnimation";
import ProcessFlowAnimation from "@/components/animations/ProcessFlowAnimation";
import DifferentiatorSection from "@/components/sections/DifferentiatorSection";
import InteractiveStatsSection from "@/components/sections/InteractiveStatsSection";
import EnhancedCTASection from "@/components/sections/EnhancedCTASection";
import GeometricBackground from "@/components/animations/GeometricBackground";
import BookDemoModal from "@/components/modals/BookDemoModal";
const Landing = () => {
  const [isBookDemoOpen, setIsBookDemoOpen] = useState(false);
  const features = [{
    icon: Brain,
    title: "AI-Powered Analysis",
    description: "Advanced machine learning algorithms process financial documents with unprecedented accuracy and speed.",
    gradient: "from-accent to-primary"
  }, {
    icon: FileSearch,
    title: "Smart Document Processing",
    description: "Automatically extract, categorize, and analyze data from bank statements, ledgers, and transaction records.",
    gradient: "from-primary to-success"
  }, {
    icon: TrendingUp,
    title: "Money Flow Visualization",
    description: "Interactive dashboards reveal complex financial relationships and trace suspicious transaction patterns.",
    gradient: "from-success to-warning"
  }, {
    icon: Users,
    title: "Person of Interest Detection",
    description: "Machine learning identifies key individuals and entities involved in financial networks automatically.",
    gradient: "from-warning to-accent"
  }, {
    icon: Shield,
    title: "Enterprise Security",
    description: "Bank-grade encryption, SOC 2 compliance, and comprehensive audit trails protect sensitive data.",
    gradient: "from-accent to-primary"
  }, {
    icon: Zap,
    title: "Rapid Insights",
    description: "Transform weeks of manual analysis into hours of automated processing with actionable results.",
    gradient: "from-primary to-success"
  }];
  return <>
      <DocumentHead title="FinNavigator — AI-Powered Financial Forensics" description="Transform complex financial data into actionable insights with advanced ML algorithms. Accelerate investigations with automated document analysis and person-of-interest detection." />
      
      <div className="flex flex-col min-h-screen">
        {/* Hero Section - Enhanced with New Animation */}
        <section className="relative py-20 lg:py-32 overflow-hidden">
          <GeometricBackground />
          
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-background">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          </div>
          
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div className="text-center lg:text-left" initial={{
              x: -50,
              opacity: 0
            }} animate={{
              x: 0,
              opacity: 1
            }} transition={{
              duration: 0.8
            }}>
                <motion.div initial={{
                scale: 0.9,
                opacity: 0
              }} animate={{
                scale: 1,
                opacity: 1
              }} transition={{
                duration: 0.6,
                delay: 0.2
              }}>
                  <Badge variant="secondary" className="mb-6 text-sm font-medium bg-accent/10 text-accent border-accent/20">Powered by Advanced AI & ML</Badge>
                </motion.div>
                
                <motion.h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight" initial={{
                y: 30,
                opacity: 0
              }} animate={{
                y: 0,
                opacity: 1
              }} transition={{
                duration: 0.8,
                delay: 0.3
              }}>
                  Financial investigations{" "}
                  <motion.span className="bg-gradient-to-r from-accent via-primary to-success bg-clip-text text-transparent" animate={{
                  backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
                }} transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "linear"
                }}>
                    reimagined.
                  </motion.span>
                </motion.h1>
                
                <motion.p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed" initial={{
                y: 30,
                opacity: 0
              }} animate={{
                y: 0,
                opacity: 1
              }} transition={{
                duration: 0.8,
                delay: 0.5
              }}>
                  Transform complex financial data into clear, actionable insights with AI-powered analysis. 
                  Identify persons of interest, trace money flows, and generate court-ready reports in hours, not weeks.
                </motion.p>
                
                <motion.div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-6" initial={{
                y: 30,
                opacity: 0
              }} animate={{
                y: 0,
                opacity: 1
              }} transition={{
                duration: 0.8,
                delay: 0.7
              }}>
                  <motion.div whileHover={{
                    scale: 1.05
                  }} whileTap={{
                    scale: 0.95
                  }}>
                    <Button 
                      size="lg" 
                      variant="cta" 
                      className="min-w-[180px] h-14 text-lg font-semibold"
                      onClick={() => setIsBookDemoOpen(true)}
                    >
                      Book a Demo
                    </Button>
                  </motion.div>
                  <Link to="/contact">
                    <motion.div whileHover={{
                    scale: 1.05
                  }} whileTap={{
                    scale: 0.95
                  }}>
                      <Button size="lg" variant="outline" className="min-w-[180px] h-14 text-lg font-semibold">
                        Contact Sales
                      </Button>
                    </motion.div>
                  </Link>
                </motion.div>
                
                <motion.p className="text-sm text-muted-foreground font-mono" initial={{
                opacity: 0
              }} animate={{
                opacity: 1
              }} transition={{
                duration: 0.8,
                delay: 0.9
              }}>
                  Your AI partner in financial forensics.
                </motion.p>
              </motion.div>

              <motion.div className="relative" initial={{
              x: 50,
              opacity: 0
            }} animate={{
              x: 0,
              opacity: 1
            }} transition={{
              duration: 0.8,
              delay: 0.4
            }}>
                <ResponsiveDataFlowAnimation />
              </motion.div>
            </div>
          </div>
        </section>

        {/* Interactive Stats Section */}
        <InteractiveStatsSection />

        {/* How it Works Section */}
        <section className="py-20 bg-muted/30 relative overflow-hidden">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div className="text-center mb-16" initial={{
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
              <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-6">
                Simple yet{" "}
                <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                  Powerful
                </span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Three intuitive steps to transform complex financial data into actionable intelligence 
                that drives successful investigations.
              </p>
            </motion.div>
            
            <ProcessFlowAnimation />
          </div>
        </section>

        {/* What Makes Us Different Section */}
        <DifferentiatorSection />


        {/* Enhanced CTA Section */}
        <EnhancedCTASection />
      </div>
      
      {/* Book Demo Modal */}
      <BookDemoModal 
        isOpen={isBookDemoOpen} 
        onClose={() => setIsBookDemoOpen(false)} 
      />
    </>;
};
export default Landing;