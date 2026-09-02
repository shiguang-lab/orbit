import { Card, Alert, Typography } from "antd";
import { MaterialIcon } from "@/app/nav";
import { useI18n } from "@/i18n";

interface Props {
  providerId: string;
}

export function SearchProviderCard({ providerId }: Props) {
  const { t } = useI18n();

  return (
    <Card style={{ marginBottom: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <MaterialIcon name="search" size={20} style={{ color: "var(--ant-color-primary)" }} />
        <Typography.Title level={5} style={{ margin: 0 }}>
          {t("providers.searchProvider", "搜索服务商")}
        </Typography.Title>
      </div>

      <Typography.Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 12 }}>
        {t(
          "providers.searchProviderDesc",
          "此提供者仅提供搜索或网页抓取服务，不包含大语言模型目录。所有请求通过 /v1/search 或网页工具路由处理。"
        )}
      </Typography.Paragraph>

      {providerId === "perplexity-search" && (
        <Alert
          type="info"
          showIcon
          icon={<MaterialIcon name="link" size={16} />}
          message={t(
            "providers.perplexitySearchSharedKeyInfo",
            "Perplexity Search 共享使用 Perplexity 的 API Key 进行在线搜索。"
          )}
          style={{ marginTop: 12 }}
        />
      )}

      {providerId === "google-pse-search" && (
        <Alert
          type="warning"
          showIcon
          icon={<MaterialIcon name="tune" size={16} />}
          message={t(
            "providers.googlePseInfo",
            "Google Programmable Search Engine (PSE) 需要配置搜索引擎 ID (cx) 及 Google Custom Search API Key。"
          )}
          style={{ marginTop: 12 }}
        />
      )}

      {providerId === "searxng-search" && (
        <Alert
          type="success"
          showIcon
          icon={<MaterialIcon name="dns" size={16} />}
          message={t(
            "providers.searxngInfo",
            "SearXNG 是一款开源隐私元搜索引擎，请输入您自托管的 SearXNG 实例 URL。"
          )}
          style={{ marginTop: 12 }}
        />
      )}
    </Card>
  );
}
