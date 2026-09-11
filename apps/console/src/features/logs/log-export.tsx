import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Card, Checkbox, Empty, Flex, Form, Input, InputNumber, Modal, Select, Space, Switch, Tag, Typography, message } from "antd";
import { api } from "@/entities/api";
import { MaterialIcon } from "@/app/nav";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import { useI18n } from "@/i18n";

type Field = { key:string;label:string;type:"text"|"password"|"textarea"|"number"|"boolean";required?:boolean;secret?:boolean;help?:string;placeholder?:string };
type Descriptor = { id:string;label:string;description:string;docsUrl:string|null;fields:Field[] };
type Destination = { id:string;name:string;type:string;enabled:boolean;config:Record<string,unknown>;batchSize:number;includeBodies:boolean;maxBodyBytes:number;maxRowsPerRun:number;cursorRowId:number;exportedTotal:number;lastRunAt:string|null;lastStatus:"success"|"failure"|null;lastError:string|null;pendingRows:number };
type Status = { job:{enabled:boolean;cron:string|null;timezone:string}|null;runs:Array<{id:number;startedAt:string;status:string;recordsAffected:number}>;destinations:Destination[] };
const loadTypes = () => api<{types:Descriptor[]}>("/log-export/types");
const loadStatus = () => api<Status>("/log-export/status");

