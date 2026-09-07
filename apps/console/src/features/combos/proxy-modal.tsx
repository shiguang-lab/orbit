import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Segmented,
  Select,
  Space,
  Tag,
  Typography,
  message,
  theme,
} from "antd";
import { createStyles } from "antd-style";
import { MaterialIcon } from "@/app/nav";
import { settingsApi } from "@/entities/api";
import type { ComboItem } from "@/entities/api";

const { Text } = Typography;

const useStyles = createStyles(({ token, css }) => ({
  modalBody: css`
    box-sizing: border-box;
    padding: 16px 0 0;
  `,
  inheritanceBanner: css`
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border-radius: 8px;
    background: rgba(59, 130, 246, 0.08);
    border: 1px solid rgba(59, 130, 246, 0.2);
    margin-bottom: 16px;
  `,
  modeSegmentWrap: css`
    box-sizing: border-box;
    margin-bottom: 16px;
  `,
  customProxyCard: css`
    box-sizing: border-box;
    background: ${token.colorFillAlter};
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: 8px;
    padding: 16px 18px;
    margin-bottom: 16px;
  `,
  savedProxyCard: css`
    box-sizing: border-box;
    background: ${token.colorFillAlter};
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: 8px;
    padding: 16px 18px;
    margin-bottom: 16px;
  `,
  authToggleBtn: css`
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: transparent;
    border: none;
    padding: 4px 0;
    cursor: pointer;
    font-size: 13px;
    color: ${token.colorTextSecondary};
    transition: color 0.2s ease;
    user-select: none;
    &:hover {
      color: ${token.colorText};
    }
  `,
  authContainer: css`
    box-sizing: border-box;
    margin-top: 10px;
    padding: 14px 16px;
    border-radius: 6px;
    background: ${token.colorBgContainer};
    border: 1px solid ${token.colorBorderSecondary};
  `,
  testResultBox: css`
    box-sizing: border-box;
    border-radius: 8px;
    padding: 10px 14px;
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
  `,
  testResultSuccess: css`
    background: rgba(16, 185, 129, 0.08);
    border: 1px solid rgba(16, 185, 129, 0.25);
    color: #10b981;
  `,
  testResultError: css`
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.25);
    color: #ef4444;
  `,
  footerContainer: css`
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    margin-top: 8px;
  `,
}));

const DASHBOARD_CUSTOM_PROXY_SOURCE = "dashboard-custom";

interface ProxyModalProps {
  open: boolean;
  combo?: ComboItem | null;
  comboName?: string;
  onClose: () => void;
  onSaved?: (proxyId?: string | null) => void;
}

