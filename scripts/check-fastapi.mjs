import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fastapiChallenges } from '../app/fastapi-challenges.ts';
import { fastapiSolutions } from '../app/fastapi-solutions.ts';
import { contextualizeCode } from '../app/challenge-scenarios.ts';
import { buildGradingScript, buildScenarioScript } from '../app/python-grader.ts';

const python = process.env.CHALLENGE_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');

function execute(script) {
  const run = spawnSync(python, ['-c', script + '\nprint(_grading_result)'], {
    encoding: 'utf8',
    timeout: 30000,
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
  });
  assert.equal(run.status, 0, run.stderr || String(run.error));
  return JSON.parse(run.stdout);
}

assert.equal(Object.keys(fastapiChallenges).length, 24);
assert.deepEqual(Object.keys(fastapiChallenges), Object.keys(fastapiSolutions));

let count = 0;
for (const [id, challenge] of Object.entries(fastapiChallenges)) {
  const code = contextualizeCode(challenge.context, fastapiSolutions[id]);
  const correct = challenge.tests.flatMap(test => {
    const result = execute(buildGradingScript(code, [test]));
    assert.equal(result.error, null, `${id}: ${result.error}`);
    return result.tests;
  });
  assert.ok(correct.every(test => test.passed), `${id}: ${JSON.stringify(correct.filter(test => !test.passed))}`);

  const scenario = execute(buildScenarioScript(code));
  assert.equal(scenario.error, null, `${id}: ${scenario.error}`);
  assert.deepEqual(JSON.parse(scenario.output), challenge.context.expected, `${id}: scenario`);

  const starter = challenge.tests.map(test => execute(buildGradingScript(challenge.starter, [test])));
  assert.ok(starter.every(result => result.error || result.tests.every(test => !test.passed)), `${id}: unfinished code accepted`);
  count += challenge.tests.length;
  console.log(`${id}: ${challenge.tests.length} FastAPI acceptance cases and real scenario passed`);
}

console.log(`Verified 24 real FastAPI scenarios / ${count} acceptance cases; unfinished implementations rejected.`);
