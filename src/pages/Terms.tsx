import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DocumentHead from "@/components/common/DocumentHead";

const Terms = () => {
  return (
    <>
      <DocumentHead 
        title="Terms of Service — FinNavigator AI"
        description="Terms of service for FinNavigator AI financial forensics software. Legal terms and conditions for using our platform."
        canonicalPath="/terms"
        noIndex={false}
      />
      <div className="min-h-screen py-16 lg:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Terms of Service
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Legal terms and conditions for using FinNavigator AI
            </p>
          </div>

          <div className="max-w-4xl mx-auto space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Acceptance of Terms</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  By accessing and using FinNavigator AI, you accept and agree to be bound by the terms 
                  and provision of this agreement. If you do not agree to abide by the above, 
                  please do not use this service.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Service Description</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  FinNavigator AI provides AI-powered financial document analysis services for 
                  forensic investigations and compliance purposes.
                </p>
                <p className="text-muted-foreground">
                  The service is intended for use by law enforcement agencies, financial institutions, 
                  compliance teams, and other authorized professionals in their official capacity.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Acceptable Use</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">You agree not to use the service:</p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>For any unlawful purpose or to solicit unlawful activity</li>
                  <li>To violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances</li>
                  <li>To infringe upon or violate our intellectual property rights or the intellectual property rights of others</li>
                  <li>To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate</li>
                  <li>To submit false or misleading information</li>
                  <li>To upload or transmit viruses or any other type of malicious code</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Intellectual Property Rights</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  The service and its original content, features, and functionality are and will remain 
                  the exclusive property of Promarma Technologies and its licensors. The service is 
                  protected by copyright, trademark, and other laws.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Disclaimer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  The information on this service is provided on an "as is" basis. To the fullest extent 
                  permitted by law, this Company excludes all representations, warranties, conditions and 
                  terms relating to our service.
                </p>
                <p className="text-muted-foreground">
                  FinNavigator AI is a tool to assist in financial analysis and should not be considered 
                  as legal advice or a substitute for professional judgment.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Limitation of Liability</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  In no event shall Promarma Technologies, nor its directors, employees, partners, agents, 
                  suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, 
                  or punitive damages, including without limitation, loss of profits, data, use, goodwill, 
                  or other intangible losses.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Governing Law</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  These Terms shall be interpreted and governed by the laws of the jurisdiction in which 
                  Promarma Technologies operates, without regard to its conflict of law provisions.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  If you have any questions about these Terms of Service, please contact us at:
                </p>
                <p className="font-semibold mt-2">hello@finnavigatorai.com</p>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-16 text-sm text-muted-foreground">
            <p>FinNavigator AI — by Promarma Technologies</p>
            <p className="mt-2">Last updated: December 2024</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Terms;
