import { useState } from "react";
import {
  Button,
  Card,
  Popconfirm,
  Select,
  Space,
  Switch,
  Tag,
  Tooltip,
  Typography,
  message,
  theme,
} from "antd";
import { Link } from "react-router-dom";
import { MaterialIcon } from "@/app/nav";
import { getStrategyDef, getStrategyColor, getStepDisplayName } from "./constants";
import type { ComboItem, ComboMetrics } from "@/entities/api";

const { Text } = Typography;

interface ComboCardProps {
  combo: ComboItem;
  metrics?: ComboMetrics | null;
  compressionEnabled?: boolean;
  hasProxy?: boolean;
  testing?: boolean;
  dragDisabled?: boolean;
  isDragged?: boolean;
  isDropTarget?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onTest?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onProxy?: () => void;
  onToggleActive?: (active: boolean) => void;
  onCompressionChange?: (mode: string) => void;
}

export function ComboCard({
  combo,
  metrics,
  compressionEnabled = false,
  hasProxy = false,
  testing = false,
  dragDisabled = false,
  isDragged = false,
  isDropTarget = false,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onTest,
  onEdit,
  onDelete,
  onDuplicate,
  onProxy,
  onToggleActive,
  onCompressionChange,
}: ComboCardProps) {
  const { token } = theme.useToken();
  const [copied, setCopied] = useState(false);
  const strategyDef = getStrategyDef(combo.strategy);
  const models = combo.models || [];
  const isDisabled = combo.isActive === false;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(combo.name);
    setCopied(true);
    message.success(`已复制组合标识 "${combo.name}"`);
    setTimeout(() => setCopied(false), 1500);
  };

  const compressionMode = (combo.config?.compressionMode as string) || "inherit";

  return (
    <Card
      size="small"
      onDragOver={onDragOver}
      onDrop={onDrop}
      style={{
        borderRadius: 8,
        opacity: isDragged ? 0.4 : (isDisabled ? 0.6 : 1),
        border: isDropTarget ? "1.5px dashed #8B5CF6" : undefined,
        backgroundColor: isDropTarget ? "rgba(139, 92, 246, 0.04)" : undefined,
        transition: "all 0.2s",
      }}
      styles={{
        body: { padding: "12px 16px" },
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        {/* Left Info Area */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 280 }}>
          {/* Drag Handle */}
          <div
            draggable={!dragDisabled}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            data-testid={`combo-drag-handle-${combo.id}`}
            title={dragDisabled ? "当前筛选状态或单项时不可拖动排序" : "按住并拖动以调整组合顺序"}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 24,
              height: 32,
              cursor: dragDisabled ? "not-allowed" : "grab",
              color: dragDisabled ? token.colorTextDisabled : token.colorTextTertiary,
              borderRadius: 4,
              transition: "color 0.15s, background-color 0.15s",
              userSelect: "none",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              if (!dragDisabled) {
                e.currentTarget.style.color = token.colorPrimary;
                e.currentTarget.style.backgroundColor = token.colorPrimaryBg;
              }
            }}
            onMouseLeave={(e) => {
              if (!dragDisabled) {
                e.currentTarget.style.color = token.colorTextTertiary;
                e.currentTarget.style.backgroundColor = "transparent";
              }
            }}
          >
            <MaterialIcon name="drag_indicator" size={18} />
          </div>

          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: "rgba(139, 92, 246, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <MaterialIcon name="layers" size={18} style={{ color: "#8B5CF6" }} />
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Text code strong style={{ fontSize: 13 }}>
                {combo.name}
              </Text>
              <Tooltip title={strategyDef.desc}>
                <Tag
                  color={getStrategyColor(combo.strategy)}
                  style={{
                    margin: 0,
                    fontSize: 10,
                    fontWeight: 500,
                    padding: "0 6px",
                    borderRadius: 4,
                  }}
                >
                  <Space size={3}>
                    <MaterialIcon name={strategyDef.icon} size={11} />
                    <span>{strategyDef.label}</span>
                  </Space>
                </Tag>
              </Tooltip>
              {hasProxy && (
                <Tag color="cyan" style={{ margin: 0, fontSize: 10 }}>
                  <Space size={2}>
                    <MaterialIcon name="vpn_lock" size={12} />
                    <span>代理生效</span>
                  </Space>
                </Tag>
              )}
              <Button
                type="text"
                size="small"
                style={{ padding: "0 4px", height: 20 }}
                onClick={handleCopy}
                title="复制组合标识"
              >
                <MaterialIcon
                  name={copied ? "check" : "content_copy"}
                  size={13}
                  style={{ color: copied ? "#10B981" : "#9CA3AF" }}
                />
              </Button>
            </div>

            {/* Models preview tags */}
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
              {models.length === 0 ? (
                <Text type="secondary" style={{ fontSize: 11, fontStyle: "italic" }}>
                  无模型节点
                </Text>
              ) : (
                <>
                  {models.slice(0, 3).map((m, idx) => (
                    <Tag key={idx} style={{ margin: 0, fontSize: 10, borderRadius: 4 }}>
                      <code>{getStepDisplayName(m)}</code>
                      {combo.strategy === "weighted" && typeof m.weight === "number" && (
                        <span style={{ opacity: 0.7 }}> ({m.weight}%)</span>
                      )}
                    </Tag>
                  ))}
                  {models.length > 3 && (
                    <Text type="secondary" style={{ fontSize: 10 }}>
                      +{models.length - 3} 个更多
                    </Text>
                  )}
                </>
              )}
            </div>

            {/* Metrics summary line */}
            {metrics && (metrics.totalRequests ?? 0) > 0 && (
              <div style={{ display: "flex", gap: 12, marginTop: 4, fontSize: 11 }}>
                <Text type="secondary">
                  <span style={{ color: "#10B981" }}>{metrics.totalSuccesses ?? 0}</span>/
                  {metrics.totalRequests} 请求
                </Text>
                <Text type="secondary">{metrics.successRate ?? 0}% 成功率</Text>
                <Text type="secondary">~{metrics.avgLatencyMs ?? 0}ms</Text>
                {(metrics.fallbackRate ?? 0) > 0 && (
                  <span style={{ color: "#F59E0B" }}>{metrics.fallbackRate}% 回退</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Actions Area */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Compression mode selector */}
          {compressionEnabled && (
            <Select
              size="small"
              value={compressionMode}
              style={{ width: 100 }}
              onChange={onCompressionChange}
              options={[
                { value: "inherit", label: "压缩: 继承" },
                { value: "off", label: "压缩: 关闭" },
                { value: "lite", label: "压缩: Lite" },
                { value: "aggressive", label: "压缩: 强力" },
              ]}
            />
          )}

          {/* Toggle active */}
          <Tooltip title={isDisabled ? "点击启用组合" : "点击停用组合"}>
            <Switch
              size="small"
              checked={!isDisabled}
              onChange={(checked) => onToggleActive?.(checked)}
            />
          </Tooltip>

          {/* Control Center monitoring link */}
          <Link to={`/dashboard/combos/${combo.id}`}>
            <Button
              type="text"
              size="small"
              title="进入控制中心监控"
              icon={<MaterialIcon name="monitoring" size={16} />}
            />
          </Link>

          {/* Test button */}
          <Button
            type="text"
            size="small"
            loading={testing}
            title="测试组合健康"
            icon={!testing ? <MaterialIcon name="play_arrow" size={16} style={{ color: "#10B981" }} /> : undefined}
            onClick={onTest}
          />

          {/* Duplicate button */}
          <Button
            type="text"
            size="small"
            title="复制此组合"
            icon={<MaterialIcon name="content_copy" size={16} />}
            onClick={onDuplicate}
          />

          {/* Proxy button */}
          <Button
            type="text"
            size="small"
            title="代理配置"
            icon={<MaterialIcon name="vpn_lock" size={16} />}
            onClick={onProxy}
          />

          {/* Edit button */}
          <Button
            type="text"
            size="small"
            title="编辑组合"
            icon={<MaterialIcon name="edit" size={16} />}
            onClick={onEdit}
          />

          {/* Delete button */}
          <Popconfirm
            title="删除组合"
            description={`确定删除组合 "${combo.name}"？`}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={onDelete}
          >
            <Button
              type="text"
              size="small"
              danger
              title="删除组合"
              icon={<MaterialIcon name="delete" size={16} />}
            />
          </Popconfirm>
        </div>
      </div>
    </Card>
  );
}
