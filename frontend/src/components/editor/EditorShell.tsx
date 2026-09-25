import React, { useState, useEffect } from "react";
import { EditorHeader } from "./EditorHeader";
import { MediaPanel } from "./MediaPanel";
import { PreviewPanel } from "./PreviewPanel";
import { Timeline } from "./Timeline";
import { TranscriptPanel } from "./TranscriptPanel";
import { Dialog } from "../ui/Dialog";
import { AudioUploader } from "../upload/AudioUploader";
import { SilenceSettings } from "../audio/SilenceSettings";
import { AudioAnalysisPanel } from "../audio/AudioAnalysisPanel";
import { ExportDialog } from "../export/ExportDialog";
import { ProjectBrowserModal } from "../projects/ProjectBrowserModal";
import { CreateProjectModal } from "../projects/CreateProjectModal";
import { BackgroundMusicModal } from "../audio/BackgroundMusicModal";
import { CharactersModal } from "../characters/CharactersModal";
import { useEditorStore } from "../../stores/editorStore";
import { useCharacterStore } from "../../stores/characterStore";
import { useProject } from "../../hooks/useProject";
import { useTranscription } from "../../hooks/useTranscription";
import { audioService, type AudioAnalysisResult } from "../../services/audioService";
import { audioPlayer } from "../../services/audioPlayer";
import { useAutoSave } from "../../hooks/useAutoSave";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { Button } from "../ui/Button";
import { Progress } from "../ui/Progress";

