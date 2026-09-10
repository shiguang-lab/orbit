import { useMemo, useState } from "react";
import { Button, Flex, message, Typography } from "antd";
import { MaterialIcon } from "@/app/nav";
import { useI18n } from "@/i18n";

type JsonTreeViewerProps = {
  value: unknown;
  maxHeight?: number;
};

function isContainer(value: unknown): value is Record<string, unknown> | unknown[] {
  return value !== null && typeof value === "object";
}

function scalar(value: unknown): { text: string; color: string } {
  if (typeof value === "string") return { text: JSON.stringify(value), color: "#a7f3d0" };
  if (typeof value === "number") return { text: String(value), color: "#93c5fd" };
  if (typeof value === "boolean") return { text: String(value), color: "#f9a8d4" };
  if (value === null) return { text: "null", color: "#a1a1aa" };
  return { text: String(value), color: "#f4f4f5" };
}

function JsonNode({
  name,
  value,
  depth,
  expandDepth,
}: {
  name?: string;
  value: unknown;
  depth: number;
  expandDepth: number;
}) {
  const [manual, setManual] = useState<boolean | null>(null);
  const expanded = manual ?? depth < expandDepth;
  const prefix = name === undefined ? null : <span style={{ color: "#c4b5fd" }}>{name}: </span>;
  if (!isContainer(value)) {
    const rendered = scalar(value);
    return <div style={{ paddingLeft: depth * 16 }}>{prefix}<span style={{ color: rendered.color }}>{rendered.text}</span></div>;
  }
  const entries = Array.isArray(value) ? value.map((item, index) => [String(index), item] as const) : Object.entries(value);
  const open = Array.isArray(value) ? "[" : "{";
  const close = Array.isArray(value) ? "]" : "}";
  return (
    <div style={{ paddingLeft: depth * 16 }}>
      <button
        type="button"
        onClick={() => setManual(!expanded)}
        aria-expanded={expanded}
        style={{ border: 0, padding: 0, background: "transparent", color: "inherit", cursor: "pointer", font: "inherit" }}
      >
        <span style={{ display: "inline-block", width: 14 }}>{expanded ? "▾" : "▸"}</span>
        {prefix}{open}{!expanded && <span style={{ color: "#71717a" }}> {entries.length} </span>}{!expanded && close}
      </button>
      {expanded && (
        <>
          {entries.map(([key, child]) => <JsonNode key={key} name={key} value={child} depth={depth + 1} expandDepth={expandDepth} />)}
          <div>{close}</div>
        </>
      )}
    </div>
  );
}

export function JsonTreeViewer({ value, maxHeight = 320 }: JsonTreeViewerProps) {
  const { t } = useI18n();
  const [expandDepth, setExpandDepth] = useState(2);
  const serialized = useMemo(() => JSON.stringify(value, null, 2), [value]);
  const copy = async () => {
    await navigator.clipboard.writeText(serialized);
    message.success(t("logs.jsonCopied"));
  };
  return (
    <div style={{ background: "#09090b", color: "#f4f4f5", borderRadius: 8, overflow: "hidden" }}>
      <Flex justify="space-between" align="center" style={{ padding: "8px 12px", borderBottom: "1px solid #27272a" }}>
        <Typography.Text style={{ color: "#a1a1aa" }}>{t("logs.expandDepth")}: {expandDepth}</Typography.Text>
        <Flex gap={8}>
          <Button icon={<MaterialIcon name="remove" />} onClick={() => setExpandDepth((depth) => Math.max(0, depth - 1))} aria-label={t("logs.collapseLevel")} />
          <Button icon={<MaterialIcon name="add" />} onClick={() => setExpandDepth((depth) => depth + 1)} aria-label={t("logs.expandLevel")} />
          <Button icon={<MaterialIcon name="content_copy" />} onClick={() => void copy()}>{t("logs.copyJson")}</Button>
        </Flex>
      </Flex>
      <div style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: 12, lineHeight: 1.5, maxHeight, overflow: "auto" }}>
        <JsonNode value={value} depth={0} expandDepth={expandDepth} />
      </div>
    </div>
  );
}
