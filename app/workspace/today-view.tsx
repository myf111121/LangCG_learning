'use client';

import { BookOpen, Brain, FlaskConical } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { courseHours, courseTasks, courseWeeks, type Lesson, type Phase } from '../curriculum';
import { lessonHref } from '../learning-navigation';
import { GraphPreview, LessonRow, PhasesGrid } from './shared';
import type { LearningRecords, MoveWorkspace } from './types';

export function TodayView({ records, loading, completed, labsDone, current, next, week, move }: {
  records: LearningRecords;
  loading: boolean;
  completed: number;
  labsDone: number;
  current: Phase;
  next: Lesson;
  week: number;
  move: MoveWorkspace;
}) {
  return <>
    <section className="langgraph-intro"><div><span className="small-eyebrow">NEW TRACK / W13–W18</span><h2>FastAPI · 从接口契约到生产交付</h2><p>24 个真实 API 任务 · 数据库与安全 · 异步与测试 · 路线和内容来自官方文档</p></div><button className="solid-button" onClick={() => move('roadmap', 13)}>进入 FastAPI 路线</button></section>
    <div className="stats">
      <div><span>学习进度</span><strong>{loading ? '—' : completed}<small> / {courseTasks} 任务</small></strong><Progress value={completed / courseTasks * 100} aria-label="学习任务完成百分比" /></div>
      <div><span>实战里程碑</span><strong>{loading ? '—' : labsDone}<small> / {courseWeeks} 项目版本</small></strong><p>每周交付一次可验收的迭代</p></div>
      <div><span>预计总投入</span><strong>{courseHours}<small> 小时</small></strong><p>阅读 {courseWeeks * 4}h · 编码 {courseWeeks * 4}h · 实战 {courseWeeks * 4}h</p></div>
    </div>
    <section className="focus-card"><div className="focus-content"><span className="focus-label">{completed === courseTasks ? '已完成路线' : '当前阶段'} <span>WEEK {String(current.week).padStart(2, '0')}</span></span><h2>{current.title}</h2><p>{completed === courseTasks ? `${courseTasks} 个任务已完成。继续完成项目验收，复盘失败样本与下一步改进。` : current.subtitle + '。'}</p><div className="focus-tags">{next.tags.map(tag => <span key={tag}>{tag}</span>)}</div><a className="primary-button" href={lessonHref(next.id, 'read', 'today', week)}><BookOpen size={17} />{completed === courseTasks ? '回顾最后任务' : '开始本次学习'}</a></div><div className="focus-graph"><GraphPreview /><span>从一个可控的循环开始</span></div></section>
    <div className="today-columns"><section className="surface"><div className="panel-title"><h2>本周学习任务</h2><span>W{String(current.week).padStart(2, '0')} · 8h</span></div>{current.lessons.map((lesson, index) => <LessonRow key={lesson.id} lesson={lesson} index={index} records={records} view="today" week={week} />)}</section><section className="surface weekly-delivery"><span className="small-eyebrow">THIS WEEK / 实战 4h</span><FlaskConical size={25} /><h3>{current.deliverable}</h3><p>{current.lab}</p><button className="outline-button" onClick={() => move('projects', current.week)}>查看本周验收</button></section></div>
    <div className="calibration"><Brain size={20} /><div><strong>已经学过基础？用 3 个问题校准一下。</strong><p>确认工具循环与图状态的理解，再开始进阶任务。</p></div><button className="text-button" onClick={() => move('quiz')}>基础校准</button></div>
    <section className="section-heading"><div><h2>十八周学习路线</h2><p>W01–06 · Agent 工程；W07–12 · LangGraph；W13–18 · FastAPI 后端工程。</p></div><button className="text-button" onClick={() => move('roadmap', current.week)}>查看完整路线</button></section>
    <PhasesGrid records={records} currentWeek={current.week} move={move} />
  </>;
}
