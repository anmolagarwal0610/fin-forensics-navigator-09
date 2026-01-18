import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CleanupResult {
  duplicateZipsDeleted: number;
  orphanedCaseFilesDeleted: number;
  archivedCsvDeleted: number;
  oldResultFilesDeleted: number;
  orphanedResultRecordsDeleted: number;
  orphanedResultStorageDeleted: number;
  sharedFundTrailsDeleted: number;
  orphanedSharedTrailsDeleted: number;
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

    console.log("🧹 Starting comprehensive storage cleanup...");
    console.log(`📅 Cleanup started at: ${new Date().toISOString()}`);
    
    const result: CleanupResult = {
      duplicateZipsDeleted: 0,
      orphanedCaseFilesDeleted: 0,
      archivedCsvDeleted: 0,
      oldResultFilesDeleted: 0,
      orphanedResultRecordsDeleted: 0,
      orphanedResultStorageDeleted: 0,
      sharedFundTrailsDeleted: 0,
      orphanedSharedTrailsDeleted: 0,
      totalBytesFreed: 0,
    };

    // Get all existing case IDs for orphan detection
    const { data: allCases } = await supabase.from('cases').select('id');
    const caseIds = new Set((allCases || []).map(c => c.id));
    console.log(`📊 Found ${caseIds.size} active cases in database`);

    // ============================================
    // STEP 1: Delete duplicate ZIP files in case-files bucket
    // ============================================
    console.log("\n📦 Step 1: Cleaning duplicate ZIPs in case-files bucket...");
    try {
      const { data: allZips } = await supabase.storage
        .from('case-files')
        .list('', { limit: 2000, search: 'zips' });
      
      if (allZips) {
        // Find zip files by traversing user folders
        for (const folder of allZips) {
          if (folder.name === '.emptyFolderPlaceholder') continue;
          
          const { data: userContents } = await supabase.storage
            .from('case-files')
            .list(`${folder.name}/zips`, { limit: 500 });
          
          if (userContents && userContents.length > 0) {
            // Group zips by case ID
            const zipsByCase = new Map<string, Array<{ name: string; created_at: string; metadata?: { size?: number } }>>();
            
            for (const zip of userContents) {
              const match = zip.name.match(/case_([a-f0-9-]+)_/);
              if (match) {
                const caseId = match[1];
                if (!zipsByCase.has(caseId)) {
                  zipsByCase.set(caseId, []);
                }
                zipsByCase.get(caseId)!.push(zip);
              }
            }
            
            // Delete older duplicates for each case
            for (const [caseId, zips] of zipsByCase) {
              if (zips.length > 1) {
                // Sort by created_at descending (newest first)
                zips.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                
                // Delete all but the newest
                const toDelete = zips.slice(1).map(z => `${folder.name}/zips/${z.name}`);
                
                if (toDelete.length > 0) {
                  const { error: delError } = await supabase.storage
                    .from('case-files')
                    .remove(toDelete);
                  
                  if (!delError) {
                    result.duplicateZipsDeleted += toDelete.length;
                    const bytesFreed = zips.slice(1).reduce((sum, z) => sum + (z.metadata?.size || 0), 0);
                    result.totalBytesFreed += bytesFreed;
                    console.log(`  ✓ Deleted ${toDelete.length} duplicate ZIPs for case ${caseId}`);
                  }
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn("⚠️ Step 1 error:", err);
    }

    // ============================================
    // STEP 2: Delete orphaned case folders in case-files bucket
    // ============================================
    console.log("\n🔍 Step 2: Finding orphaned files in case-files bucket...");
    try {
      const { data: userFolders } = await supabase.storage
        .from('case-files')
        .list('', { limit: 1000 });

      if (userFolders) {
        for (const userFolder of userFolders) {
          if (userFolder.name === '.emptyFolderPlaceholder') continue;
          
          const { data: caseFolders } = await supabase.storage
            .from('case-files')
            .list(userFolder.name, { limit: 500 });
          
          if (caseFolders) {
            for (const caseFolder of caseFolders) {
              // Skip zips folder - handled separately
              if (caseFolder.name === 'zips' || caseFolder.name === '.emptyFolderPlaceholder') continue;
              
              // Check if this case still exists
              if (!caseIds.has(caseFolder.name)) {
                const { data: caseFiles } = await supabase.storage
                  .from('case-files')
                  .list(`${userFolder.name}/${caseFolder.name}`);
                
                if (caseFiles && caseFiles.length > 0) {
                  const filesToDelete = caseFiles.map(f => `${userFolder.name}/${caseFolder.name}/${f.name}`);
                  const { error: delError } = await supabase.storage
                    .from('case-files')
                    .remove(filesToDelete);
                  
                  if (!delError) {
                    result.orphanedCaseFilesDeleted += filesToDelete.length;
                    console.log(`  ✓ Deleted ${filesToDelete.length} orphaned files from case ${caseFolder.name}`);
                  }
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn("⚠️ Step 2 error:", err);
    }

    // ============================================
    // STEP 3: Clean up CSV files for archived cases older than 90 days
    // ============================================
    console.log("\n📄 Step 3: Cleaning old archived case CSVs...");
    try {
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
            .list(`${archivedCase.creator_id}/${archivedCase.id}`);
          
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
                console.log(`  ✓ Deleted ${filesToDelete.length} CSVs from archived case ${archivedCase.id}`);
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn("⚠️ Step 3 error:", err);
    }

    // ============================================
    // STEP 4: Delete ALL non-current result files (immediate cleanup)
    // ============================================
    console.log("\n📦 Step 4: Cleaning ALL non-current result file versions...");
    try {
      // Delete ALL non-current result files - no 24-hour delay
      const { data: oldResultFiles } = await supabase
        .from('result_files')
        .select('id, storage_path, file_size_bytes')
        .eq('is_current', false);

      if (oldResultFiles && oldResultFiles.length > 0) {
        const pathsToDelete = oldResultFiles.map(f => f.storage_path);
        const idsToDelete = oldResultFiles.map(f => f.id);
        
        // Delete from storage
        const { error: storageError } = await supabase.storage
          .from('result-files')
          .remove(pathsToDelete);
        
        if (!storageError) {
          // Delete records from database
          const { error: dbError } = await supabase
            .from('result_files')
            .delete()
            .in('id', idsToDelete);
          
          if (!dbError) {
            result.oldResultFilesDeleted = oldResultFiles.length;
            result.totalBytesFreed += oldResultFiles.reduce(
              (sum, f) => sum + (f.file_size_bytes || 0), 0
            );
            console.log(`  ✓ Deleted ${oldResultFiles.length} non-current result file versions`);
          }
        }
      } else {
        console.log("  ✓ No non-current result files to clean");
      }
    } catch (err) {
      console.warn("⚠️ Step 4 error:", err);
    }

    // ============================================
    // STEP 5: Delete orphaned result_files records (case doesn't exist)
    // ============================================
    console.log("\n🔍 Step 5: Finding orphaned result_files records...");
    try {
      // Get all result files and check against existing cases
      const { data: allResultFiles } = await supabase
        .from('result_files')
        .select('id, storage_path, case_id, file_size_bytes');

      if (allResultFiles && allResultFiles.length > 0) {
        const orphanedResults = allResultFiles.filter(f => !caseIds.has(f.case_id));
        
        if (orphanedResults.length > 0) {
          const pathsToDelete = orphanedResults.map(f => f.storage_path);
          const idsToDelete = orphanedResults.map(f => f.id);
          
          // Delete from storage
          await supabase.storage.from('result-files').remove(pathsToDelete);
          
          // Delete records from database
          const { error: dbError } = await supabase
            .from('result_files')
            .delete()
            .in('id', idsToDelete);
          
          if (!dbError) {
            result.orphanedResultRecordsDeleted = orphanedResults.length;
            result.totalBytesFreed += orphanedResults.reduce(
              (sum, f) => sum + (f.file_size_bytes || 0), 0
            );
            console.log(`  ✓ Deleted ${orphanedResults.length} orphaned result_files records`);
          }
        }
      }
    } catch (err) {
      console.warn("⚠️ Step 5 error:", err);
    }

    // ============================================
    // STEP 6: Clean orphaned storage objects in result-files bucket
    // ============================================
    console.log("\n🗑️ Step 6: Cleaning orphaned storage objects in result-files bucket...");
    try {
      const { data: resultBucketFolders } = await supabase.storage
        .from('result-files')
        .list('', { limit: 1000 });

      if (resultBucketFolders) {
        for (const userFolder of resultBucketFolders) {
          if (userFolder.name === '.emptyFolderPlaceholder') continue;
          
          const { data: caseFolders } = await supabase.storage
            .from('result-files')
            .list(userFolder.name, { limit: 500 });
          
          if (caseFolders) {
            for (const caseFolder of caseFolders) {
              if (caseFolder.name === '.emptyFolderPlaceholder') continue;
              
              // Check if this case exists
              if (!caseIds.has(caseFolder.name)) {
                const { data: files } = await supabase.storage
                  .from('result-files')
                  .list(`${userFolder.name}/${caseFolder.name}`);
                
                if (files && files.length > 0) {
                  const filePaths = files.map(
                    f => `${userFolder.name}/${caseFolder.name}/${f.name}`
                  );
                  
                  const { error: delError } = await supabase.storage
                    .from('result-files')
                    .remove(filePaths);
                  
                  if (!delError) {
                    result.orphanedResultStorageDeleted += files.length;
                    console.log(`  ✓ Deleted ${files.length} orphaned files from result-files/${userFolder.name}/${caseFolder.name}`);
                  }
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn("⚠️ Step 6 error:", err);
    }

    // ============================================
    // STEP 7: Clean revoked/expired shared fund trail files
    // ============================================
    console.log("\n🔗 Step 7: Cleaning revoked/expired shared fund trail files...");
    try {
      const now = new Date().toISOString();
      
      // Get revoked or expired shares
      const { data: revokedOrExpiredShares } = await supabase
        .from('shared_fund_trails')
        .select('id, storage_path')
        .or(`is_revoked.eq.true,expires_at.lt.${now}`);
      
      if (revokedOrExpiredShares && revokedOrExpiredShares.length > 0) {
        const pathsToDelete = revokedOrExpiredShares
          .map(s => s.storage_path)
          .filter(Boolean);
        
        if (pathsToDelete.length > 0) {
          // Delete from storage
          const { error: storageError } = await supabase.storage
            .from('shared-fund-trails')
            .remove(pathsToDelete);
          
          if (!storageError) {
            // Delete the database records completely
            const idsToDelete = revokedOrExpiredShares.map(s => s.id);
            const { error: dbError } = await supabase
              .from('shared_fund_trails')
              .delete()
              .in('id', idsToDelete);
            
            if (!dbError) {
              result.sharedFundTrailsDeleted = pathsToDelete.length;
              console.log(`  ✓ Deleted ${pathsToDelete.length} revoked/expired shared fund trail files`);
            }
          } else {
            console.warn("  ⚠️ Error deleting from storage:", storageError);
          }
        }
      } else {
        console.log("  ✓ No revoked/expired shared fund trails to clean");
      }
    } catch (err) {
      console.warn("⚠️ Step 7 error:", err);
    }

    // ============================================
    // STEP 8: Clean orphaned shared fund trails (case deleted)
    // ============================================
    console.log("\n🗑️ Step 8: Cleaning orphaned shared fund trails (case deleted)...");
    try {
      const { data: allShares } = await supabase
        .from('shared_fund_trails')
        .select('id, storage_path, case_id');
      
      if (allShares && allShares.length > 0) {
        const orphanedShares = allShares.filter(s => !caseIds.has(s.case_id));
        
        if (orphanedShares.length > 0) {
          const pathsToDelete = orphanedShares.map(s => s.storage_path).filter(Boolean);
          
          // Delete from storage
          if (pathsToDelete.length > 0) {
            await supabase.storage
              .from('shared-fund-trails')
              .remove(pathsToDelete);
          }
          
          // Delete records
          const idsToDelete = orphanedShares.map(s => s.id);
          const { error: dbError } = await supabase
            .from('shared_fund_trails')
            .delete()
            .in('id', idsToDelete);
          
          if (!dbError) {
            result.orphanedSharedTrailsDeleted = orphanedShares.length;
            console.log(`  ✓ Deleted ${orphanedShares.length} orphaned shared fund trail records`);
          }
        } else {
          console.log("  ✓ No orphaned shared fund trails to clean");
        }
      }
    } catch (err) {
      console.warn("⚠️ Step 8 error:", err);
    }

    // ============================================
    // Summary
    // ============================================
    const totalDeleted = 
      result.duplicateZipsDeleted +
      result.orphanedCaseFilesDeleted +
      result.archivedCsvDeleted +
      result.oldResultFilesDeleted +
      result.orphanedResultRecordsDeleted +
      result.orphanedResultStorageDeleted +
      result.sharedFundTrailsDeleted +
      result.orphanedSharedTrailsDeleted;

    console.log("\n✅ Cleanup complete!");
    console.log("📊 Summary:", JSON.stringify(result, null, 2));
    console.log(`🗑️ Total files deleted: ${totalDeleted}`);
    console.log(`💾 Space freed: ${(result.totalBytesFreed / 1024 / 1024).toFixed(2)} MB`);

    return new Response(
      JSON.stringify({
        success: true,
        result,
        message: `Cleanup complete: ${totalDeleted} files deleted, ${(result.totalBytesFreed / 1024 / 1024).toFixed(2)} MB freed`,
        details: {
          duplicateZips: result.duplicateZipsDeleted,
          orphanedCaseFiles: result.orphanedCaseFilesDeleted,
          archivedCsvs: result.archivedCsvDeleted,
          oldResultVersions: result.oldResultFilesDeleted,
          orphanedResultRecords: result.orphanedResultRecordsDeleted,
          orphanedResultStorage: result.orphanedResultStorageDeleted,
          sharedFundTrails: result.sharedFundTrailsDeleted,
          orphanedSharedTrails: result.orphanedSharedTrailsDeleted,
        }
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
