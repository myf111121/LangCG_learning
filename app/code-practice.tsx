'use client';

import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Cloud, Code2, Copy, Eye, EyeOff, GitCompareArrows, Lightbulb, LoaderCircle, Maximize2, Minimize2, Play, RotateCcw, Square, XCircle } from 'lucide-react';
import type { CodeChallenge } from './code-challenges';
import { buildSideBySideDiff } from './code-diff';
import { buildGradingScript, buildScenarioScript, type GradingResult } from './python-grader';
import type { PythonCodeEditorHandle } from './python-code-editor';

const PythonCodeEditor = lazy(() => import('./python-code-editor').then(module => ({ default: module.PythonCodeEditor })));

type Props = {
  challenge: CodeChallenge;
  code: string;
  savedCode: string;
  completed: boolean;
  canSave: boolean;
  onChange: (code: string) => void;
  onSave: (code: string, passed: boolean) => Promise<boolean>;
};

export function CodePractice({ challenge, code, savedCode, completed, canSave, onChange, onSave }: Props) {
  const [phase, setPhase] = useState<'idle' | 'loading' | 'running' | 'saving'>('idle');
  const [result, setResult] = useState<GradingResult | null>(null);
  const [scenarioResult, setScenarioResult] = useState<GradingResult | null>(null);
  const [runMode, setRunMode] = useState<'scenario' | 'acceptance'>('acceptance');
  const [savePending, setSavePending] = useState(false);
  const [pendingCompletion, setPendingCompletion] = useState(false);
  const [testedCode, setTestedCode] = useState('');
  const [editorExpanded, setEditorExpanded] = useState(false);
  const [fullscreenError, setFullscreenError] = useState('');
  const [actionMessage,setActionMessage]=useState('');
  const [showReference, setShowReference] = useState(false);
  const [diffOnly, setDiffOnly] = useState(false);
  const native=!!challenge.runtime;
  const runtimeName=challenge.runtime==='fastapi'?'FastAPI':'LangGraph';
  const referenceCode=challenge.solution ?? challenge.starter;
  const diffRows = useMemo(() => native && showReference ? buildSideBySideDiff(code, referenceCode) : [], [code, native, referenceCode, showReference]);
  const changedRows = diffRows.filter(row => row.kind !== 'equal').length;
  const visibleDiffRows = diffOnly ? diffRows.filter(row => row.kind !== 'equal') : diffRows;
  const workerRef = useRef<Worker | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generationRef = useRef(0);
  const editorRef = useRef<PythonCodeEditorHandle | null>(null);
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const runModeRef = useRef<'scenario' | 'acceptance'>('acceptance');
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

  useEffect(() => {
    const syncFullscreen = () => {
      setEditorExpanded(document.fullscreenElement === editorContainerRef.current);
    };
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  async function toggleEditorFullscreen() {
    setFullscreenError('');
    try {
      if (document.fullscreenElement === editorContainerRef.current) await document.exitFullscreen();
      else await editorContainerRef.current?.requestFullscreen();
      if (!executing) editorRef.current?.focus();
    } catch {
      setFullscreenError('无法展开编辑器，请允许浏览器全屏，或拖动编辑框右下角继续增高。');
    }
  }

  function changeCode(value: string) {
    onChange(value);
    setResult(null);
    setScenarioResult(null);
    setSavePending(false);
    setActionMessage('');
  }

  function finishWithError(message: string) {
    generationRef.current += 1;
    dispose();
    setPhase('idle');
    const report = { tests: [], error: message, output: '' };
    if (runModeRef.current === 'scenario') setScenarioResult(report);
    else setResult(report);
  }

  async function persist(snapshot: string, success: boolean, generation: number) {
    setTestedCode(snapshot);
    setPendingCompletion(success);
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

  function run(mode: 'scenario' | 'acceptance') {
    dispose();
    const generation = ++generationRef.current;
    const snapshot = code;
    setTestedCode(snapshot);
    runModeRef.current = mode;
    setRunMode(mode);
    if (mode === 'scenario') setScenarioResult(null);
    else {
      setResult(null);
      setSavePending(false);
    }
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
          setPhase('idle');
          if (mode === 'scenario') setScenarioResult(report);
          else {
            setResult(report);
            const success = !report.error && report.tests.length === challenge.tests.length && report.tests.every(test => test.passed);
            void persist(snapshot, success, generation);
          }
        }
      };
      worker.postMessage({ script: mode === 'scenario' ? buildScenarioScript(snapshot) : buildGradingScript(snapshot, challenge.tests) });
    } catch {
      finishWithError('无法启动 Python 环境，请刷新页面后重试。');
    }
  }

  async function copyReferenceCode() {
    try {
      await navigator.clipboard.writeText(referenceCode);
      setActionMessage('正确代码已复制。');
    } catch {
      setActionMessage('复制失败，请在编辑器中全选代码后复制。');
    }
  }

  async function toggleReference() {
    if (!showReference && document.fullscreenElement === editorContainerRef.current) await document.exitFullscreen();
    setShowReference(current => !current);
    setDiffOnly(false);
    setActionMessage('');
  }

  function completeAfterReview() {
    const generation = ++generationRef.current;
    setActionMessage('');
    void persist(code, true, generation);
  }

  const practiceActions = <div className="practice-actions">
    {native ? <><button className={showReference ? 'outline-button' : 'solid-button'} disabled={executing} onClick={() => void toggleReference()}>{showReference ? <EyeOff size={16}/> : <Eye size={16}/>}{showReference ? '隐藏正确代码' : '显示正确代码'}</button>{showReference && <button className="solid-button" disabled={executing || !canSave || completed || !code.trim()} onClick={completeAfterReview}>{executing ? <LoaderCircle size={16} className="spin"/> : <CheckCircle2 size={16}/>} {executing ? '正在保存' : completed ? '已完成' : '已对照，完成任务'}</button>}</> : <>
    <button className="outline-button" disabled={executing || !code.trim()} onClick={() => run('scenario')}>{executing && runMode === 'scenario' ? <LoaderCircle size={16} className="spin" /> : <Play size={16} />}{executing && runMode === 'scenario' ? phase === 'loading' ? '正在加载 Python' : '正在运行场景' : '运行场景'}</button>
    <button className="solid-button" disabled={executing || !code.trim()} onClick={() => run('acceptance')}>{executing && runMode === 'acceptance' ? <LoaderCircle size={16} className="spin" /> : <CheckCircle2 size={16} />}{executing && runMode === 'acceptance' ? phase === 'loading' ? '正在加载 Python' : phase === 'running' ? '正在运行测试' : '正在保存结果' : '运行并验收'}</button>
    {(phase === 'loading' || phase === 'running') && <button className="outline-button" onClick={() => finishWithError('已停止运行，可以修改代码后重试。')}><Square size={14} />停止</button>}
    </>}
    <button className="text-button" disabled={executing || !canSave || code === savedCode} onClick={() => void persist(code, false, generationRef.current)}><Cloud size={15} />保存草稿</button>
  </div>;

  return <div className="lesson-content code-practice">
    <div className="challenge-heading"><h3>{challenge.title}</h3><span>{native?`${runtimeName} · 先写后对照`:`Python · 在线运行 · ${challenge.tests.length} 组测试`}</span></div>
    {native && <section className="native-runtime-guide" aria-label={`${runtimeName} 代码练习说明`}><strong>先独立实现，再按需查看答案</strong><p>在下方编辑器完成自己的代码。需要参考时点击“显示正确代码”，页面会保留你的实现，并与经过项目测试的正确代码逐行对比。</p><small>无需下载运行包或安装依赖；差异对比只帮助复盘，不会自动判断你的代码是否正确。</small></section>}
    <section className="challenge-context" aria-label="业务场景与调用流程">
      <span className="scenario-eyebrow">{challenge.runtime==='fastapi'?'FastAPI 服务':'知识库助手'} · 本节业务场景</span>
      <h3>{challenge.context.title}</h3>
      <p>{challenge.context.story}</p>
      <ol className="scenario-flow">{challenge.context.flow.map((step, index) => <li key={step} className={index === 1 ? 'your-component' : ''}><span>{index === 1 ? '本节实现' : index === 0 ? '上游输入' : '下游使用'}</span><strong>{step}</strong></li>)}</ol>
      <div className="scenario-connection"><strong>与其他功能的关系</strong><p>{challenge.context.connection}</p></div>
    </section>
    <h3>本节组件的接口与要求</h3>
    <p>{challenge.scenario}</p>
    <ul className="challenge-requirements">{challenge.requirements.map(item => <li key={item}>{item}</li>)}</ul>
    <div className="scenario-editor-guide"><div><strong>在完整程序中补全一个组件</strong><p>已提供：{challenge.context.provided}。修改“你的任务”区域，run_scenario() 会将它与上下游连接起来。</p></div><button className="outline-button" disabled={executing} onClick={() => {
      const markerStart = code.indexOf('# --- 你的任务：');
      const start = markerStart < 0 ? 0 : code.indexOf('\n', markerStart) + 1;
      const end = code.indexOf('# --- 已提供：完整调用流程', start);
      editorRef.current?.focus();
      editorRef.current?.selectRange(start, end < 0 ? code.length : end);
    }}>定位待实现代码</button></div>
    <details className="scenario-expected"><summary>补全后运行场景，预期会看到什么？</summary><pre>{JSON.stringify(challenge.context.expected, null, 2)}</pre></details>
    <div className="practice-editor" ref={editorContainerRef} onKeyDown={event => {
      if (event.key === 'Escape' && editorExpanded) {
        event.preventDefault();
        void toggleEditorFullscreen();
      }
    }}>
      <div className="practice-toolbar">
        <div className="practice-file"><Code2 size={16} /><div><strong>solution.py</strong><span>{completed ? '已完成' : code === savedCode && savedCode ? '已保存' : '草稿'}</span></div></div>
        <div className="practice-toolbar-actions">
          <button disabled={executing} onMouseDown={event => event.preventDefault()} onClick={() => editorRef.current?.showCompletions()}><Lightbulb size={15} />智能提示</button>
          <button disabled={executing} onClick={() => changeCode(challenge.starter)}><RotateCcw size={14} />恢复初始代码</button>
          <button aria-label={editorExpanded ? '收起编辑器' : '展开编辑器'} aria-pressed={editorExpanded} onClick={() => void toggleEditorFullscreen()}>{editorExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}{editorExpanded ? '收起 · Esc' : '全屏'}</button>
        </div>
      </div>
      <Suspense fallback={<div className="python-code-editor-loading" role="status"><LoaderCircle size={18} className="spin" />正在准备 Python 编辑器……</div>}>
        <PythonCodeEditor ref={editorRef} value={code} disabled={executing} maxLength={20000} onChange={changeCode} />
      </Suspense>
      {editorExpanded && <div className="practice-expanded-footer">{practiceActions}<span role="status" aria-live="polite">{native ? showReference ? '退出全屏后查看正确代码与差异。' : '先完成自己的实现，再按需查看正确代码。' : scenarioResult ? scenarioResult.error ? '场景未跑通，收起编辑器查看详情。' : '场景已运行，收起编辑器查看输出。' : result ? passed ? '验收全部通过。' : '验收未通过，收起编辑器查看详情。' : '按 Esc 返回题目与测试结果'}</span></div>}
    </div>
    {!editorExpanded && practiceActions}
    {fullscreenError && <p className="practice-hint" role="alert">{fullscreenError}</p>}
    {actionMessage && <p className="practice-hint" role="status" aria-live="polite">{actionMessage}</p>}
    {native && showReference && <section className="reference-comparison" aria-label="我的代码与正确代码差异">
      <div className="reference-comparison-heading">
        <div><span>ANSWER REVEALED / DIFF</span><h3>逐行对照</h3><p>{changedRows ? `发现 ${changedRows} 行差异：左侧红色是你的实现，右侧绿色是正确实现。` : '你的代码与正确代码完全一致。'}</p></div>
        <div className="reference-comparison-actions">
          {changedRows > 0 && <button className="outline-button" aria-pressed={diffOnly} onClick={() => setDiffOnly(current => !current)}><GitCompareArrows size={15}/>{diffOnly ? '显示全部代码' : '只看差异'}</button>}
          <button className="outline-button" onClick={() => void copyReferenceCode()}><Copy size={15}/>复制正确代码</button>
          <button className="text-button" onClick={() => void toggleReference()}><EyeOff size={15}/>隐藏答案</button>
        </div>
      </div>
      <div className="reference-diff-scroll">
        <div className="reference-diff-table" role="table" aria-label="逐行代码差异">
          <div className="reference-diff-columns" role="row"><div role="columnheader">我的代码</div><div role="columnheader">正确代码</div></div>
          {visibleDiffRows.map((row, index) => <div className={`reference-diff-row ${row.kind}`} role="row" key={`${row.left?.number ?? 'x'}-${row.right?.number ?? 'x'}-${index}`}>
            <div className="reference-diff-line left" role="cell"><span className="reference-line-number">{row.left?.number ?? ''}</span><span className="reference-line-marker">{row.kind === 'changed' || row.kind === 'removed' ? '−' : ' '}</span><code>{row.left?.text || ' '}</code></div>
            <div className="reference-diff-line right" role="cell"><span className="reference-line-number">{row.right?.number ?? ''}</span><span className="reference-line-marker">{row.kind === 'changed' || row.kind === 'added' ? '+' : ' '}</span><code>{row.right?.text || ' '}</code></div>
          </div>)}
        </div>
      </div>
    </section>}
    <p className="practice-hint">{native?'你的草稿可以随时保存。显示答案后，diff 会随着你的代码修改实时更新；页面不会运行或自动判定代码。':'“运行场景”执行整个程序并显示业务输出；“运行并验收”检查组件边界及上下游协作，全部通过会自动完成本任务。保存草稿会将任务设为待验收。首次运行需要下载 Python 环境，练习无需 API Key。'}</p>
    {!native && scenarioResult && <section className={'scenario-result ' + (scenarioResult.error ? 'failed' : 'passed')} aria-label="场景运行结果" aria-live="polite"><strong>{scenarioResult.error ? '场景未跑通 · 根据错误补全组件' : '场景已运行 · 查看上下游协作结果'}</strong><pre>{scenarioResult.error || scenarioResult.output || '程序已执行，没有打印输出。'}</pre><span>场景运行用于观察程序行为；任务完成以自动验收为准。</span></section>}
    {!native && <div className={'grading-summary ' + (passed ? 'passed' : result ? 'failed' : '')} role="status" aria-live="polite">
      {result ? <><strong>{passed ? `全部通过 · ${result.tests.length} / ${challenge.tests.length}` : result.error ? '本次运行未完成' : `通过 ${result.tests.filter(test => test.passed).length} / ${challenge.tests.length} · 请继续修改`}</strong>{passed && <span>{phase === 'saving' ? '正在保存代码与完成记录……' : savePending ? '代码已通过，完成记录尚未保存。' : '本任务已自动完成，代码与进度已保存。'}</span>}</> : <span>{completed ? '已保存的代码通过过验收。修改后请重新运行测试。' : '等待运行：每组测试检查一个具体行为。'}</span>}
    </div>}
    {!native && result?.error && <pre className="grading-error">{result.error}</pre>}
    {savePending && <div className="practice-save-pending"><span>{canSave ? '代码尚未保存，可以重试。' : '结果保留在当前页面，账户恢复连接后可以保存。'}</span><button className="outline-button" disabled={!canSave || executing} onClick={() => void persist(testedCode, pendingCompletion, generationRef.current)}>重试保存结果</button></div>}
    {!native && <><h3 className="acceptance-heading">自动验收用例</h3>
    <div className="acceptance-tests">{challenge.tests.map((test, index) => {
      const checked = result?.tests[index];
      return <details key={test.name} className={'acceptance-test ' + (checked ? checked.passed ? 'passed' : 'failed' : '')}>
        <summary>{checked ? checked.passed ? <CheckCircle2 size={17} /> : <XCircle size={17} /> : <span className="test-number">{index + 1}</span>}<span>{test.name}</span><small>{checked ? checked.passed ? '通过' : '未通过' : '待运行'}</small></summary>
        {checked && !checked.passed && <pre className="test-failure">{checked.detail}</pre>}
        <div className="test-code-label">测试代码 · expect_equal 比较实际值与预期值</div><pre className="test-code">{test.code}</pre>
      </details>;
    })}</div>
    {result?.output && <details className="practice-output"><summary>查看代码输出</summary><pre>{result.output}</pre></details>}
    <p className="practice-hint">这些场景用固定数据模拟框架的关键行为，只需要 Python 标准库。真实框架任务改用答案揭示与代码 diff 复盘实现差异。</p></>}
  </div>;
}
