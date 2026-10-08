'use client';

import { Download, NotebookPen } from 'lucide-react';
import { allLessons, phases, type Lesson } from '../curriculum';
import { lessonHref, lessonWeek, type WorkspaceView } from '../learning-navigation';
import { download } from './shared';
import type { LearningRecords, MoveWorkspace, NoteEditorRenderer } from './types';

export function NotesView({ records, loading, loadError, view, week, next, move, noteText, noteEditor, openLesson }: {
  records: LearningRecords;
  loading: boolean;
  loadError: string;
  view: WorkspaceView;
  week: number;
  next: Lesson;
  move: MoveWorkspace;
  noteText: (id: string) => string;
  noteEditor: NoteEditorRenderer;
  openLesson: (lesson: Lesson, tab?: string) => void;
}) {
  const hasTaskNotes = allLessons.some(lesson => noteText(lesson.id));
  const hasLabNotes = phases.some(phase => noteText(`lab-${phase.week}`));

  function exportNotes() {
    const ids = ['journal', ...allLessons.map(lesson => lesson.id), ...phases.map(phase => `lab-${phase.week}`)];
    const content = '# Graph Study 学习记录\n\n' + ids
      .filter(id => noteText(id))
      .map(id => `## ${id === 'journal' ? '学习复盘' : allLessons.find(lesson => lesson.id === id)?.title ?? `第 ${id.replace('lab-', '')} 周实战`}\n\n${noteText(id)}`)
      .join('\n\n');
    download('graph-study-notes.md', content);
  }

  return <>
    <section className="surface journal-panel"><div className="panel-title"><h2>学习复盘</h2><button className="text-button" disabled={loading || !!loadError} onClick={exportNotes}><Download size={15} />导出 Markdown</button></div>{noteEditor('journal', '本周最重要的三个收获')}</section>
    <section className="section-heading"><div><h2>任务与项目笔记</h2><p>在学习任务或实战页写下的笔记会显示在这里。</p></div></section>
    <div className="saved-notes">
      {allLessons.filter(lesson => noteText(lesson.id)).map(lesson => <a className="surface saved-note" key={lesson.id} href={lessonHref(lesson.id, 'note', view, week)}><span>第 {lessonWeek(lesson.id)} 周 · {records[lesson.id]?.completed ? '已完成' : '进行中'}</span><h3>{lesson.title}</h3><p>{noteText(lesson.id)}</p></a>)}
      {phases.filter(phase => noteText(`lab-${phase.week}`)).map(phase => <button className="surface saved-note" key={phase.week} onClick={() => move('projects', phase.week)}><span>第 {phase.week} 周实战</span><h3>{phase.deliverable}</h3><p>{noteText(`lab-${phase.week}`)}</p></button>)}
      {!hasTaskNotes && !hasLabNotes && <div className="notes-empty"><NotebookPen size={30} /><h3>第一条记录，从一次实验开始</h3><p>打开一个学习任务，在“笔记”中写下你的理解和运行结果。</p><button className="outline-button" onClick={() => openLesson(next, 'note')}>记录当前任务</button></div>}
    </div>
  </>;
}
