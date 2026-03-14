import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { assessorService, Assessment } from "@/lib/api/services/assessor";

interface UseComprehensiveNotesProps {
  assessmentId?: string;
  initialNotes?: string;
}

export const useComprehensiveNotes = ({
  assessmentId,
  initialNotes = "",
}: UseComprehensiveNotesProps) => {
  const [comprehensiveNotes, setComprehensiveNotes] = useState(
    initialNotes || "",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize notes when initialNotes changes (e.g., when assessment data loads)
  useEffect(() => {
    setComprehensiveNotes(initialNotes || "");
    setHasChanges(false);
  }, [initialNotes]);

  // Save notes to backend
  const saveNotes = useCallback(async () => {
    if (!assessmentId) {
      toast.error("No assessment ID provided");
      return false;
    }

    if (!hasChanges) {
      toast.info("No changes to save");
      return true;
    }

    setIsSaving(true);
    try {
      await assessorService.updateAssessment(assessmentId, {
        comprehensiveNotes,
      });
      setLastSaved(new Date());
      setHasChanges(false);
      toast.success("Notes saved successfully");
      return true;
    } catch (error: unknown) {
      console.error("Failed to save notes:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save notes";
      toast.error(errorMessage);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [assessmentId, comprehensiveNotes, hasChanges]);

  // Handle notes change
  const handleNotesChange = useCallback(
    (value: string) => {
      setComprehensiveNotes(value);
      setHasChanges(value !== (initialNotes || ""));
    },
    [initialNotes, comprehensiveNotes],
  );

  // Generate report
  const generateReport = useCallback(async () => {
    if (!assessmentId) {
      toast.error("No assessment ID provided");
      return;
    }

    // First save any pending changes
    if (hasChanges) {
      const saved = await saveNotes();
      if (!saved) {
        return; // Don't proceed if save failed
      }
    }

    try {
      const report = await assessorService.generateReport(assessmentId);
      toast.success("Report generated successfully");
      return report;
    } catch (error: unknown) {
      console.error("Failed to generate report:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to generate report";
      toast.error(errorMessage);
      return null;
    }
  }, [assessmentId, hasChanges, saveNotes]);

  // Check if user can generate report
  const canGenerateReport = Boolean(assessmentId && comprehensiveNotes.trim());

  return {
    comprehensiveNotes,
    setComprehensiveNotes: handleNotesChange,
    saveNotes,
    generateReport,
    isSaving,
    lastSaved,
    hasChanges,
    canGenerateReport,
  };
};
