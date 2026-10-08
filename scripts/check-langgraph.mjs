import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {langgraphChallenges} from '../app/langgraph-challenges.ts';
import {contextualizeCode} from '../app/challenge-scenarios.ts';
import {buildGradingScript,buildScenarioScript} from '../app/python-grader.ts';
import {langgraphSolutions} from '../app/langgraph-solutions.ts';
const python=process.env.CHALLENGE_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
function execute(script){
  const run=spawnSync(python,['-c',script+'\nprint(_grading_result)'],{encoding:'utf8',timeout:20000,env:{...process.env,PYTHONIOENCODING:'utf-8'}});
  assert.equal(run.status,0,run.stderr||String(run.error));
  return JSON.parse(run.stdout);
}
assert.equal(Object.keys(langgraphChallenges).length,24);
assert.deepEqual(Object.keys(langgraphChallenges),Object.keys(langgraphSolutions));
let count=0;
for(const [id,c] of Object.entries(langgraphChallenges)){
  const code=contextualizeCode(c.context,langgraphSolutions[id]);
  const correct=execute(buildGradingScript(code,c.tests));
  assert.equal(correct.error,null,id);
  assert.ok(correct.tests.every(t=>t.passed),`${id}: ${JSON.stringify(correct.tests.filter(t=>!t.passed))}`);
  const scene=execute(buildScenarioScript(code));
  assert.equal(scene.error,null,`${id}: ${scene.error}`);
  assert.deepEqual(JSON.parse(scene.output),c.context.expected,`${id}: scenario`);
  const starter=execute(buildGradingScript(c.starter,c.tests));
  assert.ok(starter.error || starter.tests.every(t=>!t.passed),`${id}: unfinished code accepted`);
  const broken=execute(buildGradingScript(code+'\ndef run_scenario():\n    return {}\n',c.tests));
  assert.ok(broken.tests.slice(0,-1).every(t=>t.passed),`${id}: component regression`);
  assert.equal(broken.tests.at(-1).passed,false,`${id}: broken integration accepted`);
  count+=c.tests.length;
  console.log(`${id}: ${c.tests.length} LangGraph acceptance cases and real scenario passed`);
}
console.log(`Verified 24 real LangGraph scenarios / ${count} acceptance cases; unfinished code and broken integrations rejected.`);
