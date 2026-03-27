import { useStudio } from '../hooks/useStudio';
import { STUDIO_MODULES } from '../types';
import StudioTabs from './StudioTabs';
import StudioPromptBar from './StudioPromptBar';
import StudioOutput from './StudioOutput';
import StudioHistory from './StudioHistory';
import '../styles-studio.css';

export default function StudioView() {
  const {
    activeModule, setActiveModule,
    prompt, setPrompt,
    isGenerating,
    generations,
    selectedGeneration,
    generate,
    saveToVault,
    remix,
    selectGeneration,
  } = useStudio();

  return (
    <div className="studio-container">
      {/* Header */}
      <div className="studio-header">
        <h2 className="studio-title">✨ Studio</h2>
        <p className="studio-subtitle">Describe it. Generate it. Ship it.</p>
      </div>

      {/* Module Tabs */}
      <StudioTabs activeModule={activeModule} onSelect={setActiveModule} />

      {/* Prompt Bar */}
      <StudioPromptBar
        value={prompt}
        onChange={setPrompt}
        onSubmit={generate}
        isGenerating={isGenerating}
        activeModule={activeModule}
      />

      {/* Output Area */}
      <StudioOutput
        generation={selectedGeneration}
        isGenerating={isGenerating}
        onSave={() => selectedGeneration && saveToVault(selectedGeneration)}
        onRemix={() => selectedGeneration && remix(selectedGeneration)}
      />

      {/* Generation History */}
      <StudioHistory
        generations={generations}
        selectedId={selectedGeneration?.id ?? null}
        onSelect={selectGeneration}
      />
    </div>
  );
}
