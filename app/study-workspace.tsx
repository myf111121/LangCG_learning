'use client';

import { useCallback, useEffect, useState } from 'react';
import { Code2, Network } from 'lucide-react';
import { Toaster } from 'sonner';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Progress } from '@/components/ui/progress';
import { allLessons, checkedOn, courseTasks, courseWeeks, phases, sourceById, type Lesson } from './curriculum';
import { codeChallenges } from './code-challenges';
import { contextualizeCode } from './challenge-scenarios';
import { LessonWorkspace } from './lesson-workspace';
import { lessonHref, workspaceHref, type LessonTab, type WorkspaceView } from './learning-navigation';
import { NotesView } from './workspace/notes-view';
import { ProjectsView } from './workspace/projects-view';
import { QuizView } from './workspace/quiz-view';
import { ResourcesView } from './workspace/resources-view';
import { RoadmapView } from './workspace/roadmap-view';
import { NoteEditor, StudyNavigation, SyncStatus, navigation, nextLearningContext } from './workspace/shared';
import { TodayView } from './workspace/today-view';
import { useLearningRecords } from './workspace/use-learning-records';

type WorkspaceProps = {
  initialLessonId?: string;
  initialTab?: LessonTab;
  initialView?: WorkspaceView;
  initialWeek?: number;
};

const headings: Record<WorkspaceView, { title: string; description: string }> = {
  today: { title: '把知识，变成可交付的系统。', description: '先掌握 Agent 与 LangGraph，再用 FastAPI 完成可测试、可部署的后端服务。' },
  roadmap: { title: '每一步，都有可运行的成果。', description: '每周 4 次学习任务 + 1 次实战验收。12 小时只是起点，节奏可以自行调整。' },
  projects: { title: '让每一阶段，都能通过验收。', description: '每周在同一个 Python 仓库中迭代，用可运行的结果验收。' },
  quiz: { title: '用问题，检查真正的理解。', description: '先做基础校准，再逐周检查概念与工程决策。' },
  resources: { title: '按任务阅读，按官方接口实践。', description: `官方文档校准接口，中文与专业资料补充理解。资料核对于 ${checkedOn}。` },
  notes: { title: '把实验结果，留给下一次自己。', description: '记录自己的判断、失败和改进，而不只是复制代码。' },
};

