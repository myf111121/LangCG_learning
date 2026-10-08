'use client';

import { useState } from 'react';
import { Brain, Check, Code2, Copy, Download, FlaskConical, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { approvalCode, phases, sourceById } from '../curriculum';
import { download } from './shared';
import type { LearningRecords, MoveWorkspace, NoteEditorRenderer, SaveLearningRecord } from './types';

export function ProjectsView({ records, week, move, canSave, save, noteEditor }: {
  records: LearningRecords;
  week: number;
  move: MoveWorkspace;
  canSave: boolean;
  save: SaveLearningRecord;
  noteEditor: NoteEditorRenderer;
}) {
  const [approval, setApproval] = useState<'idle' | 'paused' | 'approved' | 'rejected'>('idle');
  const [labChecks, setLabChecks] = useState<Record<string, boolean>>({});

  return <>
    <div className="project-banner"><FlaskConical size={28} /><div><span className="small-eyebrow">CAPSTONE / 主线项目</span><h2>知识库助手与多用户 API</h2><p>先完成检索、审批与记忆，再用 FastAPI 加入持久化、安全、异步能力和生产交付。</p></div><span>Agent v0.1 — API v1.0</span></div>
    <Tabs value={String(week)} onValueChange={value => move('projects', Number(value))}>
      <TabsList className="week-tabs">{phases.map(phase => <TabsTrigger key={phase.week} value={String(phase.week)}>第 {phase.week} 周</TabsTrigger>)}</TabsList>
      {phases.map(phase => <TabsContent key={phase.week} value={String(phase.week)}><section className="surface lab-panel">
        <div className="panel-title"><h2>{phase.deliverable}</h2><span>建议 4h</span></div>
        <p className="body-copy">{phase.lab}</p><h3 className="minor-heading">交付验收</h3>
        <div className="checklist">{phase.labChecks.map((check, index) => <label key={check}><Checkbox checked={labChecks[`lab-${phase.week}-${index}`] ?? !!records[`lab-${phase.week}`]?.completed} onCheckedChange={value => setLabChecks(previous => ({ ...previous, [`lab-${phase.week}-${index}`]: value === true }))} /><span>{check}</span></label>)}</div>
        <div className="lab-actions"><p>勾选代表你已在自己的项目中验证，并保留了结果。</p><button className="solid-button" disabled={!canSave || (!records[`lab-${phase.week}`]?.completed && !phase.labChecks.every((_, index) => labChecks[`lab-${phase.week}-${index}`]))} onClick={() => void save(`lab-${phase.week}`, { completed: !records[`lab-${phase.week}`]?.completed })}><Check size={15} />{records[`lab-${phase.week}`]?.completed ? '重新打开验收' : '完成本周验收'}</button></div>
        {noteEditor(`lab-${phase.week}`, '项目实验记录')}
      </section></TabsContent>)}
    </Tabs>
    <section className="surface demo-panel">
      <div className="panel-title"><div><span className="small-eyebrow">CONCEPT LAB / 第 3 周</span><h2>人工审批，亲自走一遍</h2></div><span className="demo-tag">交互示意</span></div>
      <p className="body-copy">下方模拟“准备 → 暂停 → 批准或拒绝”的状态变化。实际 LangGraph 执行请下载 Python 示例。</p>
      <div className="flow-diagram"><span className={approval === 'idle' ? 'active' : ''}><Code2 size={17} />准备草稿</span><i /><span className={approval === 'paused' ? 'active' : ''}><Brain size={17} />等待审批</span><i /><span className={approval === 'approved' || approval === 'rejected' ? 'active' : ''}><Check size={17} />{approval === 'rejected' ? '拒绝，结束' : '批准，结束'}</span></div>
      <div className="demo-state" aria-live="polite"><code>{approval === 'idle' ? 'state = { draft: "保存一条知识" }' : approval === 'paused' ? '__interrupt__ = { draft: "保存一条知识" }' : approval === 'approved' ? 'Command(resume=True) → result: 已批准' : 'Command(resume=False) → result: 已拒绝'}</code></div>
      <div className="demo-actions">{approval === 'idle' ? <button className="solid-button" onClick={() => setApproval('paused')}>执行到审批节点</button> : approval === 'paused' ? <><button className="solid-button" onClick={() => setApproval('approved')}>批准并恢复</button><button className="outline-button" onClick={() => setApproval('rejected')}>拒绝并结束</button></> : <button className="outline-button" onClick={() => setApproval('idle')}><RotateCcw size={15} />重新实验</button>}</div>
      <details className="code-details"><summary>查看可运行的 Python 示例</summary><div className="code-toolbar"><span>approval_demo.py · 无需 API Key</span><button onClick={() => { void navigator.clipboard.writeText(approvalCode).then(() => toast.success('代码已复制')).catch(() => toast.error('复制失败，请下载代码。')); }}><Copy size={14} />复制</button><button onClick={() => download('approval_demo.py', approvalCode)}><Download size={14} />下载</button></div><pre><code>{approvalCode}</code></pre><p>内存 checkpoint 用于演示；跨进程恢复请换用持久化后端。<a href={sourceById('interrupt').url} target="_blank" rel="noopener noreferrer">查看官方说明</a></p></details>
    </section>
  </>;
}
