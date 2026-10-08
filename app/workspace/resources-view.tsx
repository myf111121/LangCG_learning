'use client';

import { useState } from 'react';
import { BookOpen, ExternalLink } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { sources } from '../curriculum';
import { SourceLink } from './shared';

export function ResourcesView() {
  const [filter, setFilter] = useState('all');
  const visible = sources.filter(source => filter === 'all' || (filter === 'chinese' ? source.kind === '中文教程' : filter === 'professional' ? source.kind === '专业课程' : source.kind === '官方文档' || source.kind === '版本校准'));

  return <>
    <div className="resource-warning"><BookOpen size={22} /><div><strong>先对照版本，再运行示例</strong><p>LangChain、LangGraph 与 FastAPI 接口都以各自官方文档为准；中文内容只用于辅助理解。Python 实验使用独立虚拟环境，并记录锁定版本。</p></div></div>
    <Tabs value={filter} onValueChange={setFilter}>
      <TabsList className="resource-tabs"><TabsTrigger value="all">全部资料 · {sources.length}</TabsTrigger><TabsTrigger value="official">官方文档</TabsTrigger><TabsTrigger value="chinese">中文教程</TabsTrigger><TabsTrigger value="professional">专业课程</TabsTrigger></TabsList>
      <div className="resource-grid">{visible.map(source => <a className="surface resource-card" key={source.id} href={source.url} target="_blank" rel="noopener noreferrer"><div><span className={'resource-kind ' + (source.kind === '中文教程' ? 'chinese' : '')}>{source.kind}</span><ExternalLink size={16} /></div><h3>{source.title}</h3><p>{source.note}</p><small>{new URL(source.url).hostname}</small></a>)}</div>
    </Tabs>
    <div className="reading-tip"><strong>进阶拓展</strong><p>第 7–12 周完成 LangGraph 实战，第 13–18 周把能力封装为 FastAPI 服务。完成主线后，再扩展 MCP、Deep Agents、异步数据库、任务队列与容器编排；先保留测试、恢复和部署基线。</p><SourceLink id="fa-tutorial" /></div>
  </>;
}
