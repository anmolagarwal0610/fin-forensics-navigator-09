
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, FileSearch, TrendingUp, Shield, Users, Zap, FileText, Upload, Eye } from "lucide-react";
import DocumentHead from "@/components/common/DocumentHead";

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

  const howItWorksSteps = [
    {
      icon: FileText,
      title: "Create Case",
      description: "Set up a new investigation case with relevant metadata and context."
    },
    {
      icon: Upload,
      title: "Upload Files",
      description: "Upload bank statements, ledgers, and financial documents for analysis."
    },
    {
      icon: Eye,
      title: "Get Results",
      description: "Review insights, persons of interest, and normalized activity scores."
    }
  ];

  return (
    <>
      <DocumentHead 
        title="FinNavigator — Your partner in financial forensics"
        description="ML-powered analysis of bank statements and ledgers for actionable investigations."
      />
      
      <div className="flex flex-col min-h-screen">
        {/* Hero Section */}
        <section className="relative py-20 lg:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-background"></div>
          
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="text-center max-w-4xl mx-auto">
              <Badge variant="secondary" className="mb-6 text-sm font-medium">
                Powered by Advanced ML
              </Badge>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
                Investigations accelerated.
              </h1>
              
              <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
                FinNavigator turns complex bank statements and ledgers into concise, actionable insights—highlighting persons of interest and money flow.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
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
            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                How it works
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Three simple steps to transform complex financial data into actionable intelligence.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {howItWorksSteps.map((step, index) => (
                <div key={step.title} className="text-center">
                  <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-6 mx-auto">
                    <step.icon className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-foreground">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                Everything you need for financial forensics
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                From document ingestion to court-ready reports, FinNavigator streamlines every step of your investigation process.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <Card key={index} className="border-border hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-accent text-accent-foreground">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
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
          </div>
        </section>
      </div>
    </>
  );
};

export default Landing;
