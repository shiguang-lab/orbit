import { useState } from "react";
import { Alert, Button, Card, Flex, Input, Select, Typography } from "antd";
import { useQuery, useMutation } from "@tanstack/react-query";
import { combosApi } from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import { useI18n } from "@/i18n";

const { Title, Text } = Typography;

export default function ComboPlaygroundPage() {
  const { tt } = useI18n();
  const [combo, setCombo] = useState<string>();
  const [prompt, setPrompt] = useState("Hello from the local combo playground");
  const combosQuery = useQuery({ queryKey: ["combos", "playground"], queryFn: combosApi.list });
  const run = useMutation({ mutationFn: () => combosApi.test(combo || "", prompt) });
  if (combosQuery.isLoading) return <PageSkeleton />;
  if (combosQuery.isError) return <Alert type="error" message={tt("组合列表加载失败", "Failed to load combos")} description={String(combosQuery.error)} />;
  const items = combosQuery.data?.combos ?? [];
  return <Flex vertical gap={16}>
    <div><Title level={3} style={{ margin: 0 }}>{tt("组合演练场", "Combo Playground")}</Title><Text type="secondary">{tt("使用真实本地 runtime 测试路由、级联和回退结果。", "Exercise routing, cascade and fallback against the local runtime.")}</Text></div>
    <Card>
      <Flex vertical gap={12}>
        <Select placeholder={tt("选择组合", "Select combo")} value={combo} onChange={setCombo} options={items.map((item) => ({ label: item.name, value: item.name }))} />
        <Input.TextArea rows={5} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        <Button type="primary" onClick={() => run.mutate()} loading={run.isPending} disabled={!combo || !prompt.trim()}>{tt("运行测试", "Run test")}</Button>
        {run.isError && <Alert type="error" message={tt("测试失败", "Test failed")} description={String(run.error)} />}
        {run.data && <pre style={{ margin: 0, whiteSpace: "pre-wrap", overflowX: "auto" }}>{JSON.stringify(run.data, null, 2)}</pre>}
      </Flex>
    </Card>
  </Flex>;
}
