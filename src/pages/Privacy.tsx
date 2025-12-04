import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DocumentHead from "@/components/common/DocumentHead";

const Privacy = () => {
  return (
    <>
      <DocumentHead 
        title="Privacy Policy — FinNavigator AI"
        description="FinNavigator AI privacy policy. Learn how we collect, use, and protect your information when using our financial forensics software."
        canonicalPath="/privacy"
        noIndex={false}
      />
      <div className="min-h-screen py-16 lg:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Privacy Policy
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              How we collect, use, and protect your information
            </p>
          </div>

          <div className="max-w-4xl mx-auto space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Information We Collect</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  We collect information you provide directly to us, such as when you create an account, 
                  upload documents for analysis, or contact us for support.
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Account information (email, name, organization)</li>
                  <li>Financial documents uploaded for analysis</li>
                  <li>Usage data and system logs</li>
                  <li>Communication records</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>How We Use Your Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  We use the information we collect to provide, maintain, and improve our services:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Process and analyze uploaded financial documents</li>
                  <li>Provide customer support and respond to inquiries</li>
                  <li>Send important service updates and security notifications</li>
                  <li>Improve our AI models and analysis capabilities</li>
                  <li>Comply with legal obligations and regulatory requirements</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data Security</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  We implement appropriate technical and organizational measures to protect your personal 
                  information against unauthorized access, alteration, disclosure, or destruction.
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Encryption in transit and at rest</li>
                  <li>Regular security assessments and audits</li>
                  <li>Access controls and authentication requirements</li>
                  <li>Secure data centers with physical security measures</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data Retention</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  We retain your information for as long as necessary to provide our services and comply 
                  with legal obligations. You may request deletion of your data at any time.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Your Rights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  You have the right to access, update, or delete your personal information. 
                  You may also request data portability or object to certain processing activities.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contact Us</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  If you have questions about this Privacy Policy, please contact us at:
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

export default Privacy;
