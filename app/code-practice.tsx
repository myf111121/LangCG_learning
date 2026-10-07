'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Cloud, Download, Upload, LoaderCircle, Maximize2, Minimize2, Play, RotateCcw, Square, XCircle } from 'lucide-react';
import type { CodeChallenge } from './code-challenges';
import { buildGradingScript, buildScenarioScript, type GradingResult } from './python-grader';
import {localChallengeFiles,zipFiles,validateLocalReport} from './local-challenge';

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
  const [scenarioResult, setScenarioResult] = useState<GradingResult | null>(null);
  const [runMode, setRunMode] = useState<'scenario' | 'acceptance'>('acceptance');
  const [savePending, setSavePending] = useState(false);
  const [testedCode, setTestedCode] = useState('');
  const [editorExpanded, setEditorExpanded] = useState(false);
  const [fullscreenError, setFullscreenError] = useState('');
  const [importMessage,setImportMessage]=useState('');
  const fileInputRef=useRef<HTMLInputElement|null>(null);
  const native=challenge.runtime==='langgraph';
  const workerRef = useRef<Worker | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generationRef = useRef(0);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
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
      if (!executing) editorRef.current?.focus({ preventScroll: true });
    } catch {
      setFullscreenError('无法展开编辑器，请允许浏览器全屏，或拖动编辑框右下角继续增高。');
    }
  }

  function changeCode(value: string) {
    onChange(value);
    setResult(null);
    setScenarioResult(null);
    setSavePending(false);
    setImportMessage('');
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

  function downloadBundle(){
    const bytes=zipFiles(localChallengeFiles(lessonId,code,challenge.tests));
    const url=URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>],{type:'application/zip'}));
    const a=document.createElement('a');a.href=url;a.download=lessonId+'-langgraph.zip';a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function importFile(file:File){
    const snapshot=code;const generation=++generationRef.current;
    setImportMessage('');setPhase('loading');
    try{
      if(file.size>150000)throw new Error('文件过大，请选择 solution.py 或 result.json。');
      const content=await file.text();
      if(file.name.endsWith('.py')){
        if(content.length>20000)throw new Error('代码最多 20,000 字符。');
        changeCode(content);setImportMessage('本地代码已导入，请继续导入对应的 result.json。');setPhase('idle');return;
      }
      const report=await validateLocalReport(JSON.parse(content),lessonId,snapshot,challenge.tests);
      if(generationRef.current!==generation)return;
      setResult(report);setSavePending(false);setPhase('idle');
      const success=!report.error && report.tests.length===challenge.tests.length && report.tests.every(t=>t.passed);
      setImportMessage('已导入本地验收结果。');await persist(snapshot,success,generation);
    }catch(error){
      if(generationRef.current!==generation)return;
      setPhase('idle');setImportMessage(error instanceof SyntaxError?'文件不是有效 JSON，请选择 verify.py 生成的 result.json。':error instanceof Error?error.message:'导入失败，请重试。');
    }
  }

  const practiceActions = <div className="practice-actions">
    {native ? <><button className="solid-button" disabled={executing || !code.trim()} onClick={downloadBundle}><Download size={16}/>下载运行与验收包</button><button className="outline-button" disabled={executing} onClick={()=>fileInputRef.current?.click()}>{executing?<LoaderCircle size={16} className="spin"/>:<Upload size={16}/>}导入代码 / 验收结果</button></> : <>
    <button className="outline-button" disabled={executing || !code.trim()} onClick={() => run('scenario')}>{executing && runMode === 'scenario' ? <LoaderCircle size={16} className="spin" /> : <Play size={16} />}{executing && runMode === 'scenario' ? phase === 'loading' ? '正在加载 Python' : '正在运行场景' : '运行场景'}</button>
    <button className="solid-button" disabled={executing || !code.trim()} onClick={() => run('acceptance')}>{executing && runMode === 'acceptance' ? <LoaderCircle size={16} className="spin" /> : <CheckCircle2 size={16} />}{executing && runMode === 'acceptance' ? phase === 'loading' ? '正在加载 Python' : phase === 'running' ? '正在运行测试' : '正在保存结果' : '运行并验收'}</button>
    {(phase === 'loading' || phase === 'running') && <button className="outline-button" onClick={() => finishWithError('已停止运行，可以修改代码后重试。')}><Square size={14} />停止</button>}
    </>}
    <button className="text-button" disabled={executing || !canSave || code === savedCode} onClick={() => void persist(code, false, generationRef.current)}><Cloud size={15} />保存草稿</button>
  </div>;

  return <div className="lesson-content code-practice">
    <div className="challenge-heading"><h3>{challenge.title}</h3><span>{native?'LangGraph · 本地运行':'Python · 在线运行'} · {challenge.tests.length} 组测试</span></div>
    {native && <section className="native-runtime-guide" aria-label="LangGraph 本地运行说明"><strong>真实 LangGraph API · Python 3.11+</strong><p>网页编辑代码，下载 ZIP 后解压。运行包包含当前代码、依赖与本页全部测试；无需模型 API Key。</p><ol><li><code>python -m venv .venv</code></li><li><code>.venv\Scripts\python -m pip install -r requirements.txt</code></li><li><code>.venv\Scripts\python solution.py</code> 查看场景；<code>.venv\Scripts\python verify.py</code> 自动验收。</li><li>将生成的 <code>result.json</code> 导回本页。若在本地改过代码，先导入 <code>solution.py</code>。</li></ol><small>macOS / Linux 使用 .venv/bin/python。LangGraph 的原生依赖需要本地 Python，现有网页运行环境无法安装；详细说明在运行包 README 中。</small></section>}
    <input ref={fileInputRef} type="file" accept=".json,.py" hidden aria-label="导入本地代码或验收结果" onChange={event=>{const file=event.target.files?.[0];event.target.value='';if(file)void importFile(file)}}/>
    <section className="challenge-context" aria-label="业务场景与调用流程">
      <span className="scenario-eyebrow">知识库助手 · 本节业务场景</span>
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
      editorRef.current?.setSelectionRange(start, end < 0 ? code.length : end);
      if (editorRef.current) editorRef.current.scrollTop = code.slice(0, start).split('\n').length * 28 - 60;
    }}>定位待实现代码</button></div>
    <details className="scenario-expected"><summary>补全后运行场景，预期会看到什么？</summary><pre>{JSON.stringify(challenge.context.expected, null, 2)}</pre></details>
    <div className="practice-editor" ref={editorContainerRef} onKeyDown={event => {
      if (event.key === 'Escape' && editorExpanded) {
        event.preventDefault();
        void toggleEditorFullscreen();
      }
    }}>
      <div className="practice-toolbar"><label htmlFor={'code-' + lessonId}>solution.py</label><span>{code === savedCode && savedCode ? '代码已保存' : '代码草稿'}</span><div className="practice-toolbar-actions"><button disabled={executing} onClick={() => changeCode(challenge.starter)}><RotateCcw size={14} />恢复初始代码</button><button aria-label={editorExpanded ? '收起编辑器' : '展开编辑器'} aria-pressed={editorExpanded} onClick={() => void toggleEditorFullscreen()}>{editorExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}{editorExpanded ? '收起编辑器 · Esc' : '展开编辑器'}</button></div></div>
      <textarea ref={editorRef} id={'code-' + lessonId} aria-label="Python 代码编辑器" value={code} disabled={executing} spellCheck={false} autoCapitalize="off" autoCorrect="off" wrap="off" maxLength={20000} onChange={event => changeCode(event.target.value)} onKeyDown={event => {
        if (event.key === 'Tab') {
          event.preventDefault();
          const { selectionStart: start, selectionEnd: end } = event.currentTarget;
          changeCode(code.slice(0, start) + '    ' + code.slice(end));
          requestAnimationFrame(() => editorRef.current?.setSelectionRange(start + 4, start + 4));
        }
      }} />
      {editorExpanded && <div className="practice-expanded-footer">{practiceActions}<span role="status" aria-live="polite">{scenarioResult ? scenarioResult.error ? '场景未跑通，收起编辑器查看详情。' : '场景已运行，收起编辑器查看输出。' : result ? passed ? '验收全部通过。' : '验收未通过，收起编辑器查看详情。' : '按 Esc 返回题目与测试结果'}</span></div>}
    </div>
    {!editorExpanded && practiceActions}
    {fullscreenError && <p className="practice-hint" role="alert">{fullscreenError}</p>}
    {importMessage && <p className="practice-hint" role="status" aria-live="polite">{importMessage}</p>}
    <p className="practice-hint">{native?'下载包中的 verify.py 运行与本页一致的自动测试。导入时核对任务、代码和用例版本，全部通过后保存完成记录。保存草稿会将任务设为待验收。':'“运行场景”执行整个程序并显示业务输出；“运行并验收”检查组件边界及上下游协作，全部通过会自动完成本任务。保存草稿会将任务设为待验收。首次运行需要下载 Python 环境，练习无需 API Key。'}</p>
    {scenarioResult && <section className={'scenario-result ' + (scenarioResult.error ? 'failed' : 'passed')} aria-label="场景运行结果" aria-live="polite"><strong>{scenarioResult.error ? '场景未跑通 · 根据错误补全组件' : '场景已运行 · 查看上下游协作结果'}</strong><pre>{scenarioResult.error || scenarioResult.output || '程序已执行，没有打印输出。'}</pre><span>场景运行用于观察程序行为；任务完成以自动验收为准。</span></section>}
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
    <p className="practice-hint">{native?'本节使用真实 LangGraph 1.2.14 与固定业务数据，运行与验收无需 API Key。每周项目会继续练习模型接入、持久化和服务交付。':'这些场景用固定数据模拟框架的关键行为，只需要 Python 标准库。第 7–12 周提供真实 LangGraph API 练习，每周实战项目用于完整集成。'}</p>
  </div>;
}
