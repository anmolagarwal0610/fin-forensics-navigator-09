import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import DocumentHead from "@/components/common/DocumentHead";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  organization: z.string().trim().max(200, "Organization name must be less than 200 characters").optional(),
  message: z.string().trim().min(1, "Message is required").max(2000, "Message must be less than 2000 characters")
});

type ContactFormData = z.infer<typeof contactSchema>;

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    organization: "",
    message: ""
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Validate inputs with Zod
      const validatedData = contactSchema.parse(formData);

      // Call edge function to send emails
      const { data, error } = await supabase.functions.invoke('send-contact-email', {
        body: validatedData
      });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to send your message. Please try again or email us directly at hello@finnavigatorai.com",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Show success message
      toast({
        title: "✓ Message Received",
        description: "Thank you for contacting us. A confirmation email has been sent to your inbox. Our team will respond within 24 hours.",
        className: "border-l-4 border-l-primary",
      });
      
      // Reset form
      setFormData({
        name: "",
        email: "",
        organization: "",
        message: ""
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "An unexpected error occurred. Please try again later.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <DocumentHead 
        title="Contact Us — FinNavigator AI"
        description="Get in touch with FinNavigator AI team. Request a demo, discuss enterprise requirements, or ask questions about our financial forensics software."
        canonicalPath="/contact"
      />
      <div className="min-h-screen py-16 lg:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Contact Us
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Ready to accelerate your financial investigations? Get in touch with our team to discuss 
              your requirements and learn how FinNavigator AI can support your work.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Contact Form */}
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle className="text-2xl">Send us a message</CardTitle>
                <CardDescription className="text-base">
                  Fill out the form below and we'll get back to you within 24 hours.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        required
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Your full name"
                        maxLength={100}
                        aria-required="true"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="your.email@example.com"
                        maxLength={255}
                        aria-required="true"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="organization">Organization</Label>
                    <Input
                      id="organization"
                      name="organization"
                      type="text"
                      value={formData.organization}
                      onChange={handleInputChange}
                      placeholder="Your organization or agency"
                      maxLength={200}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="message">Message *</Label>
                    <Textarea
                      id="message"
                      name="message"
                      required
                      value={formData.message}
                      onChange={handleInputChange}
                      placeholder="Tell us about your requirements, use case, or any questions you have..."
                      rows={5}
                      maxLength={2000}
                      aria-required="true"
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    size="lg" 
                    variant="cta" 
                    className="w-full"
                    disabled={isSubmitting}
                    aria-label="Send message"
                  >
                    {isSubmitting ? (
                      "Sending..."
                    ) : (
                      <>
                        Send Message
                        <Send className="ml-2 h-4 w-4" aria-hidden="true" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <div className="space-y-8">
              <Card className="shadow-elegant">
                <CardHeader>
                  <CardTitle className="text-2xl">Get in touch</CardTitle>
                  <CardDescription className="text-base">
                    Multiple ways to reach our team for support, sales, or partnerships.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-accent text-accent-foreground rounded-lg flex items-center justify-center flex-shrink-0">
                      <Mail className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Email</h4>
                      <p className="text-muted-foreground">hello@finnavigatorai.com</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        We typically respond within 24 hours
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-accent text-accent-foreground rounded-lg flex items-center justify-center flex-shrink-0">
                      <Phone className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Phone</h4>
                      <p className="text-muted-foreground">+91-7774008649</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        For enterprise clients and government agencies
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-accent text-accent-foreground rounded-lg flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Location</h4>
                      <p className="text-muted-foreground">Remote-first company</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Serving clients globally with regional data centers
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-elegant bg-muted/30 border-none">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-3">Enterprise & Government Clients</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    For enterprise implementations, government contracts, or custom deployment 
                    requirements, we offer dedicated support channels and expedited response times.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Mention "Enterprise" or "Government" in your message for priority handling.
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-elegant">
                <CardContent className="p-6 text-center">
                  <h3 className="font-semibold mb-2">FinNavigator AI</h3>
                  <p className="text-sm text-muted-foreground">
                    by Promarma Technologies
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Contact;
