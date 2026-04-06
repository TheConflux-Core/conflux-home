import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import {
  BrainCommand,
  BrainMode,
  COMMANDS,
  DEFAULT_COMMAND
} from "../../lib/neuralBrain";
import {
  ConfluxExternalEvent,
  ConfluxStatusSource,
  PulseEventDetail,
  TokenCadenceDetail
} from "./types";

const modeToCommand = (mode: BrainMode) =>
  COMMANDS.find((entry) => entry.mode === mode) ?? DEFAULT_COMMAND;

export type UseConfluxControllerOptions = {
  initialMode?: BrainMode;
  initialStatus?: string;
  initialTransparent?: boolean;
};

export function useConfluxController(options: UseConfluxControllerOptions = {}) {
  const [command, setCommand] = useState<BrainCommand>(
    options.initialMode ? modeToCommand(options.initialMode) : DEFAULT_COMMAND
  );
  const [signalCount, setSignalCount] = useState(12);
  const [pulseImpulse, setPulseImpulse] = useState(0);
  const [pulseEvent, setPulseEvent] = useState<(PulseEventDetail & { id: number }) | undefined>();
  const [status, setStatus] = useState(options.initialStatus ?? "Conflux is dormant");
  const [transparent, setTransparent] = useState(options.initialTransparent ?? true);
  const cadenceTimersRef = useRef<number[]>([]);

  const setMode = useEffectEvent(
    (
      nextMode: BrainMode,
      source: ConfluxStatusSource = "manual",
      nextStatus?: string
    ) => {
      const nextCommand = modeToCommand(nextMode);
      setCommand(nextCommand);
      setStatus(
        nextStatus ??
          (source === "manual"
            ? `Conflux shifted to ${nextCommand.label}`
            : `${source}: ${nextCommand.label}`)
      );
      setSignalCount((count) => count + Math.ceil(nextCommand.glowBoost * 2));
      setPulseImpulse((value) => value + 6 + nextCommand.glowBoost * 4);
    }
  );

  const triggerPulse = useEffectEvent((strength = 8, nextStatus = "Signal pulse") => {
    setSignalCount((count) => count + strength);
    setPulseImpulse((value) => value + strength);
    setStatus(nextStatus);
  });

  const routePulse = useEffectEvent(
    (
      detail: PulseEventDetail,
      nextStatus = "Directed pulse",
      options?: { updateStatus?: boolean }
    ) => {
      const strength = detail.strength ?? 10;
      setSignalCount((count) => count + strength);
      setPulseImpulse((value) => value + strength * 0.8);
      setPulseEvent({
        id: Date.now() + Math.floor(Math.random() * 1000),
        ...detail
      });
      if (options?.updateStatus !== false) {
        setStatus(nextStatus);
      }
    }
  );

  const clearCadenceTimers = useEffectEvent(() => {
    cadenceTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    cadenceTimersRef.current = [];
  });

  const runCadence = useEffectEvent(
    (
      detail: TokenCadenceDetail,
      fallbackRoute: BrainCommand["activeLobes"],
      fallbackStatus: string,
      fallbackMode: BrainMode
    ) => {
      clearCadenceTimers();

      const tokens =
        detail.tokens && detail.tokens.length > 0
          ? detail.tokens
          : ["signal", "signal", "signal", "signal"];
      const route = detail.route ?? fallbackRoute;
      const intervalMs = detail.intervalMs ?? 110;
      const burstsPerToken = detail.burstsPerToken ?? 2;
      const strength = detail.strength ?? 9;

      setMode(fallbackMode, "manual", detail.status ?? fallbackStatus);

      tokens.forEach((_, index) => {
        const timer = window.setTimeout(() => {
          routePulse(
            {
              route,
              strength: strength + (index % 2 === 0 ? 1.2 : 0),
              bursts: burstsPerToken
            },
            detail.status ?? fallbackStatus,
            { updateStatus: false }
          );
        }, index * intervalMs);
        cadenceTimersRef.current.push(timer);
      });
    }
  );

  const runSpeechCadence = useEffectEvent((detail: TokenCadenceDetail) => {
    runCadence(
      detail,
      ["memory", "reasoning", "speech"],
      detail.status ?? "Speaking cadence",
      "speak"
    );
  });

  const runListeningCadence = useEffectEvent((detail: TokenCadenceDetail) => {
    runCadence(
      detail,
      ["perception", "reasoning"],
      detail.status ?? "Listening cadence",
      "listen"
    );
  });

  const applyEvent = useEffectEvent(
    (event: ConfluxExternalEvent, source: ConfluxStatusSource = "backend") => {
      if (event.mode) {
        setMode(event.mode, source, event.status);
      }
      if (event.speechCadence) {
        runSpeechCadence(event.speechCadence);
      }
      if (event.listeningCadence) {
        runListeningCadence(event.listeningCadence);
      }
      if (event.pulseEvent) {
        routePulse(event.pulseEvent, event.status ?? "Directed pulse");
      }
      if (event.pulse) {
        triggerPulse(event.pulse, event.status ?? "Signal pulse");
      }
    }
  );

  const reset = useEffectEvent(() => {
    clearCadenceTimers();
    setCommand(DEFAULT_COMMAND);
    setSignalCount(12);
    setPulseImpulse(0);
    setPulseEvent(undefined);
    setStatus(options.initialStatus ?? "Conflux is dormant");
  });

  useEffect(() => {
    const decay = window.setInterval(() => {
      setPulseImpulse((value) => Math.max(0, value - 1.2));
    }, 90);
    return () => {
      window.clearInterval(decay);
      clearCadenceTimers();
    };
  }, [clearCadenceTimers]);

  return useMemo(
    () => ({
      command,
      mode: command.mode,
      pulseImpulse,
      pulseEvent,
      signalCount,
      status,
      transparent,
      setTransparent,
      setMode,
      triggerPulse,
      routePulse,
      runSpeechCadence,
      runListeningCadence,
      applyEvent,
      reset
    }),
    [
      applyEvent,
      command,
      pulseEvent,
      pulseImpulse,
      reset,
      routePulse,
      runListeningCadence,
      runSpeechCadence,
      setMode,
      signalCount,
      status,
      transparent,
      triggerPulse
    ]
  );
}
