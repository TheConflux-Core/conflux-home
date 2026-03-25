// Conflux Home — Control Room Placeholder
// The virtual control room — JARVIS meets neural web
// Phase 2: Desktop Life

export default function ControlRoom() {
  return (
    <div className="control-room">
      <div className="control-room-placeholder">
        <div className="cr-grid-lines" />
        <div className="cr-center-glow" />
        <div className="cr-text">
          <h2>🌐 Control Room</h2>
          <p>The virtual home is coming.</p>
          <p className="cr-hint">
            Energy signatures · Status rings · Data pulsing along paths
          </p>
          <div className="cr-agents-preview">
            <div className="cr-agent-node cr-node-idle">⚡</div>
            <div className="cr-agent-node cr-node-working">🔧</div>
            <div className="cr-agent-node cr-node-idle">📊</div>
            <div className="cr-agent-node cr-node-thinking">🧠</div>
            <div className="cr-agent-node cr-node-idle">🎵</div>
          </div>
        </div>
      </div>
    </div>
  );
}
