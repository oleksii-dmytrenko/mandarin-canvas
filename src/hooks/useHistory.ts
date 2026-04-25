import { useRef, useCallback } from "react";
import type { StoredState } from "../types";
import { HISTORY_LIMIT } from "../utils/constants";

interface HistoryState {
  past: StoredState[];
  future: StoredState[];
}

export function useHistory() {
  const historyRef = useRef<HistoryState>({ past: [], future: [] });

  const trackHistory = useCallback((snapshot: StoredState) => {
    historyRef.current = {
      past: [...historyRef.current.past, snapshot].slice(-HISTORY_LIMIT),
      future: [],
    };
  }, []);

  const canUndo = historyRef.current.past.length > 0;
  const canRedo = historyRef.current.future.length > 0;

  return {
    historyRef,
    trackHistory,
    canUndo,
    canRedo,
  };
}
