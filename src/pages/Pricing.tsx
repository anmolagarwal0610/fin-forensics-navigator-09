import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ArrowRight, Users, Building2, Shield } from "lucide-react";

const Pricing = () => {
  return (
    <div className="min-h-screen py-16 lg:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Enterprise pricing for professionals
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Flexible plans designed for teams of all sizes. Custom SLAs and on‑premises deployment options available.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
          {/* Starter Plan */}
          <Card className="shadow-elegant hover:shadow-strong transition-shadow relative">
            <CardHeader className="text-center pb-8">
              <div className="w-16 h-16 bg-accent text-accent-foreground rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="h-8 w-8" />
              </div>
              <CardTitle className="text-2xl mb-2">Starter</CardTitle>
              <CardDescription className="text-base">
                Perfect for small teams and individual investigators
              </CardDescription>
              <div className="mt-6">
                <div className="text-3xl font-bold text-foreground">Contact us</div>
                <p className="text-sm text-muted-foreground mt-2">Custom pricing</p>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                  <span className="text-sm">Up to 100 documents/month</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                  <span className="text-sm">Basic OCR processing</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                  <span className="text-sm">Standard reports</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                  <span className="text-sm">Email support</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                  <span className="text-sm">30-day data retention</span>
                </div>
              </div>
              
              <div className="pt-6">
                <Link to="/contact" className="w-full">
                  <Button variant="outline" className="w-full">
                    Request Access
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Team Plan */}
          <Card className="shadow-elegant hover:shadow-strong transition-shadow border-accent relative">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <Badge variant="accent" className="px-4 py-1">Most Popular</Badge>
            </div>
            
            <CardHeader className="text-center pb-8 pt-8">
              <div className="w-16 h-16 bg-accent text-accent-foreground rounded-full flex items-center justify-center mx-auto mb-6">
                <Building2 className="h-8 w-8" />
              </div>
              <CardTitle className="text-2xl mb-2">Team</CardTitle>
              <CardDescription className="text-base">
                Ideal for growing teams and departments
              </CardDescription>
              <div className="mt-6">
                <div className="text-3xl font-bold text-foreground">Contact us</div>
                <p className="text-sm text-muted-foreground mt-2">Volume pricing available</p>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                  <span className="text-sm">Up to 1,000 documents/month</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                  <span className="text-sm">Advanced OCR & AI processing</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                  <span className="text-sm">Detailed analytics & insights</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                  <span className="text-sm">Priority support</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                  <span className="text-sm">90-day data retention</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                  <span className="text-sm">Team collaboration tools</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                  <span className="text-sm">API access</span>
                </div>
              </div>
              
              <div className="pt-6">
                <Link to="/contact" className="w-full">
                  <Button variant="cta" className="w-full">
                    Request Access
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Government Plan */}
          <Card className="shadow-elegant hover:shadow-strong transition-shadow relative">
            <CardHeader className="text-center pb-8">
              <div className="w-16 h-16 bg-accent text-accent-foreground rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="h-8 w-8" />
              </div>
              <CardTitle className="text-2xl mb-2">Government</CardTitle>
              <CardDescription className="text-base">
                Specialized for government agencies and law enforcement
              </CardDescription>
              <div className="mt-6">
                <div className="text-3xl font-bold text-foreground">Contact us</div>
                <p className="text-sm text-muted-foreground mt-2">Custom enterprise pricing</p>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                  <span className="text-sm">Unlimited document processing</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                  <span className="text-sm">On-premises deployment</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                  <span className="text-sm">Custom data retention policies</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                  <span className="text-sm">24/7 dedicated support</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                  <span className="text-sm">CJIS & FedRAMP compliance</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                  <span className="text-sm">Custom integrations</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                  <span className="text-sm">Training & onboarding</span>
                </div>
              </div>
              
              <div className="pt-6">
                <Link to="/contact" className="w-full">
                  <Button variant="outline" className="w-full">
                    Request Access
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Info */}
        <div className="max-w-4xl mx-auto">
          <Card className="bg-muted/50 border-none shadow-elegant">
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-semibold mb-4">Custom SLAs and on‑premises options available</h3>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Need something specific? We work with organizations to create custom deployment options, 
                service level agreements, and compliance requirements that meet your exact needs.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/contact">
                  <Button variant="cta">
                    Discuss Custom Requirements
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/security">
                  <Button variant="outline">
                    View Security Details
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Pricing;