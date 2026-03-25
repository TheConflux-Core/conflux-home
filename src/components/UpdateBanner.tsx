import { useAutoUpdate } from '../hooks/useAutoUpdate';
import './UpdateBanner.css';

export default function UpdateBanner() {
  const { available, version, body, downloading, downloaded, error, install, dismiss } = useAutoUpdate();

  if (!available) return null;

  return (
    <div className="update-banner">
      <div className="update-banner-content">
        <span className="update-banner-icon">🚀</span>
        <div className="update-banner-text">
          <strong>Conflux Home v{version} available</strong>
          {body && <p className="update-banner-body">{body.split('\n')[0]}</p>}
          {error && <p className="update-banner-error">{error}</p>}
        </div>
        <div className="update-banner-actions">
          {downloaded ? (
            <button className="update-btn update-btn-install" onClick={() => window.location.reload()}>
              Restart Now
            </button>
          ) : downloading ? (
            <span className="update-banner-progress">Downloading…</span>
          ) : (
            <>
              <button className="update-btn update-btn-install" onClick={install}>
                Update Now
              </button>
              <button className="update-btn update-btn-dismiss" onClick={dismiss}>
                Later
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
