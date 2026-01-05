import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CleanupResult {
  duplicateZipsDeleted: number;
  orphanedFilesDeleted: number;
  archivedCsvDeleted: number;
  totalBytesFreed: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("🧹 Starting storage cleanup...");
    
    const result: CleanupResult = {
      duplicateZipsDeleted: 0,
      orphanedFilesDeleted: 0,
      archivedCsvDeleted: 0,
      totalBytesFreed: 0,
    };

    // Step 1: Delete duplicate ZIP files (keep only newest per case)
    console.log("📦 Cleaning duplicate ZIPs...");
    const { data: duplicateZips, error: dupError } = await supabase.rpc('cleanup_duplicate_zips');
    
    if (dupError) {
      console.warn("⚠️ Duplicate ZIP cleanup via RPC failed, using fallback:", dupError.message);
      
      // Fallback: Direct query approach
      const { data: allZips } = await supabase
        .from('storage.objects' as any)
        .select('id, name, created_at, metadata')
        .eq('bucket_id', 'case-files')
        .like('name', '%/zips/case_%')
        .order('created_at', { ascending: false });
      
      if (allZips) {
        const zipsByCase = new Map<string, any[]>();
        
        for (const zip of allZips) {
          const match = zip.name.match(/case_([a-f0-9-]+)_/);
          if (match) {
            const caseId = match[1];
            if (!zipsByCase.has(caseId)) {
              zipsByCase.set(caseId, []);
            }
            zipsByCase.get(caseId)!.push(zip);
          }
        }
        
        const toDelete: string[] = [];
        for (const [_, zips] of zipsByCase) {
          // Skip the first (newest) one, delete the rest
          for (let i = 1; i < zips.length; i++) {
            toDelete.push(zips[i].name);
            result.totalBytesFreed += parseInt(zips[i].metadata?.size || '0');
          }
        }
        
        if (toDelete.length > 0) {
          const { error: delError } = await supabase.storage.from('case-files').remove(toDelete);
          if (!delError) {
            result.duplicateZipsDeleted = toDelete.length;
            console.log(`✓ Deleted ${toDelete.length} duplicate ZIPs`);
          }
        }
      }
    } else {
      result.duplicateZipsDeleted = duplicateZips?.count || 0;
    }

    // Step 2: Delete orphaned files (files without a matching case)
    console.log("🔍 Finding orphaned files...");
    const { data: allCases } = await supabase.from('cases').select('id');
    const caseIds = new Set((allCases || []).map(c => c.id));
    
    const { data: allFiles } = await supabase.storage.from('case-files').list('', {
      limit: 1000,
    });

    if (allFiles) {
      for (const folder of allFiles) {
        if (folder.name === '.emptyFolderPlaceholder') continue;
        
        // Check if this is a user folder
        const { data: userFiles } = await supabase.storage
          .from('case-files')
          .list(folder.name, { limit: 500 });
        
        if (userFiles) {
          for (const item of userFiles) {
            // Skip zips folder, handle separately
            if (item.name === 'zips') continue;
            
            // Check if this case folder still exists
            if (!caseIds.has(item.name)) {
              // This case no longer exists, delete its files
              const { data: caseFiles } = await supabase.storage
                .from('case-files')
                .list(`${folder.name}/${item.name}`);
              
              if (caseFiles && caseFiles.length > 0) {
                const filesToDelete = caseFiles.map(f => `${folder.name}/${item.name}/${f.name}`);
                const { error: delError } = await supabase.storage
                  .from('case-files')
                  .remove(filesToDelete);
                
                if (!delError) {
                  result.orphanedFilesDeleted += filesToDelete.length;
                  console.log(`✓ Deleted ${filesToDelete.length} orphaned files from ${item.name}`);
                }
              }
            }
          }
        }
      }
    }

    // Step 3: Clean up CSV files for archived cases older than 90 days
    console.log("📄 Cleaning old archived case CSVs...");
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const { data: archivedCases } = await supabase
      .from('cases')
      .select('id, creator_id')
      .eq('status', 'Archived')
      .lt('updated_at', ninetyDaysAgo.toISOString());
    
    if (archivedCases) {
      for (const archivedCase of archivedCases) {
        const { data: csvFiles } = await supabase.storage
          .from('case-files')
          .list(`${archivedCase.creator_id}/${archivedCase.id}`, {
            search: '.csv'
          });
        
        if (csvFiles && csvFiles.length > 0) {
          const filesToDelete = csvFiles
            .filter(f => f.name.endsWith('.csv'))
            .map(f => `${archivedCase.creator_id}/${archivedCase.id}/${f.name}`);
          
          if (filesToDelete.length > 0) {
            const { error: delError } = await supabase.storage
              .from('case-files')
              .remove(filesToDelete);
            
            if (!delError) {
              result.archivedCsvDeleted += filesToDelete.length;
            }
          }
        }
      }
    }

    console.log("✅ Cleanup complete:", result);

    return new Response(
      JSON.stringify({
        success: true,
        result,
        message: `Cleanup complete: ${result.duplicateZipsDeleted} duplicate ZIPs, ${result.orphanedFilesDeleted} orphaned files, ${result.archivedCsvDeleted} old CSVs deleted`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
