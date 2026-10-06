'use client';

import type { ReactNode } from 'react';
import { BookOpen, CheckCircle2, Clock, Cloud, Code2, ExternalLink, LoaderCircle, Network, RotateCcw } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CodePractice } from './code-practice';
import { codeChallenges } from './code-challenges';
import { allLessons, phases, sourceById, type Lesson } from './curriculum';
import { lessonHref, workspaceHref } from './learning-navigation';

type Props = {
  lesson: Lesson;
  tab: string;
  onTabChange: (tab: string) => void;
  view: string;
  week: number;
  completed: boolean;
  loading: boolean;
  loadError: string;
  onRetry: () => void;
  code: string;
  savedCode: string;
  canSave: boolean;
  onCodeChange: (code: string) => void;
  onSaveCode: (code: string, passed: boolean) => Promise<boolean>;
  noteEditor: ReactNode;
};

export function LessonWorkspace({ lesson, tab, onTabChange, view, week, completed, loading, loadError, onRetry, code, savedCode, canSave, onCodeChange, onSaveCode, noteEditor }: Props) {
  const index = allLessons.findIndex(item => item.id === lesson.id);
  const previous = allLessons[index - 1];
  const next = allLessons[index + 1];
  const courseWeek = Number(lesson.id.charAt(1));
  const phase = phases[courseWeek - 1];
  const backHref = workspaceHref(view, week);
  const backLabel = view === 'roadmap' ? '返回学习路线' : view === 'notes' ? '返回学习笔记' : '返回学习工作台';

  return <div className="learning-page">
    <header className="learning-topbar"><a className="learning-brand" href={backHref}><Network size={22} /><span>GRAPH STUDY</span></a><a className="outline-button" href={backHref}>{backLabel}</a></header>
    <main className="learning-main">
      <nav className="learning-breadcrumb" aria-label="学习位置"><a href={workspaceHref('roadmap', courseWeek)}>第 {courseWeek} 周 · {phase.title}</a><span>/</span><span>任务 {lesson.id.slice(-1)}</span></nav>
      <div className="learning-heading"><div><span className="small-eyebrow">TASK {String(index + 1).padStart(2, '0')} / {allLessons.length}</span><h1>{lesson.title}</h1><p>阅读约 1h，代码练习约 1h。测试全部通过后自动完成任务。</p></div><span className={'learning-status ' + (completed ? 'completed' : '')}>{completed ? <CheckCircle2 size={17} /> : <Clock size={17} />}{completed ? '已通过验收' : '学习中'}</span></div>
      {loading && <div className="sync-status" role="status"><LoaderCircle size={14} className="spin" />正在读取代码、笔记和学习记录……</div>}
      {loadError && <div className="error-banner" role="alert"><span>{loadError} 读取成功后即可保存。{loadError.includes('登录') && <a href={'/signin-with-chatgpt?return_to=' + encodeURIComponent(lessonHref(lesson.id, tab, view, week))} target="_top">登录并继续</a>}</span><button onClick={onRetry}><RotateCcw size={14} />重新读取</button></div>}
      {!loading && !loadError && <div className="sync-status"><Cloud size={14} />代码、进度与笔记保存到当前账户</div>}
      <section className="surface learning-panel" aria-label="任务学习内容">
        <Tabs value={tab} onValueChange={onTabChange}>
          <TabsList className="learning-tabs"><TabsTrigger value="read"><BookOpen size={16} />理解与阅读</TabsTrigger><TabsTrigger value="practice"><Code2 size={16} />代码挑战</TabsTrigger><TabsTrigger value="note">学习笔记</TabsTrigger></TabsList>
          <TabsContent value="read"><div className="learning-reading">
            <div className="lesson-content"><h2>本次重点</h2><p>{lesson.concept}</p><div className="inline-tags">{lesson.tags.map(tag => <code key={tag}>{tag}</code>)}</div><div className="lesson-guidance">先读对应主题，再进入代码挑战独立实现。遇到旧接口时，对照官方迁移指南。</div><button className="solid-button" onClick={() => onTabChange('practice')}><Code2 size={16} />进入代码挑战</button></div>
            <aside className="learning-references"><h2>阅读资料</h2>{lesson.refs.map(id => { const source = sourceById(id); return <a className="source-link" key={id} href={source.url} target="_blank" rel="noopener noreferrer"><span><small>{source.kind}</small>{source.title}</span><ExternalLink size={15} /></a>; })}</aside>
          </div></TabsContent>
          <TabsContent value="practice"><CodePractice key={lesson.id} lessonId={lesson.id} challenge={codeChallenges[lesson.id]} code={code} savedCode={savedCode} completed={completed} canSave={canSave} onChange={onCodeChange} onSave={onSaveCode} /></TabsContent>
          <TabsContent value="note"><div className="lesson-content learning-notes">{noteEditor}</div></TabsContent>
        </Tabs>
      </section>
      <nav className="learning-task-navigation" aria-label="相邻学习任务">
        {previous ? <a className="learning-task-link" href={lessonHref(previous.id, 'read', view, week)}><small>上一任务</small><strong>{previous.title}</strong></a> : <span />}
        {next ? <a className="learning-task-link next" href={lessonHref(next.id, 'read', view, week)}><small>下一任务</small><strong>{next.title}</strong></a> : <a className="learning-task-link next" href={workspaceHref('projects', 6)}><small>完成路线后</small><strong>继续实战项目</strong></a>}
      </nav>
    </main>
  </div>;
}