export default function StudyWorkspace({ initialLessonId, initialTab = 'read', initialView = 'today', initialWeek = 1 }: WorkspaceProps) {
  const [view, setView] = useState<WorkspaceView>(initialView);
  const [week, setWeek] = useState(initialWeek);
  const [sheetTab, setSheetTab] = useState<string>(initialTab);
  const [codeDrafts, setCodeDrafts] = useState<Record<string, string>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const learning = useLearningRecords();
  const { records, recordsRef, loading, loadError, busy, canSave, retry, save } = learning;
  const selected = allLessons.find(lesson => lesson.id === initialLessonId);
  const completed = allLessons.filter(lesson => records[lesson.id]?.completed).length;
  const labsDone = phases.filter(phase => records[`lab-${phase.week}`]?.completed).length;
  const { next, current } = nextLearningContext(records);

  const move = useCallback((target: WorkspaceView, targetWeek?: number) => {
    setView(target);
    if (targetWeek) setWeek(targetWeek);
    window.history.replaceState(window.history.state, '', workspaceHref(target, targetWeek ?? week));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [week]);

  const openLesson = useCallback((lesson: Lesson, tab = 'read') => {
    window.location.assign(lessonHref(lesson.id, tab, view, week));
  }, [view, week]);

  useEffect(() => {
    const context = (document as unknown as { modelContext?: { registerTool: (tool: unknown, options: unknown) => unknown } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const tools = [
      {
        name: 'get_learning_progress',
        title: '读取学习进度',
        description: '读取当前账户的任务进度和下一任务；不改变进度。',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true },
        execute: () => ({
          completed: allLessons.filter(lesson => recordsRef.current[lesson.id]?.completed).length,
          total: courseTasks,
          nextLesson: allLessons.find(lesson => !recordsRef.current[lesson.id]?.completed)?.id ?? null,
        }),
      },
      {
        name: 'open_learning_task',
        title: '打开学习任务',
        description: '打开任务详情，不标记完成。',
        inputSchema: { type: 'object', properties: { lessonId: { type: 'string', enum: allLessons.map(lesson => lesson.id) } }, required: ['lessonId'], additionalProperties: false },
        annotations: { readOnlyHint: false },
        execute: (input: unknown) => {
          const id = (input as { lessonId?: string })?.lessonId;
          const lesson = allLessons.find(item => item.id === id);
          if (!lesson) throw new Error('任务不存在');
          openLesson(lesson);
          return { id: lesson.id, title: lesson.title, completed: !!recordsRef.current[lesson.id]?.completed };
        },
      },
    ];
    for (const tool of tools) {
      try {
        void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {});
      } catch {}
    }
    return () => lifecycle.abort();
  }, [openLesson, recordsRef]);

  const noteText = useCallback((id: string) => noteDrafts[id] ?? records[id]?.note ?? '', [noteDrafts, records]);
  const noteEditor = useCallback((id: string, label: string) => <NoteEditor id={id} label={label} records={records} drafts={noteDrafts} setDrafts={setNoteDrafts} canSave={canSave} busy={busy} save={save} />, [records, noteDrafts, canSave, busy, save]);

  function changeLessonTab(tab: string) {
    setSheetTab(tab);
    const url = new URL(window.location.href);
    if (tab === 'read') url.searchParams.delete('tab');
    else url.searchParams.set('tab', tab);
    window.history.replaceState(window.history.state, '', url);
  }

  if (selected) {
    const challenge = codeChallenges[selected.id];
    const savedCode = records[selected.id]?.code;
    const code = codeDrafts[selected.id] ?? (savedCode ? contextualizeCode(challenge.context, savedCode) : challenge.starter);
    return <>
      <Toaster richColors position="bottom-right" />
      <LessonWorkspace
        lesson={selected}
        tab={sheetTab}
        onTabChange={changeLessonTab}
        view={view}
        week={week}
        completed={!!records[selected.id]?.completed}
        loading={loading}
        loadError={loadError}
        onRetry={retry}
        code={code}
        savedCode={savedCode ? contextualizeCode(challenge.context, savedCode) : ''}
        canSave={canSave}
        onCodeChange={value => setCodeDrafts(previous => ({ ...previous, [selected.id]: value }))}
        onSaveCode={(value, passed) => save(selected.id, { code: value, completed: passed })}
        noteEditor={noteEditor(selected.id, '理解与实验结果')}
      />
    </>;
  }

  return <SidebarProvider>
    <Toaster richColors position="bottom-right" />
    <Sidebar className="study-sidebar">
      <SidebarHeader><div className="brand"><span className="brand-icon"><Network size={23} /></span><div>GRAPH<span>STUDY / 学习工作台</span></div></div></SidebarHeader>
      <SidebarContent><SidebarGroup><p className="nav-caption">我的学习空间</p><StudyNavigation view={view} onNavigate={move} /></SidebarGroup></SidebarContent>
      <SidebarFooter>
        <div className="sidebar-plan"><span>你的学习计划</span><strong>Python 进阶路线</strong><p>{courseWeeks} 周 · 每周 12 小时</p><Progress value={completed / courseTasks * 100} aria-label="总学习进度" /><small>{completed} / {courseTasks} 任务已完成</small></div>
        <div className="profile"><span>学</span><div>持续学习者<small>Agent · LangGraph · FastAPI</small></div></div>
      </SidebarFooter>
    </Sidebar>
    <SidebarInset>
      <header className="topbar"><div className="breadcrumb"><SidebarTrigger aria-label="展开或收起导航" /><span>我的工作台</span><span className="slash">/</span><strong>{navigation.find(item => item.id === view)?.label}</strong></div><span className="edition">AGENT + LANGGRAPH + FASTAPI</span></header>
      <main className="workspace">
        <div className="page-heading"><div><p className="eyebrow">LEARN. BUILD. ITERATE.</p><h1>{headings[view].title}</h1><p>{headings[view].description}</p></div><span className="plan-chip"><Code2 size={15} /> Python · 每周 12h</span></div>
        <SyncStatus loading={loading} loadError={loadError} retry={retry} />
        {view === 'today' && <TodayView records={records} loading={loading} completed={completed} labsDone={labsDone} current={current} next={next} week={week} move={move} />}
        {view === 'roadmap' && <RoadmapView records={records} week={week} move={move} />}
        {view === 'projects' && <ProjectsView records={records} week={week} move={move} canSave={canSave} save={save} noteEditor={noteEditor} />}
        {view === 'quiz' && <QuizView />}
        {view === 'resources' && <ResourcesView />}
        {view === 'notes' && <NotesView records={records} loading={loading} loadError={loadError} view={view} week={week} next={next} move={move} noteText={noteText} noteEditor={noteEditor} openLesson={openLesson} />}
        <footer className="site-footer"><span>路线设计依据 <a href={sourceById('lg-overview').url} target="_blank" rel="noopener noreferrer">LangGraph</a> 与 <a href={sourceById('fa-tutorial').url} target="_blank" rel="noopener noreferrer">FastAPI 官方文档</a>，中文与专业课程用于补充</span><span>资料核对 · {checkedOn.replaceAll('-', '.')}</span></footer>
      </main>
    </SidebarInset>
  </SidebarProvider>;
}
