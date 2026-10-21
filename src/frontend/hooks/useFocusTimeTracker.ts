import { useEffect, useRef } from "react";
import { bumpWritingStat } from "@/utils/db";
import { useTimeTrackingStore } from "@/stores/timeTrackingStore";

const ymd = () => new Date().toISOString().slice(0, 10);

/**
 * エディタにフォーカスしている実時間を日次で記録する（オプトイン）。
 * visibilitychange と blur で区切り、一定間隔で書き出す。
 */
export const useFocusTimeTracker = () => {
  const enabled = useTimeTrackingStore((s) => s.enabled);
  const sessionStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return undefined;

    const flush = () => {
      if (sessionStartRef.current === null) return;
      const delta = Date.now() - sessionStartRef.current;
      sessionStartRef.current = null;
      if (delta > 0) {
        void bumpWritingStat(ymd(), 0, delta).catch(() => {});
      }
    };

    const start = () => {
      if (sessionStartRef.current === null) {
        sessionStartRef.current = Date.now();
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
      else start();
    };

    const onBlur = () => flush();
    const onFocus = () => start();

    start();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      flush();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, [enabled]);
};

export default useFocusTimeTracker;
