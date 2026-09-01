import { Card, Col, Flex, Row, Skeleton, Space } from "antd";

export function PageSkeleton() {
  return (
    <Flex vertical gap={16} style={{ width: "100%", padding: "4px 0" }}>
      {/* Header Banner Skeleton */}
      <Card size="small" style={{ borderRadius: 10 }}>
        <Flex align="center" justify="space-between" wrap gap={12}>
          <div>
            <Flex align="center" gap={8}>
              <Skeleton.Avatar active size={24} shape="square" />
              <Skeleton.Input active size="small" style={{ width: 140, height: 24 }} />
            </Flex>
            <div style={{ marginTop: 8 }}>
              <Skeleton.Input active size="small" style={{ width: 280, height: 14 }} />
            </div>
          </div>
          <Space size={8}>
            <Skeleton.Button active size="small" style={{ width: 80, height: 32 }} />
            <Skeleton.Button active size="small" style={{ width: 180, height: 32 }} />
          </Space>
        </Flex>
      </Card>

      {/* KPI Metric Cards Skeleton */}
      <Row gutter={[12, 12]}>
        {[1, 2, 3, 4].map((key) => (
          <Col xs={12} sm={6} key={key}>
            <Card size="small" style={{ borderRadius: 10 }}>
              <Skeleton.Input active size="small" style={{ width: 60, height: 12 }} />
              <div style={{ marginTop: 8 }}>
                <Skeleton.Button active size="small" style={{ width: 110, height: 28 }} />
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Main Content / Charts Skeleton */}
      <Row gutter={[12, 12]}>
        <Col xs={24} lg={16}>
          <Card size="small" style={{ borderRadius: 10, minHeight: 280 }}>
            <Flex align="center" justify="space-between" style={{ marginBottom: 16 }}>
              <Skeleton.Input active size="small" style={{ width: 120, height: 18 }} />
              <Skeleton.Button active size="small" style={{ width: 100, height: 24 }} />
            </Flex>
            <Skeleton active paragraph={{ rows: 6 }} title={false} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card size="small" style={{ borderRadius: 10, minHeight: 280 }}>
            <Skeleton.Input active size="small" style={{ width: 100, height: 18, marginBottom: 16 }} />
            <Skeleton active paragraph={{ rows: 6 }} title={false} />
          </Card>
        </Col>
      </Row>
    </Flex>
  );
}

export default PageSkeleton;
