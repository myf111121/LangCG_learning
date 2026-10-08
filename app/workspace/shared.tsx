'use client';

import type { Dispatch, SetStateAction } from 'react';
import { BookOpen, Brain, Check, Clock, Cloud, ExternalLink, FlaskConical, Library, LoaderCircle, Network, NotebookPen, RotateCcw, Route } from 'lucide-react';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { allLessons, courseWeeks, phases, sourceById, type Lesson } from '../curriculum';
import { lessonHref, type WorkspaceView } from '../learning-navigation';
import type { LearningRecords, MoveWorkspace, SaveLearningRecord } from './types';

export const navigation = [
  { id: 'today', label: '今日学习', icon: BookOpen },
  { id: 'roadmap', label: '学习路线', icon: Route },
  { id: 'projects', label: '实战项目', icon: FlaskConical },
  { id: 'quiz', label: '知识自测', icon: Brain },
  { id: 'resources', label: '资料库', icon: Library },
  { id: 'notes', label: '学习笔记', icon: NotebookPen },
] satisfies Array<{ id: WorkspaceView; label: string; icon: typeof Network }>;

export function StudyNavigation({ view, onNavigate }: { view: WorkspaceView; onNavigate: MoveWorkspace }) {
  const { setOpenMobile } = useSidebar();
  return <SidebarMenu>{navigation.map(item => <SidebarMenuItem key={item.id}>
    <SidebarMenuButton
      isActive={view === item.id}
      onClick={() => { onNavigate(item.id); setOpenMobile(false); }}
      className="nav-button"
    >
      <item.icon />
      <span>{item.label}</span>
      {item.id === 'roadmap' && <small>{String(courseWeeks).padStart(2, '0')}</small>}
    </SidebarMenuButton>
  </SidebarMenuItem>)}</SidebarMenu>;
}

export function GraphPreview() {
  return <svg viewBox="0 0 340 174" className="graph-preview" role="img" aria-label="Agent 执行循环：输入到 Agent，Agent 调用工具，工具结果回到 Agent">
    <path d="M60 86H113M181 86H233M267 103V137H147V103M147 69V35H267V69" fill="none" stroke="#7e789e" strokeWidth="1.5" />
    <circle cx="45" cy="86" r="16" fill="#302c48" stroke="#918bb0" />
    <text x="45" y="91" textAnchor="middle">IN</text>
    <rect x="111" y="64" width="72" height="44" rx="10" fill="#d4ef92" />
    <text x="147" y="90" textAnchor="middle" style={{ fill: '#282b20', fontWeight: 600 }}>Agent</text>
    <rect x="231" y="64" width="72" height="44" rx="10" fill="#38314f" stroke="#918bb0" />
    <text x="267" y="90" textAnchor="middle">Tools</text>
    <text x="202" y="27" textAnchor="middle">tool call</text>
    <text x="200" y="157" textAnchor="middle">tool result</text>
    <circle cx="78" cy="86" r="3" fill="#d4ef92" />
  </svg>;
}

export function SourceLink({ id }: { id: string }) {
  const source = sourceById(id);
  return <a className="source-link" href={source.url} target="_blank" rel="noopener noreferrer">
    <span><small>{source.kind}</small>{source.title}</span><ExternalLink size={15} />
  </a>;
}

export function download(name: string, content: string, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function LessonRow({ lesson, index, records, view, week }: {
  lesson: Lesson;
  index: number;
  records: LearningRecords;
  view: WorkspaceView;
  week: number;
}) {
  return <a className="lesson-row" href={lessonHref(lesson.id, 'read', view, week)}>
    <span className={'lesson-number ' + (records[lesson.id]?.completed ? 'is-done' : '')}>
      {records[lesson.id]?.completed ? <Check size={16} /> : String(index + 1).padStart(2, '0')}
    </span>
    <div><strong>{lesson.title}</strong><span>{lesson.tags.join(' / ')}</span></div>
    <small><Clock size={13} />2h</small>
    <span className="lesson-state">{records[lesson.id]?.completed ? '已完成' : '学习'}</span>
  </a>;
}

export function PhasesGrid({ records, currentWeek, move }: {
  records: LearningRecords;
  currentWeek: number;
  move: MoveWorkspace;
}) {
  return <div className="phase-grid">{phases.map(phase => {
    const count = phase.lessons.filter(lesson => records[lesson.id]?.completed).length;
    return <button key={phase.week} className={'phase-card ' + (phase.week === currentWeek ? 'current-card' : '')} onClick={() => move('roadmap', phase.week)}>
      <div className="phase-card-top"><span style={{ color: phase.color }}>W{String(phase.week).padStart(2, '0')}</span><span>{phase.track === 'langgraph' ? 'LangGraph · ' : phase.track === 'fastapi' ? 'FastAPI · ' : 'Agent · '}4 任务 · 12h</span></div>
      <h3>{phase.title}</h3><p>{phase.subtitle}</p>
      <div className="phase-card-bottom"><span>{count} / 4 完成</span><span className="stage-line" style={{ background: phase.color }} /></div>
      <Progress value={count * 25} aria-label={phase.title + '进度'} />
    </button>;
  })}</div>;
}

export function NoteEditor({ id, label, records, drafts, setDrafts, canSave, busy, save }: {
  id: string;
  label: string;
  records: LearningRecords;
  drafts: Record<string, string>;
  setDrafts: Dispatch<SetStateAction<Record<string, string>>>;
  canSave: boolean;
  busy: boolean;
  save: SaveLearningRecord;
}) {
  const text = drafts[id] ?? records[id]?.note ?? '';
  const saved = records[id]?.note ?? '';
  return <div className="note-editor">
    <label htmlFor={'note-' + id}>{label}</label>
    <Textarea id={'note-' + id} value={text} maxLength={20000} onChange={event => setDrafts(previous => ({ ...previous, [id]: event.target.value }))} placeholder="记录理解、失败原因、实验结果与下一次要验证的假设……" />
    <div className="note-actions">
      <span>{text.length} / 20,000 · {text !== saved ? '有未保存的修改' : records[id]?.updatedAt ? '已保存' : '尚未记录'}</span>
      <button className="solid-button" disabled={!canSave || text === saved} onClick={() => void save(id, { note: text })}>
        {busy ? <LoaderCircle size={15} className="spin" /> : <Cloud size={15} />}保存笔记
      </button>
    </div>
  </div>;
}

export function SyncStatus({ loading, loadError, retry, lesson = false }: {
  loading: boolean;
  loadError: string;
  retry: () => void;
  lesson?: boolean;
}) {
  if (loading) return <div className="sync-status" role="status"><LoaderCircle size={14} className="spin" />{lesson ? '正在读取代码、笔记和学习记录……' : '正在读取账户学习记录……'}</div>;
  if (loadError) return <div className="error-banner" role="alert"><span>{loadError} {lesson ? '读取成功后即可保存。' : '页面仍可阅读，读取成功后即可保存。'}{loadError.includes('登录') && <a href={lesson ? undefined : '/signin-with-chatgpt?return_to=%2F'} target="_top">登录并继续</a>}</span><button onClick={retry}><RotateCcw size={14} />重新读取</button></div>;
  return <div className="sync-status"><Cloud size={14} />{lesson ? '代码、进度与笔记保存到当前账户' : '进度与笔记保存到当前账户'}</div>;
}

export function nextLearningContext(records: LearningRecords) {
  const next = allLessons.find(lesson => !records[lesson.id]?.completed) ?? allLessons[allLessons.length - 1];
  const current = phases.find(phase => phase.lessons.some(lesson => lesson.id === next.id))!;
  return { next, current };
}
