import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getCaseById, getCaseFiles, type CaseRecord, type CaseFileRecord } from "@/api/cases";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Download, FileText, TrendingUp, Users, Eye, DollarSign } from "lucide-react";
import DocumentHead from "@/components/common/DocumentHead";
import ImageLightbox from "@/components/app/ImageLightbox";
import JSZip from "jszip";
import * as XLSX from "xlsx";

interface ParsedAnalysisData {
  beneficiaries: Array<{ [key: string]: any }>;
  beneficiaryHeaders: string[];
  mainGraphUrl: string | null;
  egoImages: Array<{ name: string; url: string }>;
  poiFileCount: number;
  fileSummaries: Array<{
    originalFile: string;
    rawTransactionsFile: string | null;
    summaryFile: string | null;
  }>;
  zipData?: JSZip | null;
}

export default function CaseAnalysisResults() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [case_, setCase] = useState<CaseRecord | null>(null);
  const [files, setFiles] = useState<CaseFileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [analysisData, setAnalysisData] = useState<ParsedAnalysisData | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    if (!id) return;
    loadCaseAndResults();
  }, [id]);

  const loadCaseAndResults = async () => {
    try {
      const [caseData, filesData] = await Promise.all([
        getCaseById(id!),
        getCaseFiles(id!)
      ]);

      if (!caseData) {
        toast({ title: "Case not found", variant: "destructive" });
        navigate("/app/dashboard");
        return;
      }

      setCase(caseData);
      setFiles(filesData);

      if (caseData.status === 'Ready' && caseData.result_zip_url) {
        await loadAnalysisFiles(caseData.result_zip_url, filesData);
      }
    } catch (error) {
      console.error("Failed to load case:", error);
      toast({ title: "Failed to load case", variant: "destructive" });
      navigate("/app/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const loadAnalysisFiles = async (zipUrl: string, originalFiles: CaseFileRecord[]) => {
    try {
      const response = await fetch(zipUrl);
      if (!response.ok) throw new Error('Failed to fetch ZIP file');
      
      const arrayBuffer = await response.arrayBuffer();
      const zip = new JSZip();
      const zipData = await zip.loadAsync(arrayBuffer);
      
      const parsedData: ParsedAnalysisData = {
        beneficiaries: [],
        beneficiaryHeaders: [],
        mainGraphUrl: null,
        egoImages: [],
        poiFileCount: 0,
        fileSummaries: []
      };

      // Process beneficiaries_by_file.xlsx
      const beneficiariesFile = zipData.file("beneficiaries_by_file.xlsx");
      if (beneficiariesFile) {
        const content = await beneficiariesFile.async("arraybuffer");
        const workbook = XLSX.read(content, { type: "array", cellStyles: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        if (jsonData.length > 2) {
          parsedData.beneficiaryHeaders = jsonData[0] as string[];
          // Start from row 2 (index 2) since data starts from 3rd row, take up to 25 beneficiaries
          parsedData.beneficiaries = jsonData.slice(2, 27).map((row, rowIndex) => {
            const obj: { [key: string]: any } = {};
            parsedData.beneficiaryHeaders.forEach((header, index) => {
              const cellAddress = XLSX.utils.encode_cell({ r: rowIndex + 2, c: index });
              const cell = worksheet[cellAddress];
              obj[header] = {
                value: row[index] || '',
                style: cell?.s ? {
                  backgroundColor: cell.s.fgColor ? `#${cell.s.fgColor.rgb || 'ffffff'}` : undefined,
                  color: cell.s.font?.color ? `#${cell.s.font.color.rgb || '000000'}` : undefined
                } : undefined
              };
            });
            return obj;
          });
        }
      }

      // Process main graph (poi_flows.png)
      const mainGraphFile = zipData.file("poi_flows.png");
      if (mainGraphFile) {
        const content = await mainGraphFile.async("blob");
        parsedData.mainGraphUrl = URL.createObjectURL(content);
      }

      // Process ego images
      const egoFiles = Object.keys(zipData.files).filter(name => name.startsWith('ego_') && name.endsWith('.png'));
      for (const fileName of egoFiles) {
        const file = zipData.file(fileName);
        if (file) {
          const content = await file.async("blob");
          parsedData.egoImages.push({
            name: fileName,
            url: URL.createObjectURL(content)
          });
        }
      }

      // Count POI files
      parsedData.poiFileCount = Object.keys(zipData.files).filter(name => 
        name.startsWith('POI_') && name.endsWith('.xlsx')
      ).length;

      // Match original files with analysis results
      const analysisFileNames = Object.keys(zipData.files);
      originalFiles.forEach(originalFile => {
        const baseName = originalFile.file_name.replace(/\.[^/.]+$/, ""); // Remove extension
        const rawTransactionsFile = analysisFileNames.find(name => 
          name.startsWith(`raw_transactions_${baseName}`) && name.endsWith('.xlsx')
        );
        const summaryFile = analysisFileNames.find(name => 
          name.startsWith(`summary_${baseName}`) && name.endsWith('.xlsx')
        );

        if (rawTransactionsFile || summaryFile) {
          parsedData.fileSummaries.push({
            originalFile: originalFile.file_name,
            rawTransactionsFile: rawTransactionsFile || null,
            summaryFile: summaryFile || null
          });
        }
      });

      parsedData.zipData = zip;
      setAnalysisData(parsedData);
    } catch (error) {
      console.error("Failed to parse ZIP file:", error);
      toast({ title: "Failed to parse analysis results", variant: "destructive" });
    }
  };

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  };

  const downloadAllPOIFiles = () => {
    if (!case_?.result_zip_url) return;
    
    handleDownload(case_.result_zip_url, `POI_files_${case_.name}.zip`);
    toast({ title: `Downloading ${analysisData?.poiFileCount || 0} POI files` });
  };

  const downloadCompleteReport = () => {
    if (case_?.result_zip_url) {
      handleDownload(case_.result_zip_url, `analysis_report_${case_.name}.zip`);
      toast({ title: "Downloading complete analysis report" });
    }
  };

  const downloadIndividualFile = async (fileName: string) => {
    if (!analysisData?.zipData) return;
    
    const file = analysisData.zipData.file(fileName);
    if (file) {
      const content = await file.async("blob");
      const url = URL.createObjectURL(content);
      handleDownload(url, fileName);
      toast({ title: `Downloading ${fileName}` });
    }
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded mb-6 w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-muted rounded mb-6"></div>
          <div className="h-48 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!case_ || case_.status !== 'Ready') {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate("/app/dashboard")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Analysis Not Ready</h3>
              <p className="text-muted-foreground">
                The analysis for this case is not yet complete. Please check back later.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analysisData) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate(`/app/cases/${case_.id}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Case
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <div className="text-lg font-medium mb-2">Loading analysis results...</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <DocumentHead title={`Analysis Results - ${case_.name} - FinNavigator`} />
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate(`/app/cases/${case_.id}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Case
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Analysis Results
              </h1>
              <p className="text-lg text-muted-foreground">{case_.name}</p>
            </div>
          </div>
          <Button onClick={downloadCompleteReport} size="lg" className="shadow-lg">
            <Download className="h-4 w-4 mr-2" />
            Download Complete Report
          </Button>
        </div>

        {/* Key Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-l-4 border-l-primary shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Beneficiaries</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analysisData.beneficiaries.length}</div>
              <p className="text-xs text-muted-foreground">Identified in analysis</p>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-orange-500 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">POI Files</CardTitle>
              <FileText className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analysisData.poiFileCount}</div>
              <p className="text-xs text-muted-foreground">Person of Interest reports</p>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-green-500 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Analysis Files</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analysisData.fileSummaries.length}</div>
              <p className="text-xs text-muted-foreground">Original files processed</p>
            </CardContent>
          </Card>
        </div>

        {/* Beneficiaries Table */}
        {analysisData.beneficiaries.length > 0 && (
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-t-lg">
              <CardTitle className="text-xl flex items-center gap-2">
                <Users className="h-5 w-5" />
                Top 25 Beneficiaries
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Detailed analysis of persons of interest identified in the financial data
              </p>
            </CardHeader>
             <CardContent className="p-0">
               <ScrollArea className="w-full h-[500px]">
                 <div className="min-w-max">
                   <Table>
                     <TableHeader className="sticky top-0 bg-background z-10">
                       <TableRow className="bg-muted/50">
                         {analysisData.beneficiaryHeaders.map((header, index) => (
                           <TableHead key={index} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider border-r last:border-r-0 min-w-[120px]">
                             {header}
                           </TableHead>
                         ))}
                       </TableRow>
                     </TableHeader>
                     <TableBody>
                       {analysisData.beneficiaries.map((beneficiary, index) => (
                         <TableRow key={index} className="hover:bg-muted/50 transition-colors border-b">
                           {analysisData.beneficiaryHeaders.map((header, colIndex) => {
                             const cellData = beneficiary[header];
                             const value = typeof cellData === 'object' ? cellData.value : cellData;
                             const style = typeof cellData === 'object' ? cellData.style : undefined;
                             
                             return (
                               <TableCell 
                                 key={colIndex} 
                                 className="px-4 py-3 text-sm whitespace-nowrap border-r last:border-r-0"
                                 style={{
                                   backgroundColor: style?.backgroundColor,
                                   color: style?.color
                                 }}
                               >
                                 {value || '-'}
                               </TableCell>
                             );
                           })}
                         </TableRow>
                       ))}
                     </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Main Flow Graph */}
        {analysisData.mainGraphUrl && (
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 rounded-t-lg">
              <CardTitle className="text-xl flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Transaction Flow Analysis
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Visual representation of person of interest relationships and transaction flows
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="relative group">
                <img 
                  src={analysisData.mainGraphUrl} 
                  alt="POI Flow Analysis" 
                  className="w-full h-auto rounded-lg border shadow-sm"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  onClick={() => handleDownload(analysisData.mainGraphUrl!, 'poi_flows.png')}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Person of Interest Raw Data */}
        <Card className="shadow-lg bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Download className="h-5 w-5" />
              Person of Interest Raw Data
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Download detailed analysis for all persons of interest
            </p>
          </CardHeader>
          <CardContent>
            <Button onClick={downloadAllPOIFiles} size="lg" className="w-full sm:w-auto shadow-lg">
              <Download className="h-4 w-4 mr-2" />
              Download All POI Files ({analysisData.poiFileCount} files)
            </Button>
          </CardContent>
        </Card>

        {/* Ego Network Images */}
        {analysisData.egoImages.length > 0 && (
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50 rounded-t-lg">
              <CardTitle className="text-xl flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Network Analysis Visualizations
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Individual ego networks showing relationship patterns for each person of interest
              </p>
            </CardHeader>
             <CardContent className="p-6">
               <div className="overflow-x-auto">
                 <div className="flex gap-4 pb-4 min-w-max">
                   {analysisData.egoImages.map((image, index) => (
                     <div 
                       key={index}
                       className="flex-shrink-0 cursor-pointer group relative"
                       onClick={() => openLightbox(index)}
                     >
                       <div className="relative w-48 h-32 bg-muted rounded-lg overflow-hidden border shadow-md hover:shadow-lg transition-all transform hover:scale-105">
                         <img 
                           src={image.url} 
                           alt={image.name}
                           className="w-full h-full object-cover"
                         />
                         <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                           <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                         </div>
                       </div>
                       <p className="text-xs text-muted-foreground mt-2 text-center truncate font-medium w-48">
                         {image.name.replace('ego_', '').replace('.png', '')}
                       </p>
                     </div>
                   ))}
                 </div>
               </div>
             </CardContent>
          </Card>
        )}

        {/* File Analysis Summary */}
        {analysisData.fileSummaries.length > 0 && (
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 rounded-t-lg">
              <CardTitle className="text-xl flex items-center gap-2">
                <FileText className="h-5 w-5" />
                File Analysis Summary
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Comparison of uploaded files with their corresponding analysis results
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {analysisData.fileSummaries.map((summary, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-gradient-to-r from-muted/30 to-muted/50 hover:from-muted/50 hover:to-muted/70 transition-all">
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      Original File: <span className="text-primary font-mono">{summary.originalFile}</span>
                    </h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                       {summary.rawTransactionsFile && (
                         <div className="flex items-center justify-between gap-2 text-sm bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg">
                           <div className="flex items-center gap-2">
                             <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                             <span className="text-muted-foreground">Raw Transactions:</span>
                             <span className="font-mono text-xs bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded">
                               {summary.rawTransactionsFile}
                             </span>
                           </div>
                           <Button
                             size="sm"
                             variant="outline"
                             onClick={() => downloadIndividualFile(summary.rawTransactionsFile!)}
                             className="flex-shrink-0"
                           >
                             <Download className="h-3 w-3" />
                           </Button>
                         </div>
                       )}
                       {summary.summaryFile && (
                         <div className="flex items-center justify-between gap-2 text-sm bg-green-50 dark:bg-green-950/30 p-3 rounded-lg">
                           <div className="flex items-center gap-2">
                             <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                             <span className="text-muted-foreground">Summary:</span>
                             <span className="font-mono text-xs bg-green-100 dark:bg-green-900/50 px-2 py-1 rounded">
                               {summary.summaryFile}
                             </span>
                           </div>
                           <Button
                             size="sm"
                             variant="outline"
                             onClick={() => downloadIndividualFile(summary.summaryFile!)}
                             className="flex-shrink-0"
                           >
                             <Download className="h-3 w-3" />
                           </Button>
                         </div>
                       )}
                     </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Image Lightbox */}
      <ImageLightbox
        images={analysisData.egoImages}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        initialIndex={lightboxIndex}
      />
    </>
  );
}