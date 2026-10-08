'use client';

import { useState } from 'react';
import { Check, ExternalLink } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { courseWeeks, phases, quizzes, sourceById } from '../curriculum';

export function QuizView() {
  const [quizWeek, setQuizWeek] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const filtered = quizzes.map((quiz, index) => ({ ...quiz, index })).filter(quiz => quiz.week === quizWeek);
  const score = filtered.filter(quiz => Number(answers[quiz.index]) === quiz.answer).length;

  return <Tabs value={String(quizWeek)} onValueChange={value => { setQuizWeek(Number(value)); setSubmitted(false); setAnswers({}); }}>
    <TabsList className="week-tabs quiz-tabs">{Array.from({ length: courseWeeks + 1 }, (_, index) => <TabsTrigger key={index} value={String(index)}>{index === 0 ? '基础校准' : `第 ${index} 周`}</TabsTrigger>)}</TabsList>
    <div className="quiz-intro"><span className="small-eyebrow">{quizWeek === 0 ? 'FOUNDATION CHECK' : phases[quizWeek - 1].title}</span><span>{filtered.length} 题 · 单选 · 提交后显示解析</span></div>
    <div className="quiz-list">{filtered.map((quiz, listIndex) => <section key={quiz.index} className="surface quiz-question">
      <h3><span>{String(listIndex + 1).padStart(2, '0')}</span>{quiz.q}</h3>
      <RadioGroup value={answers[quiz.index] ?? ''} onValueChange={value => { setAnswers(previous => ({ ...previous, [quiz.index]: value })); setSubmitted(false); }} aria-label={quiz.q}>
        {quiz.options.map((option, optionIndex) => <label className={'quiz-option ' + (submitted && optionIndex === quiz.answer ? 'correct' : '')} key={optionIndex}><RadioGroupItem value={String(optionIndex)} /><span>{option}</span>{submitted && optionIndex === quiz.answer && <Check size={16} />}</label>)}
      </RadioGroup>
      {submitted && <div className={'quiz-explanation ' + (Number(answers[quiz.index]) === quiz.answer ? 'good' : 'review')}><strong>{Number(answers[quiz.index]) === quiz.answer ? '回答正确' : '建议回顾'}</strong><p>{quiz.why}</p><a href={sourceById(quiz.ref).url} target="_blank" rel="noopener noreferrer">阅读相关资料<ExternalLink size={13} /></a></div>}
    </section>)}</div>
    <div className="quiz-submit"><button className="solid-button" disabled={!filtered.every(quiz => answers[quiz.index] !== undefined)} onClick={() => setSubmitted(true)}>提交并查看解析</button>{!submitted && <p>请选择全部 {filtered.length} 道题的答案。</p>}{submitted && <div role="status"><strong>答对 {score} / {filtered.length}</strong><p>{score === filtered.length ? '概念校准通过，接下来用代码验证。' : '结合上方解析回顾资料，再独立解释一次。'}</p></div>}</div>
  </Tabs>;
}
