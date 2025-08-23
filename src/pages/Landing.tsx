
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, FileSearch, TrendingUp, Shield, Users, Zap, FileText, Upload, Eye } from "lucide-react";
import { motion } from "framer-motion";
import DocumentHead from "@/components/common/DocumentHead";
import DataFlowAnimation from "@/components/animations/DataFlowAnimation";
import ProcessFlowAnimation from "@/components/animations/ProcessFlowAnimation";
import DifferentiatorSection from "@/components/sections/DifferentiatorSection";

const Landing = () => {
  const features = [
    {
      icon: FileSearch,
      title: "Smart Document Analysis",
      description: "AI-powered parsing of bank statements, ledgers, and financial documents with high accuracy."
    },
    {
      icon: TrendingUp,
      title: "Money Flow Tracking",
      description: "Visualize complex financial relationships and trace suspicious transactions across multiple accounts."
    },
    {
      icon: Users,
      title: "Person of Interest Detection",
      description: "Automatically identify key individuals and entities involved in financial activities."
    },
    {
      icon: Shield,
      title: "Secure & Compliant",
      description: "Enterprise-grade security with encryption in transit and at rest. SOC 2 compliant."
    },
    {
      icon: Zap,
      title: "Rapid Processing",
      description: "Get actionable insights in hours, not weeks. Streamline your investigation workflow."
    },
    {
      icon: CheckCircle,
      title: "Court-Ready Reports",
      description: "Generate comprehensive, professional reports suitable for legal proceedings."
    }
  ];

  return (
    <>
      <DocumentHead 
        title="FinNavigator — Your partner in financial forensics"
        description="ML-powered analysis of bank statements and ledgers for actionable investigations."
      />
      
      <div className="flex flex-col min-h-screen">
        {/* Hero Section - Enhanced with Animation */}
        <section className="relative py-20 lg:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-background">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          </div>
          
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div
                className="text-center lg:text-left"
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.8 }}
              >
                <Badge variant="secondary" className="mb-6 text-sm font-medium">
                  Powered by Advanced ML
                </Badge>
                
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
                  Investigations{" "}
                  <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                    accelerated.
                  </span>
                </h1>
                
                <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                  FinNavigator turns complex bank statements and ledgers into concise, actionable insights—highlighting persons of interest and money flow.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-4">
                  <Link to="/signup">
                    <Button size="lg" variant="cta" className="min-w-[160px]">
                      Start Free Trial
                    </Button>
                  </Link>
                  <Link to="/pricing">
                    <Button size="lg" variant="outline" className="min-w-[160px]">
                      View Pricing
                    </Button>
                  </Link>
                </div>
                
                <p className="text-sm text-muted-foreground font-mono">
                  Your partner in financial forensics.
                </p>
              </motion.div>

              <motion.div
                className="relative"
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <DataFlowAnimation />
              </motion.div>
            </div>
          </div>
        </section>

        {/* How it Works Section - Enhanced with Interactive Animation */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              className="text-center mb-16"
              initial={{ y: 50, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                How it works
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Three simple steps to transform complex financial data into actionable intelligence.
              </p>
            </motion.div>
            
            <ProcessFlowAnimation />
          </div>
        </section>

        {/* What Makes Us Different Section */}
        <DifferentiatorSection />

        {/* Features Grid - Enhanced with Animations */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              className="text-center mb-16"
              initial={{ y: 50, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                Everything you need for financial forensics
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                From document ingestion to court-ready reports, FinNavigator streamlines every step of your investigation process.
              </p>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ y: 50, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -5, transition: { duration: 0.2 } }}
                >
                  <Card className="border-border hover:border-accent/50 transition-all duration-300 hover:shadow-elegant h-full">
                    <CardHeader className="pb-4">
                      <motion.div
                        className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ duration: 0.2 }}
                      >
                        <feature.icon className="w-6 h-6 text-primary" />
                      </motion.div>
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-base leading-relaxed">
                        {feature.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section - Enhanced */}
        <section className="py-20 bg-accent text-accent-foreground relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-accent to-primary opacity-90" />
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl lg:text-4xl font-bold mb-6">
                Ready to accelerate your investigations?
              </h2>
              <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
                Join leading forensic accountants and investigators who trust FinNavigator for their most critical cases.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/signup">
                  <Button size="lg" variant="secondary" className="min-w-[160px]">
                    Get Started Today
                  </Button>
                </Link>
                <Link to="/contact">
                  <Button size="lg" variant="outline" className="min-w-[160px] border-accent-foreground text-accent-foreground hover:bg-accent-foreground hover:text-accent">
                    Contact Sales
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </>
  );
};

export default Landing;
