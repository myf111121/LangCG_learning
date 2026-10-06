import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { allLessons } from '@/app/curriculum';
import { parseLessonTab, parseView, parseWeek } from '@/app/learning-navigation';
import StudyWorkspace from '@/app/study-workspace';

type Props = {
  params: Promise<{ lessonId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lessonId } = await params;
  const lesson = allLessons.find(item => item.id === lessonId);
  return { title: lesson ? `${lesson.title} · Graph Study` : '任务不存在 · Graph Study' };
}

export default async function LearningPage({ params, searchParams }: Props) {
  const [{ lessonId }, query] = await Promise.all([params, searchParams]);
  if (!allLessons.some(item => item.id === lessonId)) notFound();
  return <StudyWorkspace initialLessonId={lessonId} initialTab={parseLessonTab(query.tab)} initialView={parseView(query.from)} initialWeek={parseWeek(query.week ?? lessonId.charAt(1))} />;
}
