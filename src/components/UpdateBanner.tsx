import { useAutoUpdate } from '../hooks/useAutoUpdate';
import './UpdateBanner.css';

const DOWNLOAD_URL = "https://theconflux.com/download";
const CHANGELOG_URL = "https://theconflux.com/changelog";

export default function UpdateBanner() {
  const { available, version, downloading, downloaded, error, install, dismiss } = useAutoUpdate();

  if (!available) return null;

  return (
    <div className="update-banner">
      <div className="update-banner-content">
        <span className="update-banner-icon">🚀</span>
        <div className="update-banner-text">
          <strong>Conflux Home v{version} available</strong>
          <a href={CHANGELOG_URL} target="_blank" rel="noopener noreferrer" className="update-banner-body" style={{ color: 'var(--accent-primary, #7c3aed)', textDecoration: 'underline', cursor: 'pointer', display: 'block', marginTop: '2px', fontSize: '12px' }}>
            See release notes
          </a>
          {error && (
            <div className="update-banner-error">
              <p>Auto-update failed: {error}</p>
              <a href={DOWNLOAD_URL} target="_blank" rel="noopener noreferrer" className="update-btn update-btn-install" style={{ textDecoration: 'none', display: 'inline-block' }}>
                Download Manually
              </a>
            </div>
          )}
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
