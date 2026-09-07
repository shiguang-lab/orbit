/**
 * SSE 订阅工具（参考 asset-hub shared/sse.ts 思路，事件驱动 react-query 失效）。
 * ShiguangGateway 的 SSE 端点：
 *  - GET /api/gamification/stream   → 排行榜推送（message 事件）
 *  - GET /api/gamification/notifications → 徽章解锁（badge_unlock 事件）
 *  - GET /api/services/[name]/logs  → 服务日志流（snapshot/log/heartbeat 事件）
 */
import { useEffect, useRef, useState } from "react";

export interface SseEvent {
  type: string;
  data: unknown;
}

export interface UseSseOptions {
  url: string;
  enabled?: boolean;
  eventName?: string;
}

/**
 * 订阅一个 SSE 端点。返回最近一次事件数据与订阅回调（供外部注册 listener）。
 */
export function useSse({ url, enabled = true, eventName }: UseSseOptions) {
  const [lastData, setLastData] = useState<unknown>(null);
  const [connected, setConnected] = useState(false);
  const listenersRef = useRef<Set<(event: SseEvent) => void>>(new Set());

  useEffect(() => {
    if (!enabled) return;

    let es: EventSource | null = null;
    let closed = false;

    const onEvent = (type: string, data: unknown) => {
      const evt = { type, data };
      setLastData(data);
      listenersRef.current.forEach((fn) => fn(evt));
    };

    const setup = () => {
      if (closed) return;
      es = new EventSource(url);
      es.onopen = () => setConnected(true);

      const handler = (raw: MessageEvent) => {
        let data: unknown = null;
        try {
          data = JSON.parse(String(raw.data));
        } catch {
          data = raw.data;
        }
        onEvent(raw.type, data);
      };

      if (eventName) {
        es.addEventListener(eventName, handler);
      } else {
        es.onmessage = handler;
      }

      es.onerror = () => {
        setConnected(false);
        // EventSource 自动重连，这里只更新状态
      };
    };

    setup();

    return () => {
      closed = true;
      es?.close();
    };
  }, [url, enabled, eventName]);

  const subscribe = (fn: (event: SseEvent) => void) => {
    listenersRef.current.add(fn);
    return () => {
      listenersRef.current.delete(fn);
    };
  };

  return { lastData, connected, subscribe };
}
