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
  totalBeneficiaryCount: number;
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
        totalBeneficiaryCount: 0,
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
          // Calculate total beneficiaries (all rows minus header rows)
          const totalBeneficiaries = jsonData.length - 3; // Subtract 3 for headers
          parsedData.totalBeneficiaryCount = Math.max(0, totalBeneficiaries);
          
          // Start from row 2 (index 2) since data starts from 3rd row, take up to 25 beneficiaries for display
          parsedData.beneficiaries = jsonData.slice(2, 27).map((row, rowIndex) => {
            const obj: { [key: string]: any } = {};
            parsedData.beneficiaryHeaders.forEach((header, index) => {
              const cellAddress = XLSX.utils.encode_cell({ r: rowIndex + 2, c: index });
              const cell = worksheet[cellAddress];
              
              // Enhanced color parsing for different Excel color formats
              let backgroundColor, color;
              
              if (cell?.s) {
                // Handle background color
                if (cell.s.fgColor) {
                  if (cell.s.fgColor.rgb) {
                    backgroundColor = `#${cell.s.fgColor.rgb}`;
                  } else if (cell.s.fgColor.theme !== undefined) {
                    // Handle theme colors - simplified mapping
                    const themeColors = ['#000000', '#FFFFFF', '#1F497D', '#4F81BD', '#9CBB58', '#F79646', '#C0504D', '#8064A2'];
                    backgroundColor = themeColors[cell.s.fgColor.theme] || '#FFFFFF';
                  }
                }
                
                // Handle text color
                if (cell.s.font?.color) {
                  if (cell.s.font.color.rgb) {
                    color = `#${cell.s.font.color.rgb}`;
                  } else if (cell.s.font.color.theme !== undefined) {
                    const themeColors = ['#000000', '#FFFFFF', '#1F497D', '#4F81BD', '#9CBB58', '#F79646', '#C0504D', '#8064A2'];
                    color = themeColors[cell.s.font.color.theme] || '#000000';
                  }
                }
                
                // Handle pattern fills
                if (cell.s.patternType && cell.s.bgColor) {
                  if (cell.s.bgColor.rgb) {
                    backgroundColor = `#${cell.s.bgColor.rgb}`;
                  }
                }
              }
              
              obj[header] = {
                value: row[index] || '',
                style: backgroundColor || color ? {
                  backgroundColor,
                  color
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

  const downloadBeneficiariesFile = async () => {
    if (!analysisData?.zipData) return;
    
    const file = analysisData.zipData.file("beneficiaries_by_file.xlsx");
    if (file) {
      const content = await file.async("blob");
      const url = URL.createObjectURL(content);
      handleDownload(url, "beneficiaries_by_file.xlsx");
      toast({ title: "Downloading beneficiaries file" });
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
              <div className="text-2xl font-bold">{analysisData.totalBeneficiaryCount}</div>
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Top 25 Beneficiaries
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Detailed analysis of persons of interest identified in the financial data
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadBeneficiariesFile}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Excel
                </Button>
              </div>
            </CardHeader>
             <CardContent className="p-0">
                <div className="overflow-auto max-h-[500px] border border-border rounded-b-lg">
                  <Table className="relative">
                    <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-sm z-20 shadow-sm">
                      <TableRow className="bg-muted/50 border-b-2">
                        {analysisData.beneficiaryHeaders.map((header, index) => (
                          <TableHead key={index} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider border-r last:border-r-0 min-w-[140px] bg-muted/30">
                            {header}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analysisData.beneficiaries.map((beneficiary, index) => (
                        <TableRow key={index} className="hover:bg-muted/30 transition-colors border-b">
                          {analysisData.beneficiaryHeaders.map((header, colIndex) => {
                            const cellData = beneficiary[header];
                            const value = typeof cellData === 'object' ? cellData.value : cellData;
                            const style = typeof cellData === 'object' ? cellData.style : undefined;
                            
                            // Ensure good contrast for styled cells
                            const cellStyle = style ? {
                              backgroundColor: style.backgroundColor,
                              color: style.color || (style.backgroundColor ? '#000000' : undefined),
                              fontWeight: style.backgroundColor ? '500' : 'normal'
                            } : {};
                            
                            return (
                              <TableCell 
                                key={colIndex} 
                                className="px-4 py-3 text-sm whitespace-nowrap border-r last:border-r-0 min-w-[140px]"
                                style={cellStyle}
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
             </CardContent>
          </Card>
        )}

        {/* POI Flow Main Graph */}
        {analysisData.mainGraphUrl && (
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50 rounded-t-lg">
              <CardTitle className="text-xl flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                POI Flow Analysis
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Interactive network visualization showing person of interest flows and connections
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="relative group">
                <div className="w-full h-[600px] overflow-auto border rounded-lg shadow-sm">
                  <iframe 
                    src={analysisData.mainGraphUrl.replace('.png', '.html')} 
                    title="POI Flow Analysis"
                    className="w-full min-h-full border-0"
                    style={{ minWidth: '800px', minHeight: '600px' }}
                  />
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  onClick={() => handleDownload(analysisData.mainGraphUrl!.replace('.png', '.html'), 'poi_flows.html')}
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

        {/* Ego Network Visualizations */}
        {analysisData.egoImages.length > 0 && (
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50 rounded-t-lg">
              <CardTitle className="text-xl flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Network Analysis Visualizations
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Interactive individual ego networks showing relationship patterns for each person of interest. 
                'Ego' refers to the central person in each network graph - it shows how that specific individual is connected to others.
              </p>
            </CardHeader>
             <CardContent className="p-6">
               <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                 <div className="flex gap-4 p-4">
                   {analysisData.egoImages.map((image, index) => (
                     <div 
                       key={index}
                       className="flex-shrink-0 group relative"
                     >
                       <div className="relative w-80 h-64 bg-muted rounded-lg overflow-hidden border shadow-md hover:shadow-lg transition-all">
                         <div className="w-full h-full overflow-auto">
                           <iframe 
                             src={image.url.replace('.png', '.html')} 
                             title={`Ego network for ${image.name}`}
                             className="w-full border-0"
                             style={{ minWidth: '600px', minHeight: '500px' }}
                           />
                         </div>
                         <Button
                           variant="secondary"
                           size="sm"
                           className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                           onClick={() => handleDownload(image.url.replace('.png', '.html'), image.name.replace('.png', '.html'))}
                         >
                           <Download className="h-3 w-3" />
                         </Button>
                       </div>
                       <p className="text-xs text-muted-foreground mt-2 text-center truncate font-medium w-80">
                         {image.name.replace('ego_', '').replace('.png', '')}
                       </p>
                     </div>
                   ))}
                 </div>
               </ScrollArea>
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
                Analysis results for each uploaded file with downloadable raw transactions and summary reports
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
                           <div className="flex items-center gap-2 flex-1 min-w-0">
                             <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                             <span className="text-muted-foreground flex-shrink-0">Raw Transactions:</span>
                             <span className="font-mono text-xs bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded truncate">
                               {summary.rawTransactionsFile}
                             </span>
                           </div>
                           <Button
                             size="sm"
                             variant="outline"
                             onClick={() => downloadIndividualFile(summary.rawTransactionsFile!)}
                             className="flex-shrink-0 ml-2"
                           >
                             <Download className="h-3 w-3 mr-1" />
                             Download
                           </Button>
                         </div>
                       )}
                       {summary.summaryFile && (
                         <div className="flex items-center justify-between gap-2 text-sm bg-green-50 dark:bg-green-950/30 p-3 rounded-lg">
                           <div className="flex items-center gap-2 flex-1 min-w-0">
                             <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                             <span className="text-muted-foreground flex-shrink-0">Summary:</span>
                             <span className="font-mono text-xs bg-green-100 dark:bg-green-900/50 px-2 py-1 rounded truncate">
                               {summary.summaryFile}
                             </span>
                           </div>
                           <Button
                             size="sm"
                             variant="outline"
                             onClick={() => downloadIndividualFile(summary.summaryFile!)}
                             className="flex-shrink-0 ml-2"
                           >
                             <Download className="h-3 w-3 mr-1" />
                             Download
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