export const EditorShell: React.FC = () => {
  // Attach auto-save and undo/redo/save hotkeys
  useAutoSave();
  useKeyboardShortcuts();

  const { loadProject, createNewProject, closeProject } = useProject();

  const project = useEditorStore((s) => s.project);
  const setProject = useEditorStore((s) => s.setProject);
  const setWaveformPeaks = useEditorStore((s) => s.setWaveformPeaks);
  const updateProjectSettings = useEditorStore((s) => s.updateProjectSettings);
  const isBackgroundMusicModalOpen = useEditorStore((s) => s.isBackgroundMusicModalOpen);
  const setBackgroundMusicModalOpen = useEditorStore((s) => s.setBackgroundMusicModalOpen);
  const isCharactersModalOpen = useCharacterStore((s) => s.isCharactersModalOpen);
  const setCharactersModalOpen = useCharacterStore((s) => s.setCharactersModalOpen);

  const [isAudioUploadOpen, setIsAudioUploadOpen] = useState(false);
  const [isSilenceSettingsOpen, setIsSilenceSettingsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isProjectBrowserOpen, setIsProjectBrowserOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);

  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [isAnalyzingAudio, setIsAnalyzingAudio] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AudioAnalysisResult | null>(null);

  const { isTranscribing, jobProgress, error: transcribeError, runTranscription } = useTranscription();

  // Ensure global characters are loaded in editor
  useEffect(() => {
    useCharacterStore.getState().fetchCharacters().catch(() => {});
  }, []);

  // Synchronize Background Music with audioPlayer when project or BGM changes
  useEffect(() => {
    if (project?.backgroundMusic?.url) {
      audioPlayer.loadBgm(
        project.backgroundMusic.url,
        project.backgroundMusic.volume,
        project.backgroundMusic.loop
      );
    } else {
      audioPlayer.teardownBgm();
    }
  }, [
    project?.backgroundMusic?.url,
    project?.backgroundMusic?.volume,
    project?.backgroundMusic?.loop,
  ]);

  // Project browser & new project hotkeys: Ctrl+O, Ctrl+Shift+N
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (!isCtrlOrCmd) return;

      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if (e.key.toLowerCase() === "o") {
        e.preventDefault();
        setIsProjectBrowserOpen(true);
      } else if (e.key.toLowerCase() === "n" && (e.shiftKey || e.altKey)) {
        if (!isInput) {
          e.preventDefault();
          setIsCreateProjectOpen(true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Audio upload handler
  const handleAudioSelected = async (file: File) => {
    if (!project) return;
    // Stop any active playback and clear audio element
    audioPlayer.stop();
    audioPlayer.clear();

    setIsUploadingAudio(true);
    try {
      const res = await audioService.uploadAudio(project.id, file);
      setProject({
        ...project,
        originalAudio: res.originalAudio,
        processedAudio: undefined,
        duration: res.duration,
      });

      // Automatically run silence detection and normalization
      setIsAnalyzingAudio(true);
      const analysisRes = await audioService.analyzeAudio(project.id, {
        silenceThresholdDb: project.settings.silenceThresholdDb,
        minimumSilenceMs: project.settings.minimumSilenceMs,
        silenceRetentionPercent: project.settings.silenceRetentionPercent,
      });

      setAnalysisResult(analysisRes.analysis);
      setWaveformPeaks(analysisRes.waveform);
      setProject({
        ...project,
        originalAudio: res.originalAudio,
        processedAudio: analysisRes.processedAudio,
        duration: analysisRes.duration,
      });

      setIsAudioUploadOpen(false);
    } catch (err: any) {
      alert(`Audio upload or analysis failed: ${err.message}`);
    } finally {
      setIsUploadingAudio(false);
      setIsAnalyzingAudio(false);
    }
  };

  // Silence settings re-run handler
  const handleReapplySilence = async () => {
    if (!project) return;
    // Stop any active playback and clear audio element before analyzing
    audioPlayer.stop();
    audioPlayer.clear();

    setIsAnalyzingAudio(true);
    try {
      const analysisRes = await audioService.analyzeAudio(project.id, {
        silenceThresholdDb: project.settings.silenceThresholdDb,
        minimumSilenceMs: project.settings.minimumSilenceMs,
        silenceRetentionPercent: project.settings.silenceRetentionPercent,
      });

      setAnalysisResult(analysisRes.analysis);
      setWaveformPeaks(analysisRes.waveform);
      setProject({
        ...project,
        processedAudio: analysisRes.processedAudio,
        duration: analysisRes.duration,
      });
      setIsSilenceSettingsOpen(false);
    } catch (err: any) {
      alert(`Reapplying silence processing failed: ${err.message}`);
    } finally {
      setIsAnalyzingAudio(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-background overflow-hidden">
      {/* 1. Editor Header */}
      <EditorHeader
        onOpenAudioUpload={() => setIsAudioUploadOpen(true)}
        onOpenSilenceSettings={() => setIsSilenceSettingsOpen(true)}
        onTranscribe={runTranscription}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenProjectBrowser={() => setIsProjectBrowserOpen(true)}
        onOpenCreateProject={() => setIsCreateProjectOpen(true)}
        onCloseToDashboard={() => closeProject()}
        onOpenBackgroundMusic={() => setBackgroundMusicModalOpen(true)}
        onOpenCharacters={() => setCharactersModalOpen(true)}
        isTranscribing={isTranscribing}
      />

      {/* Transcription Progress Banner if running */}
      {isTranscribing && (
        <div className="bg-primary/15 border-b border-primary/30 px-4 py-2 flex items-center justify-between animate-in fade-in">
          <div className="flex-1 max-w-xl">
            <Progress
              value={jobProgress?.progress || 15}
              label={jobProgress?.message || "Running WhisperX forced alignment..."}
              subLabel={`${jobProgress?.progress || 15}%`}
            />
          </div>
          <span className="text-xs text-primary font-medium">WhisperX + large-v3-turbo / small.en</span>
        </div>
      )}

      {/* 2. Main Workspace Layout */}
      <div className="flex-1 flex flex-col p-2 gap-2 overflow-hidden">
        {/* Top Area: Media Library (Left) + 9:16 Video Preview (Right) */}
        <div className="flex-1 flex gap-2 overflow-hidden min-h-[360px]">
          <div className="w-80 flex-shrink-0 h-full">
            <MediaPanel />
          </div>

          <div className="flex-1 h-full">
            <PreviewPanel />
          </div>

          <div className="w-96 flex-shrink-0 h-full">
            <TranscriptPanel
              onTranscribeClick={runTranscription}
              isTranscribing={isTranscribing}
            />
          </div>
        </div>

        {/* Bottom Area: Timeline with Slices and Master Voiceover Audio */}
        <div className="h-72 flex-shrink-0">
          <Timeline />
        </div>
      </div>

      {/* Upload Audio Modal */}
      <Dialog
        isOpen={isAudioUploadOpen}
        onClose={() => setIsAudioUploadOpen(false)}
        title="Upload Voiceover Audio"
      >
        <div className="flex flex-col gap-3">
          <AudioUploader
            onAudioSelected={handleAudioSelected}
            isUploading={isUploadingAudio || isAnalyzingAudio}
            uploadedFileName={project?.originalAudio ? "voiceover-audio.mp3" : undefined}
          />
          {isAnalyzingAudio && (
            <div className="text-xs text-center text-primary animate-pulse">
              Running FFmpeg silence detection and cadence normalization...
            </div>
          )}
        </div>
      </Dialog>

      {/* Silence Settings Modal */}
      <Dialog
        isOpen={isSilenceSettingsOpen}
        onClose={() => setIsSilenceSettingsOpen(false)}
        title="Silence Detection & Retention Settings"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsSilenceSettingsOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleReapplySilence}
              disabled={isAnalyzingAudio || !project?.originalAudio}
            >
              {isAnalyzingAudio ? "Analyzing..." : "Re-Analyze & Process"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {project && (
            <SilenceSettings
              thresholdDb={project.settings.silenceThresholdDb}
              minSilenceMs={project.settings.minimumSilenceMs}
              retentionPercent={project.settings.silenceRetentionPercent}
              onChangeThreshold={(val) => updateProjectSettings({ silenceThresholdDb: val })}
              onChangeMinSilence={(val) => updateProjectSettings({ minimumSilenceMs: val })}
              onChangeRetention={(val) => updateProjectSettings({ silenceRetentionPercent: val })}
              disabled={isAnalyzingAudio}
            />
          )}
          <AudioAnalysisPanel analysis={analysisResult} isAnalyzing={isAnalyzingAudio} />
        </div>
      </Dialog>

      {/* Export Video Modal */}
      <ExportDialog
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />

      {/* Project Browser Modal */}
      <ProjectBrowserModal
        isOpen={isProjectBrowserOpen}
        onClose={() => setIsProjectBrowserOpen(false)}
        activeProjectId={project?.id}
        onSelectProject={async (id) => {
          await loadProject(id);
          setIsProjectBrowserOpen(false);
        }}
        onCreateProject={async (title, preset) => {
          await createNewProject(title);
          setIsProjectBrowserOpen(false);
        }}
      />

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        onCreate={async (title, preset) => {
          await createNewProject(title);
          setIsCreateProjectOpen(false);
        }}
      />

      {/* Background Music Modal */}
      <BackgroundMusicModal
        isOpen={isBackgroundMusicModalOpen}
        onClose={() => setBackgroundMusicModalOpen(false)}
      />

      {/* Global Characters Modal */}
      <CharactersModal
        isOpen={isCharactersModalOpen}
        onClose={() => setCharactersModalOpen(false)}
      />
    </div>
  );
};
