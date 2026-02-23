import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { X, ArrowLeft, Search, Users, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BeneficiaryEntry {
  name: string;
  aliases: string[];
}

export interface GroupingOverrideResult {
  demerged: string[];   // Names removed from original group
  merged: string[];     // Names added to the group (new additions)
}

export interface PendingClusterState {
  demerged: string[];
  merged: string[];
}

interface EditGroupedNamesDialogProps {
  open: boolean;
  onClose: () => void;
  targetCluster: string;
  currentMembers: string[];
  allBeneficiaries: BeneficiaryEntry[];
  context: "cross_file" | "individual";
  fileName?: string;
  existingOverrides?: PendingClusterState;
  onSave: (overrides: GroupingOverrideResult) => void;
}

export default function EditGroupedNamesDialog({
  open,
  onClose,
  targetCluster,
  currentMembers,
  allBeneficiaries,
  context,
  fileName,
  existingOverrides,
  onSave,
}: EditGroupedNamesDialogProps) {
  // Working state
  const [groupedNames, setGroupedNames] = useState<string[]>([]);
  const [removedNames, setRemovedNames] = useState<string[]>([]);
  const [newlyAdded, setNewlyAdded] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Initialize state when dialog opens
  useEffect(() => {
    if (open) {
      const allOriginal = [targetCluster, ...currentMembers.filter(m => m.toLowerCase() !== targetCluster.toLowerCase())];
      
      if (existingOverrides) {
        // Restore pending state
        const demergedSet = new Set(existingOverrides.demerged.map(n => n.toLowerCase()));
        const remaining = allOriginal.filter(n => !demergedSet.has(n.toLowerCase()));
        const mergedNames = existingOverrides.merged.filter(
          n => !allOriginal.some(o => o.toLowerCase() === n.toLowerCase())
        );
        setGroupedNames([...remaining, ...mergedNames]);
        setRemovedNames(existingOverrides.demerged);
        setNewlyAdded(new Set(mergedNames.map(n => n.toLowerCase())));
      } else {
        setGroupedNames(allOriginal);
        setRemovedNames([]);
        setNewlyAdded(new Set());
      }
      setSearchQuery("");
      setIsSearchFocused(false);
    }
  }, [open, targetCluster, currentMembers, existingOverrides]);

  // Close search dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Original members set (lowercase) for determining if a name is "original"
  const originalMembersSet = useMemo(() => {
    const set = new Set<string>();
    set.add(targetCluster.toLowerCase());
    currentMembers.forEach(m => set.add(m.toLowerCase()));
    return set;
  }, [targetCluster, currentMembers]);

  // Currently grouped names set (lowercase) for dedup
  const groupedLowerSet = useMemo(() => 
    new Set(groupedNames.map(n => n.toLowerCase())), 
    [groupedNames]
  );
  
  const removedLowerSet = useMemo(() =>
    new Set(removedNames.map(n => n.toLowerCase())),
    [removedNames]
  );

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    
    return allBeneficiaries.filter(b => {
      // Don't show names already in group
      if (groupedLowerSet.has(b.name.toLowerCase())) return false;
      // Don't show the target cluster itself
      if (b.name.toLowerCase() === targetCluster.toLowerCase()) return false;
      
      // Check name match
      if (b.name.toLowerCase().includes(q)) return true;
      // Check alias match
      if (b.aliases.some(a => a.toLowerCase().includes(q))) return true;
      return false;
    }).slice(0, 20); // Limit results
  }, [searchQuery, allBeneficiaries, groupedLowerSet, targetCluster]);

  // Remove a name from grouped list
  const handleRemove = useCallback((name: string) => {
    if (name.toLowerCase() === targetCluster.toLowerCase()) return; // Can't remove primary

    const isOriginal = originalMembersSet.has(name.toLowerCase());
    const isNew = newlyAdded.has(name.toLowerCase());
    
    setGroupedNames(prev => prev.filter(n => n.toLowerCase() !== name.toLowerCase()));
    
    if (isOriginal && !isNew) {
      // Move to removed list
      setRemovedNames(prev => [...prev, name]);
    }
    // If newly added, just remove (don't add to removed list)
    if (isNew) {
      setNewlyAdded(prev => {
        const next = new Set(prev);
        next.delete(name.toLowerCase());
        return next;
      });
    }
  }, [targetCluster, originalMembersSet, newlyAdded]);

  // Restore a removed name
  const handleRestore = useCallback((name: string) => {
    setRemovedNames(prev => prev.filter(n => n.toLowerCase() !== name.toLowerCase()));
    setGroupedNames(prev => [...prev, name]);
  }, []);

  // Add a beneficiary from search results (with all their aliases)
  const handleAddBeneficiary = useCallback((entry: BeneficiaryEntry) => {
    const namesToAdd = [entry.name, ...entry.aliases].filter(
      n => !groupedLowerSet.has(n.toLowerCase()) && !removedLowerSet.has(n.toLowerCase())
    );
    
    if (namesToAdd.length === 0) return;
    
    setGroupedNames(prev => [...prev, ...namesToAdd]);
    setNewlyAdded(prev => {
      const next = new Set(prev);
      namesToAdd.forEach(n => next.add(n.toLowerCase()));
      return next;
    });
    // Also remove from removed list if they were there
    setRemovedNames(prev => prev.filter(n => !namesToAdd.some(a => a.toLowerCase() === n.toLowerCase())));
    
    setSearchQuery("");
    setIsSearchFocused(false);
  }, [groupedLowerSet, removedLowerSet]);

  // Check if there are changes
  const hasChanges = useMemo(() => {
    if (removedNames.length > 0) return true;
    if (newlyAdded.size > 0) return true;
    return false;
  }, [removedNames, newlyAdded]);

  const handleSave = () => {
    onSave({
      demerged: removedNames,
      merged: groupedNames.filter(n => newlyAdded.has(n.toLowerCase())),
    });
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-4 sm:px-6 py-3 sm:py-4 border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base sm:text-lg font-semibold">
                Edit Grouped Names
              </DialogTitle>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 truncate">
                Managing group: <span className="font-medium text-foreground">"{targetCluster}"</span>
                {context === "individual" && fileName && (
                  <span className="ml-1 text-muted-foreground">• {fileName}</span>
                )}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-hidden px-4 sm:px-6 py-3 sm:py-4 space-y-4">
          {/* Search bar */}
          <div ref={searchContainerRef} className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                placeholder="Search beneficiary names to add..."
                className="pl-9 pr-8 h-9 text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(""); setIsSearchFocused(false); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
            {/* Search results dropdown */}
            {isSearchFocused && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border rounded-lg shadow-lg max-h-48 overflow-hidden">
                <ScrollArea className="max-h-48">
                  {searchResults.length === 0 ? (
                    <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                      No matching beneficiaries found
                    </div>
                  ) : (
                    <div className="p-1">
                      {searchResults.map((entry, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleAddBeneficiary(entry)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/60 rounded-md transition-colors text-sm"
                        >
                          <Plus className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <span className="font-medium">{entry.name}</span>
                            {entry.aliases.length > 0 && (
                              <span className="text-xs text-muted-foreground ml-1.5">
                                (+{entry.aliases.length} alias{entry.aliases.length > 1 ? "es" : ""})
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}
          </div>

          {/* Two columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 flex-1 min-h-0">
            {/* Grouped Names */}
            <div className="flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-foreground">Grouped Names</h3>
                <Badge variant="secondary" className="text-xs">{groupedNames.length}</Badge>
              </div>
              <ScrollArea className="flex-1 h-[200px] sm:h-[280px] rounded-lg border bg-green-50/50 dark:bg-green-950/10">
                <div className="p-2 space-y-1">
                  {groupedNames.map((name, idx) => {
                    const isPrimary = name.toLowerCase() === targetCluster.toLowerCase();
                    const isNew = newlyAdded.has(name.toLowerCase());
                    return (
                      <div
                        key={`${name}-${idx}`}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                          isPrimary
                            ? "bg-primary/10 border border-primary/20"
                            : isNew
                              ? "bg-emerald-100/80 dark:bg-emerald-900/30 border border-emerald-300/50 dark:border-emerald-700/50"
                              : "bg-green-100/60 dark:bg-green-900/20 border border-green-200/50 dark:border-green-800/30"
                        )}
                      >
                        <span className="text-xs font-mono text-muted-foreground w-5 text-right flex-shrink-0">
                          {idx + 1}.
                        </span>
                        <span className={cn(
                          "flex-1 min-w-0 break-words",
                          isPrimary && "font-semibold"
                        )}>
                          {name}
                          {isPrimary && (
                            <Badge variant="outline" className="ml-1.5 text-[10px] px-1 py-0 align-middle">
                              Primary
                            </Badge>
                          )}
                          {isNew && (
                            <Badge variant="outline" className="ml-1.5 text-[10px] px-1 py-0 align-middle border-emerald-400 text-emerald-700 dark:text-emerald-400">
                              New
                            </Badge>
                          )}
                        </span>
                        {!isPrimary && (
                          <button
                            onClick={() => handleRemove(name)}
                            className="p-1 hover:bg-destructive/10 rounded transition-colors flex-shrink-0"
                            title="Remove from group"
                          >
                            <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {groupedNames.length === 0 && (
                    <div className="text-center py-6 text-sm text-muted-foreground">
                      No names in group
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Removed Names */}
            <div className="flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-foreground">Removed Names</h3>
                <Badge variant="secondary" className="text-xs">{removedNames.length}</Badge>
              </div>
              <ScrollArea className="flex-1 h-[200px] sm:h-[280px] rounded-lg border bg-red-50/50 dark:bg-red-950/10">
                <div className="p-2 space-y-1">
                  {removedNames.map((name, idx) => (
                    <div
                      key={`${name}-${idx}`}
                      className="flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-red-100/60 dark:bg-red-900/20 border border-red-200/50 dark:border-red-800/30 transition-colors"
                    >
                      <span className="text-xs font-mono text-muted-foreground w-5 text-right flex-shrink-0">
                        {idx + 1}.
                      </span>
                      <span className="flex-1 min-w-0 break-words">{name}</span>
                      <button
                        onClick={() => handleRestore(name)}
                        className="p-1 hover:bg-primary/10 rounded transition-colors flex-shrink-0"
                        title="Restore to group"
                      >
                        <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                      </button>
                    </div>
                  ))}
                  {removedNames.length === 0 && (
                    <div className="text-center py-6 text-sm text-muted-foreground">
                      No removed names
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-4 sm:px-6 py-3 sm:py-4 border-t bg-muted/30 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <Button variant="outline" onClick={handleCancel} size="sm">
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            size="sm" 
            disabled={!hasChanges}
            className="gap-1.5"
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
