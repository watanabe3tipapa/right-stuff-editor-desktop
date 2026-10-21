import { useEffect, useState } from "react";

export interface StorageUsage {
  usageBytes: number;
  quotaBytes: number;
  ratio: number;
  supported: boolean;
}

const refreshEstimate = async (): Promise<StorageUsage> => {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
    return { usageBytes: 0, quotaBytes: 0, ratio: 0, supported: false };
  }
  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    return {
      usageBytes: usage,
      quotaBytes: quota,
      ratio: quota > 0 ? usage / quota : 0,
      supported: true,
    };
  } catch {
    return { usageBytes: 0, quotaBytes: 0, ratio: 0, supported: false };
  }
};

export const formatBytes = (bytes: number): string => {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(value >= 100 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
};

export const useSystemStatus = (refreshIntervalMs = 30000) => {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [storage, setStorage] = useState<StorageUsage>({
    usageBytes: 0,
    quotaBytes: 0,
    ratio: 0,
    supported: false,
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const next = await refreshEstimate();
      if (!cancelled) setStorage(next);
    };
    void run();
    const timer = window.setInterval(() => void run(), refreshIntervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [refreshIntervalMs]);

  return { isOnline, storage };
};

export default useSystemStatus;
