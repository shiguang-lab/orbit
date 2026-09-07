import { useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  Divider,
  Flex,
  Form,
  Input,
  Modal,
  Progress,
  Row,
  Tag,
  Typography,
  message,
} from "antd";
import { createStyles } from "antd-style";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import { gamificationApi, settingsApi, type BadgeItem } from "@/entities/api";
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
  sectionCard: {
    borderRadius: 8,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  levelBox: {
    width: 56,
    height: 56,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 24,
    fontWeight: 900,
    background: "linear-gradient(135deg, #6366f1, #a855f7)",
    color: "#fff",
    boxShadow: "0 4px 12px rgba(99, 102, 241, 0.28)",
    flexShrink: 0,
  },
  badgeCard: {
    borderRadius: 8,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgElevated,
    padding: "12px 14px",
    cursor: "pointer",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    position: "relative",
    overflow: "hidden",
    transition: "all 0.2s ease",
    "&:hover": {
      borderColor: token.colorPrimary,
      transform: "translateY(-2px)",
      boxShadow: token.boxShadowTertiary,
    },
  },
  badgeCardLocked: {
    opacity: 0.55,
    filter: "grayscale(75%)",
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    overflow: "hidden",
  },
}));

// Lucide icon name to Material Symbol font name mapping
const BADGE_ICONS: Record<string, string> = {
  sparkles: "auto_awesome",
  zap: "bolt",
  cpu: "memory",
  whale: "water",
  gift: "redeem",
  heart: "favorite",
  santa: "celebration",
  trophy: "emoji_events",
  compass: "explore",
  languages: "translate",
  blocks: "widgets",
  gauge: "speed",
  shield: "shield",
  flame: "local_fire_department",
  sword: "swords",
  crown: "workspace_premium",
  infinity: "all_inclusive",
  rocket: "rocket_launch",
  bug: "bug_report",
  "git-merge": "merge",
  medal: "military_tech",
  question: "help",
};

const RARITY_CONFIG: Record<string, { color: string; labelZh: string; labelEn: string }> = {
  common: { color: "default", labelZh: "普通", labelEn: "Common" },
  uncommon: { color: "green", labelZh: "罕见", labelEn: "Uncommon" },
  rare: { color: "blue", labelZh: "稀有", labelEn: "Rare" },
  epic: { color: "purple", labelZh: "史诗", labelEn: "Epic" },
  legendary: { color: "gold", labelZh: "传说", labelEn: "Legendary" },
};

const BADGE_ZH_DICT: Record<string, { name: string; description: string; criteria?: string }> = {
  "first-token": {
    name: "首个 Token",
    description: "完成了您的首次 API 请求",
    criteria: "通过 智枢 完成您的首次 API 请求。",
  },
  "token-consumer": {
    name: "Token 消费者",
    description: "完成了 1,000 次 API 请求",
    criteria: "通过 智枢 完成 1,000 次 API 请求。",
  },
  "token-machine": {
    name: "Token 机器",
    description: "完成了 10,000 次 API 请求",
    criteria: "通过 智枢 完成 10,000 次 API 请求。",
  },
  "token-whale": {
    name: "Token 巨鲸",
    description: "完成了 100,000 次 API 请求",
    criteria: "通过 智枢 完成 100,000 次 API 请求。",
  },
  "generous": {
    name: "慷慨分享",
    description: "与他人分享了 1,000 个 Token",
    criteria: "与其他用户累计分享 1,000 个 Token。",
  },
  "philanthropist": {
    name: "慈善家",
    description: "与他人分享了 10,000 个 Token",
    criteria: "与其他用户累计分享 10,000 个 Token。",
  },
  "token-santa": {
    name: "Token 圣诞老人",
    description: "与他人分享了 100,000 个 Token",
    criteria: "与其他用户累计分享 100,000 个 Token。",
  },
  "community-hero": {
    name: "社区英雄",
    description: "与他人分享了 1,000,000 个 Token",
    criteria: "与其他用户累计分享 1,000,000 个 Token。",
  },
  "explorer": {
    name: "探索者",
    description: "使用了 5 个不同的提供商",
    criteria: "使用至少 5 个不同的 AI 提供商。",
  },
  "polyglot": {
    name: "多语通",
    description: "使用了 10 个不同的模型",
    criteria: "使用至少 10 个不同的 AI 模型。",
  },
  "architect": {
    name: "架构师",
    description: "创建了 3 个组合路由",
    criteria: "创建 3 个组合路由。",
  },
  "speedster": {
    name: "极速者",
    description: "在 100 次请求中平均延迟 <500ms",
    criteria: "在 100 次请求中保持平均延迟低于 500 毫秒。",
  },
  "resilient": {
    name: "坚韧不拔",
    description: "连续 7 天保持 100% 正常运行",
    criteria: "连续 7 天保持 100% 的正常运行时间。",
  },
  "radar-supporter": {
    name: "雷达支持者",
    description: "验证了实时 Radar 支持者源",
    criteria: "验证已签名的实时 Radar 支持者数据源。",
  },
  "daily-user": {
    name: "每日用户",
    description: "连续 3 天活跃运行",
    criteria: "连续 3 天使用 智枢。",
  },
  "weekly-warrior": {
    name: "每周勇士",
    description: "连续 7 天活跃运行",
    criteria: "连续 7 天使用 智枢。",
  },
  "monthly-master": {
    name: "每月大师",
    description: "连续 30 天活跃运行",
    criteria: "连续 30 天使用 智枢。",
  },
  "unstoppable": {
    name: "势不可挡",
    description: "连续 365 天持续活跃",
    criteria: "连续 365 天持续使用 智枢。",
  },
  "early-adopter": {
    name: "早期采用者",
    description: "在功能推出的首月内加入",
    criteria: "在游戏化推出后的首月内加入。",
  },
  "bug-hunter": {
    name: "Bug 猎手",
    description: "成功报告了 5 个有效问题",
    criteria: "报告 5 个有效系统问题。",
  },
  "contributor": {
    name: "贡献者",
    description: "合并了 1 个拉取请求",
    criteria: "将 1 个拉取请求合并到系统中。",
  },
  "community-leader": {
    name: "社区领袖",
    description: "在任意排行榜中进入前 10 名",
    criteria: "在任意排行榜中进入前 10 名。",
  },
  "secret-badge": {
    name: "???",
    description: "一个隐藏成就等待解锁...",
    criteria: "完成隐藏成就以揭晓此徽章。",
  },
};

