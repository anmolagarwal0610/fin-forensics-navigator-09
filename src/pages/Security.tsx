import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Lock, Eye, FileText, Users, Server, CheckCircle, Database } from "lucide-react";

const Security = () => {
  return (
    <div className="min-h-screen py-16 lg:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Security & Compliance
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Enterprise-grade security designed for the most sensitive financial investigations. 
            Built with compliance, privacy, and data protection at the core.
          </p>
        </div>

        {/* Security Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-success text-success-foreground rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8" />
            </div>
            <h3 className="font-semibold mb-2">SOC 2 Type II</h3>
            <p className="text-sm text-muted-foreground">
              Independently audited security controls
            </p>
          </div>
          
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-success text-success-foreground rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="h-8 w-8" />
            </div>
            <h3 className="font-semibold mb-2">End-to-End Encryption</h3>
            <p className="text-sm text-muted-foreground">
              AES-256 encryption at rest and in transit
            </p>
          </div>
          
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-success text-success-foreground rounded-full flex items-center justify-center mx-auto mb-4">
              <Eye className="h-8 w-8" />
            </div>
            <h3 className="font-semibold mb-2">Zero Trust Architecture</h3>
            <p className="text-sm text-muted-foreground">
              Continuous verification and monitoring
            </p>
          </div>
          
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-success text-success-foreground rounded-full flex items-center justify-center mx-auto mb-4">
              <Server className="h-8 w-8" />
            </div>
            <h3 className="font-semibold mb-2">Private Cloud</h3>
            <p className="text-sm text-muted-foreground">
              Dedicated infrastructure options
            </p>
          </div>
        </div>

        {/* Detailed Security Sections */}
        <div className="space-y-12 max-w-6xl mx-auto">
          {/* Data Handling */}
          <Card className="shadow-elegant">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-accent text-accent-foreground rounded-lg flex items-center justify-center">
                  <Database className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Data Handling</CardTitle>
                  <CardDescription className="text-base">
                    How we process and manage your sensitive financial data
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Data Minimization</h4>
                      <p className="text-sm text-muted-foreground">We only collect and process data necessary for analysis</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Automated Sanitization</h4>
                      <p className="text-sm text-muted-foreground">Personal identifiers are automatically masked where appropriate</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Data Classification</h4>
                      <p className="text-sm text-muted-foreground">All data is classified and handled according to sensitivity levels</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Processing Transparency</h4>
                      <p className="text-sm text-muted-foreground">Full audit trail of all data processing activities</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Storage & Encryption */}
          <Card className="shadow-elegant">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-accent text-accent-foreground rounded-lg flex items-center justify-center">
                  <Lock className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Storage & Encryption</CardTitle>
                  <CardDescription className="text-base">
                    Military-grade encryption and secure storage infrastructure
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium">AES-256 Encryption</h4>
                      <p className="text-sm text-muted-foreground">Industry-standard encryption for all data at rest</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium">TLS 1.3 in Transit</h4>
                      <p className="text-sm text-muted-foreground">All data transmission uses latest TLS encryption</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Key Management</h4>
                      <p className="text-sm text-muted-foreground">Hardware security modules (HSM) for key storage</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Regional Data Centers</h4>
                      <p className="text-sm text-muted-foreground">Data stored in geographically appropriate regions</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Backup Encryption</h4>
                      <p className="text-sm text-muted-foreground">All backups are encrypted with separate keys</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Zero-Knowledge Architecture</h4>
                      <p className="text-sm text-muted-foreground">Client-side encryption options available</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Access Controls */}
          <Card className="shadow-elegant">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-accent text-accent-foreground rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Access Controls</CardTitle>
                  <CardDescription className="text-base">
                    Role-based permissions and identity management
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Multi-Factor Authentication</h4>
                      <p className="text-sm text-muted-foreground">Required for all user accounts and API access</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Role-Based Access Control</h4>
                      <p className="text-sm text-muted-foreground">Granular permissions based on job functions</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Session Management</h4>
                      <p className="text-sm text-muted-foreground">Automatic session timeouts and device tracking</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium">SSO Integration</h4>
                      <p className="text-sm text-muted-foreground">Support for SAML, OIDC, and enterprise SSO</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium">API Security</h4>
                      <p className="text-sm text-muted-foreground">OAuth 2.0 and API key management</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Privileged Access Management</h4>
                      <p className="text-sm text-muted-foreground">Just-in-time access for administrative functions</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Audit & Logging */}
          <Card className="shadow-elegant">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-accent text-accent-foreground rounded-lg flex items-center justify-center">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Audit & Logging</CardTitle>
                  <CardDescription className="text-base">
                    Comprehensive activity monitoring and compliance reporting
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Complete Activity Logs</h4>
                      <p className="text-sm text-muted-foreground">All user actions and system events are logged</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Tamper-Proof Logging</h4>
                      <p className="text-sm text-muted-foreground">Immutable audit trails with cryptographic verification</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Real-Time Monitoring</h4>
                      <p className="text-sm text-muted-foreground">Automated alerts for suspicious activities</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Compliance Reporting</h4>
                      <p className="text-sm text-muted-foreground">Automated reports for regulatory requirements</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Retention & Deletion */}
          <Card className="shadow-elegant">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-accent text-accent-foreground rounded-lg flex items-center justify-center">
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Retention & Deletion</CardTitle>
                  <CardDescription className="text-base">
                    Configurable data lifecycle and secure deletion policies
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Flexible Retention Policies</h4>
                      <p className="text-sm text-muted-foreground">Customizable retention periods by data type</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Automated Expiration</h4>
                      <p className="text-sm text-muted-foreground">Automatic deletion based on configured policies</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Secure Deletion</h4>
                      <p className="text-sm text-muted-foreground">NIST-compliant data destruction procedures</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Legal Hold Support</h4>
                      <p className="text-sm text-muted-foreground">Suspension of deletion for litigation purposes</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Compliance Badges */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-semibold mb-8">Compliance & Certifications</h2>
          <div className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto">
            <Badge variant="outline" className="px-6 py-3 text-sm font-medium">
              SOC 2 Type II
            </Badge>
            <Badge variant="outline" className="px-6 py-3 text-sm font-medium">
              GDPR Compliant
            </Badge>
            <Badge variant="outline" className="px-6 py-3 text-sm font-medium">
              CCPA Compliant
            </Badge>
            <Badge variant="outline" className="px-6 py-3 text-sm font-medium">
              CJIS Compatible
            </Badge>
            <Badge variant="outline" className="px-6 py-3 text-sm font-medium">
              FedRAMP Ready
            </Badge>
            <Badge variant="outline" className="px-6 py-3 text-sm font-medium">
              ISO 27001
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Security;