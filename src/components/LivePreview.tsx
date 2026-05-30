import { useState, useEffect, useRef, useCallback } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';

interface LivePreviewProps {
  code: string;
  framework: string; // 'html' | 'react' | 'tailwind'
  deviceMode?: 'desktop' | 'tablet' | 'mobile';
}

const DEVICE_WIDTHS: Record<string, number> = {
  desktop: 1280,
  tablet: 768,
  mobile: 375,
};

// Cache vendor scripts once loaded (from main page context — has correct CSP)
let vendorCache: { react?: string; reactDom?: string; babel?: string; tailwind?: string } = {};
let vendorLoaded = false;
let vendorLoading = false;

async function loadVendorScripts(): Promise<void> {
  if (vendorLoaded) return;
  if (vendorLoading) {
    // Wait for existing load
    while (!vendorLoaded) await new Promise(r => setTimeout(r, 50));
    return;
  }
  vendorLoading = true;
  try {
    const [react, reactDom, babel, tailwind] = await Promise.all([
      fetch('/vendor/react.production.min.js').then(r => r.text()),
      fetch('/vendor/react-dom.production.min.js').then(r => r.text()),
      fetch('/vendor/babel.min.js').then(r => r.text()),
      fetch('/vendor/tailwindcss.js').then(r => r.text()),
    ]);
    vendorCache = { react, reactDom, babel, tailwind };
    vendorLoaded = true;
  } catch (e) {
    console.error('[LivePreview] Failed to load vendor scripts:', e);
  }
}

/**
 * Build the srcdoc HTML for the iframe.
 * Vendor scripts are inlined as <script> blocks — no external loads needed.
 */
function buildSrcDoc(code: string, framework: string): string {
  const { react, reactDom, babel, tailwind } = vendorCache;
  const vendorReady = react && reactDom && babel;

  if (framework === 'react') {
    // Extract component name from export default function X or function X
    const componentMatch = code.match(/(?:export\s+default\s+)?function\s+(\w+)/)
      || code.match(/(?:export\s+default\s+)?(?:const|let|var)\s+(\w+)\s*=/);
    const componentName = componentMatch ? componentMatch[1] : 'App';

    // Escape code for embedding in a string literal
    const escapedCode = JSON.stringify(code);

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${vendorReady ? `<script>${react}<\/script>` : ''}
  ${vendorReady ? `<script>${reactDom}<\/script>` : ''}
  ${vendorReady ? `<script>${babel}<\/script>` : ''}
  ${tailwind ? `<script>${tailwind}<\/script>` : ''}
  <style>
    body { margin: 0; padding: 0; background: #0f172a; min-height: 100vh; }
    * { box-sizing: border-box; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    try {
      var { useState, useEffect, useRef, useCallback, useMemo, useContext, Fragment } = React;
      var codeStr = ${escapedCode};
      var transpiled = Babel.transform(codeStr, { presets: ['react'] }).code;
      transpiled = transpiled.replace(/export default /g, '');
      transpiled = transpiled.replace(/export \{/g, '/* export {');
      transpiled = transpiled.replace(/import .+/g, '');
      transpiled = transpiled.replace(/"use strict";?/g, '');
      transpiled = transpiled.replace(/\bconst /g, 'var ');
      transpiled = transpiled.replace(/\blet /g, 'var ');
      eval(transpiled);
      var root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(React.createElement(${componentName}));
    } catch(e) {
      document.getElementById('root').innerHTML = '<pre style="color:#f87171;padding:20px;font-size:13px;white-space:pre-wrap">' + e.message + '\\n\\n' + e.stack + '</pre>';
    }
  <\/script>
</body>
</html>`;
  }

  // For html/tailwind — code is a complete HTML document
  // Inject Tailwind CDN inline if available
  if (!code.includes('<body') && !code.includes('<html')) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${tailwind ? `<script>${tailwind}<\/script>` : ''}
  <style>body { margin: 0; padding: 20px; background: #0f172a; min-height: 100vh; }</style>
</head>
<body>
${code}
</body>
</html>`;
  }

  // Full HTML document — inject Tailwind inline if not already present
  if (tailwind && !code.includes('tailwindcss')) {
    return code.replace('</head>', `<script>${tailwind}<\/script></head>`);
  }

  return code;
}

export default function LivePreview({ code, framework, deviceMode = 'desktop' }: LivePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [srcDoc, setSrcDoc] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const [vendorsReady, setVendorsReady] = useState(vendorLoaded);

  // Load vendor scripts on mount
  useEffect(() => {
    loadVendorScripts().then(() => setVendorsReady(true));
  }, []);

  // Debounced preview update when code or vendors change
  useEffect(() => {
    if (!code || !vendorsReady) {
      setSrcDoc('');
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const doc = buildSrcDoc(code, framework);
      setSrcDoc(doc);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [code, framework, vendorsReady]);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const containerWidth = DEVICE_WIDTHS[deviceMode] || 1280;

  return (
    <div className="live-preview-container">
      <div className="live-preview-header">
        <div className="live-preview-dots">
          <span className="dot dot-red" />
          <span className="dot dot-yellow" />
          <span className="dot dot-green" />
        </div>
        <span className="live-preview-title">Preview</span>
        <button className="live-preview-refresh" onClick={handleRefresh} title="Refresh preview">
          ↻
        </button>
      </div>
      <div className="live-preview-frame-wrapper" style={{ maxWidth: containerWidth }}>
        {srcDoc ? (
          <iframe
            ref={iframeRef}
            key={refreshKey}
            className="live-preview-iframe"
            srcDoc={srcDoc}
            title="Web Preview"
          />
        ) : (
          <div className="live-preview-empty">
            <div className="live-preview-empty-icon">🌐</div>
            <div className="live-preview-empty-text">
              {!vendorsReady ? 'Loading preview engine...' : 'Your preview will appear here'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
