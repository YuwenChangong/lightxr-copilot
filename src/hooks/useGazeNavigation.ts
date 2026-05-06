// useGazeNavigation — keyboard + mouse gaze simulation hook
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { AppId } from "@/lib/glass-os/gaze-types";
import { APP_REGISTRY, createAction } from "@/lib/glass-os/gaze-types";
import { executeAction } from "@/lib/glass-os/action-executor";

export interface GazeNavState {
  view: "launcher" | "app";
  focusedIndex: number;
  activeApp: AppId | null;
  hoveredIndex: number | null;
}

export function useGazeNavigation() {
  const [state, setState] = useState<GazeNavState>({
    view: "launcher",
    focusedIndex: 0,
    activeApp: null,
    hoveredIndex: null,
  });
  const stateRef = useRef(state);
  stateRef.current = state;

  const openApp = useCallback((appId: AppId) => {
    setState((s) => ({ ...s, view: "app", activeApp: appId, focusedIndex: s.focusedIndex }));
    executeAction(createAction("open_app", { appId }, "gaze"));
  }, []);

  const closeApp = useCallback(() => {
    setState((s) => ({ ...s, view: "launcher", activeApp: null }));
    executeAction(createAction("close_app", undefined, "gaze"));
  }, []);

  const setHoveredIndex = useCallback((idx: number | null) => {
    setState((s) => ({ ...s, hoveredIndex: idx }));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const { view, focusedIndex } = stateRef.current;

      if (view === "launcher") {
        const cols = 3;
        switch (e.key) {
          case "ArrowRight":
            e.preventDefault();
            setState((s) => ({
              ...s,
              focusedIndex: Math.min(s.focusedIndex + 1, APP_REGISTRY.length - 1),
            }));
            break;
          case "ArrowLeft":
            e.preventDefault();
            setState((s) => ({
              ...s,
              focusedIndex: Math.max(s.focusedIndex - 1, 0),
            }));
            break;
          case "ArrowDown":
            e.preventDefault();
            setState((s) => ({
              ...s,
              focusedIndex: Math.min(s.focusedIndex + cols, APP_REGISTRY.length - 1),
            }));
            break;
          case "ArrowUp":
            e.preventDefault();
            setState((s) => ({
              ...s,
              focusedIndex: Math.max(s.focusedIndex - cols, 0),
            }));
            break;
          case "Enter":
            e.preventDefault();
            openApp(APP_REGISTRY[focusedIndex].id);
            break;
        }
      } else if (view === "app") {
        if (e.key === "Escape") {
          e.preventDefault();
          closeApp();
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openApp, closeApp]);

  return {
    ...state,
    openApp,
    closeApp,
    setHoveredIndex,
  };
}