export function ProxyModal({ open, combo, comboName, onClose, onSaved }: ProxyModalProps) {
  const { styles } = useStyles();
  const { token } = theme.useToken();
  const targetId = combo?.id || comboName || "";
  const targetLabel = combo?.name || comboName || "";

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [mode, setMode] = useState<"saved" | "custom">("saved");
  const [savedProxies, setSavedProxies] = useState<
    Array<{
      id: string;
      name?: string;
      host?: string;
      port?: number | string;
      type?: string;
      status?: string;
      username?: string;
      password?: string;
      source?: string;
    }>
  >([]);
  const [selectedProxyId, setSelectedProxyId] = useState<string>("");
  const [hasOwnProxy, setHasOwnProxy] = useState(false);
  const [inheritedProxy, setInheritedProxy] = useState<{
    level: string;
    type?: string;
    host?: string;
    port?: number | string;
  } | null>(null);

  // Custom proxy form states
  const [proxyType, setProxyType] = useState<string>("http");
  const [host, setHost] = useState<string>("");
  const [port, setPort] = useState<number | undefined>(undefined);
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showAuth, setShowAuth] = useState<boolean>(false);

  // Test results
  const [testResult, setTestResult] = useState<{
    success: boolean;
    publicIp?: string;
    latencyMs?: number;
    error?: string;
  } | null>(null);

  const getDefaultPort = (type: string) => {
    if (type === "socks5") return 1080;
    if (type === "https") return 443;
    return 8080;
  };

  // Load proxy registry and existing combo assignment
  useEffect(() => {
    if (!open || !targetId) return;

    let mounted = true;
    const fetchProxySettings = async () => {
      try {
        setLoading(true);
        setTestResult(null);

        const [proxyListRes, configRes] = await Promise.all([
          settingsApi.proxyConfig({ scope: "registry" }).catch(() => null),
          settingsApi.proxyConfig({ scope: "combo", id: targetId }).catch(() => null),
        ]);

        if (!mounted) return;

        // Parse registry proxies
        let registryItems: Array<{
          id: string;
          name?: string;
          host?: string;
          port?: number | string;
          type?: string;
          status?: string;
          username?: string;
          password?: string;
          source?: string;
        }> = [];

        if (proxyListRes && typeof proxyListRes === "object") {
          const rawItems = (proxyListRes as Record<string, unknown>).proxies || (proxyListRes as Record<string, unknown>).items;
          if (Array.isArray(rawItems)) {
            registryItems = rawItems;
          }
        }
        setSavedProxies(registryItems);

        // Parse current combo proxy config
        if (configRes && typeof configRes === "object") {
          const cfg = configRes as Record<string, unknown>;
          const combosMap = (cfg.combos as Record<string, unknown>) || {};
          const ownProxy = (combosMap[targetId] || combosMap[combo?.name || ""]) as
            | {
                id?: string;
                host?: string;
                port?: number | string;
                type?: string;
                username?: string;
                password?: string;
                source?: string;
              }
            | undefined;

          const assignedProxyId = (cfg.assignedProxyId as string) || (cfg.proxyId as string) || ownProxy?.id;
          const globalProxy = (cfg.global || cfg.default) as
            | {
                host?: string;
                port?: number | string;
                type?: string;
              }
            | undefined;

          if (assignedProxyId) {
            setSelectedProxyId(assignedProxyId);
            setHasOwnProxy(true);
            const assignedItem = registryItems.find((p) => p.id === assignedProxyId);
            if (assignedItem?.source === DASHBOARD_CUSTOM_PROXY_SOURCE) {
              setMode("custom");
              setProxyType(assignedItem.type || "http");
              setHost(assignedItem.host || "");
              setPort(assignedItem.port ? Number(assignedItem.port) : undefined);
              setUsername(assignedItem.username || "");
              setPassword(assignedItem.password || "");
              setShowAuth(Boolean(assignedItem.username || assignedItem.password));
            } else {
              setMode("saved");
            }
          } else if (ownProxy && ownProxy.host) {
            setHasOwnProxy(true);
            setMode("custom");
            setProxyType(ownProxy.type || "http");
            setHost(ownProxy.host || "");
            setPort(ownProxy.port ? Number(ownProxy.port) : undefined);
            setUsername(ownProxy.username || "");
            setPassword(ownProxy.password || "");
            setShowAuth(Boolean(ownProxy.username || ownProxy.password));
          } else {
            setHasOwnProxy(false);
            if (registryItems.length === 0) {
              setMode("custom");
            } else {
              setMode("saved");
            }
          }

          if (!assignedProxyId && (!ownProxy || !ownProxy.host) && globalProxy?.host) {
            setInheritedProxy({
              level: "全局默认代理",
              type: globalProxy.type || "http",
              host: globalProxy.host,
              port: globalProxy.port,
            });
          } else {
            setInheritedProxy(null);
          }
        }
      } catch (err) {
        console.error("Failed to load proxy settings:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchProxySettings();

    return () => {
      mounted = false;
    };
  }, [open, targetId, combo?.name]);

  // Save proxy settings
  const handleSave = async () => {
    try {
      setSaving(true);

      if (mode === "saved") {
        if (!selectedProxyId) {
          message.warning("请先选择一个代理节点");
          return;
        }
        await settingsApi.assignProxy("combo", targetId, selectedProxyId);
        onSaved?.(selectedProxyId);
        message.success("已成功绑定代理节点");
      } else {
        const trimmedHost = host.trim();
        if (!trimmedHost) {
          message.warning("请输入代理服务器主机地址");
          return;
        }

        const effectivePort = port || getDefaultPort(proxyType);
        const customProxyPayload = {
          name: `Custom for ${targetLabel}`,
          type: proxyType,
          host: trimmedHost,
          port: effectivePort,
          username: username.trim() || undefined,
          password: password || undefined,
          source: DASHBOARD_CUSTOM_PROXY_SOURCE,
        };

        const createdProxy = await settingsApi.createCustomProxy(customProxyPayload);
        const newProxyId = (createdProxy as { id?: string })?.id;

        if (newProxyId) {
          await settingsApi.assignProxy("combo", targetId, newProxyId);
        }
        onSaved?.(newProxyId);
        message.success("已成功保存并启用专属代理");
      }

      onClose();
    } catch (err) {
      console.error("Save proxy failed:", err);
      message.error(err instanceof Error ? err.message : "保存代理配置失败");
    } finally {
      setSaving(false);
    }
  };

  // Clear combo proxy and inherit global
  const handleClear = async () => {
    try {
      setSaving(true);
      await settingsApi.assignProxy("combo", targetId, null);
      onSaved?.(null);
      message.success("已清除专属代理，恢复继承全局设置");
      onClose();
    } catch (err) {
      console.error("Clear proxy failed:", err);
      message.error(err instanceof Error ? err.message : "恢复全局继承失败");
    } finally {
      setSaving(false);
    }
  };

  // Connectivity test
  const handleTest = async () => {
    try {
      setTesting(true);
      setTestResult(null);

      if (mode === "saved") {
        if (!selectedProxyId) {
          message.warning("请先选择代理节点");
          return;
        }
        const res = await settingsApi.testProxy({ proxyId: selectedProxyId });
        if (res.success !== false && !res.error) {
          setTestResult({
            success: true,
            publicIp: res.publicIp,
            latencyMs: res.latencyMs,
          });
        } else {
          setTestResult({
            success: false,
            error: res.error || "连接代理服务器失败",
            latencyMs: res.latencyMs,
          });
        }
      } else {
        if (!host.trim()) {
          message.warning("请输入代理服务器地址");
          return;
        }
        const testPayload = {
          type: proxyType,
          host: host.trim(),
          port: port || getDefaultPort(proxyType),
          username: username.trim() || undefined,
          password: password || undefined,
        };
        const res = await settingsApi.testProxy({ proxy: testPayload });
        if (res.success !== false && !res.error) {
          setTestResult({
            success: true,
            publicIp: res.publicIp,
            latencyMs: res.latencyMs,
          });
        } else {
          setTestResult({
            success: false,
            error: res.error || "连接代理服务器失败",
            latencyMs: res.latencyMs,
          });
        }
      }
    } catch (err) {
      setTestResult({
        success: false,
        error: err instanceof Error ? err.message : "测试请求异常",
      });
    } finally {
      setTesting(false);
    }
  };

  const sortedProxies = useMemo(() => {
    return [...savedProxies].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [savedProxies]);

  const selectedProxyItem = useMemo(() => {
    return savedProxies.find((p) => p.id === selectedProxyId);
  }, [savedProxies, selectedProxyId]);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={640}
      title={
        <Space align="center" size={8}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: "rgba(6, 182, 212, 0.12)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialIcon name="vpn_lock" size={16} style={{ color: "#06B6D4" }} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 600 }}>
            组合专属出站代理配置
          </span>
        </Space>
      }
      footer={
        <div className={styles.footerContainer}>
          <Space size={8}>
            <Button
              icon={<MaterialIcon name="speed" size={14} />}
              onClick={handleTest}
              loading={testing}
              disabled={loading || (mode === "saved" ? !selectedProxyId : !host.trim())}
            >
              测试连通性
            </Button>
            {hasOwnProxy && (
              <Popconfirm
                title="确定清除此组合的专属代理并恢复继承全局设置？"
                onConfirm={handleClear}
              >
                <Button danger type="text" icon={<MaterialIcon name="delete" size={14} />}>
                  清除并恢复继承
                </Button>
              </Popconfirm>
            )}
          </Space>
          <Space size={8}>
            <Button onClick={onClose}>取消</Button>
            <Button
              type="primary"
              onClick={handleSave}
              loading={saving}
              disabled={loading || (mode === "saved" ? !selectedProxyId : !host.trim())}
              style={{ background: "#06B6D4", borderColor: "#06B6D4" }}
            >
              保存配置
            </Button>
          </Space>
        </div>
      }
    >
      <div className={styles.modalBody}>
        {/* Inheritance Indicator */}
        {!hasOwnProxy && inheritedProxy && (
          <div className={styles.inheritanceBanner}>
            <MaterialIcon name="subdirectory_arrow_right" size={16} style={{ color: "#3B82F6" }} />
            <Text style={{ fontSize: 12, color: "#3B82F6" }}>
              当前正在继承 <b>{inheritedProxy.level}</b>:{" "}
              <code>
                {inheritedProxy.type}://{inheritedProxy.host}:{inheritedProxy.port}
              </code>
            </Text>
          </div>
        )}

        {/* Mode Selector */}
        <div className={styles.modeSegmentWrap}>
          <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 6 }}>
            代理配置来源:
          </Text>
          <Segmented
            value={mode}
            options={[
              {
                value: "saved",
                label: (
                  <Space size={4}>
                    <MaterialIcon name="inventory_2" size={14} />
                    <span>从代理池选用 ({savedProxies.length})</span>
                  </Space>
                ),
              },
              {
                value: "custom",
                label: (
                  <Space size={4}>
                    <MaterialIcon name="tune" size={14} />
                    <span>自定义独立代理</span>
                  </Space>
                ),
              },
            ]}
            onChange={(val) => {
              setMode(val as "saved" | "custom");
              setTestResult(null);
            }}
          />
        </div>

        {/* Mode 1: Saved Proxies */}
        {mode === "saved" && (
          <div className={styles.savedProxyCard}>
            <Form layout="vertical">
              <Form.Item
                label={<Text strong>选择已注册的代理服务器</Text>}
                help="将直接复用系统代理池中已有的代理节点"
                style={{ marginBottom: selectedProxyItem ? 12 : 0 }}
              >
                <Select
                  placeholder="请选择代理节点..."
                  value={selectedProxyId || undefined}
                  onChange={(val) => {
                    setSelectedProxyId(val);
                    setTestResult(null);
                  }}
                  options={sortedProxies.map((p) => ({
                    value: p.id,
                    label: `${p.name || p.id} (${p.type || "http"}://${p.host}:${p.port})`,
                  }))}
                  notFoundContent="暂无可用的已保存代理，请切换到自定义独立代理"
                />
              </Form.Item>

              {selectedProxyItem && (
                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: 6,
                    background: "rgba(6, 182, 212, 0.05)",
                    border: "1px solid rgba(6, 182, 212, 0.2)",
                  }}
                >
                  <Space size={12} wrap>
                    <Text style={{ fontSize: 11 }}>
                      协议: <Tag color="cyan">{selectedProxyItem.type || "http"}</Tag>
                    </Text>
                    <Text style={{ fontSize: 11 }}>
                      主机: <code>{selectedProxyItem.host}</code>
                    </Text>
                    <Text style={{ fontSize: 11 }}>
                      端口: <code>{selectedProxyItem.port}</code>
                    </Text>
                    {selectedProxyItem.username && (
                      <Text style={{ fontSize: 11 }}>
                        认证: <code>{selectedProxyItem.username}</code>
                      </Text>
                    )}
                  </Space>
                </div>
              )}
            </Form>
          </div>
        )}

        {/* Mode 2: Custom Direct Proxy */}
        {mode === "custom" && (
          <div className={styles.customProxyCard}>
            <Form layout="vertical">
              {/* Proxy Type */}
              <Form.Item label={<Text strong>代理协议类型</Text>} style={{ marginBottom: 12 }}>
                <Segmented
                  value={proxyType}
                  options={[
                    { label: "HTTP", value: "http" },
                    { label: "HTTPS", value: "https" },
                    { label: "SOCKS5", value: "socks5" },
                  ]}
                  onChange={(v) => {
                    setProxyType(v as string);
                    if (!port) setPort(getDefaultPort(v as string));
                  }}
                />
              </Form.Item>

              {/* Host & Port */}
              <Row gutter={12}>
                <Col span={16}>
                  <Form.Item
                    label={<Text strong>代理主机地址</Text>}
                    required
                    style={{ marginBottom: 12 }}
                  >
                    <Input
                      placeholder="例如: 127.0.0.1 或 proxy.example.com"
                      value={host}
                      autoComplete="off"
                      onChange={(e) => setHost(e.target.value)}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label={<Text strong>端口</Text>}
                    style={{ marginBottom: 12 }}
                  >
                    <InputNumber
                      min={1}
                      max={65535}
                      placeholder={String(getDefaultPort(proxyType))}
                      style={{ width: "100%" }}
                      value={port}
                      onChange={(v) => setPort(v ?? undefined)}
                    />
                  </Form.Item>
                </Col>
              </Row>

              {/* Authentication Toggle */}
              <div>
                <button
                  type="button"
                  className={styles.authToggleBtn}
                  onClick={() => setShowAuth((prev) => !prev)}
                >
                  <MaterialIcon name={showAuth ? "expand_less" : "expand_more"} size={16} />
                  <span>🔒 身份验证 (可选，若代理服务器需要用户名与密码)</span>
                </button>

                {showAuth && (
                  <div className={styles.authContainer}>
                    <Row gutter={12}>
                      <Col span={12}>
                        <Form.Item label="用户名" style={{ marginBottom: 0 }}>
                          <Input
                            placeholder="可选"
                            autoComplete="off"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label="密码" style={{ marginBottom: 0 }}>
                          <Input.Password
                            placeholder="可选"
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>
                )}
              </div>
            </Form>
          </div>
        )}

        {/* Test Result Display */}
        {testResult && (
          <div
            className={`${styles.testResultBox} ${
              testResult.success ? styles.testResultSuccess : styles.testResultError
            }`}
          >
            <MaterialIcon
              name={testResult.success ? "check_circle" : "error"}
              size={18}
              style={{ color: testResult.success ? "#10B981" : "#EF4444" }}
            />
            <div style={{ flex: 1, fontSize: 12 }}>
              {testResult.success ? (
                <div>
                  <Text strong style={{ color: "#10B981" }}>
                    代理连通测试成功
                  </Text>
                  <span style={{ marginLeft: 8, color: token.colorTextSecondary }}>
                    出口 IP: <code>{testResult.publicIp || "未知"}</code>
                    {typeof testResult.latencyMs === "number" && ` · 耗时 ${testResult.latencyMs}ms`}
                  </span>
                </div>
              ) : (
                <div>
                  <Text strong style={{ color: "#EF4444" }}>
                    代理测试失败:
                  </Text>
                  <span style={{ marginLeft: 6 }}>{testResult.error}</span>
                  {typeof testResult.latencyMs === "number" && (
                    <span style={{ marginLeft: 6, color: token.colorTextSecondary }}>
                      ({testResult.latencyMs}ms)
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
