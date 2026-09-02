import {
  Avatar,
  Button,
  Card,
  Col,
  Flex,
  Form,
  Input,
  Row,
  Tag,
  Typography,
  message,
} from "antd";
import { createStyles } from "antd-style";
import { MaterialIcon } from "@/app/nav";

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
}));

export function ProfilePage() {
  const { styles } = useStyles();
  const [messageApi, contextHolder] = message.useMessage();

  const handleSave = () => {
    messageApi.success("个人偏好与管理员配置已更新");
  };

  return (
    <div className={styles.page}>
      {contextHolder}

      {/* 1. Header Banner */}
      <Card className={styles.headerCard} styles={{ body: { padding: "14px 18px" } }}>
        <Flex justify="space-between" align="center" wrap gap={12}>
          <Flex align="center" gap={12}>
            <Avatar size={48} style={{ background: "#6366f1", fontSize: 20 }}>
              Y
            </Avatar>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  管理员账户与个人偏好
                </Title>
                <Tag color="geekblue">超级管理员</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                管理当前登录账户身份信息、双因子认证 (2FA)、通知偏好与个人主题。
              </Text>
            </div>
          </Flex>

          <Button type="primary" icon={<MaterialIcon name="save" size={16} />} onClick={handleSave}>
            保存修改
          </Button>
        </Flex>
      </Card>

      {/* 2. Form */}
      <Card title="账户基础信息" className={styles.sectionCard} size="small">
        <Form layout="vertical">
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item label="管理员用户名">
                <Input defaultValue="yanxianliang" readOnly />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="电子邮箱">
                <Input defaultValue="admin@orbit.local" />
              </Form.Item>
            </Col>

          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item label="默认工作区模式">
                <Input defaultValue="orbit-gateway (Default Primary)" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="权限角色">
                <Input defaultValue="Full System Root Access" readOnly />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>
    </div>
  );
}

export default ProfilePage;
