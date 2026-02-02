import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DocumentHead from "@/components/common/DocumentHead";
import { Separator } from "@/components/ui/separator";

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
              Legal Terms and Conditions for Using FinNavigator AI
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Effective Date: February 1, 2025 | Last Updated: February 2, 2025
            </p>
          </div>

          <div className="max-w-4xl mx-auto space-y-8">
            {/* Important Notice Banner */}
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="pt-6">
                <p className="text-sm font-semibold text-destructive mb-2">IMPORTANT LEGAL NOTICE</p>
                <p className="text-sm text-muted-foreground">
                  PLEASE READ THESE TERMS OF SERVICE CAREFULLY BEFORE USING THE FINNAVIGATOR AI PLATFORM. 
                  BY ACCESSING OR USING THE SERVICE, YOU AGREE TO BE BOUND BY THESE TERMS. IF YOU DO NOT 
                  AGREE TO ALL OF THESE TERMS, DO NOT ACCESS OR USE THE SERVICE. THESE TERMS CONTAIN 
                  IMPORTANT PROVISIONS INCLUDING AN ARBITRATION AGREEMENT, CLASS ACTION WAIVER, AND 
                  LIMITATIONS ON LIABILITY.
                </p>
              </CardContent>
            </Card>

            {/* Section 1: Acceptance of Terms */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">1. Acceptance of Terms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  <strong>1.1</strong> These Terms of Service ("Terms") constitute a legally binding agreement 
                  between you ("User," "you," or "your") and <strong>Promarma Technologies LLP</strong>, a 
                  Limited Liability Partnership registered under the laws of India ("Company," "we," "us," 
                  or "our"), governing your access to and use of the FinNavigator AI platform, including all 
                  related websites, applications, software, services, and features (collectively, the "Service").
                </p>
                <p>
                  <strong>1.2</strong> By creating an account, accessing, or using the Service in any manner, 
                  you acknowledge that you have read, understood, and agree to be bound by these Terms, our 
                  Privacy Policy, and any additional terms, policies, or guidelines incorporated herein by 
                  reference.
                </p>
                <p>
                  <strong>1.3</strong> If you are using the Service on behalf of an organization, you represent 
                  and warrant that you have the authority to bind that organization to these Terms, and 
                  references to "you" shall include both you individually and the organization.
                </p>
                <p>
                  <strong>1.4</strong> We reserve the right to modify these Terms at any time. Material changes 
                  will be notified through the Service or via email. Your continued use of the Service after 
                  such modifications constitutes acceptance of the updated Terms.
                </p>
              </CardContent>
            </Card>

            {/* Section 2: Definitions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">2. Definitions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>For the purposes of these Terms, the following definitions shall apply:</p>
                <ul className="list-none space-y-3 pl-4">
                  <li>
                    <strong>"AI-Generated Content"</strong> means any output, analysis, report, visualization, 
                    summary, or other content produced by the Service through the use of artificial intelligence 
                    or machine learning technologies.
                  </li>
                  <li>
                    <strong>"Input Data"</strong> means any documents, files, data, information, or materials 
                    that you upload, submit, or otherwise provide to the Service for processing or analysis.
                  </li>
                  <li>
                    <strong>"Confidential Information"</strong> means any non-public information disclosed by 
                    either party to the other, including but not limited to business information, technical 
                    data, trade secrets, and proprietary information.
                  </li>
                  <li>
                    <strong>"Subscription"</strong> means the paid access tier selected by you that governs 
                    the scope, features, and usage limits of the Service available to you.
                  </li>
                  <li>
                    <strong>"Authorized Users"</strong> means individuals authorized by you to access and use 
                    the Service under your account.
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Section 3: Service Description */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">3. Service Description</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  <strong>3.1</strong> FinNavigator AI is an artificial intelligence-powered platform designed 
                  to assist in the analysis of financial documents for forensic investigation, compliance 
                  review, and audit purposes. The Service processes Input Data using machine learning algorithms 
                  to generate analytical outputs including but not limited to transaction pattern analysis, 
                  fund flow visualizations, anomaly detection, and summary reports.
                </p>
                <p>
                  <strong>3.2</strong> The Service is intended for use by trained professionals including law 
                  enforcement agencies, financial institutions, compliance officers, forensic accountants, 
                  auditors, and other qualified professionals in their official or professional capacity.
                </p>
                <p>
                  <strong>3.3</strong> The Service is provided as a technological tool to assist in analysis 
                  and is not a substitute for professional judgment, legal advice, financial advice, or the 
                  expertise of qualified professionals.
                </p>
              </CardContent>
            </Card>

            {/* Section 4: AI Technology Disclaimer - CRITICAL */}
            <Card className="border-primary/50">
              <CardHeader className="bg-primary/5">
                <CardTitle className="text-xl text-primary">4. AI Technology Disclaimer</CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  THIS SECTION CONTAINS CRITICAL INFORMATION ABOUT THE LIMITATIONS OF AI TECHNOLOGY
                </p>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="bg-muted/50 p-4 rounded-lg border">
                  <p className="text-sm font-semibold uppercase tracking-wide mb-3">
                    IMPORTANT: READ CAREFULLY
                  </p>
                  <p className="text-sm text-muted-foreground">
                    THE SERVICE UTILIZES ARTIFICIAL INTELLIGENCE AND MACHINE LEARNING TECHNOLOGIES WHICH ARE 
                    INHERENTLY PROBABILISTIC IN NATURE. THE OUTPUTS GENERATED BY THE SERVICE MAY CONTAIN 
                    ERRORS, INACCURACIES, OMISSIONS, INCOMPLETE INFORMATION, OR "HALLUCINATIONS" (OUTPUTS 
                    THAT APPEAR PLAUSIBLE BUT ARE FACTUALLY INCORRECT).
                  </p>
                </div>
                
                <p className="text-muted-foreground">
                  <strong>4.1</strong> You expressly acknowledge and agree that:
                </p>
                <ul className="list-[lower-alpha] pl-8 space-y-2 text-muted-foreground">
                  <li>
                    AI-Generated Content should be treated as <strong>preliminary analysis only</strong> and 
                    not as definitive conclusions, findings, or determinations;
                  </li>
                  <li>
                    You <strong>must independently verify</strong> all AI-Generated Content through qualified 
                    professional review before relying upon, acting on, or making any decisions based on such 
                    content;
                  </li>
                  <li>
                    The Company makes <strong>no representations, warranties, or guarantees</strong> regarding 
                    the accuracy, completeness, reliability, timeliness, or suitability of any AI-Generated 
                    Content for any particular purpose;
                  </li>
                  <li>
                    You <strong>assume all risk</strong> associated with the use of AI-Generated Content, 
                    including any consequences arising from errors, inaccuracies, or omissions therein;
                  </li>
                  <li>
                    The Service may not detect all relevant patterns, anomalies, or issues within your 
                    Input Data, and <strong>the absence of findings does not indicate the absence of problems</strong>;
                  </li>
                  <li>
                    AI technology is continuously evolving, and the performance characteristics of the 
                    Service may change over time without notice.
                  </li>
                </ul>

                <p className="text-muted-foreground">
                  <strong>4.2</strong> The Company explicitly disclaims any responsibility for:
                </p>
                <ul className="list-[lower-alpha] pl-8 space-y-2 text-muted-foreground">
                  <li>
                    Any decisions made based on AI-Generated Content;
                  </li>
                  <li>
                    Any actions taken or not taken as a result of relying on AI-Generated Content;
                  </li>
                  <li>
                    Any legal, financial, regulatory, or professional consequences arising from the use of 
                    AI-Generated Content;
                  </li>
                  <li>
                    Any third-party claims arising from your use of or reliance on AI-Generated Content.
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Section 5: User Responsibilities */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">5. User Responsibilities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  <strong>5.1 Verification Obligation.</strong> You agree and undertake to independently 
                  verify all AI-Generated Content before using such content for any purpose, including but 
                  not limited to:
                </p>
                <ul className="list-[lower-alpha] pl-8 space-y-2">
                  <li>Making any business, legal, financial, or professional decisions;</li>
                  <li>Filing any reports with regulatory authorities or courts;</li>
                  <li>Taking any actions that may affect third parties;</li>
                  <li>Relying on such content in any official proceeding or investigation.</li>
                </ul>

                <p>
                  <strong>5.2 Professional Review.</strong> You agree that all AI-Generated Content shall be 
                  reviewed by qualified professionals with appropriate expertise before any reliance thereon. 
                  Such professionals may include, as applicable, certified forensic accountants, legal counsel, 
                  compliance officers, or other appropriately qualified individuals.
                </p>

                <p>
                  <strong>5.3 Input Data Authorization.</strong> You represent, warrant, and undertake that:
                </p>
                <ul className="list-[lower-alpha] pl-8 space-y-2">
                  <li>
                    You have all necessary rights, permissions, authorizations, and consents to upload, 
                    process, and analyze all Input Data through the Service;
                  </li>
                  <li>
                    The upload and processing of Input Data does not violate any applicable law, regulation, 
                    court order, or third-party rights including privacy and data protection rights;
                  </li>
                  <li>
                    You have obtained all required consents from data subjects whose personal information 
                    may be contained in the Input Data;
                  </li>
                  <li>
                    You will comply with all applicable data protection laws and regulations in connection 
                    with your use of the Service.
                  </li>
                </ul>

                <p>
                  <strong>5.4 Accuracy of Input Data.</strong> You are solely responsible for the accuracy, 
                  quality, integrity, legality, and reliability of all Input Data. The Company shall have 
                  no liability for any errors, inaccuracies, or omissions in AI-Generated Content that 
                  result from errors, inaccuracies, or omissions in your Input Data.
                </p>

                <p>
                  <strong>5.5 Compliance.</strong> You shall use the Service in compliance with all applicable 
                  laws, regulations, and industry standards, including but not limited to the Information 
                  Technology Act, 2000, and any applicable data protection legislation.
                </p>
              </CardContent>
            </Card>

            {/* Section 6: Acceptable Use */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">6. Acceptable Use</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  <strong>6.1</strong> You agree not to use the Service for any purpose that is unlawful or 
                  prohibited by these Terms, or to solicit the performance of any illegal activity.
                </p>
                <p><strong>6.2</strong> Specifically, you shall not:</p>
                <ul className="list-[lower-alpha] pl-8 space-y-2">
                  <li>
                    Upload, transmit, or process any Input Data that you do not have lawful authorization 
                    to process;
                  </li>
                  <li>
                    Use the Service to violate any international, federal, state, or local regulations, 
                    rules, laws, or ordinances;
                  </li>
                  <li>
                    Infringe upon or violate our intellectual property rights or the intellectual property 
                    rights of others;
                  </li>
                  <li>
                    Attempt to reverse engineer, decompile, disassemble, or otherwise attempt to derive the 
                    source code, algorithms, or underlying models of the Service;
                  </li>
                  <li>
                    Use the Service to train, develop, or improve competing AI or machine learning systems;
                  </li>
                  <li>
                    Share, transfer, or allow access to your account credentials to unauthorized parties;
                  </li>
                  <li>
                    Use automated means (bots, scrapers, etc.) to access the Service except as expressly 
                    permitted;
                  </li>
                  <li>
                    Interfere with or disrupt the integrity or performance of the Service or related systems;
                  </li>
                  <li>
                    Upload or transmit viruses, malware, or any other malicious code;
                  </li>
                  <li>
                    Use the Service in any manner that could damage, disable, overburden, or impair the 
                    Service.
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Section 7: Account Terms */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">7. Account Terms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  <strong>7.1 Registration.</strong> To access the Service, you must create an account by 
                  providing accurate, current, and complete information. You agree to update your account 
                  information promptly to maintain its accuracy.
                </p>
                <p>
                  <strong>7.2 Account Security.</strong> You are responsible for maintaining the 
                  confidentiality of your account credentials and for all activities that occur under your 
                  account. You agree to notify us immediately of any unauthorized access or use of your 
                  account.
                </p>
                <p>
                  <strong>7.3 Account Termination by User.</strong> You may terminate your account at any 
                  time by following the account closure procedures in the Service. Upon termination, your 
                  right to access the Service will cease immediately.
                </p>
                <p>
                  <strong>7.4 Account Termination by Company.</strong> We reserve the right to suspend or 
                  terminate your account at any time, with or without cause, and with or without notice, 
                  including but not limited to cases of suspected violation of these Terms, fraudulent 
                  activity, or non-payment of fees.
                </p>
                <p>
                  <strong>7.5 Effect of Termination.</strong> Upon termination of your account:
                </p>
                <ul className="list-[lower-alpha] pl-8 space-y-2">
                  <li>All licenses granted to you under these Terms will immediately terminate;</li>
                  <li>You must immediately cease all use of the Service;</li>
                  <li>
                    We may delete your Input Data and AI-Generated Content after a reasonable period, 
                    subject to our data retention policies and legal obligations;
                  </li>
                  <li>
                    You shall not be entitled to any refund of fees except as expressly provided in these 
                    Terms.
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Section 8: Intellectual Property */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">8. Intellectual Property Rights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  <strong>8.1 Company Ownership.</strong> The Service, including all software, algorithms, 
                  models, interfaces, designs, trademarks, trade secrets, and other intellectual property 
                  embodied therein, is and shall remain the exclusive property of Promarma Technologies LLP 
                  and its licensors. These Terms do not grant you any ownership rights in the Service.
                </p>
                <p>
                  <strong>8.2 License Grant.</strong> Subject to your compliance with these Terms, we grant 
                  you a limited, non-exclusive, non-transferable, revocable license to access and use the 
                  Service solely for your internal business purposes during the term of your Subscription.
                </p>
                <p>
                  <strong>8.3 Your Input Data.</strong> You retain all ownership rights in your Input Data. 
                  By uploading Input Data to the Service, you grant us a limited license to process, analyze, 
                  and store such data solely for the purpose of providing the Service to you.
                </p>
                <p>
                  <strong>8.4 AI-Generated Content.</strong> Subject to our underlying intellectual property 
                  rights in the Service and its outputs, you may use AI-Generated Content produced from your 
                  Input Data for your internal business purposes, subject to the disclaimers and limitations 
                  set forth in these Terms.
                </p>
                <p>
                  <strong>8.5 Feedback.</strong> Any feedback, suggestions, or ideas you provide regarding 
                  the Service shall become our exclusive property, and we may use such feedback without 
                  restriction or compensation to you.
                </p>
                <p>
                  <strong>8.6 Restrictions.</strong> You shall not:
                </p>
                <ul className="list-[lower-alpha] pl-8 space-y-2">
                  <li>Copy, modify, or create derivative works of the Service;</li>
                  <li>Sublicense, sell, lease, or otherwise transfer access to the Service;</li>
                  <li>
                    Remove or alter any proprietary notices, labels, or marks on the Service or 
                    AI-Generated Content.
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Section 9: Data Processing */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">9. Data Processing and Privacy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  <strong>9.1 Data Processing.</strong> We will process your Input Data solely for the 
                  purpose of providing the Service to you in accordance with these Terms and our Privacy 
                  Policy.
                </p>
                <p>
                  <strong>9.2 Data Security.</strong> We implement reasonable technical and organizational 
                  measures to protect your Input Data against unauthorized access, loss, or destruction. 
                  However, no system is completely secure, and we cannot guarantee absolute security.
                </p>
                <p>
                  <strong>9.3 Data Retention.</strong> We will retain your Input Data and AI-Generated 
                  Content for the period necessary to provide the Service and as required by applicable 
                  law. Upon termination of your account, we will delete or anonymize your data in accordance 
                  with our data retention policies.
                </p>
                <p>
                  <strong>9.4 Aggregated Data.</strong> We may create anonymized, aggregated data derived 
                  from your use of the Service for purposes including service improvement, analytics, and 
                  research. Such aggregated data will not identify you or any individual.
                </p>
                <p>
                  <strong>9.5 Third-Party Processors.</strong> We may engage third-party service providers 
                  to assist in providing the Service. Such providers are bound by confidentiality obligations 
                  and are only permitted to process data as necessary to provide services to us.
                </p>
              </CardContent>
            </Card>

            {/* Section 10: Fees and Payment */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">10. Fees and Payment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  <strong>10.1 Subscription Fees.</strong> Access to certain features of the Service requires 
                  a paid Subscription. Subscription fees are as set forth on our pricing page at the time of 
                  purchase.
                </p>
                <p>
                  <strong>10.2 Payment Terms.</strong> All fees are payable in advance in accordance with 
                  the billing cycle selected at the time of purchase. We accept payment methods as indicated 
                  on the Service.
                </p>
                <p>
                  <strong>10.3 Taxes.</strong> All fees are exclusive of applicable taxes. You are responsible 
                  for paying all applicable taxes, including GST, in connection with your use of the Service.
                </p>
                <p>
                  <strong>10.4 Price Changes.</strong> We reserve the right to change our fees at any time. 
                  Price changes will be effective at the start of the next billing cycle following notice 
                  to you.
                </p>
                <p>
                  <strong>10.5 Refund Policy.</strong> Except as required by applicable law, all fees are 
                  non-refundable. No refunds will be provided for partial use, unused features, or early 
                  termination of a Subscription.
                </p>
                <p>
                  <strong>10.6 Late Payment.</strong> If any payment is not received by the due date, we 
                  may suspend or terminate your access to the Service and charge interest on overdue amounts 
                  at the rate of 1.5% per month or the maximum rate permitted by law, whichever is lower.
                </p>
              </CardContent>
            </Card>

            {/* Section 11: Service Availability */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">11. Service Availability</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  <strong>11.1 No Uptime Guarantee.</strong> While we strive to maintain high availability 
                  of the Service, we do not guarantee any specific level of uptime or availability. The 
                  Service may be unavailable due to scheduled maintenance, unscheduled maintenance, system 
                  failures, or circumstances beyond our control.
                </p>
                <p>
                  <strong>11.2 Modifications.</strong> We reserve the right to modify, update, or discontinue 
                  any feature or aspect of the Service at any time, with or without notice. We shall not be 
                  liable to you or any third party for any modification, suspension, or discontinuation of 
                  the Service.
                </p>
                <p>
                  <strong>11.3 Maintenance.</strong> We may perform scheduled and unscheduled maintenance 
                  on the Service. We will endeavor to provide advance notice of scheduled maintenance when 
                  practicable, but we are not obligated to do so.
                </p>
                <p>
                  <strong>11.4 Force Majeure.</strong> We shall not be liable for any delay or failure in 
                  performance resulting from causes beyond our reasonable control, including but not limited 
                  to acts of God, war, terrorism, riots, embargoes, acts of civil or military authorities, 
                  fire, floods, epidemics, pandemics, strikes, or failures of third-party services.
                </p>
              </CardContent>
            </Card>

            {/* Section 12: Disclaimer of Warranties - CRITICAL */}
            <Card className="border-destructive/50">
              <CardHeader className="bg-destructive/5">
                <CardTitle className="text-xl text-destructive">12. Disclaimer of Warranties</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="bg-muted/50 p-4 rounded-lg border text-sm uppercase tracking-wide">
                  <p className="font-semibold mb-3">
                    PLEASE READ THIS SECTION CAREFULLY AS IT LIMITS OUR LIABILITY TO YOU
                  </p>
                  <p className="text-muted-foreground normal-case">
                    <strong>12.1</strong> THE SERVICE, INCLUDING ALL AI-GENERATED CONTENT, IS PROVIDED ON AN 
                    "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR 
                    IMPLIED.
                  </p>
                </div>
                
                <p className="text-muted-foreground">
                  <strong>12.2</strong> TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, PROMARMA 
                  TECHNOLOGIES LLP EXPRESSLY DISCLAIMS ALL WARRANTIES, WHETHER EXPRESS, IMPLIED, STATUTORY, 
                  OR OTHERWISE, INCLUDING BUT NOT LIMITED TO:
                </p>
                <ul className="list-[lower-alpha] pl-8 space-y-2 text-muted-foreground">
                  <li>
                    IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND 
                    NON-INFRINGEMENT;
                  </li>
                  <li>
                    WARRANTIES THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE OF 
                    VIRUSES OR OTHER HARMFUL COMPONENTS;
                  </li>
                  <li>
                    WARRANTIES REGARDING THE ACCURACY, COMPLETENESS, RELIABILITY, TIMELINESS, OR 
                    CORRECTNESS OF ANY AI-GENERATED CONTENT;
                  </li>
                  <li>
                    WARRANTIES THAT THE SERVICE WILL MEET YOUR REQUIREMENTS OR EXPECTATIONS;
                  </li>
                  <li>
                    WARRANTIES THAT DEFECTS WILL BE CORRECTED OR THAT THE SERVICE WILL BE COMPATIBLE 
                    WITH ANY PARTICULAR HARDWARE OR SOFTWARE.
                  </li>
                </ul>

                <p className="text-muted-foreground">
                  <strong>12.3</strong> YOU ACKNOWLEDGE THAT YOU ARE USING THE SERVICE AT YOUR OWN RISK. 
                  ANY MATERIAL DOWNLOADED OR OTHERWISE OBTAINED THROUGH THE USE OF THE SERVICE IS ACCESSED 
                  AT YOUR OWN DISCRETION AND RISK.
                </p>

                <p className="text-muted-foreground">
                  <strong>12.4</strong> NO ADVICE OR INFORMATION, WHETHER ORAL OR WRITTEN, OBTAINED BY YOU 
                  FROM THE COMPANY OR THROUGH THE SERVICE SHALL CREATE ANY WARRANTY NOT EXPRESSLY STATED 
                  IN THESE TERMS.
                </p>
              </CardContent>
            </Card>

            {/* Section 13: Limitation of Liability - CRITICAL */}
            <Card className="border-destructive/50">
              <CardHeader className="bg-destructive/5">
                <CardTitle className="text-xl text-destructive">13. Limitation of Liability</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="bg-muted/50 p-4 rounded-lg border">
                  <p className="text-sm font-semibold uppercase tracking-wide mb-3">
                    CRITICAL: LIABILITY CAP AND EXCLUSIONS
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>13.1</strong> TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT 
                    SHALL PROMARMA TECHNOLOGIES LLP, ITS PARTNERS, DIRECTORS, EMPLOYEES, AGENTS, AFFILIATES, 
                    SUCCESSORS, OR LICENSORS (COLLECTIVELY, THE "COMPANY PARTIES") BE LIABLE FOR:
                  </p>
                </div>

                <ul className="list-[lower-alpha] pl-8 space-y-2 text-muted-foreground">
                  <li>
                    ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY DAMAGES, 
                    INCLUDING BUT NOT LIMITED TO DAMAGES FOR LOSS OF PROFITS, REVENUE, GOODWILL, DATA, 
                    BUSINESS OPPORTUNITIES, OR OTHER INTANGIBLE LOSSES;
                  </li>
                  <li>
                    ANY DAMAGES ARISING FROM YOUR USE OF OR INABILITY TO USE THE SERVICE OR AI-GENERATED 
                    CONTENT;
                  </li>
                  <li>
                    ANY DAMAGES ARISING FROM ERRORS, INACCURACIES, OMISSIONS, OR HALLUCINATIONS IN 
                    AI-GENERATED CONTENT;
                  </li>
                  <li>
                    ANY DAMAGES ARISING FROM UNAUTHORIZED ACCESS TO OR ALTERATION OF YOUR TRANSMISSIONS 
                    OR DATA;
                  </li>
                  <li>
                    ANY DAMAGES ARISING FROM DECISIONS MADE OR ACTIONS TAKEN BASED ON AI-GENERATED CONTENT;
                  </li>
                  <li>
                    ANY DAMAGES ARISING FROM THIRD-PARTY CLAIMS RELATED TO YOUR USE OF THE SERVICE OR 
                    AI-GENERATED CONTENT.
                  </li>
                </ul>

                <Separator className="my-4" />

                <p className="text-muted-foreground">
                  <strong>13.2 LIABILITY CAP.</strong> NOTWITHSTANDING ANYTHING TO THE CONTRARY CONTAINED 
                  HEREIN, THE TOTAL AGGREGATE LIABILITY OF THE COMPANY PARTIES FOR ANY AND ALL CLAIMS 
                  ARISING OUT OF OR RELATING TO THESE TERMS OR YOUR USE OF THE SERVICE SHALL NOT EXCEED 
                  THE GREATER OF:
                </p>
                <ul className="list-[lower-alpha] pl-8 space-y-2 text-muted-foreground">
                  <li>
                    THE TOTAL AMOUNTS PAID BY YOU TO THE COMPANY IN THE TWELVE (12) MONTHS IMMEDIATELY 
                    PRECEDING THE EVENT GIVING RISE TO THE CLAIM; OR
                  </li>
                  <li>
                    ONE HUNDRED UNITED STATES DOLLARS (USD $100).
                  </li>
                </ul>

                <p className="text-muted-foreground">
                  <strong>13.3</strong> THE LIMITATIONS IN THIS SECTION SHALL APPLY REGARDLESS OF THE FORM 
                  OF ACTION, WHETHER IN CONTRACT, TORT (INCLUDING NEGLIGENCE), STRICT LIABILITY, OR 
                  OTHERWISE, AND EVEN IF THE COMPANY PARTIES HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH 
                  DAMAGES.
                </p>

                <p className="text-muted-foreground">
                  <strong>13.4</strong> SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OR LIMITATION OF 
                  CERTAIN DAMAGES. IN SUCH JURISDICTIONS, THE LIABILITY OF THE COMPANY PARTIES SHALL BE 
                  LIMITED TO THE MAXIMUM EXTENT PERMITTED BY LAW.
                </p>
              </CardContent>
            </Card>

            {/* Section 14: Indemnification */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">14. Indemnification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  <strong>14.1</strong> You agree to defend, indemnify, and hold harmless Promarma 
                  Technologies LLP and its partners, officers, directors, employees, agents, affiliates, 
                  successors, and assigns (collectively, "Indemnified Parties") from and against any and 
                  all claims, damages, losses, liabilities, costs, and expenses (including reasonable 
                  attorneys' fees and legal costs) arising out of or relating to:
                </p>
                <ul className="list-[lower-alpha] pl-8 space-y-2">
                  <li>
                    Your access to or use of the Service, including any AI-Generated Content;
                  </li>
                  <li>
                    Your Input Data, including any claims that your Input Data infringes or violates the 
                    rights of any third party;
                  </li>
                  <li>
                    Your violation of these Terms or any applicable law, regulation, or third-party rights;
                  </li>
                  <li>
                    Any decisions made or actions taken by you or third parties based on AI-Generated 
                    Content;
                  </li>
                  <li>
                    Any claims by third parties arising from your use of the Service or AI-Generated 
                    Content, including claims of harm, damage, or injury;
                  </li>
                  <li>
                    Your negligence or willful misconduct.
                  </li>
                </ul>

                <p>
                  <strong>14.2</strong> The Company reserves the right, at your expense, to assume the 
                  exclusive defense and control of any matter for which you are required to indemnify the 
                  Indemnified Parties, and you agree to cooperate with our defense of these claims.
                </p>

                <p>
                  <strong>14.3</strong> You shall not settle any claim without the prior written consent 
                  of the Company if such settlement would impose any obligation or liability on the 
                  Indemnified Parties.
                </p>
              </CardContent>
            </Card>

            {/* Section 15: Governing Law & Disputes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">15. Governing Law and Dispute Resolution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  <strong>15.1 Governing Law.</strong> These Terms and any dispute or claim arising out of 
                  or in connection with them or their subject matter shall be governed by and construed in 
                  accordance with the laws of India, without regard to its conflict of law provisions.
                </p>
                
                <p>
                  <strong>15.2 Arbitration Agreement.</strong> Any dispute, controversy, or claim arising 
                  out of or relating to these Terms or the breach, termination, or invalidity thereof, 
                  shall be settled by binding arbitration administered in accordance with the Arbitration 
                  and Conciliation Act, 1996 of India. The seat and venue of arbitration shall be New Delhi, 
                  India. The arbitration shall be conducted by a sole arbitrator mutually appointed by the 
                  parties. The language of arbitration shall be English.
                </p>

                <p>
                  <strong>15.3 Class Action Waiver.</strong> YOU AND THE COMPANY AGREE THAT EACH PARTY MAY 
                  BRING CLAIMS AGAINST THE OTHER ONLY IN YOUR OR ITS INDIVIDUAL CAPACITY AND NOT AS A 
                  PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS, CONSOLIDATED, OR REPRESENTATIVE 
                  PROCEEDING. Unless both you and the Company agree otherwise, the arbitrator may not 
                  consolidate or join more than one person's or party's claims.
                </p>

                <p>
                  <strong>15.4 Injunctive Relief.</strong> Notwithstanding the foregoing, either party may 
                  seek injunctive or other equitable relief in any court of competent jurisdiction to 
                  protect its intellectual property rights or Confidential Information pending the outcome 
                  of arbitration.
                </p>

                <p>
                  <strong>15.5 Limitation Period.</strong> Any claim or cause of action arising out of or 
                  related to these Terms or the Service must be filed within one (1) year after such claim 
                  or cause of action arose, or it shall be forever barred.
                </p>

                <p>
                  <strong>15.6 Exclusive Jurisdiction.</strong> For any matters not subject to arbitration, 
                  the courts located in New Delhi, India shall have exclusive jurisdiction, and you consent 
                  to the personal jurisdiction of such courts.
                </p>
              </CardContent>
            </Card>

            {/* Section 16: General Provisions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">16. General Provisions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  <strong>16.1 Entire Agreement.</strong> These Terms, together with the Privacy Policy and 
                  any other agreements expressly incorporated by reference, constitute the entire agreement 
                  between you and the Company regarding the Service and supersede all prior agreements, 
                  representations, and understandings.
                </p>
                
                <p>
                  <strong>16.2 Severability.</strong> If any provision of these Terms is held to be invalid, 
                  illegal, or unenforceable, the remaining provisions shall continue in full force and 
                  effect. The invalid provision shall be modified to the minimum extent necessary to make 
                  it valid, legal, and enforceable while preserving its original intent.
                </p>

                <p>
                  <strong>16.3 Waiver.</strong> The failure of the Company to enforce any right or provision 
                  of these Terms shall not constitute a waiver of such right or provision. Any waiver of 
                  any provision of these Terms will be effective only if in writing and signed by the 
                  Company.
                </p>

                <p>
                  <strong>16.4 Assignment.</strong> You may not assign or transfer these Terms or any rights 
                  or obligations hereunder without the prior written consent of the Company. The Company 
                  may assign or transfer these Terms without restriction.
                </p>

                <p>
                  <strong>16.5 Notices.</strong> All notices under these Terms shall be in writing and shall 
                  be deemed given when delivered personally, sent by email to the addresses on file, or 
                  sent by certified mail, return receipt requested.
                </p>

                <p>
                  <strong>16.6 Relationship of Parties.</strong> Nothing in these Terms shall be construed 
                  to create a partnership, joint venture, employment, or agency relationship between you 
                  and the Company.
                </p>

                <p>
                  <strong>16.7 Third-Party Rights.</strong> These Terms do not confer any rights on any 
                  third party, except that the Indemnified Parties are intended third-party beneficiaries 
                  of the indemnification and limitation of liability provisions.
                </p>

                <p>
                  <strong>16.8 Survival.</strong> The provisions of these Terms that by their nature should 
                  survive termination shall survive, including but not limited to Sections 4, 5, 8, 12, 13, 
                  14, 15, and 16.
                </p>

                <p>
                  <strong>16.9 Export Compliance.</strong> You agree to comply with all applicable export 
                  and import control laws and regulations in connection with your use of the Service.
                </p>

                <p>
                  <strong>16.10 Headings.</strong> The headings in these Terms are for convenience only and 
                  shall not affect their interpretation.
                </p>
              </CardContent>
            </Card>

            {/* Section 17: Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">17. Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  If you have any questions about these Terms of Service, or if you need to contact us for 
                  any reason, please reach out to us at:
                </p>
                
                <div className="bg-muted/30 p-6 rounded-lg border space-y-2">
                  <p className="font-semibold text-foreground">Promarma Technologies LLP</p>
                  <p>Email: <a href="mailto:legal@finnavigatorai.com" className="text-primary hover:underline">legal@finnavigatorai.com</a></p>
                  <p>General Inquiries: <a href="mailto:hello@finnavigatorai.com" className="text-primary hover:underline">hello@finnavigatorai.com</a></p>
                  <p>Website: <a href="https://finnavigatorai.com" className="text-primary hover:underline">https://finnavigatorai.com</a></p>
                </div>

                <p className="text-sm">
                  For legal notices under these Terms, please send correspondence to our registered office 
                  address or via email to <a href="mailto:legal@finnavigatorai.com" className="text-primary hover:underline">legal@finnavigatorai.com</a>.
                </p>
              </CardContent>
            </Card>

            {/* Acknowledgment Section */}
            <Card className="bg-muted/30">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground text-center">
                  BY USING THE FINNAVIGATOR AI SERVICE, YOU ACKNOWLEDGE THAT YOU HAVE READ THESE TERMS OF 
                  SERVICE, UNDERSTAND THEM, AND AGREE TO BE BOUND BY THEM. IF YOU DO NOT AGREE TO THESE 
                  TERMS, YOU MUST NOT ACCESS OR USE THE SERVICE.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-16 text-sm text-muted-foreground space-y-2">
            <p>FinNavigator AI — by Promarma Technologies LLP</p>
            <p>Last updated: February 2025</p>
            <p className="text-xs">© 2025 Promarma Technologies LLP. All rights reserved.</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Terms;
