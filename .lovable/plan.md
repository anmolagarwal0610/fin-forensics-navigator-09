

# Plan: Add Hindi Translations for Remaining Hardcoded English Strings

## Overview

Multiple buttons, labels, and KPI titles across the Case Detail page and Analysis Results page still display hardcoded English text. We need to replace them with translation keys and add corresponding Hindi translations.

## Scope of Changes

### Files to Modify

| File | Changes |
|------|---------|
| `src/i18n/locales/en.json` | Add new translation keys |
| `src/i18n/locales/hi.json` | Add Hindi translations |
| `src/pages/app/CaseDetail.tsx` | Replace hardcoded strings with `t()` calls |
| `src/pages/app/CaseAnalysisResults.tsx` | Replace hardcoded strings with `t()` calls |

### Strings to Translate

**CaseDetail.tsx (Case Preview Page):**
- "Back" button
- "Download All" button
- "Add or Remove Files" button
- "Continue Analysis" button
- "Add Files" button
- "View Results" / "View Results (Coming Soon)" button
- "Files" heading
- "Analysis Results" heading
- "Analysis Complete" text
- "Results are ready for review." text
- "Timeline" heading
- "No files uploaded yet." text
- "No events yet." text
- "Results will appear here once analysis is complete." text
- "Analysis encountered an issue..." text
- "Loading case..." text

**CaseAnalysisResults.tsx (Results Page):**
- "Back to Case" button
- "View Previous Results" / "View Latest Results" buttons
- "Viewing Previous Results" badge
- "Download Report" button
- "Analysis Results" heading
- KPIs: "Total Beneficiaries", "Identified in analysis", "Person of Interest (POI)", "Beneficiaries Present in more than one file", "Analysis Files", "Original files processed"
- "Top X Beneficiaries" title
- "Transaction Flow Analysis" heading + description
- Tab labels: "Fund Trail", "Sankey Graph", "Node Graph"
- "Person of Interest Raw Data" heading + description
- "Download All POI Files" button
- "Interactive POI Analysis" heading + description
- "File Analysis Summary" heading + description
- Per-file labels: "Raw Transactions", "Summary", "Download", "Graph", "View Summary"
- "Share" (tooltip on share buttons)

## Technical Approach

1. **Add `useTranslation` import** to both `CaseDetail.tsx` and `CaseAnalysisResults.tsx`
2. **Add `const { t } = useTranslation()`** at the top of each component
3. **Replace each hardcoded string** with the corresponding `t('key')` call
4. **Add all new keys** to both `en.json` and `hi.json`

Most keys already exist in the JSON files under `caseDetail.*` and `analysisResults.*` sections -- we will reuse those and only add missing ones.

## New Translation Keys Needed

The following keys already exist and can be reused:
- `caseDetail.back`, `caseDetail.files`, `caseDetail.downloadAll`, `caseDetail.addOrRemoveFiles`, `caseDetail.continueAnalysis`, `caseDetail.addFiles`, `caseDetail.viewResults`, `caseDetail.timeline`, `caseDetail.noFilesYet`, `caseDetail.noEventsYet`, `caseDetail.analysisComplete`, `caseDetail.resultsReadyForReview`, `caseDetail.viewResultsComingSoon`, `caseDetail.resultsAppearHere`, `caseDetail.analysisIssue`
- `analysisResults.title`, `analysisResults.backToCase`, `analysisResults.viewPreviousResults`, `analysisResults.viewLatestResults`, `analysisResults.downloadReport`, `analysisResults.viewingPreviousResults`, `analysisResults.totalBeneficiaries`, `analysisResults.identifiedInAnalysis`, `analysisResults.personOfInterest`, `analysisResults.presentInMultipleFiles`, `analysisResults.analysisFiles`, `analysisResults.originalFilesProcessed`, `analysisResults.topBeneficiaries`, `analysisResults.transactionFlowAnalysis`, `analysisResults.interactiveVisualization`, `analysisResults.sankeyGraph`, `analysisResults.nodeGraph`, `analysisResults.poiRawData`, `analysisResults.downloadDetailedAnalysis`, `analysisResults.downloadAllPOI`, `analysisResults.interactivePOIAnalysis`, `analysisResults.individualNetworkAnalysis`, `analysisResults.fileAnalysisSummary`

New keys to add in both JSON files:

```
"analysisResults.fundTrail": "Fund Trail" / "फंड ट्रेल"
"analysisResults.rawTransactions": "Raw Transactions" / "कच्चे लेनदेन"
"analysisResults.summary": "Summary" / "सारांश"
"analysisResults.graph": "Graph" / "ग्राफ"
"analysisResults.share": "Share" / "साझा करें"
"analysisResults.fileAnalysisSummaryDesc": "Analysis results for each uploaded file..." / "..."
"analysisResults.originalFile": "Original File" / "मूल फ़ाइल"
"caseDetail.analysisResults": "Analysis Results" / "विश्लेषण परिणाम"
"caseDetail.loadingCase": "Loading case..." / "केस लोड हो रहा है..."
```

## No Changes to These Files

- `HTMLViewer.tsx` and `FundTrailViewer.tsx` use icon-only buttons (no visible text labels), so no translation changes are needed there.

