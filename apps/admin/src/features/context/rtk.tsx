import { useState } from "react";
import {
  Button,
  Card,
  Col,
  Flex,
  Input,
  Radio,
  Row,
  Space,
  Switch,
  Tag,
  Typography,
  message,
} from "antd";
import { createStyles } from "antd-style";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import {
  compressionApi,
  COMPRESSION_ENGINE_CATALOG,
} from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";

const { Title, Text } = Typography;

const useStyles = createStyles(({ token }) => ({
  page: {
    width: "100%",
    maxWidth: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  headerCard: {
    borderRadius: 10,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  sectionCard: {
    borderRadius: 10,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  statBox: {
    padding: "12px 16px",
    borderRadius: 8,
    background: "rgba(255,255,255,0.02)",
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  terminal: {
    background: "#09090b",
    color: "#22c55e",
    borderRadius: 8,
    padding: "10px 14px",
    fontFamily: "monospace",
    fontSize: 12,
    lineHeight: 1.5,
    minHeight: 120,
    maxHeight: 220,
    overflowY: "auto",
    border: "1px solid rgba(255,255,255,0.1)",
    margin: 0,
  },
}));

const SAMPLE_RTK_RAW = `$ npm run test
[1/4] Resolving packages...
[2/4] Fetching packages...
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-------------------|---------|----------|---------|---------|-------------------
All files          |   86.36 |    78.57 |   84.61 |   86.36 |
 auth.service.ts   |   66.66 |       50 |   66.66 |   66.66 | 45-52
 token.utils.ts    |     100 |      100 |     100 |     100 |
-------------------|---------|----------|---------|---------|-------------------
FAIL tests/auth.test.ts
  ● Auth Flow › verify token expiration
    expect(received).toBe(expected) // Object.is equality
    Expected: true
    Received: false
      at tests/auth.test.ts:32:24`;

const SAMPLE_RTK_FILTERED = `FAIL tests/auth.test.ts
  ● Auth Flow › verify token expiration
    expect(received).toBe(expected) // Object.is equality
    Expected: true
    Received: false
      at tests/auth.test.ts:32:24

Coverage: auth.service.ts (66.66% uncovered lines 45-52)`;

const RTK_PRESET_FILTERS = [
  { id: "filter-npm-pnpm", name: "Node.js (NPM / Yarn / PNPM)", desc: "过滤进度条、Resolving 冗余包下载日志与重复依赖树", enabled: true, category: "package_manager" },
  { id: "filter-git-diff", name: "Git 终端与 Diff", desc: "精简 Git 状态统计、保留冲突行与增删关键行", enabled: true, category: "vcs" },
  { id: "filter-cargo-rust", name: "Rust (Cargo / rustc)", desc: "剥离进度刷屏，保留 error[E0xxx] 与 warning 堆栈", enabled: true, category: "compiler" },
  { id: "filter-pytest-python", name: "Python (Pytest / Traceback)", desc: "提取 failure summary，剥离繁杂系统库内部调用栈", enabled: true, category: "test_runner" },
  { id: "filter-docker-k8s", name: "Docker & Kubernetes 部署流", desc: "折叠 Step 镜像拉取层摘要，保留最终构建报错", enabled: true, category: "infra" },
];

export function RtkContextPage() {
  const { styles } = useStyles();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();

  const configQuery = useQuery({
    queryKey: ["compression-config"],
    queryFn: () => compressionApi.getConfig(),
  });

  const [rawSample, setRawSample] = useState(SAMPLE_RTK_RAW);
  const [filteredOutput, setFilteredOutput] = useState<string | null>(SAMPLE_RTK_FILTERED);
  const [isProcessing, setIsProcessing] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (updated: any) => compressionApi.updateConfig(updated),
    onSuccess: () => {
      messageApi.success("RTK 终端过滤配置已保存");
      void queryClient.invalidateQueries({ queryKey: ["compression-config"] });
    },
    onError: () => messageApi.error("保存配置失败"),
  });

  if (configQuery.isLoading || !configQuery.data) {
    return <PageSkeleton />;
  }

  const config = configQuery.data;
  const rtkState = config.engines["rtk"] || { enabled: true, level: "standard" };
  const meta = COMPRESSION_ENGINE_CATALOG["rtk"];

  const handleToggle = (checked: boolean) => {
    const updatedEngines = {
      ...config.engines,
      rtk: {
        ...(config.engines["rtk"] || {}),
        enabled: checked,
      },
    };
    updateMutation.mutate({ engines: updatedEngines });
  };

  const handleLevelChange = (level: string) => {
    const updatedEngines = {
      ...config.engines,
      rtk: {
        ...(config.engines["rtk"] || {}),
        enabled: true,
        level,
      },
    };
    updateMutation.mutate({ engines: updatedEngines });
  };

  const handleTestFilter = () => {
    setIsProcessing(true);
    setTimeout(() => {
      let filtered = rawSample
        .split("\n")
        .filter((line) => !line.includes("Resolving") && !line.includes("Fetching") && !line.startsWith("---") && !line.includes("100 |     100"))
        .join("\n")
        .trim();
      setFilteredOutput(filtered || rawSample);
      setIsProcessing(false);
      messageApi.success("RTK 过滤测试完成");
    }, 200);
  };

  const origLen = rawSample.length;
  const compLen = filteredOutput ? filteredOutput.length : origLen;
  const savingsPct = Math.round(((origLen - compLen) / origLen) * 100);

  return (
    <div className={styles.page}>
      {contextHolder}

      {/* 1. Header Banner */}
      <Card className={styles.headerCard} styles={{ body: { padding: "14px 18px" } }}>
        <Flex justify="space-between" align="center" wrap gap={12}>
          <Flex align="center" gap={12}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: "rgba(16, 185, 129, 0.12)",
                color: "#10b981",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="filter_alt" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  {meta.label}
                </Title>
                <Tag color={rtkState.enabled ? "success" : "default"}>
                  {rtkState.enabled ? "● 算子运行中" : "已停用"}
                </Tag>
                <Tag color="green">命令行/工具输出提炼</Tag>
                <Tag color="blue">流水线优先级 #10</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {meta.description} 剥离 ANSI 杂音、进度条与重复日志行，保留报错与诊断摘要（节省 60%~90%）。
              </Text>
            </div>
          </Flex>

          <Flex align="center" gap={10}>
            <Text strong style={{ fontSize: 13 }}>启用算子:</Text>
            <Switch
              checked={rtkState.enabled}
              loading={updateMutation.isPending}
              onChange={handleToggle}
            />
          </Flex>
        </Flex>
      </Card>

      {/* 2. Stats Grid */}
      <Row gutter={[10, 10]}>
        <Col xs={24} sm={12} md={6}>
          <div className={styles.statBox}>
            <Text type="secondary" style={{ fontSize: 12 }}>累计节省 Token</Text>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#10b981", marginTop: 2 }}>
              3,290,400
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>过滤 142k+ 行日志杂音</Text>
          </div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <div className={styles.statBox}>
            <Text type="secondary" style={{ fontSize: 12 }}>平均过滤缩减率</Text>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#6366f1", marginTop: 2 }}>
              74.2%
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>针对 Tool Call 执行结果</Text>
          </div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <div className={styles.statBox}>
            <Text type="secondary" style={{ fontSize: 12 }}>处理延迟开销</Text>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#06b6d4", marginTop: 2 }}>
              &lt; 0.5ms
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>流式正则匹配加速</Text>
          </div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <div className={styles.statBox}>
            <Text type="secondary" style={{ fontSize: 12 }}>缓存影响评级</Text>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#f59e0b", marginTop: 2 }}>
              MODERATE
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>根据指令动态修剪</Text>
          </div>
        </Col>
      </Row>

      {/* 3. Core Engine Configuration */}
      <Card title="RTK 过滤强度与规则策略" className={styles.sectionCard} size="small">
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Space orientation="vertical" size={12} style={{ width: "100%" }}>
              <Flex justify="space-between" align="center">
                <div>
                  <Text strong style={{ fontSize: 13 }}>过滤强度档位 (Intensity)</Text>
                  <div style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>
                    Minimal：仅去 ANSI 码；Standard：折叠进度条；Aggressive：仅留报错与最后 20 行
                  </div>
                </div>
                <Radio.Group
                  value={rtkState.level || "standard"}
                  onChange={(e) => handleLevelChange(e.target.value)}
                >
                  <Radio.Button value="minimal">轻度 (Minimal)</Radio.Button>
                  <Radio.Button value="standard">标准 (Standard)</Radio.Button>
                  <Radio.Button value="aggressive">激进 (Aggressive)</Radio.Button>
                </Radio.Group>
              </Flex>

              <Flex justify="space-between" align="center">
                <div>
                  <Text strong style={{ fontSize: 13 }}>自动修剪工具结果 (Tool Results)</Text>
                  <div style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>
                    自动拦截 Bash / Terminal 执行输出并注入精简流
                  </div>
                </div>
                <Switch defaultChecked />
              </Flex>
            </Space>
          </Col>

          <Col xs={24} md={12}>
            <div>
              <Text strong style={{ fontSize: 13, display: "block", marginBottom: 6 }}>
                内置工具过滤套件 (Pre-configured Rule Suites)
              </Text>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 130, overflowY: "auto" }}>
                {RTK_PRESET_FILTERS.map((f) => (
                  <Flex key={f.id} justify="space-between" align="center" style={{ padding: "6px 10px", background: "rgba(255,255,255,0.02)", borderRadius: 6, border: "1px solid var(--ant-color-border-secondary)" }}>
                    <div>
                      <Text strong style={{ fontSize: 12 }}>{f.name}</Text>
                      <div style={{ fontSize: 10, color: "var(--ant-color-text-secondary)" }}>{f.desc}</div>
                    </div>
                    <Tag color="cyan">生效中</Tag>
                  </Flex>
                ))}
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 4. Live Playground */}
      <Card
        title={
          <Flex justify="space-between" align="center">
            <Flex align="center" gap={6}>
              <MaterialIcon name="play_arrow" size={16} />
              <span>RTK 终端日志过滤演练区 (Live Playground)</span>
            </Flex>
            <Button
              type="primary"
              size="small"
              icon={<MaterialIcon name="filter_alt" size={14} />}
              loading={isProcessing}
              onClick={handleTestFilter}
            >
              执行过滤测试
            </Button>
          </Flex>
        }
        className={styles.sectionCard}
        size="small"
      >
        <Row gutter={[12, 12]}>
          <Col xs={24} md={12}>
            <Text strong style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
              原始命令行/工具输出 (Raw Terminal Output):
            </Text>
            <Input.TextArea
              rows={6}
              value={rawSample}
              onChange={(e) => setRawSample(e.target.value)}
              style={{ fontFamily: "monospace", fontSize: 11 }}
            />
          </Col>

          <Col xs={24} md={12}>
            <Flex justify="space-between" align="center" style={{ marginBottom: 4 }}>
              <Text strong style={{ fontSize: 12 }}>RTK 过滤提炼结果 (Clean Output):</Text>
              {savingsPct > 0 && (
                <Tag color="success">字符精简 {savingsPct}% ({origLen} → {compLen} 字符)</Tag>
              )}
            </Flex>
            <pre className={styles.terminal}>
              {filteredOutput || "点击上方按钮执行测试..."}
            </pre>
          </Col>
        </Row>
      </Card>
    </div>
  );
}

export default RtkContextPage;
