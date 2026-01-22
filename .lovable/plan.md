

# Plan: Add "Download All" Button and File Removal Sync

## Overview
This plan addresses two features:
1. **Download All Files** - Add a button to download all uploaded files as a ZIP
2. **Rename Button & Sync File Removal** - Rename "Add More Files" to "Add or Remove Files" and sync file removals from the upload page back to CaseDetail

---

## Part 1: Add "Download All" Button

### Location
In `src/pages/app/CaseDetail.tsx`, inside the Files card header, to the left of the existing "Add More Files" button.

### Design
- Subtle outline button with Download icon
- Only visible when there are files to download
- Downloads all files as a single ZIP named `{case_name}_files.zip`

### Implementation Steps

**Step 1.1:** Add JSZip import (already available in the project)

**Step 1.2:** Create `handleDownloadAllFiles` function:
```typescript
const handleDownloadAllFiles = async () => {
  if (files.length === 0) return;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required");
    
    const zip = new JSZip();
    
    for (const file of files) {
      const filePath = `${user.id}/${case_.id}/${file.file_name}`;
      const { data, error } = await supabase.storage
        .from('case-files')
        .download(filePath);
      
      if (error || !data) continue;
      zip.file(file.file_name, data);
    }
    
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${case_.name}_files.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({ title: "Files downloaded successfully" });
  } catch (error) {
    toast({ title: "Failed to download files", variant: "destructive" });
  }
};
```

**Step 1.3:** Add Download All button in the Files CardHeader (lines 282-333):
- Place to the left of existing buttons
- Icon-only button with tooltip for subtlety
- Only show when `files.length > 0`

---

## Part 2: Rename "Add More Files" to "Add or Remove Files"

### Changes Required

**Step 2.1:** Update button text in `CaseDetail.tsx` (line 300):
```typescript
// Before:
Add More Files

// After:
Add or Remove Files
```

**Step 2.2:** Update tooltip text (line 304):
```typescript
// Before:
<p>Add more files to this case or create a new case</p>

// After:  
<p>Add or remove files from this case</p>
```

**Step 2.3:** Add translation keys to `en.json` and `hi.json`:
```json
// en.json
"caseDetail": {
  "addOrRemoveFiles": "Add or Remove Files",
  "addOrRemoveFilesTooltip": "Add or remove files from this case",
  "downloadAll": "Download All Files"
}

// hi.json
"caseDetail": {
  "addOrRemoveFiles": "फाइलें जोड़ें या हटाएं",
  "addOrRemoveFilesTooltip": "इस केस में फाइलें जोड़ें या हटाएं",
  "downloadAll": "सभी फाइलें डाउनलोड करें"
}
```

---

## Part 3: Sync Removed Files to Database

### The Challenge
When a user removes a pre-existing file in CaseUpload (Add Files mode), that file should be removed from:
1. The `case_files` database table
2. The Supabase Storage bucket

### File Name Matching Logic
Per your requirement, files in CaseDetail may have `.pdf` or `.xls` extension, while in CaseUpload they appear as `.xlsx`. Match using **base filename without extension**:

```typescript
const getBaseName = (fileName: string): string => {
  // Remove extension and return base name (case-insensitive)
  return fileName.replace(/\.(pdf|xlsx?|csv|png|jpe?g)$/i, '').toLowerCase();
};
```

### Implementation Steps

**Step 3.1:** Add `deleteCaseFile` function to `src/api/cases.ts`:
```typescript
export const deleteCaseFile = async (caseId: string, fileName: string) => {
  const { data: auth } = await supabase.auth.getUser();
  const user_id = auth.user?.id;
  if (!user_id) throw new Error("Not authenticated");

  // Delete from database
  const { error: dbError } = await supabase
    .from("case_files")
    .delete()
    .eq("case_id", caseId)
    .eq("file_name", fileName);
  
  if (dbError) throw dbError;

  // Delete from storage
  const filePath = `${user_id}/${caseId}/${fileName}`;
  await supabase.storage.from('case-files').remove([filePath]);
  
  return true;
};
```

**Step 3.2:** Add `deleteCaseFilesByBaseName` function for matching by base name:
```typescript
export const deleteCaseFilesByBaseName = async (caseId: string, baseNames: string[]) => {
  // Fetch all files for the case
  const files = await getCaseFiles(caseId);
  
  // Helper to extract base name
  const getBaseName = (fn: string) => fn.replace(/\.(pdf|xlsx?|csv|png|jpe?g)$/i, '').toLowerCase();
  
  // Find files whose base names match
  const filesToDelete = files.filter(f => 
    baseNames.includes(getBaseName(f.file_name))
  );
  
  // Delete each matching file
  for (const file of filesToDelete) {
    await deleteCaseFile(caseId, file.file_name);
  }
  
  return filesToDelete.length;
};
```

**Step 3.3:** Update `CaseUpload.tsx` to track removed pre-existing files:

In `handleStartAnalysis` function, after the analysis completes successfully:

```typescript
// Track which pre-existing files were removed (original files minus current files)
const [originalPreExistingFiles, setOriginalPreExistingFiles] = useState<string[]>([]);

// When loading pre-existing files, store original list:
setOriginalPreExistingFiles(preExistingFiles.map(f => f.name));

// In handleStartAnalysis, before navigating:
const currentPreExisting = files.filter(f => f.isPreExisting).map(f => f.name);
const removedFiles = originalPreExistingFiles.filter(
  name => !currentPreExisting.some(
    curr => getBaseName(curr) === getBaseName(name)
  )
);

if (removedFiles.length > 0) {
  const baseNamesToDelete = removedFiles.map(name => getBaseName(name));
  await deleteCaseFilesByBaseName(case_.id, baseNamesToDelete);
}
```

---

## Summary of File Changes

| File | Changes |
|------|---------|
| `src/pages/app/CaseDetail.tsx` | Add JSZip import, Download All button, rename "Add More Files" |
| `src/api/cases.ts` | Add `deleteCaseFile` and `deleteCaseFilesByBaseName` functions |
| `src/pages/app/CaseUpload.tsx` | Track removed pre-existing files, delete them after analysis |
| `src/i18n/locales/en.json` | Add translation keys for new text |
| `src/i18n/locales/hi.json` | Add Hindi translations for new text |

---

## Important Notes

1. **No changes to existing logic** - Only additions for the new functionality
2. **Graceful failure** - If file deletion fails, log error but don't block the analysis
3. **Matching is case-insensitive** - `File.pdf` matches `file.xlsx`
4. **Extension-agnostic matching** - Only base filename is compared

