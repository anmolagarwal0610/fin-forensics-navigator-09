
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Shield, Zap, Users, TrendingUp, FileText, Search, AlertTriangle } from "lucide-react";
import DocumentHead from "@/components/common/DocumentHead";

const Landing = () => {
  return (
    <>
      <DocumentHead />
      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="relative py-20 lg:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="text-center max-w-4xl mx-auto">
              <Badge variant="outline" className="mb-8 px-4 py-2">
                AI-Powered Financial Forensics
              </Badge>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-8">
                Uncover Financial Truth with{" "}
                <span className="text-accent">AI Precision</span>
              </h1>
              
              <p className="text-xl lg:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
                Transform complex financial documents into clear, actionable insights. 
                Professional-grade analysis for investigations, compliance, and forensic accounting.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
                <Link to="/signup">
                  <Button size="lg" variant="cta" className="text-lg px-8 py-4 w-full sm:w-auto">
                    Start Free Trial
                  </Button>
                </Link>
                <Link to="/contact">
                  <Button size="lg" variant="outline" className="text-lg px-8 py-4 w-full sm:w-auto">
                    Schedule Demo
                  </Button>
                </Link>
              </div>

              {/* Social Proof */}
              <div className="flex flex-wrap justify-center gap-8 opacity-60">
                <div className="text-sm text-muted-foreground">Trusted by Law Enforcement</div>
                <div className="text-sm text-muted-foreground">•</div>
                <div className="text-sm text-muted-foreground">Financial Institutions</div>
                <div className="text-sm text-muted-foreground">•</div>
                <div className="text-sm text-muted-foreground">Compliance Teams</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 lg:py-32 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold mb-6">
                Accelerate Your Financial Investigations
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                From document processing to pattern analysis, FinNavigator streamlines every step of your forensic workflow.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <Card className="shadow-elegant hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-accent text-accent-foreground rounded-lg flex items-center justify-center mb-4">
                    <FileText className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl">Document Processing</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    Advanced OCR extracts data from bank statements, ledgers, and transaction records with exceptional accuracy.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="shadow-elegant hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-accent text-accent-foreground rounded-lg flex items-center justify-center mb-4">
                    <Search className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl">Pattern Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    AI identifies suspicious patterns, unusual transactions, and potential indicators of financial misconduct.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="shadow-elegant hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-accent text-accent-foreground rounded-lg flex items-center justify-center mb-4">
                    <Users className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl">Entity Tracking</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    Automatically identify and track individuals, businesses, and their financial relationships across documents.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="shadow-elegant hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-accent text-accent-foreground rounded-lg flex items-center justify-center mb-4">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl">Risk Assessment</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    Comprehensive risk scoring based on transaction patterns, entity relationships, and regulatory indicators.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="shadow-elegant hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-accent text-accent-foreground rounded-lg flex items-center justify-center mb-4">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl">Timeline Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    Visualize financial activities over time to identify trends, anomalies, and critical investigation periods.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="shadow-elegant hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-accent text-accent-foreground rounded-lg flex items-center justify-center mb-4">
                    <Shield className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl">Compliance Ready</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    Generate court-ready reports with detailed findings, supporting evidence, and regulatory compliance documentation.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 lg:py-32">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <div>
                  <h2 className="text-3xl lg:text-4xl font-bold mb-8">
                    Transform Weeks of Work into Hours
                  </h2>
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <CheckCircle className="h-6 w-6 text-success flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="font-semibold text-lg mb-2">Reduce Analysis Time by 90%</h3>
                        <p className="text-muted-foreground">
                          What used to take weeks of manual review now completes in hours with AI assistance.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                      <CheckCircle className="h-6 w-6 text-success flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="font-semibold text-lg mb-2">Improve Accuracy</h3>
                        <p className="text-muted-foreground">
                          AI-powered analysis catches patterns and anomalies that manual review might miss.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                      <CheckCircle className="h-6 w-6 text-success flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="font-semibold text-lg mb-2">Scale Your Operations</h3>
                        <p className="text-muted-foreground">
                          Handle more cases simultaneously without compromising on thoroughness or quality.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="lg:text-center">
                  <Card className="shadow-elegant bg-muted/30 border-none p-8">
                    <CardContent className="space-y-8">
                      <div className="text-center">
                        <div className="text-4xl font-bold text-accent mb-2">24 hrs</div>
                        <div className="text-sm text-muted-foreground">Average turnaround time</div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold mb-1">99.8%</div>
                          <div className="text-xs text-muted-foreground">Data extraction accuracy</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-2xl font-bold mb-1">500+</div>
                          <div className="text-xs text-muted-foreground">Cases processed monthly</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 lg:py-32 bg-accent text-accent-foreground">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl lg:text-4xl font-bold mb-6">
                Ready to Transform Your Investigations?
              </h2>
              <p className="text-xl mb-12 opacity-90">
                Join leading law enforcement agencies and financial institutions using FinNavigator 
                to uncover financial truth faster than ever before.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/signup">
                  <Button 
                    size="lg" 
                    variant="secondary" 
                    className="text-lg px-8 py-4 w-full sm:w-auto bg-background text-foreground hover:bg-background/90"
                  >
                    Start Free Trial
                  </Button>
                </Link>
                <Link to="/contact">
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="text-lg px-8 py-4 w-full sm:w-auto border-background/20 text-accent-foreground hover:bg-background/10"
                  >
                    Contact Sales
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default Landing;
