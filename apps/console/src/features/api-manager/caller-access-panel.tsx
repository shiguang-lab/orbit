import { Alert, Button, Descriptions, Drawer, Empty, Flex, Form, Input, Radio, Tag, Typography, theme } from "antd";
import dayjs from "dayjs";
import type { ApiKeyView } from "@/entities/api";
import { useI18n } from "@/i18n";
import { MaterialIcon } from "@/app/nav";
import { callerClientName, isCallerIpRuleValid, parseCallerIpRules } from "./caller-access";

const { Text, Paragraph } = Typography;

export function CallerAccessFields() {
  const { tt } = useI18n();
  const { token } = theme.useToken();
  const form = Form.useFormInstance();
  const mode = Form.useWatch("ipAccessMode", form) ?? "all";
  const noLog = Form.useWatch("noLog", form);
  const rules = parseCallerIpRules(Form.useWatch("ipAllowlist", form));
  return (
    <section style={{ border: `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadiusLG, padding: 20, marginBottom: 20 }}>
      <Flex gap={10} align="center" style={{ marginBottom: 8 }}>
        <MaterialIcon name="verified_user" size={20} style={{ color: token.colorPrimary }} />
        <Text strong>{tt("调用方访问控制", "Caller access")}</Text>
      </Flex>
      <Paragraph type="secondary" style={{ marginBottom: 16 }}>
        {tt("决定哪些网络地址可以使用此密钥，与模型权限同时生效。", "Choose which network addresses can use this key, alongside its model permissions.")}
      </Paragraph>
      <Form.Item name="ipAccessMode" label={tt("IP 访问范围", "IP access")} initialValue="all" style={{ marginBottom: mode === "restricted" ? 16 : 8 }}>
        <Radio.Group options={[
          { value: "all", label: tt("不限制 IP", "Any IP") },
          { value: "restricted", label: tt("仅允许指定 IP", "Specified IPs only") },
        ]} />
      </Form.Item>
      {mode === "restricted" ? (
        <Form.Item
          name="ipAllowlist"
          label={tt("允许的 IP 或网段", "Allowed IPs or networks")}
          validateTrigger="onBlur"
          rules={[{ validator: async (_, value) => {
            const entries = parseCallerIpRules(value);
            if (!entries.length) throw new Error(tt("请至少填写一个 IP 或网段，或选择「不限制 IP」。", "Add at least one IP or network, or select Any IP."));
            if (entries.length > 100) throw new Error(tt("最多支持 100 条规则。", "Up to 100 rules are supported."));
            const invalid = entries.filter((entry) => !isCallerIpRuleValid(entry));
            if (invalid.length) throw new Error(`${tt("格式不正确", "Invalid format")}: ${invalid.slice(0, 3).join(", ")}`);
          } }]}
          extra={<Flex justify="space-between" wrap gap={4}><span>{tt("每行一条；支持 IPv4、IPv6、CIDR，也可粘贴逗号分隔的地址。", "One per line. Supports IPv4, IPv6, CIDR and comma-separated addresses.")}</span><span>{tt(`${rules.length} / 100 条`, `${rules.length} / 100 rules`)}</span></Flex>}
        >
          <Input.TextArea autoSize={{ minRows: 4, maxRows: 8 }} style={{ fontFamily: "monospace" }} placeholder={"192.0.2.10\n198.51.100.0/24\n2001:db8::/32"} />
        </Form.Item>
      ) : <Paragraph type="secondary">{tt("持有有效密钥的调用方可从任意 IP 发起请求。", "Callers with a valid key can connect from any IP.")}</Paragraph>}
      <Flex gap={8} align="flex-start" style={{ paddingTop: 12, borderTop: `1px solid ${token.colorBorderSecondary}`, color: token.colorTextSecondary }}>
        <MaterialIcon name={noLog ? "visibility_off" : "history"} size={18} />
        <Text type="secondary">{noLog
          ? tt("已开启免日志：保存后将清除已有来源，并停止记录。IP 限制仍然生效。", "No-log is enabled: saving clears the recorded source and stops recording. IP restrictions still apply.")
          : tt("最近一次调用的 IP、客户端和时间会显示在调用来源中。", "The latest caller IP, client and time appear in Caller source.")}</Text>
      </Flex>
    </section>
  );
}

export function CallerSourceDrawer({ apiKey, onClose, onEdit }: { apiKey: ApiKeyView | null; onClose: () => void; onEdit: (key: ApiKeyView) => void }) {
  const { tt } = useI18n();
  const { token } = theme.useToken();
  return (
    <Drawer open={Boolean(apiKey)} onClose={onClose} title={tt("调用来源", "Caller source")} width={480} styles={{ wrapper: { maxWidth: "100vw" } }}
      footer={apiKey && <Button block onClick={() => onEdit(apiKey)} icon={<MaterialIcon name="tune" size={18} />}>{tt("编辑访问控制", "Edit access controls")}</Button>}>
      {apiKey && <Flex vertical gap={24}>
        <Flex vertical gap={4}><Text strong style={{ fontSize: 18, overflowWrap: "anywhere" }}>{apiKey.name}</Text><Text type="secondary">{tt("最近一次通过密钥鉴权和 IP 校验的请求", "Latest request passing key authentication and IP checks")}</Text></Flex>
        {apiKey.noLog ? <Alert type="info" showIcon title={tt("来源记录已关闭", "Source recording disabled")} description={tt("此密钥已开启免日志，不保留调用方信息。", "This key uses no-log mode and does not retain caller information.")} /> : apiKey.lastClientAt ? <>
          <Descriptions column={1} layout="vertical" items={[
            { key: "client", label: tt("客户端", "Client"), children: <Text strong>{callerClientName(apiKey.lastClientUserAgent) || tt("未知客户端", "Unknown client")}</Text> },
            { key: "ip", label: tt("来源 IP", "Source IP"), children: <Text code copyable={Boolean(apiKey.lastClientIp)}>{apiKey.lastClientIp || "—"}</Text> },
            { key: "time", label: tt("最近调用时间", "Last request"), children: dayjs(apiKey.lastClientAt).format("YYYY-MM-DD HH:mm:ss") },
            { key: "ua", label: "User-Agent", children: <Text style={{ wordBreak: "break-all", fontFamily: "monospace" }}>{apiKey.lastClientUserAgent || "—"}</Text> },
          ]} />
          <Text type="secondary">{tt("客户端名称根据 User-Agent 识别，由调用方上报；此记录不代表模型调用成功。", "Client names are inferred from caller-reported User-Agent. This record does not imply a successful model response.")}</Text>
        </> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={tt("尚无调用记录。此密钥发起请求后，来源将显示在这里。", "No caller recorded yet. The source will appear after this key makes a request.")} />}
        <Flex vertical gap={12} style={{ borderTop: `1px solid ${token.colorBorderSecondary}`, paddingTop: 20 }}>
          <Text strong>{tt("IP 访问范围", "IP access")}</Text>
          {apiKey.ipAllowlist?.length ? <Flex wrap gap={8}>{apiKey.ipAllowlist.map((rule) => <Tag key={rule} style={{ margin: 0, fontFamily: "monospace", whiteSpace: "normal", overflowWrap: "anywhere" }}>{rule}</Tag>)}</Flex> : <Text type="secondary">{tt("不限制 IP", "Any IP")}</Text>}
        </Flex>
      </Flex>}
    </Drawer>
  );
}
