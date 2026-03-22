import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 1200);
    const doneTimer = setTimeout(() => onComplete(), 1500);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  return (
    <div
      className="splash-screen"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.3s ease',
        pointerEvents: fading ? 'none' : 'auto',
      }}
    >
      <div className="splash-logo">⚡</div>
      <h1 className="splash-title">Conflux Home</h1>
      <p className="splash-tagline">A home for your AI family</p>
    </div>
  );
}