function getTierInfo(level: number, tt: (zh: string, en: string) => string) {
  if (level >= 40) return { name: tt("钻石段位", "Diamond Tier"), color: "cyan" };
  if (level >= 30) return { name: tt("白金段位", "Platinum Tier"), color: "purple" };
  if (level >= 20) return { name: tt("黄金段位", "Gold Tier"), color: "gold" };
  if (level >= 10) return { name: tt("白银段位", "Silver Tier"), color: "blue" };
  return { name: tt("青铜段位", "Bronze Tier"), color: "default" };
}

function getLevelTitle(level: number, tt: (zh: string, en: string) => string) {
  if (level >= 40) return tt("传奇宗师", "Grandmaster");
  if (level >= 30) return tt("专家级架构师", "Principal Architect");
  if (level >= 20) return tt("系统架构师", "System Architect");
  if (level >= 10) return tt("资深工程师", "Senior Engineer");
  return tt("初级开发者", "Junior Developer");
}

export function ProfilePage() {
  const { styles } = useStyles();
  const { isZh, tt } = useI18n();
  const [messageApi, contextHolder] = message.useMessage();
  const [selectedBadge, setSelectedBadge] = useState<BadgeItem | null>(null);
  const [passwordForm] = Form.useForm();

  const levelQuery = useQuery({
    queryKey: ["gamification-level"],
    queryFn: gamificationApi.getLevel,
  });

  const badgesQuery = useQuery({
    queryKey: ["gamification-badges"],
    queryFn: gamificationApi.getBadges,
  });

  const earnedQuery = useQuery({
    queryKey: ["gamification-earned"],
    queryFn: gamificationApi.getEarnedBadges,
  });

  const changePasswordMutation = useMutation({
    mutationFn: (values: any) => settingsApi.changePassword(values.newPassword),
    onSuccess: () => {
      messageApi.success(tt("管理员主密码更新成功", "Management password updated successfully"));
      passwordForm.resetFields();
    },
    onError: () => messageApi.error(tt("更新主密码失败", "Failed to update password")),
  });

  if (levelQuery.isLoading || badgesQuery.isLoading || earnedQuery.isLoading) {
    return <PageSkeleton />;
  }

  const levelInfo = levelQuery.data?.level || { currentLevel: 1, totalXp: 0, apiKeyId: "admin", updatedAt: "" };
  const allBadges = badgesQuery.data?.badges || [];
  const earnedBadges = earnedQuery.data?.badges || [];
  const earnedSet = new Set(earnedBadges.map((b) => b.badgeId));

  const level = levelInfo.currentLevel;
  const totalXp = levelInfo.totalXp;
  const xpForCurrent = (level - 1) * (level - 1) * 50;
  const xpForNext = level * level * 50;
  const xpInLevel = Math.max(0, totalXp - xpForCurrent);
  const xpNeeded = Math.max(1, xpForNext - xpForCurrent);
  const pct = Math.min(100, Math.round((xpInLevel / xpNeeded) * 100));
  const tier = getTierInfo(level, tt);
  const levelTitle = getLevelTitle(level, tt);

  const getBadgeDisplay = (badge: BadgeItem) => {
    const zh = BADGE_ZH_DICT[badge.id];
    const name = isZh && zh ? zh.name : badge.name;
    const description = isZh && zh ? zh.description : badge.description;
    const criteria = isZh && zh?.criteria ? zh.criteria : badge.description;
    const iconName = BADGE_ICONS[badge.icon] || "military_tech";
    return { name, description, criteria, iconName };
  };

  const selectedDisplay = selectedBadge ? getBadgeDisplay(selectedBadge) : null;

  return (
    <div className={styles.page}>
      {contextHolder}

      {/* 1. Header Banner */}
      <Card className={styles.headerCard} styles={{ body: { padding: "12px 16px" } }}>
        <Flex justify="space-between" align="center" wrap gap={12}>
          <Flex align="center" gap={12}>
            <Avatar size={46} style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)", fontSize: 18, fontWeight: 700 }}>
              A
            </Avatar>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  {tt("个人中心与成就", "Admin Profile & Achievements")}
                </Title>
                <Tag color="geekblue">{tt("超级管理员", "Root Administrator")}</Tag>
                <Tag color="gold">Lv.{level}</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt(
                  "查看当前网关操作员经验等级、勋章成就收集进度、会话凭证状态与管理密码维护。",
                  "Track developer level, earned badge collection, active credentials, and admin security settings."
                )}
              </Text>
            </div>
          </Flex>
        </Flex>
      </Card>

      {/* 2. Level & XP Progress Card */}
      <Card className={styles.sectionCard} size="small">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={7}>
            <Flex align="center" gap={12}>
              <div className={styles.levelBox}>
                {level}
              </div>
              <div>
                <Text strong style={{ fontSize: 15, display: "block" }}>
                  {levelTitle}
                </Text>
                <Tag color={tier.color} style={{ marginTop: 4 }}>
                  {tier.name}
                </Tag>
              </div>
            </Flex>
          </Col>

          <Col xs={24} md={17}>
            <Flex justify="space-between" style={{ fontSize: 12, marginBottom: 4 }}>
              <Text type="secondary">
                {tt(`升级进度 (目标 Lv.${level + 1})`, `Level Progress (Target Lv.${level + 1})`)}
              </Text>
              <Text strong style={{ fontFamily: "monospace" }}>
                {xpInLevel.toLocaleString()} / {xpNeeded.toLocaleString()} XP ({pct}%)
              </Text>
            </Flex>
            <Progress percent={pct} strokeColor={{ "0%": "#6366f1", "100%": "#a855f7" }} />
            <Flex justify="space-between" style={{ fontSize: 11, color: "var(--ant-color-text-secondary)", marginTop: 4 }}>
              <span>{tt(`累计获取经验: ${totalXp.toLocaleString()} XP`, `Total XP: ${totalXp.toLocaleString()} XP`)}</span>
              <span>🔥 {tt("连续活跃 7 天", "7-Day Active Streak")}</span>
            </Flex>
          </Col>
        </Row>
      </Card>

      {/* 3. Badges Collection */}
      <Card
        title={
          <Flex justify="space-between" align="center">
            <Flex align="center" gap={8}>
              <MaterialIcon name="military_tech" size={18} />
              <span>{tt("荣誉勋章与成就收集", "Earned Badges & Milestones")}</span>
            </Flex>
            <Tag color="cyan">
              {tt(`已解锁 ${earnedSet.size} / ${allBadges.length} 项`, `${earnedSet.size} / ${allBadges.length} Unlocked`)}
            </Tag>
          </Flex>
        }
        className={styles.sectionCard}
        size="small"
      >
        <Row gutter={[12, 12]}>
          {allBadges.map((b) => {
            const isEarned = earnedSet.has(b.id);
            const rarityConf = RARITY_CONFIG[b.rarity] || { color: "default", labelZh: b.rarity, labelEn: b.rarity };
            const display = getBadgeDisplay(b);

            return (
              <Col xs={24} sm={12} md={6} key={b.id}>
                <div
                  className={`${styles.badgeCard} ${!isEarned ? styles.badgeCardLocked : ""}`}
                  onClick={() => setSelectedBadge(b)}
                >
                  <Flex align="flex-start" gap={10}>
                    <div
                      className={styles.iconBox}
                      style={{
                        background: isEarned ? "rgba(99, 102, 241, 0.15)" : "rgba(100, 116, 139, 0.12)",
                        color: isEarned ? "#6366f1" : "inherit",
                      }}
                    >
                      <MaterialIcon name={display.iconName} size={20} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Flex justify="space-between" align="center" style={{ marginBottom: 2 }}>
                        <Text strong style={{ fontSize: 13 }} ellipsis>
                          {display.name}
                        </Text>
                        <Tag color={rarityConf.color} style={{ margin: 0, fontSize: 10 }}>
                          {isZh ? rarityConf.labelZh : rarityConf.labelEn}
                        </Tag>
                      </Flex>
                      <Text type="secondary" style={{ fontSize: 11, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.4 }}>
                        {display.description}
                      </Text>
                    </div>
                  </Flex>
                  <Flex justify="flex-end" style={{ marginTop: 8 }}>
                    <Tag color={isEarned ? "green" : "default"} style={{ margin: 0, fontSize: 10 }}>
                      {isEarned ? tt("已获得", "Unlocked") : tt("未解锁", "Locked")}
                    </Tag>
                  </Flex>
                </div>
              </Col>
            );
          })}
        </Row>
      </Card>

      {/* 4. Credentials & Security Management */}
      <Row gutter={[12, 12]}>
        <Col xs={24} md={12}>
          <Card title={tt("重置管理员主密码", "Update Admin Password")} className={styles.sectionCard} size="small" style={{ height: "100%" }}>
            <Form form={passwordForm} layout="vertical" onFinish={(v) => changePasswordMutation.mutate(v)}>
              <Form.Item
                label={tt("新管理密码", "New Password")}
                name="newPassword"
                rules={[{ required: true, min: 6, message: tt("密码至少需包含 6 个字符", "Password must be at least 6 characters") }]}
              >
                <Input.Password placeholder="••••••••" />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={changePasswordMutation.isPending} icon={<MaterialIcon name="key" size={14} />}>
                {tt("更新密码", "Update Password")}
              </Button>
            </Form>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card title={tt("当前账户身份与权限概览", "Account & Workspace Details")} className={styles.sectionCard} size="small" style={{ height: "100%" }}>
            <Flex vertical gap={10}>
              <Flex justify="space-between" align="center">
                <Text type="secondary">{tt("用户名 / 身份", "Username / Identity")}:</Text>
                <Text strong>admin</Text>
              </Flex>
              <Divider style={{ margin: "2px 0" }} />
              <Flex justify="space-between" align="center">
                <Text type="secondary">{tt("安全权限级别", "Role")}:</Text>
                <Tag color="green">{tt("超级管理员全权访问", "Full Root Access")}</Tag>
              </Flex>
              <Divider style={{ margin: "2px 0" }} />
              <Flex justify="space-between" align="center">
                <Text type="secondary">{tt("会话保持状态", "Session Status")}:</Text>
                <Badge status="processing" text={tt("活跃（Cookie 鉴权生效中）", "Active (Cookie Authenticated)")} />
              </Flex>
            </Flex>
          </Card>
        </Col>
      </Row>

      {/* Badge Detail Modal */}
      <Modal
        title={
          selectedDisplay ? (
            <Flex align="center" gap={8}>
              <MaterialIcon name={selectedDisplay.iconName} size={20} style={{ color: "#6366f1" }} />
              <span>{selectedDisplay.name}</span>
            </Flex>
          ) : null
        }
        open={Boolean(selectedBadge)}
        onCancel={() => setSelectedBadge(null)}
        footer={[
          <Button key="close" type="primary" onClick={() => setSelectedBadge(null)}>
            {tt("关闭", "Close")}
          </Button>,
        ]}
      >
        {selectedBadge && selectedDisplay && (
          <Flex vertical gap={12} style={{ padding: "8px 0" }}>
            <Flex justify="space-between" align="center">
              <Text strong>{tt("稀有度级别", "Rarity")}:</Text>
              <Tag color={RARITY_CONFIG[selectedBadge.rarity]?.color || "default"}>
                {isZh ? RARITY_CONFIG[selectedBadge.rarity]?.labelZh : RARITY_CONFIG[selectedBadge.rarity]?.labelEn}
              </Tag>
            </Flex>
            <Flex justify="space-between" align="center">
              <Text strong>{tt("解锁状态", "Status")}:</Text>
              <Tag color={earnedSet.has(selectedBadge.id) ? "green" : "default"}>
                {earnedSet.has(selectedBadge.id) ? tt("已解锁", "Unlocked") : tt("未解锁", "Locked")}
              </Tag>
            </Flex>
            <div>
              <Text strong>{tt("勋章描述与解锁条件", "Criteria")}:</Text>
              <p style={{ marginTop: 4, color: "var(--ant-color-text-secondary)" }}>{selectedDisplay.criteria}</p>
            </div>
          </Flex>
        )}
      </Modal>
    </div>
  );
}

export default ProfilePage;
