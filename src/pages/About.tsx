import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, Users, Shield, Zap } from "lucide-react";

const About = () => {
  return (
    <div className="min-h-screen py-16 lg:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            About FinNavigator
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            We build practical AI tools for financial forensics.
          </p>
          <div className="text-lg font-semibold text-foreground">
            FinNavigator — by Promarma Technologies
          </div>
        </div>

        {/* Mission Statement */}
        <div className="max-w-4xl mx-auto mb-16">
          <Card className="shadow-elegant bg-muted/30 border-none">
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                To empower financial investigators, compliance teams, and law enforcement agencies 
                with advanced AI-driven tools that transform complex financial data into clear, 
                actionable insights—accelerating investigations while maintaining the highest 
                standards of security and compliance.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Core Values */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Our Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-accent text-accent-foreground rounded-full flex items-center justify-center mx-auto mb-6 shadow-elegant">
                <Target className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Precision</h3>
              <p className="text-muted-foreground">
                Every analysis is built on accurate data processing and meticulous attention to detail.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-accent text-accent-foreground rounded-full flex items-center justify-center mx-auto mb-6 shadow-elegant">
                <Shield className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Security</h3>
              <p className="text-muted-foreground">
                We prioritize the protection of sensitive financial data with enterprise-grade security.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-accent text-accent-foreground rounded-full flex items-center justify-center mx-auto mb-6 shadow-elegant">
                <Users className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Partnership</h3>
              <p className="text-muted-foreground">
                We work closely with investigators to understand their needs and challenges.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-accent text-accent-foreground rounded-full flex items-center justify-center mx-auto mb-6 shadow-elegant">
                <Zap className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Innovation</h3>
              <p className="text-muted-foreground">
                Continuous advancement in AI and forensic analysis capabilities.
              </p>
            </div>
          </div>
        </div>

        {/* What We Do */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">What We Do</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle className="text-xl">Financial Document Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Our advanced OCR and AI processing capabilities accurately extract and analyze data 
                  from bank statements, ledgers, transaction records, and other financial documents, 
                  regardless of format or quality.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle className="text-xl">Pattern Recognition</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Identify suspicious patterns, unusual transactions, and potential red flags using 
                  machine learning algorithms trained specifically for financial forensics and 
                  compliance investigations.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle className="text-xl">Entity Identification</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Automatically identify and track persons of interest, business entities, and their 
                  relationships across multiple documents and transactions with normalized risk scoring.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle className="text-xl">Investigative Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Generate comprehensive, court-ready reports with executive summaries, detailed 
                  findings, and actionable recommendations tailored for legal and compliance teams.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Who We Serve */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Who We Serve</h2>
          <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
            <Badge variant="outline" className="px-4 py-2 text-sm">
              Law Enforcement Agencies
            </Badge>
            <Badge variant="outline" className="px-4 py-2 text-sm">
              Financial Institutions
            </Badge>
            <Badge variant="outline" className="px-4 py-2 text-sm">
              Compliance Teams
            </Badge>
            <Badge variant="outline" className="px-4 py-2 text-sm">
              Forensic Accountants
            </Badge>
            <Badge variant="outline" className="px-4 py-2 text-sm">
              Government Agencies
            </Badge>
            <Badge variant="outline" className="px-4 py-2 text-sm">
              Legal Professionals
            </Badge>
            <Badge variant="outline" className="px-4 py-2 text-sm">
              Private Investigators
            </Badge>
            <Badge variant="outline" className="px-4 py-2 text-sm">
              Corporate Security
            </Badge>
          </div>
        </div>

        {/* Company Info */}
        <div className="max-w-4xl mx-auto">
          <Card className="shadow-elegant">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Promarma Technologies</CardTitle>
              <CardDescription className="text-base">
                Building the future of financial forensics through artificial intelligence
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                Founded by experts in financial technology, artificial intelligence, and law enforcement, 
                we understand the unique challenges faced by financial investigators. Our team combines 
                deep technical expertise with real-world experience in financial forensics and compliance.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                We are committed to advancing the field of financial forensics through responsible AI 
                development, rigorous security practices, and close collaboration with the investigative 
                community.
              </p>
              <div className="pt-4">
                <p className="font-semibold text-foreground">
                  FinNavigator — by Promarma Technologies
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default About;