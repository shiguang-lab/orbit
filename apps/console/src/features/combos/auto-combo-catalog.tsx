import { useState } from "react";
import { Button, Card, Col, Row, Space, Tag, Typography, message, Modal } from "antd";
import { MaterialIcon } from "@/app/nav";
import { AUTO_COMBO_TEMPLATES, type AutoComboTemplate, getStrategyDef, getStrategyColor } from "./constants";
import { combosApi } from "@/entities/api";

const { Text, Title, Paragraph } = Typography;

interface AutoComboCatalogProps {
  onComboCreated?: (comboId: string) => void;
}

export function AutoComboCatalog({ onComboCreated }: AutoComboCatalogProps) {
  const [open, setOpen] = useState(false);
  const [duplicating, setDuplicating] = useState<string | null>(null);

  const handleDuplicate = (tpl: AutoComboTemplate) => {
    Modal.confirm({
      title: `物化自动组合 "${tpl.displayName}"？`,
      content: `这将在数据库中生成一个可手动编辑的静态组合快照 "${tpl.name}"。此快照将保留当前匹配的模型与策略，之后可自由增删模型或调整参数。`,
      okText: "确认物化",
      cancelText: "取消",
      onOk: async () => {
        setDuplicating(tpl.name);
        try {
          const res = await combosApi.duplicate(tpl.name, tpl.strategy);
          message.success(`已成功创建组合 "${res.name}"`);
          if (res.id) {
            onComboCreated?.(String(res.id));
          }
        } catch (err) {
          message.error(err instanceof Error ? err.message : "物化自动组合失败");
        } finally {
          setDuplicating(null);
        }
      },
    });
  };

  return (
    <Card size="small" style={{ borderRadius: 8 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={() => setOpen((prev) => !prev)}
      >
        <Space align="center" size={8}>
          <MaterialIcon name="auto_awesome" size={20} style={{ color: "#8B5CF6" }} />
          <Title level={5} style={{ margin: 0 }}>
            自动路由目录
          </Title>
          <Tag color="purple" style={{ margin: 0, borderRadius: 10 }}>
            {AUTO_COMBO_TEMPLATES.length} 个内置模板
          </Tag>
        </Space>
        <Button
          type="text"
          size="small"
          icon={<MaterialIcon name={open ? "expand_less" : "expand_more"} size={18} />}
        >
          {open ? "收起" : "展开"}
        </Button>
      </div>

      <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 4 }}>
        内置 auto/* 零配置智能路由组合。可以直接在 API 请求中把这些名称作为 model 字段发起调用——无需任何前置设置；也可以点击“生成快照”将其物化为可自定义编辑的组合。
      </Text>

      {open && (
        <div style={{ marginTop: 16 }}>
          <Row gutter={[12, 12]}>
            {AUTO_COMBO_TEMPLATES.map((tpl) => (
              <Col xs={24} sm={12} lg={8} key={tpl.name}>
                <Card
                  size="small"
                  hoverable
                  style={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    borderRadius: 6,
                  }}
                  actions={[
                    <Button
                      key="duplicate"
                      type="link"
                      size="small"
                      loading={duplicating === tpl.name}
                      icon={<MaterialIcon name="content_copy" size={14} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicate(tpl);
                      }}
                    >
                      物化为静态组合
                    </Button>,
                  ]}
                >
                  <div>
                    <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 6 }}>
                      <Text strong style={{ fontSize: 13 }}>
                        {tpl.displayName}
                      </Text>
                      <Tag color={getStrategyColor(tpl.strategy)} style={{ fontSize: 10, margin: 0 }}>
                        {getStrategyDef(tpl.strategy).label}
                      </Tag>
                    </Space>
                    <Paragraph
                      type="secondary"
                      style={{ fontSize: 11, marginBottom: 8, minHeight: 32 }}
                    >
                      {tpl.description || "根据当前可用模型与能力动态调度最优节点"}
                    </Paragraph>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      <Tag style={{ fontSize: 10, margin: 0 }}>
                        <code>{tpl.name}</code>
                      </Tag>
                      {tpl.categories.map((cat) => (
                        <Tag key={cat} color="default" style={{ fontSize: 10, margin: 0 }}>
                          {cat}
                        </Tag>
                      ))}
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      )}
    </Card>
  );
}
