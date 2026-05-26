/** PLACEHOLDER — Pending full redesign by Forge in a future session */

export default function MarketplaceNew() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#1a0a0a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
      color: '#ff4444',
    }}>
      <div style={{
        fontSize: '72px',
        fontWeight: 900,
        letterSpacing: '-2px',
        textTransform: 'uppercase',
        marginBottom: '24px',
        textShadow: '0 0 40px rgba(255,68,68,0.4)',
      }}>
        MARKETPLACE
      </div>
      <div style={{
        fontSize: '20px',
        fontWeight: 600,
        letterSpacing: '6px',
        color: '#882222',
        textTransform: 'uppercase',
      }}>
        NEW
      </div>
      <div style={{
        marginTop: '48px',
        fontSize: '13px',
        color: '#551111',
        letterSpacing: '2px',
      }}>
        REDESIGN BY FORGE — COMING SOON
      </div>
    </div>
  );
}
