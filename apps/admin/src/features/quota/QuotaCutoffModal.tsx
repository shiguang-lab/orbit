import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Empty,
  Flex,
  InputNumber,
  Modal,
  Space,
  Tag,
  Typography,
} from "antd";
import { MaterialIcon } from "@/app/nav";

const { Text } = Typography;

export interface QuotaCutoffModalWindow {
  key: string;
  displayName: string;
}

interface QuotaCutoffModalProps {
  open: boolean;
  onClose: () => void;
  connectionId: string;
  connectionName: string;
  provider: string;
  windows: QuotaCutoffModalWindow[];
  current: Record<string, number> | null;
  providerDefaults: Record<string, number>;
  globalDefaultPercent: number;
  onSave: (patch: Record<string, number | null> | null) => Promise<void>;
}

export function QuotaCutoffModal({
  open,
  onClose,
  connectionId,
  connectionName,
  provider,
  windows,
  current,
  providerDefaults,
  globalDefaultPercent,
  onSave,
}: QuotaCutoffModalProps) {
  const [drafts, setDrafts] = useState<Record<string, number | null>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wasOpenRef = useRef(false);
  const seededConnectionIdRef = useRef<string | null>(null);

  useEffect(() => {
    const shouldSeed =
      open && (!wasOpenRef.current || seededConnectionIdRef.current !== connectionId);
    wasOpenRef.current = open;
    if (!shouldSeed) return;

    seededConnectionIdRef.current = connectionId;
    const initial: Record<string, number | null> = {};
    for (const w of windows) {
      const persisted = current?.[w.key];
      initial[w.key] = typeof persisted === "number" ? persisted : null;
    }
    setDrafts(initial);
    setError(null);
  }, [open, connectionId, windows, current]);

  const resolveDefaultFor = (windowKey: string): number =>
    typeof providerDefaults[windowKey] === "number"
      ? providerDefaults[windowKey]
      : globalDefaultPercent;

  const buildPatch = (): Record<string, number | null> => {
    const patch: Record<string, number | null> = {};
    for (const w of windows) {
      const val = drafts[w.key];
      if (val === null || val === undefined) {
        if (current?.[w.key] !== undefined) patch[w.key] = null;
        continue;
      }
      if (current?.[w.key] !== val) patch[w.key] = val;
    }
    return patch;
  };

  const handleSave = async () => {
    const patch = buildPatch();
    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(patch);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "保存切流阈值失败");
    } finally {
      setSaving(false);
    }
  };

  const handleResetAll = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(null);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "重置失败");
    } finally {
      setSaving(false);
    }
  };

  const hasAnyOverride =
    current !== null && current !== undefined && Object.keys(current).length > 0;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <Flex align="center" gap={8}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: "#F472B622",
              color: "#F472B6",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialIcon name="tune" size={18} />
          </div>
          <div>
            <span style={{ fontSize: 16, fontWeight: 600 }}>配置切流保护阈值</span>
            <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
              {connectionName} ({provider})
            </Text>
          </div>
        </Flex>
      }
      destroyOnClose
      width={560}
      footer={
        <Flex justify="space-between" align="center" style={{ width: "100%" }}>
          <div>
            {hasAnyOverride && (
              <Button danger type="text" onClick={handleResetAll} loading={saving}>
                重置全部覆盖项
              </Button>
            )}
          </div>
          <Space size={8}>
            <Button onClick={onClose} disabled={saving}>
              取消
            </Button>
            <Button type="primary" onClick={handleSave} loading={saving}>
              保存阈值设置
            </Button>
          </Space>
        </Flex>
      }
    >
      <div style={{ marginTop: 12 }}>
        <Alert
          type="info"
          showIcon
          message="配额切流与降级机制"
          description="设定该账号在各时间窗口下的最小剩余配额百分比（或已消耗上限）。当额度触及该阈值时，网关将自动停止路由到该账号，避免触发上游 429 报错或封禁。留空则自动继承系统默认值。"
          style={{ marginBottom: 16 }}
        />

        {error && (
          <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />
        )}

        {windows.length === 0 ? (
          <Empty
            description="该账号暂未检测到配额时间窗口（可在列表中点击刷新同步一次）"
            style={{ margin: "24px 0" }}
          />
        ) : (
          <Space direction="vertical" size={10} style={{ width: "100%" }}>
            {windows.map((w) => {
              const defaultVal = resolveDefaultFor(w.key);
              const currentDraft = drafts[w.key];
              const isCustom = typeof currentDraft === "number";

              return (
                <Card
                  key={w.key}
                  size="small"
                  style={{
                    borderRadius: 8,
                    background: isCustom ? "rgba(59, 130, 246, 0.03)" : "rgba(128, 128, 128, 0.02)",
                    border: isCustom ? "1px solid rgba(59, 130, 246, 0.3)" : "1px solid rgba(128, 128, 128, 0.15)",
                  }}
                >
                  <Flex justify="space-between" align="center">
                    <div>
                      <Flex align="center" gap={6}>
                        <Text strong style={{ fontSize: 13 }}>
                          {w.displayName}
                        </Text>
                        {isCustom ? (
                          <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>
                            自定义覆盖
                          </Tag>
                        ) : (
                          <Tag style={{ fontSize: 10, margin: 0 }} color="default">
                            继承默认
                          </Tag>
                        )}
                      </Flex>
                      <Text type="secondary" style={{ fontSize: 11, marginTop: 2, display: "block" }}>
                        系统默认切流阈值: {defaultVal}% (留空继承)
                      </Text>
                    </div>

                    <Flex align="center" gap={8}>
                      <InputNumber
                        min={0}
                        max={100}
                        step={1}
                        placeholder={`${defaultVal}`}
                        value={currentDraft}
                        onChange={(val) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [w.key]: typeof val === "number" ? val : null,
                          }))
                        }
                        style={{ width: 110 }}
                        addonAfter="%"
                      />
                      {isCustom && (
                        <Button
                          size="small"
                          type="text"
                          style={{ fontSize: 12, padding: "0 4px" }}
                          onClick={() =>
                            setDrafts((prev) => ({
                              ...prev,
                              [w.key]: null,
                            }))
                          }
                        >
                          清除
                        </Button>
                      )}
                    </Flex>
                  </Flex>
                </Card>
              );
            })}
          </Space>
        )}
      </div>
    </Modal>
  );
}

export default QuotaCutoffModal;
