import { useState, useCallback, useEffect } from 'react';
import { View } from '../types';
import { playNavSwish, startPulseAmbient, startHearthAmbient, startOrbitAmbient, startEchoAmbient } from '../lib/sound';

interface ImmersiveViewProps {
  view: View;
  backgroundUrl: string;
  onClose: () => void;
  children: React.ReactNode;
}

export default function ImmersiveView({ view, backgroundUrl, onClose, children }: ImmersiveViewProps) {
  const [exiting, setExiting] = useState(false);

  const handleClose = useCallback(() => {
    playNavSwish('back');
    setExiting(true);
    // Match the exit animation duration
    setTimeout(() => onClose(), 200);
  }, [onClose]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleClose]);

  // Play swish-in on mount
  useEffect(() => {
    playNavSwish('forward');
  }, []);

  // Per-app ambient soundscape — starts on mount, stops on unmount
  useEffect(() => {
    let stop: (() => void) | undefined;
    switch (view) {
      case 'pulse':  stop = startPulseAmbient(); break;
      // case 'hearth':  stop = startHearthAmbient(); break;
      case 'orbit':     /* stop = startOrbitAmbient(); */ break;
      case 'mirror':     stop = startEchoAmbient(); break;
      // horizon and other apps — no ambient (could add later)
    }
    return () => { stop?.(); };
  }, [view]);

  return (
    <div className={`immersive-overlay ${exiting ? 'immersive-exiting' : ''}`}>
      {backgroundUrl && (
        <>
          <div
            className="immersive-bg"
            style={{ backgroundImage: `url('${backgroundUrl}')` }}
          />
          <div className="immersive-gradient" />
        </>
      )}
      {view !== 'story' && (
        <button className="immersive-back-btn" onClick={handleClose}>
          Desktop →
        </button>
      )}
      <div className="immersive-content">
        {children}
      </div>
    </div>
  );
}
