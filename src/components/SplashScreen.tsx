import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 700);
    const doneTimer = setTimeout(() => onComplete(), 1000);
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
      <img
        src="/logo_v1.png"
        alt="Conflux Home"
        className="splash-logo"
        style={{
          width: 80,
          height: 80,
          objectFit: 'contain',
          filter: 'drop-shadow(0 0 24px rgba(0,212,255,0.5))',
          marginBottom: 8,
        }}
      />
      <h1 className="splash-title">Conflux Home</h1>
      <p className="splash-tagline">A home for your AI family</p>
    </div>
  );
}
