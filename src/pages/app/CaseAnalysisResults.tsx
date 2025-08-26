import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileText, Users, TrendingUp, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getCaseById } from "@/api/cases";
import type { CaseRecord } from "@/api/cases";

interface AnalysisFile {
  name: string;
  type: 'beneficiaries' | 'summary' | 'raw' | 'poi' | 'other';
  downloadUrl: string;
  originalFileName?: string;
}

interface BeneficiaryData {
  name: string;
  totalAmount: number;
  transactionCount: number;
  riskLevel: 'high' | 'medium' | 'low';
  cellColor?: string;
}

export default function CaseAnalysisResults() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [case_, setCase] = useState<CaseRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [analysisFiles, setAnalysisFiles] = useState<AnalysisFile[]>([]);
  const [beneficiariesData, setBeneficiariesData] = useState<BeneficiaryData[]>([]);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadCaseAndResults();
    }
  }, [id]);

  const loadCaseAndResults = async () => {
    try {
      setLoading(true);
      const caseData = await getCaseById(id!);
      
      if (!caseData) {
        toast({
          title: "Case not found",
          description: "The requested case could not be found.",
          variant: "destructive",
        });
        navigate("/app");
        return;
      }

      if (caseData.analysis_status !== 'completed' || !caseData.result_zip_url) {
        toast({
          title: "Analysis not ready",
          description: "The analysis for this case is not yet complete.",
          variant: "destructive",
        });
        navigate("/app");
        return;
      }

      setCase(caseData);
      await loadAnalysisFiles(caseData.result_zip_url);
    } catch (error) {
      console.error("Error loading case:", error);
      toast({
        title: "Error",
        description: "Failed to load case analysis results.",
        variant: "destructive",
      });
      navigate("/app");
    } finally {
      setLoading(false);
    }
  };

  const loadAnalysisFiles = async (zipUrl: string) => {
    try {
      // In a real implementation, you would extract and process the zip file
      // For now, we'll simulate the expected files
      const mockFiles: AnalysisFile[] = [
        {
          name: "beneficiaries_by_file.xlsx",
          type: "beneficiaries",
          downloadUrl: zipUrl,
        },
        {
          name: "POI_detailed_analysis.xlsx",
          type: "poi",
          downloadUrl: zipUrl,
        },
        {
          name: "POI_transaction_patterns.xlsx",
          type: "poi",
          downloadUrl: zipUrl,
        },
      ];

      // Mock beneficiaries data with top 25 entries
      const mockBeneficiaries: BeneficiaryData[] = Array.from({ length: 25 }, (_, i) => ({
        name: `Person ${i + 1}`,
        totalAmount: Math.floor(Math.random() * 1000000) + 10000,
        transactionCount: Math.floor(Math.random() * 100) + 1,
        riskLevel: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)] as 'high' | 'medium' | 'low',
        cellColor: ['#ff6b6b', '#ffd93d', '#6bcf7f'][Math.floor(Math.random() * 3)],
      }));

      setAnalysisFiles(mockFiles);
      setBeneficiariesData(mockBeneficiaries);
    } catch (error) {
      console.error("Error loading analysis files:", error);
      toast({
        title: "Error",
        description: "Failed to load analysis files.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = async (file: AnalysisFile) => {
    try {
      setDownloadingFile(file.name);
      
      // Create a temporary download link
      const link = document.createElement('a');
      link.href = file.downloadUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Download started",
        description: `Downloading ${file.name}`,
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download failed",
        description: "Failed to download the file.",
        variant: "destructive",
      });
    } finally {
      setDownloadingFile(null);
    }
  };

  const downloadAllPOIFiles = async () => {
    const poiFiles = analysisFiles.filter(file => file.type === 'poi');
    for (const file of poiFiles) {
      await handleDownload(file);
    }
  };

  const downloadCompleteReport = async () => {
    if (case_?.result_zip_url) {
      const link = document.createElement('a');
      link.href = case_.result_zip_url;
      link.download = `complete_analysis_${case_.name}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Download started",
        description: "Downloading complete analysis report",
      });
    }
  };

  const getRiskBadgeVariant = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded mb-6"></div>
          <div className="space-y-4">
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-64 bg-muted rounded"></div>
            <div className="h-48 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!case_) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analysis Results</h1>
          <p className="text-muted-foreground mt-1">
            Case: {case_.name} • Analysis completed
          </p>
        </div>
        <Button onClick={() => navigate("/app")} variant="outline">
          Back to Dashboard
        </Button>
      </div>

      {/* Key Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Persons</p>
                <p className="text-2xl font-bold">{beneficiariesData.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm text-muted-foreground">High Risk</p>
                <p className="text-2xl font-bold">
                  {beneficiariesData.filter(b => b.riskLevel === 'high').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold">
                  ${beneficiariesData.reduce((sum, b) => sum + b.totalAmount, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Analysis Files</p>
                <p className="text-2xl font-bold">{analysisFiles.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Persons of Interest Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Persons of Interest (Top 25)
          </CardTitle>
          <Button 
            onClick={() => handleDownload(analysisFiles.find(f => f.type === 'beneficiaries')!)}
            disabled={downloadingFile === 'beneficiaries_by_file.xlsx'}
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Table
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Transactions</TableHead>
                  <TableHead>Risk Level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {beneficiariesData.map((person, index) => (
                  <TableRow 
                    key={index}
                    style={{ backgroundColor: person.cellColor ? `${person.cellColor}20` : undefined }}
                  >
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{person.name}</TableCell>
                    <TableCell>${person.totalAmount.toLocaleString()}</TableCell>
                    <TableCell>{person.transactionCount}</TableCell>
                    <TableCell>
                      <Badge variant={getRiskBadgeVariant(person.riskLevel)}>
                        {person.riskLevel.toUpperCase()}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* POI Files Download */}
      <Card>
        <CardHeader>
          <CardTitle>Person of Interest Raw Data</CardTitle>
          <p className="text-sm text-muted-foreground">
            Download detailed analysis for all persons of interest
          </p>
        </CardHeader>
        <CardContent>
          <Button onClick={downloadAllPOIFiles} className="w-full sm:w-auto">
            <Download className="h-4 w-4 mr-2" />
            Download All POI Files ({analysisFiles.filter(f => f.type === 'poi').length} files)
          </Button>
        </CardContent>
      </Card>

      {/* Uploaded Files Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>File Analysis Summary</CardTitle>
          <p className="text-sm text-muted-foreground">
            Analysis results for each uploaded file
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Mock uploaded files analysis */}
            {['transactions.xlsx', 'bank_statements.pdf', 'invoices.xlsx'].map((fileName, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{fileName}</h4>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Summary
                    </Button>
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Raw Data
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Analysis completed • {Math.floor(Math.random() * 500) + 100} transactions found
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Complete Report Download */}
      <Card>
        <CardHeader>
          <CardTitle>Complete Analysis Report</CardTitle>
          <p className="text-sm text-muted-foreground">
            Download the complete analysis report as a zip file
          </p>
        </CardHeader>
        <CardContent>
          <Button onClick={downloadCompleteReport} size="lg" className="w-full sm:w-auto">
            <Download className="h-5 w-5 mr-2" />
            Download Complete Report
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}