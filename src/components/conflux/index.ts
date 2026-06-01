export { ConfluxPresence } from "./ConfluxPresence";
export type { FairyExpression, FairyNudge } from "./ConfluxPresence";
export { ConfluxDebugPanel } from "./ConfluxDebugPanel";
export { ConfluxTauriHost } from "./ConfluxTauriHost";
export { useConfluxController } from "./useConfluxController";
export { ConfluxContext, useConflux } from "./ConfluxContext";
export type { ConfluxContextValue } from "./ConfluxContext";
export { default as ConfluxStatusOrb } from "./ConfluxStatusOrb";
export { default as DockGlow } from "./DockGlow";
export { default as VoiceFAB } from "./VoiceFAB";
export { default as NudgeToast } from "./NudgeToast";
export {
  bindConfluxWindowEvents,
  emitConfluxPulseEvent,
  emitConfluxStateEvent,
  type ConfluxWindowBridge,
  type ConfluxWindowEventName
} from "./windowBridge";
export {
  attachTauriConfluxListeners,
  type ConfluxTauriListen,
  type ConfluxTauriUnlisten
} from "./tauriBridge";
export type {
  BrainCommand,
  BrainMode,
  ConfluxTauriHostProps,
  ConfluxExternalEvent,
  ConfluxStatusSource,
  LobeName,
  PulseEventDetail,
  TokenCadenceDetail,
  UseConfluxControllerOptions
} from "./types";
