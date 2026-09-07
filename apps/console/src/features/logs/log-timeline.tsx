import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Button,
  Card,
  Drawer,
  Flex,
  InputNumber,
  Space,
  Tag,
  Typography,
} from "antd";
import { createStyles } from "antd-style";
import { useQuery } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import { logsApi, type RequestCallLog } from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";

const { Text } = Typography;

export type ViewMode = "follow" | "live" | "pan";

export const VISIBLE_WINDOW_MS = 5 * 60 * 1000;
export const BAR_HEIGHT = 28;
export const LANE_GAP = 4;
export const LANE_HEIGHT = BAR_HEIGHT + LANE_GAP;
export const HEADER_HEIGHT = 48;
export const AXIS_HEIGHT = 32;
export const MIN_BAR_WIDTH = 3;
export const DEFAULT_LIST_POLL_SECONDS = 2;
export const TIMELINE_LIST_POLL_STORAGE_KEY = "timelineListPollSeconds";
export const FOLLOW_LINE_X = 0.75;
export const LIVE_LINE_FRACTION = 0.9;
export const CONVERSATION_LANE_REUSE_STORAGE_KEY = "timelineConversationLaneReuseMinutes";
export const DEFAULT_CONVERSATION_LANE_REUSE_WINDOW_MS = 2 * 60 * 1000;

export function computeBarRange(
  log: RequestCallLog,
  nowMs: number
): { startMs: number; endMs: number } {
  const ts = new Date(log.timestamp || log.createdAt || nowMs).getTime();
  const dur = log.durationMs ?? log.latencyMs ?? 0;
  if (log.active) return { startMs: ts, endMs: nowMs };
  return { startMs: ts - dur, endMs: ts };
}

export const MODE_META: Record<ViewMode, { label: string; description: string }> = {
  follow: {
    label: "跟随 (Follow)",
    description: "自动跟随最新请求，保持视角靠右",
  },
  live: {
    label: "实时 (Now)",
    description: "以当前系统时间 NOW 线为基准动态推进",
  },
  pan: {
    label: "拖拽 (Pan)",
    description: "按住鼠标自由拖动画布浏览历史",
  },
};

export function formatTimeAxis(ms: number): string {
  const d = new Date(ms);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  const s = d.getSeconds().toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export function formatDateLabel(ms: number): string {
  const d = new Date(ms);
  const months = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
  return `${months[d.getMonth()]}${d.getDate()}日`;
}

export function getStatusColor(status: number | undefined, active?: boolean): string {
  if (active) return "#6366F1";
  const st = status ?? 200;
  if (st >= 200 && st < 300) return "#059669";
  if (st >= 400 && st < 500) return "#D97706";
  if (st >= 500) return "#DC2626";
  return "#6B7280";
}

export function truncateModel(model: string | null | undefined): string {
  if (!model) return "";
  const parts = model.split("/");
  const short = parts[parts.length - 1];
  return short.length > 16 ? short.slice(0, 15) + "…" : short;
}

export function allocateLanes(
  items: RequestCallLog[],
  nowMs: number,
  reuseWindowMs: number = DEFAULT_CONVERSATION_LANE_REUSE_WINDOW_MS
): Map<string, number> {
  const lanes: { startMs: number; endMs: number }[] = [];
  const laneConversation: (string | null)[] = [];
  const laneMap = new Map<string, number>();

  const sorted = [...items].sort((a, b) => {
    const aStart = new Date(a.timestamp).getTime();
    const bStart = new Date(b.timestamp).getTime();
    return aStart - bStart;
  });

  for (const item of sorted) {
    const { startMs, endMs } = computeBarRange(item, nowMs);
    const conversationId = item.sessionTag || null;

    let placed = false;

    if (conversationId) {
      for (let i = 0; i < lanes.length; i++) {
        if (laneConversation[i] === conversationId && startMs - lanes[i].endMs <= reuseWindowMs) {
          lanes[i] = { startMs, endMs };
          laneMap.set(item.id, i);
          placed = true;
          break;
        }
      }
    }

    if (!placed) {
      for (let i = 0; i < lanes.length; i++) {
        if (lanes[i].endMs < startMs) {
          lanes[i] = { startMs, endMs };
          laneConversation[i] = conversationId;
          laneMap.set(item.id, i);
          placed = true;
          break;
        }
      }
    }
    if (!placed) {
      laneMap.set(item.id, lanes.length);
      laneConversation.push(conversationId);
      lanes.push({ startMs, endMs });
    }
  }

  return laneMap;
}

const useStyles = createStyles(({ token }) => ({
  page: {
    width: "100%",
    flex: 1,
    minHeight: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    userSelect: "none",
  },
  toolbarCard: {
    borderRadius: 12,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
    boxShadow: token.boxShadowTertiary,
    flexShrink: 0,
  },
  canvasWrapper: {
    flex: 1,
    minHeight: 480,
    background: "#09090b",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    borderRadius: 12,
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.35)",
    overflow: "hidden",
    position: "relative",
    display: "flex",
    flexDirection: "column",
  },
  canvasContent: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
    touchAction: "none",
  },
  legendBar: {
    height: 36,
    borderTop: "1px solid rgba(255, 255, 255, 0.08)",
    background: "#18181b",
    padding: "0 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.45)",
    flexShrink: 0,
  },
  tooltipCard: {
    position: "fixed",
    zIndex: 1000,
    pointerEvents: "none",
    background: "#18181b",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    borderRadius: 8,
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)",
    padding: "10px 12px",
    minWidth: 220,
    maxWidth: 320,
  },
}));

