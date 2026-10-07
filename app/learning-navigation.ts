import {courseWeeks} from './curriculum.ts';

export const workspaceViews = ['today', 'roadmap', 'projects', 'quiz', 'resources', 'notes'] as const;
export type WorkspaceView = typeof workspaceViews[number];
export type LessonTab = 'read' | 'practice' | 'note';

export function parseView(value: unknown): WorkspaceView {
  return workspaceViews.includes(value as WorkspaceView) ? value as WorkspaceView : 'today';
}

export function parseWeek(value: unknown): number {
  const week = typeof value === 'string' ? Number(value) : value;
  return typeof week === 'number' && Number.isInteger(week) && week >= 1 && week <= courseWeeks ? week : 1;
}

export function lessonWeek(id:string):number{return parseWeek(Number(/^w(\d+)-/.exec(id)?.[1]))}

export function parseLessonTab(value: unknown): LessonTab {
  return value === 'practice' || value === 'note' ? value : 'read';
}

export function workspaceHref(view: string, week: number): string {
  return '/?' + new URLSearchParams({ view: parseView(view), week: String(parseWeek(week)) });
}

export function lessonHref(id: string, tab = 'read', from = 'today', week = 1): string {
  const query = new URLSearchParams({ from: parseView(from), week: String(parseWeek(week)) });
  if (tab !== 'read') query.set('tab', parseLessonTab(tab));
  return '/learn/' + encodeURIComponent(id) + '?' + query;
}
