import { useState } from "react";
import {
  Card,
  Col,
  Flex,
  Row,
  Segmented,
  Table,
  Tag,
  Typography,
} from "antd";
import { createStyles } from "antd-style";
import { useQuery } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import { gamificationApi, type LeaderboardEntry } from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import { useI18n } from "@/i18n";

const { Title, Text } = Typography;

const useStyles = createStyles(({ token }) => ({
  page: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  headerCard: {
    borderRadius: 8,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  podiumCard: {
    borderRadius: 8,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
    position: "relative",
    overflow: "hidden",
    height: "100%",
    transition: "all 0.2s ease",
    "&:hover": {
      borderColor: token.colorPrimary,
      transform: "translateY(-2px)",
      boxShadow: token.boxShadowTertiary,
    },
  },
  podiumTopBarGold: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    background: "linear-gradient(90deg, #fbbf24, #d97706)",
  },
  podiumTopBarSilver: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    background: "linear-gradient(90deg, #cbd5e1, #64748b)",
  },
  podiumTopBarBronze: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    background: "linear-gradient(90deg, #f97316, #b45309)",
  },
  sectionCard: {
    borderRadius: 8,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
}));

const MEDAL_ICONS = ["🥇", "🥈", "🥉"];

export function LeaderboardPage() {
  const { styles } = useStyles();
  const { tt } = useI18n();
  const [scope, setScope] = useState<string>("global");

  const leaderboardQuery = useQuery({
    queryKey: ["leaderboard-list", scope],
    queryFn: () => gamificationApi.getLeaderboard(scope),
  });

  if (leaderboardQuery.isLoading) {
    return <PageSkeleton />;
  }

  const entries = leaderboardQuery.data?.entries ?? [];
  const myRank = leaderboardQuery.data?.myRank ?? 1;
  const top3 = entries.slice(0, 3);

  const scopeOptions = [
    { label: tt("历史总榜", "All-Time"), value: "global" },
    { label: tt("本周排行", "Weekly"), value: "weekly" },
    { label: tt("本月排行", "Monthly"), value: "monthly" },
    { label: tt("共享贡献榜", "Tokens Shared"), value: "tokens_shared" },
  ];

  return (
    <div className={styles.page}>
      {/* 1. Header Banner */}
      <Card className={styles.headerCard} styles={{ body: { padding: "12px 16px" } }}>
        <Flex justify="space-between" align="center" wrap gap={12}>
          <Flex align="center" gap={12}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: "rgba(234, 179, 8, 0.12)",
                color: "#eab308",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="emoji_events" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  {tt("算力贡献与模型竞技排行榜", "Compute & Model Leaderboard")}
                </Title>
                <Tag color="gold">{tt("实时天梯榜单", "Live Arena")}</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt(
                  "统计网关各 API 密钥、客户端与节点的调用吞吐量、Tokens 消耗与社区联邦共享算力排名。",
                  "Track throughput, token consumption, and federated compute contributions across API keys."
                )}
              </Text>
            </div>
          </Flex>

          <Segmented
            value={scope}
            onChange={(val) => setScope(val as string)}
            options={scopeOptions}
          />
        </Flex>
      </Card>

      {/* 2. Top 3 Podiums */}
      {top3.length > 0 && (
        <Row gutter={[12, 12]}>
          {top3.map((entry, idx) => {
            const barClass =
              idx === 0
                ? styles.podiumTopBarGold
                : idx === 1
                ? styles.podiumTopBarSilver
                : styles.podiumTopBarBronze;
            return (
              <Col xs={24} md={8} key={entry.apiKeyId}>
                <Card className={styles.podiumCard} size="small" styles={{ body: { padding: "16px" } }}>
                  <div className={barClass} />
                  <Flex justify="space-between" align="center">
                    <Flex align="center" gap={12}>
                      <span style={{ fontSize: 32 }}>{MEDAL_ICONS[idx]}</span>
                      <div>
                        <Text strong style={{ fontSize: 14 }}>
                          {entry.apiKeyId.slice(0, 16)}...
                        </Text>
                        <div style={{ fontSize: 22, fontWeight: 700, color: idx === 0 ? "#eab308" : "inherit", marginTop: 2 }}>
                          {entry.score.toLocaleString()} <span style={{ fontSize: 12, fontWeight: 400, color: "var(--ant-color-text-secondary)" }}>{scope === "tokens_shared" ? "Tokens" : "PTS"}</span>
                        </div>
                      </div>
                    </Flex>
                    <div style={{ fontSize: 40, fontWeight: 900, opacity: 0.15 }}>
                      #{idx + 1}
                    </div>
                  </Flex>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* 3. My Rank Banner */}
      <Card className={styles.sectionCard} size="small" styles={{ body: { padding: "12px 16px" } }}>
        <Flex justify="space-between" align="center">
          <Flex align="center" gap={8}>
            <MaterialIcon name="verified_user" size={18} style={{ color: "#3b82f6" }} />
            <Text strong>{tt("当前控制台管理员身份排名", "Your Console Admin Rank")}:</Text>
            <Tag color="blue" style={{ fontSize: 13, fontWeight: 600 }}>#{myRank}</Tag>
          </Flex>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {tt(`当前统计作用域: ${scopeOptions.find(s => s.value === scope)?.label}`, `Active scope: ${scope}`)}
          </Text>
        </Flex>
      </Card>

      {/* 4. Leaderboard Table */}
      <Card
        title={
          <Flex align="center" gap={8}>
            <MaterialIcon name="leaderboard" size={18} />
            <span>{tt("完整天梯天梯榜单", "Full Leaderboard Rankings")}</span>
          </Flex>
        }
        className={styles.sectionCard}
        size="small"
      >
        <Table<LeaderboardEntry>
          rowKey="apiKeyId"
          size="small"
          dataSource={entries}
          pagination={{ pageSize: 10 }}
          columns={[
            {
              title: tt("排名", "Rank"),
              key: "rank",
              width: 80,
              render: (_, __, index) => (
                <span style={{ fontWeight: index < 3 ? 700 : 400, color: index < 3 ? "#eab308" : "inherit" }}>
                  {index < 3 ? MEDAL_ICONS[index] : `#${index + 1}`}
                </span>
              ),
            },
            {
              title: tt("调用密钥 / 节点标识", "API Key / Node Identifier"),
              dataIndex: "apiKeyId",
              key: "apiKeyId",
              render: (id) => <code style={{ fontSize: 12 }}>{id}</code>,
            },
            {
              title: tt("算力贡献分 / Tokens", "Score / Tokens"),
              dataIndex: "score",
              key: "score",
              align: "right",
              render: (score) => (
                <Text strong style={{ fontFamily: "monospace", fontSize: 13 }}>
                  {score.toLocaleString()} {scope === "tokens_shared" ? "Tokens" : "PTS"}
                </Text>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}

export default LeaderboardPage;
