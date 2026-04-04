 import { useState, useEffect } from "react";
 import { parseExcelFile, CellData } from "@/utils/excelParser";
 import SummaryTableViewer from "./SummaryTableViewer";
 import { Loader2 } from "lucide-react";
 import JSZip from "jszip";
 import type { GroupingOverrideResult, PendingClusterState } from "./EditGroupedNamesDialog";
 import type { BatchTraceResponse } from "@/types/traceTransaction";
 
 interface LazySummaryTableViewerProps {
   summaryFileName: string;
   rawTransactionsFileName: string | null;
   zipData: JSZip | null;
   isExpanded: boolean;
   cachedData?: CellData[][];
   onCacheData?: (fileName: string, data: CellData[][]) => void;
   onLoadRawData?: () => Promise<CellData[][] | null>;
   onSaveGroupingOverride?: (context: "cross_file" | "individual", targetCluster: string, overrides: GroupingOverrideResult, fileName?: string) => void;
   pendingOverrides?: Record<string, PendingClusterState>;
   fundTracesData?: BatchTraceResponse | null;
   caseId?: string;
 }
 
 export default function LazySummaryTableViewer({
   summaryFileName,
   rawTransactionsFileName,
   zipData,
   isExpanded,
   cachedData,
   onCacheData,
   onLoadRawData,
   onSaveGroupingOverride,
   pendingOverrides,
   fundTracesData,
   caseId,
 }: LazySummaryTableViewerProps) {
   const [data, setData] = useState<CellData[][] | undefined>(cachedData);
   const [isLoading, setIsLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
 
   // Load data when expanded for the first time
   useEffect(() => {
     if (isExpanded && !data && !isLoading && zipData) {
       loadData();
     }
   }, [isExpanded]);
 
   const loadData = async () => {
     if (!zipData || !summaryFileName) return;
     
     setIsLoading(true);
     setError(null);
     
     try {
       const file = zipData.file(summaryFileName);
       if (!file) {
         setError("Summary file not found");
         return;
       }
       
       const content = await file.async("arraybuffer");
       const parsed = await parseExcelFile(content);
       setData(parsed);
       
       // Cache the data
       if (onCacheData) {
         onCacheData(summaryFileName, parsed);
       }
     } catch (err) {
       console.error(`Failed to parse summary file ${summaryFileName}:`, err);
       setError("Failed to load summary data");
     } finally {
       setIsLoading(false);
     }
   };
 
   if (!isExpanded) {
     return null;
   }
 
   if (isLoading) {
     return (
       <div className="flex items-center justify-center py-8">
         <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
         <span className="text-muted-foreground">Loading summary data...</span>
       </div>
     );
   }
 
   if (error) {
     return (
       <div className="text-center py-8 text-destructive">
         {error}
       </div>
     );
   }
 
   return (
     <SummaryTableViewer 
       data={data}
       fileName={summaryFileName}
       rawTransactionsFileName={rawTransactionsFileName}
       onLoadRawData={onLoadRawData}
       onSaveGroupingOverride={onSaveGroupingOverride}
       pendingOverrides={pendingOverrides}
     />
   );
 }