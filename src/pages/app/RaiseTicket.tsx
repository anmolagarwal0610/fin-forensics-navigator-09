import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Ticket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import FileUploader from "@/components/app/FileUploader";

interface FileItem {
  name: string;
  size: number;
  file: File;
}

const ticketSchema = z.object({
  queryType: z.string().min(1, "Please select a query type"),
  subject: z.string().min(3, "Subject must be at least 3 characters").max(200, "Subject must be less than 200 characters"),
  description: z.string().min(20, "Description must be at least 20 characters").max(2000, "Description must be less than 2000 characters"),
  caseId: z.string().optional(),
});

type TicketFormData = z.infer<typeof ticketSchema>;

export default function RaiseTicket() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);

  const form = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      queryType: "",
      subject: "",
      description: "",
      caseId: "",
    },
  });

  // Fetch user's cases for reference
  const { data: cases } = useQuery({
    queryKey: ["user-cases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cases")
        .select("id, name")
        .eq("creator_id", user?.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch user profile
  const { data: profile } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user?.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const onSubmit = async (data: TicketFormData) => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      // Generate ticket ID
      const ticketId = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Upload files if any
      const uploadedAttachments: Array<{ name: string; url: string; size: number }> = [];
      
      if (files.length > 0) {
        for (const fileItem of files) {
          const filePath = `${user.id}/${ticketId}/${fileItem.file.name}`;
          
          const { error: uploadError } = await supabase.storage
            .from('support-attachments')
            .upload(filePath, fileItem.file);
          
          if (uploadError) {
            console.error(`Failed to upload ${fileItem.file.name}:`, uploadError);
            continue; // Skip this file but continue with others
          }

          // Generate signed URL with 7-day expiry
          const { data: signedUrlData } = await supabase.storage
            .from('support-attachments')
            .createSignedUrl(filePath, 604800); // 7 days in seconds
          
          if (signedUrlData?.signedUrl) {
            uploadedAttachments.push({
              name: fileItem.file.name,
              url: signedUrlData.signedUrl,
              size: fileItem.size
            });
          }
        }
      }

      // Get case name if case ID is provided
      let caseName = "";
      if (data.caseId) {
        const selectedCase = cases?.find(c => c.id === data.caseId);
        caseName = selectedCase?.name || "";
      }

      // Call the support ticket edge function
      const { data: ticketResponse, error: ticketError } = await supabase.functions.invoke(
        "send-support-ticket",
        {
          body: {
            ticketType: "manual",
            queryType: data.queryType,
            subject: data.subject,
            description: data.description,
            userEmail: user.email,
            userId: user.id,
            organizationName: profile?.organization_name,
            caseId: data.caseId || undefined,
            caseName: caseName || undefined,
            ticketId: ticketId,
            attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
          },
        }
      );

      if (ticketError) throw ticketError;

      toast({
        title: "Ticket submitted successfully",
        description: ticketResponse.message || "We'll respond within 24 hours.",
      });

      navigate("/app/dashboard");
    } catch (error: any) {
      console.error("Error submitting ticket:", error);
      toast({
        title: "Failed to submit ticket",
        description: error.message || "Please try again or email hello@finnavigatorai.com directly.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Raise a Support Ticket</h1>
        <p className="text-sm text-muted-foreground">
          Having trouble? Let us know and we'll get back to you as soon as possible.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Ticket className="h-8 w-8 text-primary" />
            <div>
              <CardTitle>Submit Your Issue</CardTitle>
              <CardDescription>
                Provide details about your issue and we'll help resolve it quickly.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="queryType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Query Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select issue category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PDF Processing Failed">PDF Processing Failed</SelectItem>
                        <SelectItem value="Beneficiary Data Missing">Beneficiary Data Missing</SelectItem>
                        <SelectItem value="Graph/Chart Issues">Graph/Chart Issues</SelectItem>
                        <SelectItem value="Data Extraction Errors">Data Extraction Errors</SelectItem>
                        <SelectItem value="CSV File Corrections Not Applied">CSV File Corrections Not Applied</SelectItem>
                        <SelectItem value="Analysis Results Incomplete">Analysis Results Incomplete</SelectItem>
                        <SelectItem value="File Upload Issues">File Upload Issues</SelectItem>
                        <SelectItem value="Review Page Issues">Review Page Issues</SelectItem>
                        <SelectItem value="Performance/Timeout Issues">Performance/Timeout Issues</SelectItem>
                        <SelectItem value="Account/Billing">Account/Billing</SelectItem>
                        <SelectItem value="Feature Request">Feature Request</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="caseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Related Case (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a case if applicable" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cases?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select a case if your issue is related to a specific analysis
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject *</FormLabel>
                    <FormControl>
                      <Input placeholder="Brief summary of your issue" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Please provide detailed information about your issue. Include steps to reproduce if applicable."
                        rows={8}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Minimum 20 characters. Be as specific as possible to help us resolve your issue faster.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>Attachments (Optional)</FormLabel>
                <FileUploader
                  files={files}
                  onFilesChange={setFiles}
                  maxFileSize={20 * 1024 * 1024} // 20MB
                  acceptedTypes={['.pdf', '.png', '.jpg', '.jpeg', '.xlsx', '.xls', '.csv']}
                />
                <p className="text-xs text-muted-foreground">
                  Attach screenshots, error logs, or related documents (Max 5 files, 20MB each)
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Submit Ticket"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/app/dashboard")}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
