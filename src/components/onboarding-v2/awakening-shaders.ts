/**
 * Custom GLSL Shaders for Onboarding V2
 * 
 * These are Three.js shader materials used exclusively in the onboarding sequence.
 * No other part of the app imports this file.
 */

// ── Dissolve Shader (Agent Materialization) ──────────────────

export const dissolveVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const dissolveFragmentShader = `
  uniform sampler2D uTexture;
  uniform float uProgress;      // 0 = invisible, 1 = fully visible
  uniform float uTime;
  uniform vec3 uColor;          // Agent accent color
  uniform float uScanlineWidth;
  uniform float uEdgeGlow;
  
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  
  // Simplex-like noise for dissolve pattern
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
  
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = rot * p * 2.0;
      a *= 0.5;
    }
    return v;
  }
  
  void main() {
    vec4 texColor = texture2D(uTexture, vUv);
    
    // Dissolve noise field
    float n = fbm(vUv * 8.0 + uTime * 0.3);
    
    // Dissolve threshold — below progress = visible, above = dissolved
    float dissolveEdge = smoothstep(uProgress - 0.1, uProgress + 0.1, n);
    
    // Scanline effect during materialization
    float scanline = sin(vPosition.y * 40.0 + uTime * 8.0) * 0.5 + 0.5;
    scanline = pow(scanline, 8.0) * step(uProgress, 0.95);
    
    // Edge glow where dissolve meets solid
    float edge = smoothstep(0.0, 0.15, abs(n - uProgress));
    float edgeGlow = (1.0 - edge) * uEdgeGlow;
    
    // Fresnel rim light
    vec3 viewDir = normalize(cameraPosition - vPosition);
    float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 3.0);
    
    // Combine
    vec3 baseColor = texColor.rgb;
    vec3 glowColor = uColor * (edgeGlow + fresnel * 0.4);
    vec3 scanlineColor = uColor * scanline * 0.6;
    
    vec3 finalColor = baseColor * uProgress + glowColor + scanlineColor;
    float finalAlpha = texColor.a * (1.0 - dissolveEdge) * uProgress;
    finalAlpha += edgeGlow * 0.5 + fresnel * 0.2;
    
    gl_FragColor = vec4(finalColor, clamp(finalAlpha, 0.0, 1.0));
  }
`;

// ── Hologram Shader (Input Field) ────────────────────────────

export const hologramVertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  
  void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const hologramFragmentShader = `
  uniform float uTime;
  uniform float uIntensity;
  uniform vec3 uColor;
  uniform float uInputProgress;  // 0-1, how much has been typed
  
  varying vec2 vUv;
  varying vec3 vPosition;
  
  void main() {
    // Base gradient — fades from center outward
    float dist = length(vUv - 0.5) * 2.0;
    float gradient = 1.0 - smoothstep(0.0, 1.0, dist);
    
    // Horizontal scanlines
    float scanline = sin(vUv.y * 200.0 + uTime * 4.0) * 0.5 + 0.5;
    scanline = pow(scanline, 4.0) * 0.3;
    
    // Vertical pulse that responds to typing
    float pulse = sin(vUv.x * 12.0 - uTime * 6.0 + uInputProgress * 20.0) * 0.5 + 0.5;
    pulse = pow(pulse, 3.0) * uInputProgress;
    
    // Flicker
    float flicker = 0.95 + 0.05 * sin(uTime * 30.0);
    
    // Combine
    float alpha = (gradient * 0.15 + scanline * 0.1 + pulse * 0.2) * uIntensity * flicker;
    vec3 color = uColor * (1.0 + pulse * 0.5);
    
    gl_FragColor = vec4(color, alpha);
  }
`;

// ── Shockwave Shader ─────────────────────────────────────────

export const shockwaveVertexShader = `
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const shockwaveFragmentShader = `
  uniform float uTime;
  uniform float uProgress;   // 0-1, ring expansion
  uniform vec3 uColor;
  uniform float uRadius;
  
  varying vec2 vUv;
  
  void main() {
    vec2 center = vUv - 0.5;
    float dist = length(center) * 2.0;
    
    // Expanding ring
    float ring = abs(dist - uProgress * uRadius);
    float ringGlow = smoothstep(0.08, 0.0, ring);
    float ringFade = 1.0 - uProgress; // fades as it expands
    
    // Inner fill (brief flash)
    float innerFlash = smoothstep(uProgress * uRadius, 0.0, dist) * (1.0 - uProgress) * 0.3;
    
    float alpha = (ringGlow + innerFlash) * ringFade;
    vec3 color = uColor * (1.0 + ringGlow * 0.5);
    
    gl_FragColor = vec4(color, alpha);
  }
`;

// ── Grid Floor Shader ────────────────────────────────────────

export const gridVertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  
  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const gridFragmentShader = `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uOpacity;
  
  varying vec2 vUv;
  varying vec3 vWorldPos;
  
  void main() {
    // Grid lines
    vec2 grid = abs(fract(vWorldPos.xz * 0.5) - 0.5);
    float line = min(grid.x, grid.y);
    float gridLine = 1.0 - smoothstep(0.0, 0.03, line);
    
    // Distance fade
    float dist = length(vWorldPos.xz) * 0.05;
    float fade = 1.0 - smoothstep(0.0, 1.0, dist);
    
    // Pulse wave
    float wave = sin(length(vWorldPos.xz) * 0.3 - uTime * 2.0) * 0.5 + 0.5;
    
    float alpha = gridLine * fade * uOpacity * (0.6 + wave * 0.4);
    vec3 color = uColor * (1.0 + wave * 0.3);
    
    gl_FragColor = vec4(color, alpha);
  }
`;

// ── Particle Trail Shader ────────────────────────────────────

export const particleVertexShader = `
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3 aColor;
  
  varying float vAlpha;
  varying vec3 vColor;
  
  void main() {
    vAlpha = aAlpha;
    vColor = aColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const particleFragmentShader = `
  varying float vAlpha;
  varying vec3 vColor;
  
  void main() {
    // Soft circle
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);
    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
    alpha *= vAlpha;
    
    // Glow
    vec3 color = vColor * (1.0 + (1.0 - dist) * 0.5);
    
    gl_FragColor = vec4(color, alpha);
  }
`;
