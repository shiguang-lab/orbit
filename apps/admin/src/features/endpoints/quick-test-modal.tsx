import { useState, useEffect } from "react";
import {
  Button,
  Flex,
  Input,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { createStyles } from "antd-style";
import { MaterialIcon } from "@/app/nav";
import { keysApi } from "@/entities/api";
import { useQuery } from "@tanstack/react-query";
import type { EndpointCardDef } from "./constants";

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

const useStyles = createStyles(({ token }) => ({
  codeViewer: {
    fontFamily: "monospace",
    fontSize: 12,
    background: token.colorBgElevated,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: 6,
    padding: "10px 14px",
    maxHeight: 280,
    overflowY: "auto",
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
  },
}));

interface QuickTestModalProps {
  endpoint: EndpointCardDef | null;
  baseUrl: string;
  onClose: () => void;
}

export function QuickTestModal({ endpoint, baseUrl, onClose }: QuickTestModalProps) {
  const { styles } = useStyles();

  const [testBody, setTestBody] = useState("");
  const [selectedKeyId, setSelectedKeyId] = useState<string>("");
  const [manualKey, setManualKey] = useState<string>("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: number;
    statusText: string;
    latencyMs: number;
    headers: Record<string, string>;
    body: unknown;
  } | null>(null);

  // Fetch available keys
  const keysQuery = useQuery({
    queryKey: ["api-keys-for-endpoint-test"],
    queryFn: keysApi.list,
    staleTime: 30_000,
  });

  const availableKeys = (keysQuery.data?.keys ?? []).filter(
    (k) => k.isActive !== false && k.isBanned !== true
  );

  useEffect(() => {
    if (endpoint) {
      setTestResult(null);
      if (endpoint.exampleBody) {
        setTestBody(JSON.stringify(endpoint.exampleBody, null, 2));
      } else {
        setTestBody("");
      }
      if (availableKeys.length > 0 && !selectedKeyId) {
        setSelectedKeyId(availableKeys[0].id);
      }
    }
  }, [endpoint]);

  if (!endpoint) return null;

  const fullEndpointUrl = `${baseUrl.replace(/\/$/, "")}${endpoint.path}`;
  const method = endpoint.path === "/v1/models" ? "GET" : "POST";

  const handleExecute = async () => {
    setTesting(true);
    setTestResult(null);

    let parsedBody: unknown = undefined;
    if (method !== "GET" && testBody.trim()) {
      try {
        parsedBody = JSON.parse(testBody);
      } catch {
        message.error("请求体不是有效的 JSON 格式");
        setTesting(false);
        return;
      }
    }

    const headers: Record<string, string> = {};
    if (manualKey.trim()) {
      headers["Authorization"] = `Bearer ${manualKey.trim()}`;
    } else if (selectedKeyId) {
      try {
        const revealRes = await keysApi.reveal(selectedKeyId);
        if (revealRes.key) {
          headers["Authorization"] = `Bearer ${revealRes.key}`;
        }
      } catch {
        headers["Authorization"] = `Bearer ${selectedKeyId}`;
      }
    }

    const startTime = performance.now();
    try {
      const res = await fetch(fullEndpointUrl, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: parsedBody ? JSON.stringify(parsedBody) : undefined,
      });

      const latencyMs = Math.round(performance.now() - startTime);
      const resHeaders: Record<string, string> = {};
      res.headers.forEach((val, k) => {
        resHeaders[k] = val;
      });

      let resBody: unknown = null;
      const text = await res.text();
      try {
        resBody = JSON.parse(text);
      } catch {
        resBody = text;
      }

      setTestResult({
        status: res.status,
        statusText: res.statusText || (res.ok ? "OK" : "Error"),
        latencyMs,
        headers: resHeaders,
        body: resBody,
      });
    } catch (err) {
      const latencyMs = Math.round(performance.now() - startTime);
      setTestResult({
        status: 0,
        statusText: "Network Error",
        latencyMs,
        headers: {},
        body: { error: err instanceof Error ? err.message : "无法连接至网关端点" },
      });
    } finally {
      setTesting(false);
    }
  };

  const copyToClipboard = (text: string, tip = "已复制到剪贴板") => {
    navigator.clipboard.writeText(text);
    message.success(tip);
  };

  return (
    <Modal
      open={Boolean(endpoint)}
      onCancel={onClose}
      width={780}
      title={
        <Space size={8} align="center">
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: endpoint.iconBg,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialIcon name={endpoint.icon} size={16} style={{ color: endpoint.iconColor }} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 600 }}>在线调试端点 · {endpoint.title}</span>
          <Tag style={{ fontFamily: "monospace", fontSize: 11, margin: 0 }}>
            {endpoint.path}
          </Tag>
        </Space>
      }
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
        <Button
          key="curl"
          icon={<MaterialIcon name="code" size={14} />}
          onClick={() => {
            const curlHeaders = [
              `-X ${method}`,
              `-H "Content-Type: application/json"`,
            ];
            if (manualKey) curlHeaders.push(`-H "Authorization: Bearer ${manualKey}"`);
            const curlBody = testBody ? `-d '${testBody.replace(/'/g, "\\'")}'` : "";
            const curlCmd = `curl ${fullEndpointUrl} \\\n  ${curlHeaders.join(" \\\n  ")} ${curlBody ? `\\\n  ${curlBody}` : ""}`;
            copyToClipboard(curlCmd, "已复制 cURL 请求代码");
          }}
        >
          复制 cURL
        </Button>,
        <Button
          key="send"
          type="primary"
          icon={<MaterialIcon name="send" size={14} />}
          loading={testing}
          onClick={() => void handleExecute()}
        >
          发起实时请求
        </Button>,
      ]}
    >
      <Flex vertical gap={12} style={{ marginTop: 12 }}>
        <Paragraph type="secondary" style={{ fontSize: 12, margin: 0 }}>
          {endpoint.description}
        </Paragraph>

        {/* Auth Selection */}
        <div>
          <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
            API 密钥认证 (Bearer Token):
          </Text>
          <Flex gap={8} wrap>
            {availableKeys.length > 0 && !manualKey && (
              <Select
                value={selectedKeyId}
                onChange={setSelectedKeyId}
                style={{ width: 260 }}
                options={availableKeys.map((k) => ({
                  label: `${k.name} (${k.key ? k.key.slice(0, 8) + "..." : k.id})`,
                  value: k.id,
                }))}
              />
            )}
            <Input
              placeholder="或输入自定义 Bearer Token..."
              value={manualKey}
              onChange={(e) => setManualKey(e.target.value)}
              style={{ flex: 1, minWidth: 200 }}
            />
          </Flex>
        </div>

        {/* Body Editor for POST */}
        {method !== "GET" && (
          <div>
            <Flex align="center" justify="space-between" style={{ marginBottom: 4 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                请求体 JSON Payload:
              </Text>
              {endpoint.exampleBody && (
                <Button
                  type="link"
                  size="small"
                  style={{ padding: 0, height: "auto", fontSize: 11 }}
                  onClick={() =>
                    setTestBody(JSON.stringify(endpoint.exampleBody, null, 2))
                  }
                >
                  重置为示例
                </Button>
              )}
            </Flex>
            <TextArea
              rows={6}
              value={testBody}
              onChange={(e) => setTestBody(e.target.value)}
              style={{ fontFamily: "monospace", fontSize: 12 }}
              placeholder="输入有效的 JSON 请求参数..."
            />
          </div>
        )}

        {/* Results Box */}
        {testResult && (
          <div style={{ marginTop: 4 }}>
            <Flex align="center" justify="space-between" style={{ marginBottom: 6 }}>
              <Space size={8}>
                <Tag
                  color={
                    testResult.status >= 200 && testResult.status < 300
                      ? "success"
                      : "error"
                  }
                  style={{ fontWeight: 700, fontSize: 12 }}
                >
                  HTTP {testResult.status} {testResult.statusText}
                </Tag>
                <Text strong style={{ fontSize: 12 }}>
                  耗时: {testResult.latencyMs}ms
                </Text>
              </Space>
              <Button
                type="link"
                size="small"
                style={{ padding: 0, height: "auto", fontSize: 11 }}
                onClick={() =>
                  copyToClipboard(
                    typeof testResult.body === "string"
                      ? testResult.body
                      : JSON.stringify(testResult.body, null, 2),
                    "已复制响应结果"
                  )
                }
              >
                复制响应
              </Button>
            </Flex>
            <pre className={styles.codeViewer}>
              {typeof testResult.body === "string"
                ? testResult.body
                : JSON.stringify(testResult.body, null, 2)}
            </pre>
          </div>
        )}
      </Flex>
    </Modal>
  );
}
