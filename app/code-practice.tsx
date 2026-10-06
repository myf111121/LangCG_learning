'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Cloud, LoaderCircle, Play, RotateCcw, Square, XCircle } from 'lucide-react';
import type { CodeChallenge } from './code-challenges';
import { buildGradingScript, type GradingResult } from './python-grader';

type Props = {
  lessonId: string;
  challenge: CodeChallenge;
  code: string;
  savedCode: string;
  completed: boolean;
  canSave: boolean;
  onChange: (code: string) => void;
  onSave: (code: string, passed: boolean) => Promise<boolean>;
};

export function CodePractice({ lessonId, challenge, code, savedCode, completed, canSave, onChange, onSave }: Props) {
  const [phase, setPhase] = useState<'idle' | 'loading' | 'running' | 'saving'>('idle');
  const [result, setResult] = useState<GradingResult | null>(null);
  const [savePending, setSavePending] = useState(false);
  const [testedCode, setTestedCode] = useState('');
  const workerRef = useRef<Worker | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generationRef = useRef(0);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const executing = phase !== 'idle';
  const passed = !!result && !result.error && result.tests.length === challenge.tests.length && result.tests.every(test => test.passed);

  function dispose() {
    workerRef.current?.terminate();
    workerRef.current = null;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }

  useEffect(() => () => {
    generationRef.current += 1;
    workerRef.current?.terminate();
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  function changeCode(value: string) {
    onChange(value);
    setResult(null);
    setSavePending(false);
  }

  function finishWithError(message: string) {
    generationRef.current += 1;
    dispose();
    setPhase('idle');
    setResult({ tests: [], error: message, output: '' });
  }

  async function persist(snapshot: string, success: boolean, generation: number) {
    setTestedCode(snapshot);
    if (!canSave) {
      setSavePending(true);
      return;
    }
    setPhase('saving');
    const saved = await onSave(snapshot, success);
    if (generationRef.current !== generation) return;
    setSavePending(!saved);
    setPhase('idle');
  }

  function run() {
    dispose();
    const generation = ++generationRef.current;
    const snapshot = code;
    setTestedCode(snapshot);
    setResult(null);
    setSavePending(false);
    setPhase('loading');
    try {
      const worker = new Worker('/python-worker.js', { type: 'module' });
      workerRef.current = worker;
      timerRef.current = setTimeout(() => finishWithError('Python 环境加载超时，请检查网络后重新运行。'), 60000);
      worker.onerror = () => {
        if (generationRef.current === generation) finishWithError('Python 环境加载失败，请检查网络后重新运行。');
      };
      worker.onmessage = (event: MessageEvent<{ type: string; error?: string; result?: GradingResult }>) => {
        if (generationRef.current !== generation) return;
        if (event.data.type === 'running') {
          if (timerRef.current) clearTimeout(timerRef.current);
          setPhase('running');
          timerRef.current = setTimeout(() => finishWithError('代码运行超过 10 秒，已停止。请检查循环退出条件后重试。'), 10000);
        } else if (event.data.type === 'error') {
          finishWithError(event.data.error || '执行失败，请重试。');
        } else if (event.data.type === 'result' && event.data.result) {
          dispose();
          const report = event.data.result;
          setResult(report);
          setPhase('idle');
          const success = !report.error && report.tests.length === challenge.tests.length && report.tests.every(test => test.passed);
          void persist(snapshot, success, generation);
        }
      };
      worker.postMessage({ script: buildGradingScript(snapshot, challenge.tests) });
    } catch {
      finishWithError('无法启动 Python 环境，请刷新页面后重试。');
    }
  }

  return <div className="lesson-content code-practice">
    <div className="challenge-heading"><h3>{challenge.title}</h3><span>Python · {challenge.tests.length} 组测试</span></div>
    <p>{challenge.scenario}</p>
    <h3>接口与要求</h3>
    <ul className="challenge-requirements">{challenge.requirements.map(item => <li key={item}>{item}</li>)}</ul>
    <div className="practice-editor">
      <div className="practice-toolbar"><label htmlFor={'code-' + lessonId}>solution.py</label><span>{code === savedCode && savedCode ? '代码已保存' : '代码草稿'}</span><button disabled={executing} onClick={() => changeCode(challenge.starter)}><RotateCcw size={14} />恢复初始代码</button></div>
      <textarea ref={editorRef} id={'code-' + lessonId} aria-label="Python 代码编辑器" value={code} disabled={executing} spellCheck={false} autoCapitalize="off" autoCorrect="off" wrap="off" maxLength={20000} onChange={event => changeCode(event.target.value)} onKeyDown={event => {
        if (event.key === 'Tab') {
          event.preventDefault();
          const { selectionStart: start, selectionEnd: end } = event.currentTarget;
          changeCode(code.slice(0, start) + '    ' + code.slice(end));
          requestAnimationFrame(() => editorRef.current?.setSelectionRange(start + 4, start + 4));
        }
      }} />
    </div>
    <div className="practice-actions">
      <button className="solid-button" disabled={executing || !code.trim()} onClick={run}>{executing ? <LoaderCircle size={16} className="spin" /> : <Play size={16} />}{phase === 'loading' ? '正在加载 Python' : phase === 'running' ? '正在运行测试' : phase === 'saving' ? '正在保存结果' : '运行并验收'}</button>
      {(phase === 'loading' || phase === 'running') && <button className="outline-button" onClick={() => finishWithError('已停止运行，可以修改代码后重试。')}><Square size={14} />停止</button>}
      <button className="text-button" disabled={executing || !canSave || code === savedCode} onClick={() => void persist(code, false, generationRef.current)}><Cloud size={15} />保存草稿</button>
    </div>
    <p className="practice-hint">补全代码后运行测试。全部通过会自动完成本任务；保存草稿会保留代码并将任务设为待验收。首次运行需要下载 Python 环境，练习无需 API Key。</p>
    <div className={'grading-summary ' + (passed ? 'passed' : result ? 'failed' : '')} role="status" aria-live="polite">
      {result ? <><strong>{passed ? `全部通过 · ${result.tests.length} / ${challenge.tests.length}` : result.error ? '本次运行未完成' : `通过 ${result.tests.filter(test => test.passed).length} / ${challenge.tests.length} · 请继续修改`}</strong>{passed && <span>{phase === 'saving' ? '正在保存代码与完成记录……' : savePending ? '代码已通过，完成记录尚未保存。' : '本任务已自动完成，代码与进度已保存。'}</span>}</> : <span>{completed ? '已保存的代码通过过验收。修改后请重新运行测试。' : '等待运行：每组测试检查一个具体行为。'}</span>}
    </div>
    {result?.error && <pre className="grading-error">{result.error}</pre>}
    {savePending && <div className="practice-save-pending"><span>{canSave ? '结果尚未保存，可以重试。' : '结果保留在当前页面，账户恢复连接后可以保存。'}</span><button className="outline-button" disabled={!canSave || executing} onClick={() => void persist(testedCode, passed, generationRef.current)}>重试保存结果</button></div>}
    <h3 className="acceptance-heading">自动验收用例</h3>
    <div className="acceptance-tests">{challenge.tests.map((test, index) => {
      const checked = result?.tests[index];
      return <details key={test.name} className={'acceptance-test ' + (checked ? checked.passed ? 'passed' : 'failed' : '')}>
        <summary>{checked ? checked.passed ? <CheckCircle2 size={17} /> : <XCircle size={17} /> : <span className="test-number">{index + 1}</span>}<span>{test.name}</span><small>{checked ? checked.passed ? '通过' : '未通过' : '待运行'}</small></summary>
        {checked && !checked.passed && <pre className="test-failure">{checked.detail}</pre>}
        <div className="test-code-label">测试代码 · expect_equal 比较实际值与预期值</div><pre className="test-code">{test.code}</pre>
      </details>;
    })}</div>
    {result?.output && <details className="practice-output"><summary>查看代码输出</summary><pre>{result.output}</pre></details>}
    <p className="practice-hint">这些场景用固定数据模拟框架的关键行为，只需要 Python 标准库。实际 LangChain / LangGraph 集成在每周实战项目中练习。</p>
  </div>;
}
