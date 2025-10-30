import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Ticket, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/app/AppLayout";
import { useQuery } from "@tanstack/react-query";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
const MAX_TOTAL_SIZE = 20 * 1024 * 1024; // 20MB total
const ALLOWED_FILE_TYPES = ["application/pdf", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/csv", "image/png", "image/jpeg"];

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
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    // Validate file types
    const invalidFiles = selectedFiles.filter(file => !ALLOWED_FILE_TYPES.includes(file.type));
    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid file type",
        description: "Only PDF, XLSX, CSV, PNG, and JPG files are allowed.",
        variant: "destructive",
      });
      return;
    }

    // Validate file sizes
    const oversizedFiles = selectedFiles.filter(file => file.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      toast({
        title: "File too large",
        description: `Maximum file size is 10MB. Please compress large files.`,
        variant: "destructive",
      });
      return;
    }

    // Validate total size
    const currentSize = files.reduce((sum, f) => sum + f.size, 0);
    const newSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);
    if (currentSize + newSize > MAX_TOTAL_SIZE) {
      toast({
        title: "Total size exceeded",
        description: "Maximum total size is 20MB. Please remove some files.",
        variant: "destructive",
      });
      return;
    }

    setFiles([...files, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: TicketFormData) => {
    if (!user) return;

    setIsSubmitting(true);
    try {
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
    <AppLayout>
      <div className="container max-w-3xl py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Ticket className="h-8 w-8 text-primary" />
              <div>
                <CardTitle>Raise a Support Ticket</CardTitle>
                <CardDescription>
                  Having issues? Let us know and we'll help resolve them quickly.
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
                          <SelectItem value="">None</SelectItem>
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

                <div className="space-y-3">
                  <label className="text-sm font-medium">Attachments (Optional)</label>
                  <div className="flex items-center gap-3">
                    <Button type="button" variant="outline" size="sm" asChild>
                      <label className="cursor-pointer">
                        <Upload className="h-4 w-4 mr-2" />
                        Choose Files
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.xlsx,.csv,.png,.jpg,.jpeg"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Max 10MB per file, 20MB total
                    </span>
                  </div>

                  {files.length > 0 && (
                    <div className="space-y-2 mt-3">
                      {files.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-muted rounded-md"
                        >
                          <div className="flex-1 truncate">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
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
    </AppLayout>
  );
}