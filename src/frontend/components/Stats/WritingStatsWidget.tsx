import React, { useEffect, useMemo, useState } from "react";
import { desktop } from "@/utils/desktop";
import type { WritingStat as DBWritingStat } from "@shared/types";
import { useEditorStore } from "@/stores/editorStore";
import { useTimeTrackingStore } from "@/stores/timeTrackingStore";

const ymd = (d: Date) => d.toISOString().slice(0, 10);

const getStreak = (stats: DBWritingStat[]): number => {
  const set = new Set(stats.map((s) => s.date));
  let days = 0;
  const d = new Date();
  while (true) {
    const k = ymd(d);
    if (set.has(k) && stats.find((s) => s.date === k)?.charsWritten && stats.find((s) => s.date === k)!.charsWritten > 0) {
      days++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return days;
};

const Sparkline: React.FC<{ points: number[] }> = ({ points }) => {
  if (points.length === 0) return <div className="h-8" />;
  const max = Math.max(1, ...points);
  const path = points
    .map((v, i) => `${(i / Math.max(1, points.length - 1)) * 100},${100 - (v / max) * 90}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-8 w-full">
      <polyline
        points={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-blue-400"
      />
    </svg>
  );
};

export const WritingStatsWidget: React.FC = () => {
  const [stats, setStats] = useState<DBWritingStat[]>([]);
  const { content, currentDocumentId, documents } = useEditorStore();
  const { enabled } = useTimeTrackingStore();
  const [todayChars, setTodayChars] = useState(0);

  useEffect(() => {
    void (async () => {
      const s = await desktop.statsGet(7);
      setStats(s);
    })();
  }, []);

  useEffect(() => {
    const prev = (documents.find((d) => d.id === currentDocumentId)?.content ?? "").length;
    const now = content.length;
    const diff = Math.max(0, now - prev);
    if (diff > 0) {
      setTodayChars((c) => c + diff);
    }
  }, [content.length]);

  const weekly = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const k = ymd(d);
        return stats.find((s) => s.date === k)?.charsWritten ?? 0;
      }),
    [stats],
  );

  const streak = useMemo(() => getStreak(stats), [stats]);
  const monthFocusHours = useMemo(() => {
    return (stats.slice(0, 30).reduce((sum, s) => sum + (s.focusMs || 0), 0) / 3600000).toFixed(1);
  }, [stats]);

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/80 p-3 text-xs text-gray-300">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-gray-100">執筆統計</span>
        <span className="text-gray-500">今日 +{todayChars.toLocaleString("ja-JP")}字</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="rounded bg-gray-700/60 p-2">
          <div className="text-gray-400">連続日数</div>
          <div className="text-lg font-semibold text-gray-100">{streak}日</div>
        </div>
        <div className="rounded bg-gray-700/60 p-2">
          <div className="text-gray-400">執筆時間（月）</div>
          <div className="text-lg font-semibold text-gray-100">{monthFocusHours}h</div>
        </div>
      </div>
      <div className="mt-2">
        <div className="text-gray-400">直近7日（文字数）</div>
        <Sparkline points={weekly} />
      </div>
      {!enabled && (
        <div className="mt-2 text-gray-500">執筆時間トラッキングはオプトイン設定で有効化できます</div>
      )}
    </div>
  );
};

export default WritingStatsWidget;