export function LogTimelinePage() {
  const { styles } = useStyles();
  const [mode, setMode] = useState<ViewMode>("follow");
  const [zoom, setZoom] = useState<number>(1);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [canvasWidth, setCanvasWidth] = useState<number>(1200);
  const [panOffsetMs, setPanOffsetMs] = useState<number>(0);
  const [panFrozenMs, setPanFrozenMs] = useState<number>(0);
  const [liveBaseMs, setLiveBaseMs] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [dragStartOffset, setDragStartOffset] = useState<number>(0);
  const [selectedLog, setSelectedLog] = useState<RequestCallLog | null>(null);

  const [conversationLaneReuseMinutes, setConversationLaneReuseMinutes] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(CONVERSATION_LANE_REUSE_STORAGE_KEY);
      const parsed = saved ? Number(saved) : 2;
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 2;
    } catch {
      return 2;
    }
  });

  const [listPollSeconds, setListPollSeconds] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(TIMELINE_LIST_POLL_STORAGE_KEY);
      const parsed = saved ? Number(saved) : DEFAULT_LIST_POLL_SECONDS;
      return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_LIST_POLL_SECONDS;
    } catch {
      return DEFAULT_LIST_POLL_SECONDS;
    }
  });

  const canvasRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);

  const logsQuery = useQuery({
    queryKey: ["request-timeline-logs"],
    queryFn: () => logsApi.listCallLogs({ limit: 200 }),
    refetchInterval: listPollSeconds * 1000,
  });

  const logs = useMemo(() => logsQuery.data ?? [], [logsQuery.data]);

  // ResizeObserver for canvas width
  useEffect(() => {
    if (!canvasRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setCanvasWidth(entry.contentRect.width);
      }
    });
    observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, []);

  // Live animation loop
  useEffect(() => {
    let lastUpdate = 0;
    const THROTTLE_MS = mode === "follow" ? 0 : 50;
    const onFrame = (frame: number) => {
      if (frame - lastUpdate >= THROTTLE_MS) {
        lastUpdate = frame;
        setNowMs(Date.now());
      }
      animRef.current = requestAnimationFrame(onFrame);
    };
    animRef.current = requestAnimationFrame(onFrame);
    return () => cancelAnimationFrame(animRef.current);
  }, [mode]);

  const windowMs = VISIBLE_WINDOW_MS / zoom;

  const timeRange = useMemo(() => {
    if (mode === "follow") {
      const end = nowMs + windowMs * (1 - FOLLOW_LINE_X);
      const start = end - windowMs;
      return { start, end };
    }
    if (mode === "live") {
      const base = liveBaseMs || nowMs;
      const elapsed = nowMs - base;
      const snapWindow = windowMs * LIVE_LINE_FRACTION;
      const slot = elapsed % snapWindow;
      const start = nowMs - slot - windowMs * (1 - LIVE_LINE_FRACTION);
      return { start, end: start + windowMs };
    }
    const base = panFrozenMs || nowMs;
    const start = base - windowMs * 0.5 + panOffsetMs;
    return { start, end: start + windowMs };
  }, [mode, nowMs, windowMs, liveBaseMs, panFrozenMs, panOffsetMs]);

  const { start: timeStart, end: timeEnd } = timeRange;

  const nowLineX = useMemo(() => {
    if (mode === "follow") {
      return FOLLOW_LINE_X * 100;
    }
    const totalMs = timeEnd - timeStart;
    if (totalMs <= 0) return 50;
    return Math.max(0, Math.min(100, ((nowMs - timeStart) / totalMs) * 100));
  }, [mode, nowMs, timeStart, timeEnd]);

  const visibleLogs = useMemo(() => {
    return logs.filter((log) => {
      const { startMs, endMs } = computeBarRange(log, nowMs);
      return endMs >= timeStart && startMs <= timeEnd;
    });
  }, [logs, timeStart, timeEnd, nowMs]);

  const laneMap = useMemo(
    () => allocateLanes(logs, nowMs, conversationLaneReuseMinutes * 60 * 1000),
    [logs, nowMs, conversationLaneReuseMinutes]
  );
  const maxLane = useMemo(() => (laneMap.size > 0 ? Math.max(...laneMap.values()) : 0), [laneMap]);

  const barElements = useMemo(() => {
    const totalMs = timeEnd - timeStart;
    return visibleLogs.map((log) => {
      const { startMs, endMs } = computeBarRange(log, nowMs);

      const leftPct = ((startMs - timeStart) / totalMs) * 100;
      const rightPct = ((endMs - timeStart) / totalMs) * 100;
      const widthPct = Math.max(rightPct - leftPct, (MIN_BAR_WIDTH / (canvasWidth || 1200)) * 100);

      const lane = laneMap.get(log.id) ?? 0;
      const topPx = lane * LANE_HEIGHT;
      const color = getStatusColor(log.status, log.active);
      const opacity = log.active ? 0.9 : 0.75;

      return { log, leftPct, widthPct, topPx, color, opacity };
    });
  }, [visibleLogs, timeStart, timeEnd, nowMs, laneMap, canvasWidth]);

  // Connectors for multi-turn conversations
  const connectorElements = useMemo(() => {
    const byConversation = new Map<string, typeof barElements>();
    for (const el of barElements) {
      const cid = el.log.sessionTag;
      if (!cid) continue;
      const list = byConversation.get(cid);
      if (list) list.push(el);
      else byConversation.set(cid, [el]);
    }

    const connectors: { id: string; x1: number; x2: number; y: number }[] = [];
    for (const els of byConversation.values()) {
      const sorted = [...els].sort(
        (a, b) => new Date(a.log.timestamp).getTime() - new Date(b.log.timestamp).getTime()
      );
      for (let i = 0; i < sorted.length - 1; i++) {
        const a = sorted[i];
        const b = sorted[i + 1];
        if (a.topPx !== b.topPx) continue;
        connectors.push({
          id: `${a.log.id}-${b.log.id}`,
          x1: a.leftPct + a.widthPct,
          x2: b.leftPct,
          y: a.topPx + BAR_HEIGHT / 2,
        });
      }
    }
    return connectors;
  }, [barElements]);

  const axisTicks = useMemo(() => {
    const totalMs = timeEnd - timeStart;
    if (totalMs <= 0) return [];

    const MS_MIN = 60 * 1000;
    const MS_10MIN = 10 * MS_MIN;
    const MS_HOUR = 60 * MS_MIN;
    const MS_DAY = 24 * MS_HOUR;

    const startOfHour = (ms: number) => {
      const d = new Date(ms);
      d.setMinutes(0, 0, 0);
      return d.getTime();
    };

    const startOfDay = (ms: number) => {
      const d = new Date(ms);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    };

    const ticks: { pct: number; label: string; kind: "day" | "hour" | "minor" }[] = [];

    const addTick = (ms: number, label: string, kind: "day" | "hour" | "minor") => {
      const pct = ((ms - timeStart) / totalMs) * 100;
      if (pct >= 0 && pct <= 100) {
        ticks.push({ pct, label, kind });
      }
    };

    if (totalMs <= MS_HOUR * 4) {
      const interval = totalMs <= MS_10MIN ? MS_MIN : MS_10MIN;
      const first = Math.ceil(timeStart / interval) * interval;
      for (let ms = first; ms <= timeEnd; ms += interval) {
        const isDay = startOfDay(ms) === ms;
        const isHour = startOfHour(ms) === ms;
        addTick(
          ms,
          isDay ? formatDateLabel(ms) : formatTimeAxis(ms),
          isDay ? "day" : isHour ? "hour" : "minor"
        );
      }
    } else if (totalMs <= MS_DAY) {
      const interval = totalMs <= MS_HOUR * 6 ? MS_10MIN : MS_HOUR;
      const first = Math.ceil(timeStart / interval) * interval;
      for (let ms = first; ms <= timeEnd; ms += interval) {
        const isDay = startOfDay(ms) === ms;
        addTick(ms, isDay ? formatDateLabel(ms) : formatTimeAxis(ms), isDay ? "day" : "hour");
      }
    } else {
      const firstDay = startOfDay(timeStart);
      const start = firstDay < timeStart ? firstDay + MS_DAY : firstDay;
      for (let ms = start; ms <= timeEnd; ms += MS_DAY) {
        addTick(ms, formatDateLabel(ms), "day");
      }
    }

    return ticks;
  }, [timeStart, timeEnd]);

  const contentHeight = Math.max((maxLane + 1) * LANE_HEIGHT + 40, 360);

  const handleReset = useCallback(() => {
    setPanOffsetMs(0);
    setLiveBaseMs(nowMs);
  }, [nowMs]);

  const handleModeChange = useCallback(
    (newMode: ViewMode) => {
      setMode(newMode);
      setPanOffsetMs(0);
      if (newMode === "pan") setPanFrozenMs(nowMs);
      setLiveBaseMs(nowMs);
    },
    [nowMs]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (mode !== "pan") {
      setMode("pan");
      setPanFrozenMs(nowMs);
      setLiveBaseMs(nowMs);
    }
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragStartOffset(mode === "pan" ? panOffsetMs : 0);
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartX;
      const msPerPx = windowMs / (canvasWidth || 1200);
      setPanOffsetMs(dragStartOffset - dx * msPerPx);
    },
    [isDragging, dragStartX, dragStartOffset, windowMs, canvasWidth]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.25 : 0.8;
    setZoom((z) => Math.max(0.001, Math.min(8, z * factor)));
  }, []);

  const hoveredLog = hoveredId ? logs.find((l) => l.id === hoveredId) : null;

  if (logsQuery.isLoading && !logsQuery.data) {
    return <PageSkeleton />;
  }

  return (
    <div className={styles.page}>
      {/* Toolbar & Controls Card */}
      <Card className={styles.toolbarCard} styles={{ body: { padding: "12px 18px" } }}>
        <Flex align="center" justify="space-between" wrap gap={12}>
          <Flex align="center" gap={12}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)",
                border: "1px solid rgba(99, 102, 241, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#818cf8",
              }}
            >
              <MaterialIcon name="timeline" size={20} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <span style={{ fontSize: 15, fontWeight: 700, color: "inherit" }}>
                  日志时间线 (Request Timeline)
                </span>
                <Tag color="purple" style={{ margin: 0, fontWeight: 600 }}>
                  {visibleLogs.length} 可视 / {logs.length} 全量
                </Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                多泳道并发请求瀑布流，实时追踪网关负载分布、首字耗时与多轮对话链路
              </Text>
            </div>
          </Flex>

          <Space size={12} wrap>
            {/* Mode selector */}
            <Flex
              style={{
                borderRadius: 8,
                border: "1px solid var(--ant-color-border-secondary)",
                overflow: "hidden",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              {(["follow", "live", "pan"] as ViewMode[]).map((m) => (
                <Button
                  key={m}
                  type={mode === m ? "primary" : "text"}
                  size="small"
                  onClick={() => handleModeChange(m)}
                  title={MODE_META[m].description}
                  style={{
                    borderRadius: 0,
                    fontSize: 12,
                    fontWeight: 600,
                    height: 28,
                    padding: "0 10px",
                  }}
                >
                  {MODE_META[m].label}
                </Button>
              ))}
            </Flex>

            {/* Reset */}
            <Button
              size="small"
              icon={<MaterialIcon name="replay" size={14} />}
              onClick={handleReset}
              style={{ height: 28, fontSize: 12 }}
            >
              重置视角
            </Button>

            {/* Lane reuse */}
            <Flex align="center" gap={4} style={{ fontSize: 12, color: "var(--ant-color-text-secondary)" }}>
              <span>泳道复用:</span>
              <InputNumber
                size="small"
                min={1}
                max={60}
                value={conversationLaneReuseMinutes}
                onChange={(val) => {
                  const next = Math.max(1, Number(val) || 1);
                  setConversationLaneReuseMinutes(next);
                  try {
                    localStorage.setItem(CONVERSATION_LANE_REUSE_STORAGE_KEY, String(next));
                  } catch {}
                }}
                style={{ width: 56 }}
              />
              <span>分</span>
            </Flex>

            {/* Poll interval */}
            <Flex align="center" gap={4} style={{ fontSize: 12, color: "var(--ant-color-text-secondary)" }}>
              <span>刷新:</span>
              <InputNumber
                size="small"
                min={1}
                max={30}
                value={listPollSeconds}
                onChange={(val) => {
                  const next = Math.max(1, Number(val) || 1);
                  setListPollSeconds(next);
                  try {
                    localStorage.setItem(TIMELINE_LIST_POLL_STORAGE_KEY, String(next));
                  } catch {}
                }}
                style={{ width: 56 }}
              />
              <span>秒</span>
            </Flex>

            {/* Zoom Controls */}
            <Space.Compact size="small">
              <Button
                style={{ height: 28 }}
                onClick={() => setZoom((z) => Math.max(0.001, z * 0.5))}
              >
                -
              </Button>
              <Button style={{ height: 28, minWidth: 44, fontWeight: 700 }} disabled>
                {zoom >= 1 ? `${zoom}x` : `${Math.round(zoom * 100)}%`}
              </Button>
              <Button
                style={{ height: 28 }}
                onClick={() => setZoom((z) => Math.min(8, z * 2))}
              >
                +
              </Button>
            </Space.Compact>
          </Space>
        </Flex>
      </Card>

      {/* Main Canvas */}
      <div className={styles.canvasWrapper}>
        <div
          ref={canvasRef}
          className={styles.canvasContent}
          style={{ cursor: isDragging ? "grabbing" : mode === "pan" ? "grab" : "default" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          {/* Scrollable multi-lane area */}
          <div style={{ position: "absolute", left: 0, right: 0, height: contentHeight, top: 0 }}>
            {/* Top Time Axis */}
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                height: AXIS_HEIGHT,
                borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
                background: "rgba(9, 9, 11, 0.92)",
                backdropFilter: "blur(6px)",
                zIndex: 10,
              }}
            >
              {axisTicks.map((axisTick, i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: `${axisTick.pct}%`,
                    top: 0,
                    transform: "translateX(-50%)",
                  }}
                >
                  <div style={{ width: 1, height: 8, background: "rgba(255, 255, 255, 0.25)", margin: "0 auto" }} />
                  <span
                    style={{
                      display: "block",
                      fontSize: 10,
                      fontFamily: "ui-monospace, monospace",
                      color: "rgba(255, 255, 255, 0.45)",
                      marginTop: 2,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {axisTick.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Horizontal Lane Grid Lines */}
            {Array.from({ length: maxLane + 1 }).map((_, i) => (
              <div
                key={`grid-${i}`}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: AXIS_HEIGHT + i * LANE_HEIGHT + BAR_HEIGHT,
                  borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                }}
              />
            ))}

            {/* Request Bars */}
            {barElements.map(({ log, leftPct, widthPct, topPx, color, opacity }) => (
              <div
                key={log.id}
                onClick={() => setSelectedLog(log)}
                onMouseEnter={(e) => {
                  setHoveredId(log.id);
                  setTooltipPos({ x: e.clientX, y: e.clientY });
                }}
                onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
                onMouseLeave={() => {
                  setHoveredId(null);
                  setTooltipPos(null);
                }}
                style={{
                  position: "absolute",
                  left: `${leftPct}%`,
                  width: `${widthPct}%`,
                  top: AXIS_HEIGHT + topPx,
                  height: BAR_HEIGHT,
                  backgroundColor: color,
                  opacity,
                  minWidth: MIN_BAR_WIDTH,
                  borderRadius: 4,
                  cursor: "pointer",
                  zIndex: 4,
                  boxShadow: "0 2px 6px rgba(0, 0, 0, 0.35)",
                  transition: "opacity 0.1s ease",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    padding: "0 6px",
                    overflow: "hidden",
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontFamily: "ui-monospace, monospace",
                      color: "rgba(255, 255, 255, 0.95)",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {truncateModel(log.model)}
                  </span>
                </div>
              </div>
            ))}

            {/* Multi-turn conversation connector arrows */}
            <svg
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: AXIS_HEIGHT,
                height: (maxLane + 1) * LANE_HEIGHT,
                width: "100%",
                zIndex: 2,
                pointerEvents: "none",
                color: "rgba(99, 102, 241, 0.65)",
              }}
              viewBox={`0 0 100 ${(maxLane + 1) * LANE_HEIGHT}`}
              preserveAspectRatio="none"
            >
              <defs>
                <marker
                  id="conversation-connector-arrow"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
                </marker>
              </defs>
              {connectorElements.map(({ id, x1, x2, y }) => (
                <line
                  key={id}
                  x1={x1}
                  y1={y}
                  x2={x2}
                  y2={y}
                  stroke="currentColor"
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                  markerEnd="url(#conversation-connector-arrow)"
                />
              ))}
            </svg>
          </div>

          {/* NOW Indicator Line */}
          <div
            style={{
              position: "absolute",
              left: `${nowLineX}%`,
              top: 0,
              bottom: 0,
              zIndex: 20,
              pointerEvents: "none",
              transform: "translateX(-50%)",
            }}
          >
            <div
              style={{
                width: 2,
                height: "100%",
                background: "#ef4444",
                boxShadow: "0 0 10px rgba(239, 68, 68, 0.7)",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 2,
                left: "50%",
                transform: "translateX(-50%)",
                background: "#ef4444",
                color: "#ffffff",
                fontSize: 9,
                fontFamily: "ui-monospace, monospace",
                fontWeight: 800,
                padding: "1px 4px",
                borderRadius: 3,
                letterSpacing: 0.5,
              }}
            >
              NOW
            </div>
          </div>

          {/* Vertical Time Lines */}
          {axisTicks.map((axisTick) => (
            <div
              key={`vl-${axisTick.pct}`}
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: `${axisTick.pct}%`,
                width: axisTick.kind === "day" ? 2 : 1,
                backgroundColor:
                  axisTick.kind === "day"
                    ? "rgba(99, 102, 241, 0.35)"
                    : axisTick.kind === "hour"
                      ? "rgba(148, 163, 184, 0.2)"
                      : "rgba(148, 163, 184, 0.08)",
                pointerEvents: "none",
                zIndex: 1,
                transform: "translateX(-50%)",
              }}
            />
          ))}
        </div>

        {/* Legend Bar */}
        <div className={styles.legendBar}>
          <Flex align="center" gap={16}>
            <Flex align="center" gap={6}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: "#059669" }} />
              <span>2xx (成功)</span>
            </Flex>
            <Flex align="center" gap={6}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: "#D97706" }} />
              <span>4xx (客户端错误)</span>
            </Flex>
            <Flex align="center" gap={6}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: "#DC2626" }} />
              <span>5xx (服务端错误)</span>
            </Flex>
            <Flex align="center" gap={6}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: "#6366F1" }} />
              <span>Active (进行中)</span>
            </Flex>
            <Flex align="center" gap={6}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: "#6B7280" }} />
              <span>Other (其他)</span>
            </Flex>
          </Flex>

          <Flex align="center" gap={8} style={{ color: "rgba(255,255,255,0.4)" }}>
            <MaterialIcon name="info" size={14} />
            <span>{MODE_META[mode].description}</span>
          </Flex>
        </div>
      </div>

      {/* Floating Hover Tooltip */}
      {hoveredLog && tooltipPos && (
        <div
          className={styles.tooltipCard}
          style={{
            left: tooltipPos.x + 14,
            top: tooltipPos.y - 10,
          }}
        >
          <Flex align="center" gap={8} style={{ marginBottom: 6 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: getStatusColor(hoveredLog.status, hoveredLog.active),
              }}
            />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#ffffff" }}>
              {hoveredLog.model || "未知模型"}
            </span>
            {hoveredLog.active && (
              <Tag color="purple" style={{ margin: 0, fontSize: 10, padding: "0 4px" }}>
                进行中
              </Tag>
            )}
          </Flex>

          <div style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.65)", display: "flex", flexDirection: "column", gap: 3 }}>
            <Flex justify="space-between" gap={12}>
              <span>开始时间:</span>
              <span style={{ fontFamily: "monospace", color: "#e4e4e7" }}>
                {new Date(computeBarRange(hoveredLog, nowMs).startMs).toLocaleTimeString()}
              </span>
            </Flex>
            <Flex justify="space-between" gap={12}>
              <span>耗时:</span>
              <span style={{ fontFamily: "monospace", color: "#e4e4e7" }}>
                {hoveredLog.active
                  ? `~${Math.round((nowMs - computeBarRange(hoveredLog, nowMs).startMs) / 1000)}s`
                  : `${hoveredLog.durationMs ?? hoveredLog.latencyMs ?? 0}ms`}
              </span>
            </Flex>
            <Flex justify="space-between" gap={12}>
              <span>状态码:</span>
              <span style={{ fontFamily: "monospace", color: "#e4e4e7" }}>
                {hoveredLog.status || "挂起中"}
              </span>
            </Flex>
            {hoveredLog.provider && (
              <Flex justify="space-between" gap={12}>
                <span>提供者:</span>
                <span style={{ color: "#e4e4e7" }}>{hoveredLog.provider}</span>
              </Flex>
            )}
            <Flex justify="space-between" gap={12}>
              <span>Tokens (入 / 出):</span>
              <span style={{ fontFamily: "monospace", color: "#e4e4e7" }}>
                {hoveredLog.inputTokens ?? hoveredLog.tokens?.in ?? hoveredLog.tokens?.prompt ?? 0} /{" "}
                {hoveredLog.outputTokens ?? hoveredLog.tokens?.out ?? hoveredLog.tokens?.completion ?? 0}
              </span>
            </Flex>
            {hoveredLog.error && (
              <div style={{ color: "#f87171", fontSize: 10, marginTop: 4, wordBreak: "break-all" }}>
                {hoveredLog.error}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detail Drawer on click */}
      <Drawer
        title={
          <Flex align="center" gap={8}>
            <MaterialIcon name="receipt_long" size={18} />
            <span>请求审计详情</span>
            {selectedLog && (
              <Tag color={(selectedLog.status ?? 200) < 400 ? "success" : "error"}>
                {selectedLog.status ?? 200}
              </Tag>
            )}
          </Flex>
        }
        open={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        width={640}
      >
        {selectedLog && (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Card size="small" title="基础元信息">
              <Space direction="vertical" size={6} style={{ width: "100%", fontSize: 13 }}>
                <Flex justify="space-between">
                  <Text type="secondary">请求 ID:</Text>
                  <Text code copyable>{selectedLog.id}</Text>
                </Flex>
                <Flex justify="space-between">
                  <Text type="secondary">模型:</Text>
                  <Text strong>{selectedLog.model || "-"}</Text>
                </Flex>
                <Flex justify="space-between">
                  <Text type="secondary">提供商:</Text>
                  <Text>{selectedLog.provider || "-"}</Text>
                </Flex>
                <Flex justify="space-between">
                  <Text type="secondary">耗时:</Text>
                  <Text>{selectedLog.durationMs ?? selectedLog.latencyMs ?? 0}ms</Text>
                </Flex>
                <Flex justify="space-between">
                  <Text type="secondary">Tokens (输入 / 输出):</Text>
                  <Text>
                    {selectedLog.inputTokens ?? selectedLog.tokens?.in ?? selectedLog.tokens?.prompt ?? 0} /{" "}
                    {selectedLog.outputTokens ?? selectedLog.tokens?.out ?? selectedLog.tokens?.completion ?? 0}
                  </Text>
                </Flex>
                <Flex justify="space-between">
                  <Text type="secondary">时间:</Text>
                  <Text>{new Date(selectedLog.timestamp).toLocaleString()}</Text>
                </Flex>
              </Space>
            </Card>

            {selectedLog.error && (
              <Card size="small" title="异常诊断">
                <Text type="danger" style={{ fontFamily: "monospace", fontSize: 12 }}>
                  {selectedLog.error}
                </Text>
              </Card>
            )}

            <Card size="small" title="调用原始 JSON">
              <pre
                style={{
                  background: "#09090b",
                  color: "#d4d4d8",
                  padding: 12,
                  borderRadius: 6,
                  fontSize: 11,
                  maxHeight: 260,
                  overflowY: "auto",
                  margin: 0,
                }}
              >
                {JSON.stringify(selectedLog, null, 2)}
              </pre>
            </Card>
          </Space>
        )}
      </Drawer>
    </div>
  );
}

export default LogTimelinePage;