export function LogExportPage() {
  const { tt } = useI18n(); const qc=useQueryClient(); const [editing,setEditing]=useState<Destination|null|undefined>(); const [form]=Form.useForm();
  const types=useQuery({queryKey:["log-export-types"],queryFn:loadTypes});
  const status=useQuery({queryKey:["log-export-status"],queryFn:loadStatus,refetchInterval:30_000});
  const refresh=()=>qc.invalidateQueries({queryKey:["log-export-status"]});
  const action=useMutation({mutationFn:({id,kind}:{id:string;kind:"run"|"test"|"reset"})=>api(`/log-export/destinations/${id}/${kind}`,{method:"POST"}),onSuccess:(_,v)=>{message.success(v.kind==="test"?tt("连接测试成功","Connection test succeeded"):tt("操作完成","Operation completed"));refresh();},onError:(e:Error)=>message.error(e.message)});
  const remove=useMutation({mutationFn:(id:string)=>api(`/log-export/destinations/${id}`,{method:"DELETE"}),onSuccess:()=>{message.success(tt("目标已删除","Destination deleted"));refresh();},onError:(e:Error)=>message.error(e.message)});
  const selectedType=Form.useWatch("type",form) as string|undefined;
  const descriptor=useMemo(()=>types.data?.types.find(x=>x.id===selectedType),[types.data,selectedType]);
  if(types.isLoading||status.isLoading)return <PageSkeleton/>;
  const open=(item:Destination|null)=>{setEditing(item); const first=types.data?.types[0]?.id; form.setFieldsValue(item?{...item,...item.config}:{type:first,batchSize:500,maxRowsPerRun:10000,maxBodyBytes:262144,includeBodies:false,enabled:false});};
  const save=async()=>{try{const values=await form.validateFields(); const d=types.data?.types.find(x=>x.id===values.type); const config=Object.fromEntries((d?.fields??[]).map(f=>[f.key,values[f.key]]).filter(([,v])=>v!==undefined)); const body={name:values.name,type:values.type,enabled:values.enabled,config,batchSize:values.batchSize,includeBodies:values.includeBodies,maxBodyBytes:values.maxBodyBytes,maxRowsPerRun:values.maxRowsPerRun}; await api(editing?`/log-export/destinations/${editing.id}`:"/log-export/destinations",{method:editing?"PATCH":"POST",body:JSON.stringify(body)}); message.success(tt("导出目标已保存","Export destination saved"));setEditing(undefined);refresh();}catch(e){if(e instanceof Error)message.error(e.message)}};
  return <Flex vertical gap={12}>
    <Card><Flex justify="space-between" align="center" wrap gap={12}><Space><MaterialIcon name="cloud_upload" size={28}/><div><Typography.Title level={4} style={{margin:0}}>{tt("持续日志导出","Continuous log export")}</Typography.Title><Typography.Text type="secondary">{tt("按游标持续将调用日志安全导出到外部分析仓库。","Continuously ship call logs to external analytics stores with a durable cursor.")}</Typography.Text></div></Space><Button type="primary" icon={<MaterialIcon name="add"/>} onClick={()=>open(null)}>{tt("添加","Add")}</Button></Flex></Card>
    <Alert type="info" showIcon message={tt("调度状态","Schedule status")} description={status.data?.job?`${status.data.job.cron} (${status.data.job.timezone}) · ${status.data.job.enabled?tt("已启用","enabled"):tt("已停用","disabled")}`:tt("后台任务尚未初始化","Background job not initialized yet")}/>
    {!status.data?.destinations.length?<Card><Empty description={tt("尚未配置导出目标","No export destinations configured")}/></Card>:status.data.destinations.map(item=><Card key={item.id} title={<Space>{item.name}<Tag>{types.data?.types.find(x=>x.id===item.type)?.label??item.type}</Tag><Tag color={item.enabled?"green":"default"}>{item.enabled?tt("已启用","Enabled"):tt("已停用","Disabled")}</Tag></Space>} extra={<Space><Button onClick={()=>action.mutate({id:item.id,kind:"test"})}>{tt("测试","Test")}</Button><Button onClick={()=>action.mutate({id:item.id,kind:"run"})}>{tt("立即运行","Run now")}</Button><Button onClick={()=>open(item)}>{tt("编辑","Edit")}</Button><Button danger onClick={()=>Modal.confirm({title:tt("删除此导出目标？","Delete this export destination?"),onOk:()=>remove.mutateAsync(item.id)})}>{tt("删除","Delete")}</Button></Space>}>
      <Flex gap={24} wrap><Typography.Text>{tt("待导出","Pending")}: {item.pendingRows}</Typography.Text><Typography.Text>{tt("累计导出","Exported")}: {item.exportedTotal}</Typography.Text><Typography.Text>{tt("上次运行","Last run")}: {item.lastRunAt?new Date(item.lastRunAt).toLocaleString():tt("从未","Never")}</Typography.Text>{item.lastStatus&&<Tag color={item.lastStatus==="success"?"green":"red"}>{item.lastStatus}</Tag>}</Flex>{item.lastError&&<Alert style={{marginTop:12}} type="error" message={item.lastError}/>}<Button type="link" onClick={()=>action.mutate({id:item.id,kind:"reset"})}>{tt("重置游标并重新导出","Reset cursor and re-export")}</Button>
    </Card>)}
    <Modal open={editing!==undefined} title={editing?tt("编辑导出目标","Edit export destination"):tt("添加导出目标","Add export destination")} onCancel={()=>setEditing(undefined)} onOk={save} destroyOnHidden width={680}>
      <Form form={form} layout="vertical"><Form.Item name="name" label={tt("名称","Name")} rules={[{required:true}]}><Input/></Form.Item><Form.Item name="type" label={tt("目标类型","Destination type")} rules={[{required:true}]}><Select disabled={Boolean(editing)} options={types.data?.types.map(x=>({value:x.id,label:x.label}))}/></Form.Item>
      {descriptor?.fields.map(field=><Form.Item key={field.key} name={field.key} label={field.label} extra={field.help} valuePropName={field.type==="boolean"?"checked":"value"} rules={[{required:field.required,message:tt("必填项","Required")}]}> {field.type==="boolean"?<Switch/>:field.type==="number"?<InputNumber style={{width:"100%"}}/>:field.type==="textarea"?<Input.TextArea rows={5} placeholder={field.placeholder}/>:<Input type={field.secret?"password":"text"} placeholder={field.placeholder}/>}</Form.Item>)}
      <Flex gap={12} wrap><Form.Item name="batchSize" label={tt("批大小","Batch size")}><InputNumber min={1} max={10000}/></Form.Item><Form.Item name="maxRowsPerRun" label={tt("单次最大行数","Max rows per run")}><InputNumber min={1} max={1000000}/></Form.Item><Form.Item name="maxBodyBytes" label={tt("正文最大字节数","Max body bytes")}><InputNumber min={1024} max={10485760}/></Form.Item></Flex>
      <Form.Item name="includeBodies" valuePropName="checked"><Checkbox>{tt("包含请求、响应与流水线正文（可能含敏感数据）","Include request, response and pipeline bodies (may contain sensitive data)")}</Checkbox></Form.Item><Form.Item name="enabled" valuePropName="checked"><Checkbox>{tt("保存后启用自动导出","Enable scheduled export after saving")}</Checkbox></Form.Item></Form>
    </Modal>
  </Flex>;
}
export default LogExportPage;
