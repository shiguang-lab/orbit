import {
  Button,
  Card,
  Col,
  Flex,
  Progress,
  Row,
  Tag,
  Typography,
} from "antd";
import { createStyles } from "antd-style";
import { useQuery } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import { runtimeApi } from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";

const { Title, Text } = Typography;

const useStyles = createStyles(({ token }) => ({
  page: {
    width: "100%",
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    minHeight: 0,
    overflowY: "auto",
    paddingRight: 2,
    "&::-webkit-scrollbar": {
      width: 6,
    },
    "&::-webkit-scrollbar-thumb": {
      backgroundColor: token.colorBorderSecondary,
      borderRadius: 3,
    },
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
}));

export function RuntimePage() {
  const { styles } = useStyles();

  const runtimeQuery = useQuery({
    queryKey: ["runtime-stats"],
    queryFn: () => runtimeApi.getStats(),
    refetchInterval: 3000,
  });

  if (runtimeQuery.isLoading || !runtimeQuery.data) {
    return <PageSkeleton />;
  }

  const s = runtimeQuery.data;
  const uptimeDays = (s.uptimeSeconds / 86400).toFixed(1);

  return (
    <div className={styles.page}>
      {/* 1. Header Banner */}
      <Card className={styles.headerCard} styles={{ body: { padding: "14px 18px" } }}>
        <Flex justify="space-between" align="center" wrap gap={12}>
          <Flex align="center" gap={12}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: "rgba(245, 158, 11, 0.12)",
                color: "#f59e0b",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="bolt" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  网关核心运行时状态
                </Title>
                <Tag color="green">已稳定运行 {uptimeDays} 天</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                实时监控 Node.js / V8 堆内存、Event Loop 事件循环延迟、GC 停顿与并发请求池负载。
              </Text>
            </div>
          </Flex>

          <Button
            type="default"
            icon={<MaterialIcon name="refresh" size={16} />}
            onClick={() => void runtimeQuery.refetch()}
          >
            刷新运行时
          </Button>
        </Flex>
      </Card>

      {/* 2. Top Stats */}
      <Row gutter={[10, 10]}>
        <Col xs={24} sm={12} md={6}>
          <div className={styles.statBox}>
            <Text type="secondary" style={{ fontSize: 12 }}>Event Loop 事件循环延迟</Text>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#10b981", marginTop: 2 }}>
              {s.eventLoopLagMs} ms
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>极度顺畅，无阻塞任务</Text>
          </div>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <div className={styles.statBox}>
            <Text type="secondary" style={{ fontSize: 12 }}>V8 堆内存占用 (Heap)</Text>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#38bdf8", marginTop: 2 }}>
              {s.heapUsedMb} MB / {s.heapTotalMb} MB
            </div>
            <Progress percent={Math.round((s.heapUsedMb / s.heapTotalMb) * 100)} size="small" strokeColor="#38bdf8" />
          </div>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <div className={styles.statBox}>
            <Text type="secondary" style={{ fontSize: 12 }}>并发活跃请求数</Text>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#6366f1", marginTop: 2 }}>
              {s.activeRequests} 链接
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>常驻工作线程: {s.goroutinesOrThreads}</Text>
          </div>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <div className={styles.statBox}>
            <Text type="secondary" style={{ fontSize: 12 }}>CPU 使用率</Text>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#f59e0b", marginTop: 2 }}>
              {s.cpuUsagePct}%
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>GC 停顿: {s.gcPauseMs}ms</Text>
          </div>
        </Col>
      </Row>
    </div>
  );
}

export default RuntimePage;
