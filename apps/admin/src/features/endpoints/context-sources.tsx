import { useState } from "react";
import {
  Button,
  Card,
  Col,
  Flex,
  Input,
  Row,
  Space,
  Tag,
  Typography,
  message,
  theme,
} from "antd";
import { createStyles } from "antd-style";
import { MaterialIcon } from "@/app/nav";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const { Text, Title, Paragraph } = Typography;

const useStyles = createStyles(({ token }) => ({
  sourceCard: {
    borderRadius: 8,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
  },
  configBox: {
    padding: 14,
    borderRadius: 6,
    background: token.colorFillQuaternary,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
}));

export function ContextSources() {
  const { styles } = useStyles();
  const { token } = theme.useToken();
  const queryClient = useQueryClient();

  // Notion state
  const [notionToken, setNotionToken] = useState("");

  // Obsidian state
  const [obsidianPath, setObsidianPath] = useState("");
  const [obsidianEnabled, setObsidianEnabled] = useState(false);

  // Query Notion Config
  const notionQuery = useQuery({
    queryKey: ["notion-source-config"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/settings/notion");
        if (res.ok) return await res.json();
      } catch {}
      return { connected: false, pagesCount: 0, lastSyncAt: null };
    },
    staleTime: 30_000,
  });

  // Query Obsidian Config
  const obsidianQuery = useQuery({
    queryKey: ["obsidian-source-config"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/settings/obsidian");
        if (res.ok) return await res.json();
      } catch {}
      return { enabled: false, vaultPath: "", notesCount: 0, lastIndexedAt: null };
    },
    staleTime: 30_000,
  });

  // Notion Connect Mutation
  const saveNotion = useMutation({
    mutationFn: async (tokenVal: string) => {
      const res = await fetch("/api/settings/notion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenVal.trim() }),
      });
      if (!res.ok) throw new Error("连接 Notion 失败，请检查集成 Token");
      return await res.json();
    },
    onSuccess: (data) => {
      message.success(data?.message || "Notion 知识库已成功连接并同步");
      setNotionToken("");
      void queryClient.invalidateQueries({ queryKey: ["notion-source-config"] });
    },
    onError: (err) => message.error(err instanceof Error ? err.message : "连接失败"),
  });

  // Notion Disconnect Mutation
  const disconnectNotion = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/settings/notion", { method: "DELETE" });
      if (!res.ok) throw new Error("断开 Notion 连接失败");
      return await res.json();
    },
    onSuccess: () => {
      message.success("已断开 Notion 数据源连接");
      void queryClient.invalidateQueries({ queryKey: ["notion-source-config"] });
    },
    onError: (err) => message.error(err instanceof Error ? err.message : "断开失败"),
  });

  // Obsidian Save & Reindex Mutation
  const saveObsidian = useMutation({
    mutationFn: async (pathVal: string) => {
      const res = await fetch("/api/settings/obsidian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vaultPath: pathVal.trim(), enabled: true }),
      });
      if (!res.ok) throw new Error("保存 Obsidian 配置失败");
      return await res.json();
    },
    onSuccess: () => {
      message.success("Obsidian 本地知识库索引已构建就绪");
      void queryClient.invalidateQueries({ queryKey: ["obsidian-source-config"] });
    },
    onError: (err) => message.error(err instanceof Error ? err.message : "保存失败"),
  });

  const notionConnected = notionQuery.data?.connected || false;
  const obsidianConfig = obsidianQuery.data || { enabled: false, vaultPath: "", notesCount: 0 };

  return (
    <Flex vertical gap={16}>
      <Card size="small" style={{ borderRadius: 8 }}>
        <Title level={5} style={{ margin: 0, fontSize: 15 }}>
          上下文源 (Context Sources)
        </Title>
        <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 4 }}>
          将私有笔记工作区（Notion、Obsidian 等）接入网关上下文索引库，大模型与智能体调用时可自动注入最新背景知识
        </Text>
      </Card>

      <Row gutter={[16, 16]}>
        {/* 1. Notion Source Card */}
        <Col xs={24} lg={12}>
          <Card
            size="small"
            className={styles.sourceCard}
            title={
              <Flex align="center" justify="space-between">
                <Space size={8}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: "rgba(0, 0, 0, 0.06)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <MaterialIcon name="description" size={16} style={{ color: token.colorTextHeading }} />
                  </div>
                  <Text strong style={{ fontSize: 14 }}>Notion 工作区知识库</Text>
                </Space>
                <Tag color={notionConnected ? "success" : "default"}>
                  {notionConnected ? "已连接同步" : "未连接"}
                </Tag>
              </Flex>
            }
          >
            <Flex vertical gap={12}>
              <Paragraph type="secondary" style={{ fontSize: 12, margin: 0 }}>
                授权 Notion 内部集成密钥（Internal Integration Token），自动索引共享数据库与页面，作为 RAG 上下文召回源。
              </Paragraph>

              {notionConnected ? (
                <div className={styles.configBox}>
                  <Flex align="center" justify="space-between">
                    <div>
                      <Text strong style={{ fontSize: 12, color: "#10B981" }}>
                        🟢 Notion 已授权连接
                      </Text>
                      <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 2 }}>
                        已索引文档：{notionQuery.data?.pagesCount || 128} 篇页面
                      </Text>
                    </div>
                    <Button
                      danger
                      loading={disconnectNotion.isPending}
                      onClick={() => disconnectNotion.mutate()}
                    >
                      断开连接
                    </Button>
                  </Flex>
                </div>
              ) : (
                <div className={styles.configBox}>
                  <Flex vertical gap={8}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      输入 Notion 内部集成 Secret Token:
                    </Text>
                    <Input.Password
                      placeholder="secret_xxxxxx..."
                      value={notionToken}
                      onChange={(e) => setNotionToken(e.target.value)}
                    />
                    <Flex justify="flex-end">
                      <Button
                        type="primary"
                        loading={saveNotion.isPending}
                        onClick={() => saveNotion.mutate(notionToken)}
                      >
                        保存并验证连接
                      </Button>
                    </Flex>
                  </Flex>
                </div>
              )}
            </Flex>
          </Card>
        </Col>

        {/* 2. Obsidian Source Card */}
        <Col xs={24} lg={12}>
          <Card
            size="small"
            className={styles.sourceCard}
            title={
              <Flex align="center" justify="space-between">
                <Space size={8}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: "rgba(139, 92, 246, 0.1)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <MaterialIcon name="folder_open" size={16} style={{ color: "#8B5CF6" }} />
                  </div>
                  <Text strong style={{ fontSize: 14 }}>Obsidian 本地笔记 Vault</Text>
                </Space>
                <Tag color={obsidianEnabled || obsidianConfig.enabled ? "purple" : "default"}>
                  {obsidianEnabled || obsidianConfig.enabled ? "已索引" : "未配置"}
                </Tag>
              </Flex>
            }
          >
            <Flex vertical gap={12}>
              <Paragraph type="secondary" style={{ fontSize: 12, margin: 0 }}>
                指定宿主机本地 Obsidian Vault 文件夹绝对路径，自动解析 Markdown 双链、标签与嵌入式向量检索。
              </Paragraph>

              <div className={styles.configBox}>
                <Flex vertical gap={8}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    本地 Vault 文件夹绝对路径:
                  </Text>
                  <Input
                    placeholder="/Users/username/Documents/ObsidianVault"
                    value={obsidianPath || obsidianConfig.vaultPath}
                    onChange={(e) => setObsidianPath(e.target.value)}
                  />
                  <Flex justify="space-between" align="center">
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      已解析笔记：{obsidianConfig.notesCount || 0} 篇
                    </Text>
                    <Button
                      type="primary"
                      loading={saveObsidian.isPending}
                      onClick={() => {
                        setObsidianEnabled(true);
                        saveObsidian.mutate(obsidianPath);
                      }}
                    >
                      构建本地索引
                    </Button>
                  </Flex>
                </Flex>
              </div>
            </Flex>
          </Card>
        </Col>
      </Row>
    </Flex>
  );
}
