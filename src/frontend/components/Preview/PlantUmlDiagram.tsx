import React, { useEffect, useMemo, useState } from "react";
import { DiagramCard, type DiagramAction } from "./DiagramCard";
import { buildPlantUmlUrl, normalizePlantUmlServer } from "@/utils/diagramEncoding";
import { desktop, isDesktop } from "@/utils/desktop";

interface PlantUmlDiagramProps {
  code: string;
  server: string;
  enabled?: boolean;
}

const openUrl = async (url: string) => {
  if (isDesktop()) {
    try {
      await desktop.openExternal(url);
      return;
    } catch {
      /* fall through to window.open */
    }
  }
  window.open(url, "_blank", "noopener,noreferrer");
};

const serverHost = (server: string): string => {
  try {
    return new URL(server).host;
  } catch {
    return server;
  }
};

export const PlantUmlDiagram: React.FC<PlantUmlDiagramProps> = ({
  code,
  server,
  enabled = true,
}) => {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const source = code.trim();

  const url = useMemo(() => buildPlantUmlUrl(server, source), [server, source]);
  const serverUrl = useMemo(() => normalizePlantUmlServer(server), [server]);

  useEffect(() => {
    setLoading(true);
    setFailed(false);
  }, [url, retryKey]);

  const error = !enabled
    ? "PlantUML のレンダリングは設定で無効になっています。"
    : !source
      ? "PlantUML のソースが空です。"
      : failed
        ? "PlantUML サーバーから図を取得できませんでした。"
        : null;

  const actions: DiagramAction[] = enabled && source
    ? [
        { label: "サーバーで開く", onClick: () => void openUrl(serverUrl) },
        { label: "SVG を開く", onClick: () => void openUrl(url) },
      ]
    : [];

  return (
    <DiagramCard
      kind="plantuml"
      label="PlantUML ダイアグラム"
      source={code}
      loading={enabled && !!source && loading && !failed}
      error={error}
      errorHint={
        enabled
          ? `ネットワーク接続と PlantUML サーバー（${serverHost(server)}）の設定を確認してください。オフライン環境では表示できません。`
          : "設定の「プレビュー」から PlantUML を有効にできます。"
      }
      onRetry={enabled && source ? () => setRetryKey((key) => key + 1) : undefined}
      actions={actions}
      note={
        enabled && source ? (
          <span>
            図のソースは外部の PlantUML サーバー（{serverHost(server)}）へ送信されます。
            ローカルサーバーを使う場合は設定から URL を変更してください。
          </span>
        ) : undefined
      }
    >
      <div className="flex justify-center overflow-x-auto">
        <img
          key={`${url}-${retryKey}`}
          src={url}
          alt="PlantUML ダイアグラム"
          className="h-auto max-w-full"
          onLoad={() => {
            setLoading(false);
            setFailed(false);
          }}
          onError={() => {
            setLoading(false);
            setFailed(true);
          }}
        />
      </div>
    </DiagramCard>
  );
};

export default PlantUmlDiagram;
