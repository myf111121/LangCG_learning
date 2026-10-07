import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {localChallengeFiles,zipFiles,validateLocalReport} from '../app/local-challenge.ts';
import {codeChallenges} from '../app/code-challenges.ts';
import {contextualizeCode} from '../app/challenge-scenarios.ts';
import {langgraphSolutions} from './langgraph-solutions.mjs';
import {allLessons,phases,sources,quizzes,courseWeeks,courseTasks,courseHours} from '../app/curriculum.ts';
import {parseWeek,lessonWeek,lessonHref} from '../app/learning-navigation.ts';
assert.equal(courseWeeks,12);assert.equal(courseTasks,48);assert.equal(courseHours,144);
assert.equal(new Set(allLessons.map(l=>l.id)).size,48);
assert.deepEqual(Object.keys(codeChallenges),allLessons.map(l=>l.id));
assert.equal(new Set(sources.map(s=>s.id)).size,sources.length);
for(const p of phases){assert.equal(p.lessons.length,4);assert.equal(parseWeek(p.week),p.week);for(const l of p.lessons){assert.equal(lessonWeek(l.id),p.week);for(const ref of l.refs)assert.ok(sources.some(s=>s.id===ref));if(p.track)assert.equal(l.reading.length,3)}}
for(let w=0;w<=12;w++)assert.ok(quizzes.some(q=>q.week===w));
for(const q of quizzes)assert.ok(sources.some(s=>s.id===q.ref));
assert.equal(parseWeek(13),1);assert.match(lessonHref('w12-4','practice','roadmap',12),/week=12/);
const python=process.env.CHALLENGE_PYTHON||'python';
const root=mkdtempSync(join(tmpdir(),'graph-study-runner-'));
try{
  for(const id of ['w7-1','w9-2','w10-4','w11-4','w12-3']){
    const c=codeChallenges[id],code=contextualizeCode(c.context,langgraphSolutions[id]);
    const files=localChallengeFiles(id,code,c.tests);writeFileSync(join(root,'bundle.zip'),zipFiles(files));
    let run=spawnSync(python,['-c','import zipfile,sys; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; z.extractall(sys.argv[2])',join(root,'bundle.zip'),root],{encoding:'utf8'});
    assert.equal(run.status,0,run.stderr);
    assert.equal(readFileSync(join(root,'solution.py'),'utf8'),code);
    run=spawnSync(python,[join(root,'verify.py')],{encoding:'utf8',timeout:60000});
    assert.equal(run.status,0,run.stderr+run.stdout);
    const report=JSON.parse(readFileSync(join(root,'result.json'),'utf8'));
    const valid=await validateLocalReport(report,id,code,c.tests);assert.ok(valid.tests.every(t=>t.passed));
    await assert.rejects(validateLocalReport(report,'w12-4',code,c.tests),/当前任务/);
    await assert.rejects(validateLocalReport(report,id,code+'\n',c.tests),/当前代码/);
    await assert.rejects(validateLocalReport(report,id,code,[...c.tests,{name:'changed',code:'pass'}]),/更新/);
    await assert.rejects(validateLocalReport({...report,tests:report.tests.slice(1)},id,code,c.tests),/缺少/);
    const malformed=structuredClone(report);malformed.tests[0].passed='true';
    await assert.rejects(validateLocalReport(malformed,id,code,c.tests),/不一致/);
    writeFileSync(join(root,'solution.py'),c.starter);
    run=spawnSync(python,[join(root,'verify.py')],{encoding:'utf8',timeout:60000});assert.equal(run.status,1);
    const failed=await validateLocalReport(JSON.parse(readFileSync(join(root,'result.json'),'utf8')),id,c.starter,c.tests);
    assert.ok(failed.tests.every(t=>!t.passed));
  }
}finally{rmSync(root,{recursive:true,force:true})}
console.log('Verified 12-week navigation and curriculum; ZIP extraction, native verifier, matching imports, stale/malformed results and incomplete solutions.');
