import type { CodeTest } from './code-challenges';
import { buildGradingScript, type GradingResult } from './python-grader.ts';

export const langgraphRequirements='langgraph==1.2.14\nlangchain-core==1.6.7\nlanggraph-checkpoint-sqlite==3.1.1\n';
export async function sha256(value:string):Promise<string>{
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}

export function buildLocalVerifier(lessonId:string,tests:CodeTest[]):string{
  const harness=buildGradingScript('',[]).split('\n_grading_result =')[0];
  const serialized=JSON.stringify(tests);
  return `# 自动生成的本地 LangGraph 验收；与网页使用同一组测试。
import sys, os, json, hashlib, subprocess, importlib.metadata
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
LESSON = ${JSON.stringify(lessonId)}
TEST_TEXT = ${JSON.stringify(serialized)}
TESTS = json.loads(TEST_TEXT)
HARNESS = ${JSON.stringify(harness)}

if "--worker" in sys.argv:
    scope = {}
    exec(HARNESS, scope)
    data = json.load(sys.stdin)
    print(json.dumps(scope["_grade"](data), ensure_ascii=False))
    raise SystemExit(0)

root = Path(__file__).resolve().parent
code = (root / "solution.py").read_bytes().decode("utf-8-sig")
try:
    version = importlib.metadata.version("langgraph")
    if version != "1.2.14":
        raise RuntimeError("请先安装 requirements.txt：本课使用 langgraph==1.2.14")
    run = subprocess.run([sys.executable, str(Path(__file__).resolve()), "--worker"],
        input=json.dumps({"code":code,"tests":TESTS,"mode":"acceptance"},ensure_ascii=False),
        text=True,encoding="utf-8",capture_output=True,timeout=45,
        env={**os.environ,"PYTHONIOENCODING":"utf-8"})
    if run.returncode != 0:
        raise RuntimeError(run.stderr[-3000:] or "验收进程异常退出")
    result = json.loads(run.stdout)
except Exception as error:
    result = {"tests":[],"error":str(error)[:3000],"output":""}
report = {"schema":1,"lesson_id":LESSON,
    "code_sha256":hashlib.sha256(code.encode("utf-8")).hexdigest(),
    "tests_sha256":hashlib.sha256(TEST_TEXT.encode("utf-8")).hexdigest(),**result}
(root / "result.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
passed = not result["error"] and len(result["tests"]) == len(TESTS) and all(t["passed"] for t in result["tests"])
for test in result["tests"]:
    print(("PASS " if test["passed"] else "FAIL ") + test["name"])
    if not test["passed"]: print(test["detail"])
if result["error"]: print(result["error"])
print("全部通过。将 result.json 导入网页。" if passed else "尚未通过。修改 solution.py 后再次运行。")
raise SystemExit(0 if passed else 1)
`;
}

export async function validateLocalReport(value:unknown,lessonId:string,code:string,tests:CodeTest[]):Promise<GradingResult>{
  if(!value || typeof value!=='object')throw new Error('请选择 verify.py 生成的 result.json。');
  const report=value as Record<string,unknown>;
  if(report.schema!==1 || report.lesson_id!==lessonId)throw new Error('验收结果不属于当前任务，请下载本任务运行包。');
  if(report.code_sha256!==await sha256(code))throw new Error('结果与当前代码不一致。若在本地修改过，请先导入 solution.py，再导入它的 result.json；否则请重新运行验收。');
  if(report.tests_sha256!==await sha256(JSON.stringify(tests)))throw new Error('验收用例已更新，请重新下载运行包并验收。');
  if(!(report.error===null || typeof report.error==='string') || typeof report.output!=='string' || !Array.isArray(report.tests))throw new Error('验收文件格式无效。');
  if(report.tests.length!==tests.length && !(typeof report.error==='string' && report.tests.length===0))throw new Error('验收结果缺少测试，请重新运行 verify.py。');
  const results=report.tests.map((item:unknown,index:number)=>{
    if(!item || typeof item!=='object')throw new Error('测试结果格式无效。');
    const t=item as Record<string,unknown>;
    if(t.name!==tests[index].name || typeof t.passed!=='boolean' || typeof t.detail!=='string')throw new Error('测试结果与当前用例不一致。');
    return {name:t.name,passed:t.passed,detail:t.detail.slice(0,3000)};
  });
  return {tests:results,error:typeof report.error==='string'?report.error.slice(0,3000):null,output:report.output.slice(0,4000)};
}

// ZIP STORE format: no additional browser dependency, UTF-8 filenames and content.
export function zipFiles(files:Record<string,string>):Uint8Array{
  const encoder=new TextEncoder();const parts:Uint8Array[]=[];const directory:Uint8Array[]=[];let offset=0;
  const header=(size:number)=>{const bytes=new Uint8Array(size);return {bytes,view:new DataView(bytes.buffer)}};
  for(const [name,text] of Object.entries(files)){
    const filename=encoder.encode(name),body=encoder.encode(text);let crc=0xffffffff;
    for(const byte of body){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}crc=(crc^0xffffffff)>>>0;
    const h=header(30);h.view.setUint32(0,0x04034b50,true);h.view.setUint16(4,20,true);h.view.setUint16(6,0x800,true);h.view.setUint16(12,0x21,true);h.view.setUint32(14,crc,true);h.view.setUint32(18,body.length,true);h.view.setUint32(22,body.length,true);h.view.setUint16(26,filename.length,true);
    parts.push(h.bytes,filename,body);
    const d=header(46);d.view.setUint32(0,0x02014b50,true);d.view.setUint16(4,20,true);d.view.setUint16(6,20,true);d.view.setUint16(8,0x800,true);d.view.setUint16(14,0x21,true);d.view.setUint32(16,crc,true);d.view.setUint32(20,body.length,true);d.view.setUint32(24,body.length,true);d.view.setUint16(28,filename.length,true);d.view.setUint32(42,offset,true);
    directory.push(d.bytes,filename);offset+=30+filename.length+body.length;
  }
  const end=header(22),directorySize=directory.reduce((sum,p)=>sum+p.length,0);
  end.view.setUint32(0,0x06054b50,true);end.view.setUint16(8,directory.length/2,true);end.view.setUint16(10,directory.length/2,true);end.view.setUint32(12,directorySize,true);end.view.setUint32(16,offset,true);
  const out=new Uint8Array(offset+directorySize+22);let cursor=0;
  for(const part of [...parts,...directory,end.bytes]){out.set(part,cursor);cursor+=part.length}return out;
}

export function localChallengeFiles(lessonId:string,code:string,tests:CodeTest[]):Record<string,string>{
  return {'solution.py':code,'verify.py':buildLocalVerifier(lessonId,tests),'requirements.txt':langgraphRequirements,'README.md':`# ${lessonId} · LangGraph 实战

需要 Python 3.11+。解压后在此目录执行：

    python -m venv .venv
    .venv\\Scripts\\python -m pip install -r requirements.txt
    .venv\\Scripts\\python solution.py
    .venv\\Scripts\\python verify.py

macOS / Linux 将 .venv\\Scripts\\python 换成 .venv/bin/python。
solution.py 运行完整场景；verify.py 执行网页同一组验收并生成 result.json。
测试代码会在独立进程运行，整组验收限时 45 秒。
这些练习使用真实 LangGraph API 与固定业务数据，无需模型 API Key。

可以在网页编辑代码后重新下载，也可以修改此目录的 solution.py。
若本地修改过，请先在网页导入 solution.py，再导入 result.json。
网页会核对任务、代码和用例版本，全部通过后保存完成进度。
导入结果用于自己的学习记录，不作为受信考试证明。
`};
}
