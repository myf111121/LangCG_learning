'use client';

import { BookOpen, CheckCircle2, Clock, ExternalLink, Layers3 } from 'lucide-react';
import { phases, sourceById } from '../curriculum';
import { LessonRow, SourceLink } from './shared';
import type { LearningRecords, MoveWorkspace } from './types';

export function RoadmapView({ records, week, move }: {
  records: LearningRecords;
  week: number;
  move: MoveWorkspace;
}) {
  const phase = phases[week - 1];
  return <>
    <div className="route-tracks"><button className={week <= 6 ? 'active' : ''} onClick={() => move('roadmap', 1)}>W01–06 · Agent 工程</button><button className={week >= 7 && week <= 12 ? 'active' : ''} onClick={() => move('roadmap', 7)}>W07–12 · LangGraph</button><button className={week >= 13 ? 'active' : ''} onClick={() => move('roadmap', 13)}>W13–18 · FastAPI</button><span>{week >= 7 ? '真实 API · 先写代码，再揭示答案与 diff' : '标准库场景 · 网页运行与自动验收'}</span></div>
    <div className="route-strip">{phases.map(item => <button key={item.week} className={week === item.week ? 'selected' : ''} onClick={() => move('roadmap', item.week)}><span>W{String(item.week).padStart(2, '0')}</span><strong>{item.title}</strong>{item.lessons.filter(lesson => records[lesson.id]?.completed).length === 4 && <CheckCircle2 size={16} />}</button>)}</div>
    <section className="surface phase-details">
      <div className="phase-details-heading"><div><span className="small-eyebrow" style={{ color: phase.color }}>WEEK {String(week).padStart(2, '0')}</span><h2>{phase.title}</h2><p>{phase.subtitle}</p></div><span className="plan-chip"><Clock size={15} />阅读 4h + 编码 4h + 实战 4h</span></div>
      <div className="chapter-note"><BookOpen size={16} /><span>{phase.chapters} · 每个任务：阅读约 1h，编码约 1h</span><a href={sourceById(phase.track === 'fastapi' ? 'fa-tutorial' : 'learn').url} target="_blank" rel="noopener noreferrer">查看目录<ExternalLink size={13} /></a></div>
      {phase.lessons.map((lesson, index) => <LessonRow key={lesson.id} lesson={lesson} index={index} records={records} view="roadmap" week={week} />)}
      <div className="milestone"><Layers3 size={23} /><div><small>本周交付</small><strong>{phase.deliverable}</strong></div><button className="solid-button" onClick={() => move('projects', week)}>开始实战验收</button></div>
    </section>
    <div className="reading-tip"><strong>建议的学习方法</strong><p>第 1–6 周用网页测试检查正常路径和边界；第 7–12 周独立编写真实 LangGraph；第 13–18 周按 FastAPI 官方教程完成请求契约、数据库、安全、异步和部署。真实框架任务需要时再揭示正确实现，用逐行 diff 定位理解差异。</p><SourceLink id={phase.track === 'fastapi' ? 'fa-tutorial' : 'migrate'} /></div>
  </>;
}
