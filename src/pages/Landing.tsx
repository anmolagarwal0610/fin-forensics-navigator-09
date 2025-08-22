import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Lock, FileText, Users, TrendingUp, Eye, ArrowRight, CheckCircle } from "lucide-react";
import heroBackground from "@/assets/hero-background.jpg";

const Landing = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${heroBackground})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          <div className="absolute inset-0 bg-primary/90"></div>
        </div>
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center text-white">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
              Investigations accelerated.
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-3xl mx-auto leading-relaxed">
              FinNavigator turns complex bank statements and ledgers into concise, actionable insights—highlighting persons of interest and money flow.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
              <Link to="/contact">
                <Button size="lg" variant="hero" className="w-full sm:w-auto">
                  Request Access
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/signin">
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-white border-white hover:bg-white hover:text-primary">
                  Sign In
                </Button>
              </Link>
            </div>
            
            <p className="text-sm text-white/70 font-mono">
              Your partner in financial forensics.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 lg:py-24 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How it works</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Three simple steps to transform complex financial data into actionable intelligence.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-accent text-accent-foreground rounded-full flex items-center justify-center mx-auto mb-6 shadow-elegant">
                <FileText className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Create Case</h3>
              <p className="text-muted-foreground">
                Set up a new investigation case with relevant metadata and context.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-accent text-accent-foreground rounded-full flex items-center justify-center mx-auto mb-6 shadow-elegant">
                <TrendingUp className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Upload Files</h3>
              <p className="text-muted-foreground">
                Upload bank statements, ledgers, and financial documents for analysis.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-accent text-accent-foreground rounded-full flex items-center justify-center mx-auto mb-6 shadow-elegant">
                <Eye className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Get Results</h3>
              <p className="text-muted-foreground">
                Review insights, persons of interest, and normalized activity scores.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Built for professionals</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Advanced capabilities designed for financial investigators and compliance teams.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="shadow-elegant hover:shadow-strong transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-accent text-accent-foreground rounded-lg flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6" />
                </div>
                <CardTitle>Accurate ingestion of bank statements & ledgers</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Advanced OCR and parsing technology ensures precise data extraction from various financial document formats, maintaining data integrity throughout the process.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card className="shadow-elegant hover:shadow-strong transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-accent text-accent-foreground rounded-lg flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <CardTitle>Clear, consumable summaries & CTAs</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Transform complex financial data into clear, actionable reports with executive summaries and specific recommended actions for investigation teams.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card className="shadow-elegant hover:shadow-strong transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-accent text-accent-foreground rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6" />
                </div>
                <CardTitle>Persons of Interest & normalized activity scores</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Identify key individuals and entities with risk-weighted activity scores, helping investigators focus on the most relevant leads and connections.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Trust & Security */}
      <section className="py-16 lg:py-24 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Enterprise-grade security</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built with security and compliance at the core, meeting the highest standards for sensitive financial data.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <div className="text-center p-6">
              <Shield className="h-10 w-10 text-accent mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Encryption at rest & in transit</h3>
              <p className="text-sm text-muted-foreground">
                End-to-end encryption protects your data at all times.
              </p>
            </div>
            
            <div className="text-center p-6">
              <Lock className="h-10 w-10 text-accent mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Private, region-scoped storage</h3>
              <p className="text-sm text-muted-foreground">
                Data residency controls and regional storage options.
              </p>
            </div>
            
            <div className="text-center p-6">
              <CheckCircle className="h-10 w-10 text-accent mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Audit trail & least-privilege access</h3>
              <p className="text-sm text-muted-foreground">
                Complete activity logging with role-based permissions.
              </p>
            </div>
            
            <div className="text-center p-6">
              <Eye className="h-10 w-10 text-accent mx-auto mb-4" />
              <h3 className="font-semibold mb-2">SOC 2 Type II compliance</h3>
              <p className="text-sm text-muted-foreground">
                Independently audited security controls and processes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Coming soon</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Continuous innovation to enhance your financial forensics capabilities.
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
            <Badge variant="muted" className="px-4 py-2 text-sm">
              Advanced Dashboard
            </Badge>
            <Badge variant="muted" className="px-4 py-2 text-sm">
              Enhanced OCR Engine
            </Badge>
            <Badge variant="muted" className="px-4 py-2 text-sm">
              Entity Relationship Graphs
            </Badge>
            <Badge variant="muted" className="px-4 py-2 text-sm">
              Predictive Analytics
            </Badge>
            <Badge variant="muted" className="px-4 py-2 text-sm">
              API Integration
            </Badge>
            <Badge variant="muted" className="px-4 py-2 text-sm">
              Mobile App
            </Badge>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24 bg-primary text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to accelerate your investigations?
          </h2>
          <p className="text-xl mb-8 text-white/90 max-w-2xl mx-auto">
            Join leading organizations using FinNavigator for financial forensics and compliance.
          </p>
          <Link to="/contact">
            <Button size="lg" variant="hero">
              Request Access Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Landing;