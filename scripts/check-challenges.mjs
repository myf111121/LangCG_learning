import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { codeChallenges } from '../app/code-challenges.ts';
import { buildGradingScript } from '../app/python-grader.ts';

// Reference implementations are verification fixtures, never imported by the UI.
const solutions = {
  'w1-1': `def run_agent(actions, tools):
    trace = []
    for action in actions:
        if action['type'] == 'final':
            return {'answer': action['answer'], 'trace': trace}
        if action['name'] not in tools:
            raise ValueError('unknown tool')
        result = tools[action['name']](**action['args'])
        trace.append({'tool': action['name'], 'args': action['args'], 'result': result})
    raise ValueError('missing final')`,
  'w1-2': `def search_notes(query, limit, backend, max_attempts=3):
    if not isinstance(query, str) or not query.strip() or type(limit) is not int or not 1 <= limit <= 5 or type(max_attempts) is not int or not 1 <= max_attempts <= 3:
        raise ValueError('invalid parameters')
    for attempt in range(max_attempts):
        try:
            return backend(query.strip(), limit)
        except TimeoutError:
            if attempt == max_attempts - 1:
                raise`,
  'w1-3': `def validate_answer(payload, available_ids):
    if not isinstance(payload.get('answer'), str) or not payload['answer'].strip() or not isinstance(payload.get('source_ids'), list) or type(payload.get('needs_clarification')) is not bool:
        raise ValueError('schema')
    ids = payload['source_ids']
    if any(not isinstance(i, str) or i not in available_ids for i in ids) or not ids and not payload['needs_clarification']:
        raise ValueError('sources')
    return {k: payload[k] for k in ['answer', 'source_ids', 'needs_clarification']}`,
  'w1-4': `def summarize_runs(runs):
    if len({r['id'] for r in runs}) != len(runs):
        raise ValueError('duplicate')
    n = len(runs)
    return {'count': n, 'success_rate': sum(r['passed'] for r in runs) / n if n else 0, 'mean_latency_ms': sum(r['latency_ms'] for r in runs) / n if n else 0, 'total_tokens': sum(r['tokens'] for r in runs)}`,
  'w2-1': `import copy
def merge_state(state, update):
    result = copy.deepcopy(state)
    result.update(copy.deepcopy({k: v for k, v in update.items() if k != 'events'}))
    if 'events' in state or 'events' in update:
        events, seen = [], set()
        for e in state.get('events', []) + update.get('events', []):
            if e['id'] not in seen:
                events.append(copy.deepcopy(e))
                seen.add(e['id'])
        result['events'] = events
    return result`,
  'w2-2': `def route_query(state):
    if state.get('documents', []):
        return 'answer'
    return 'rewrite' if state.get('rewrite_count', 0) < 2 else 'clarify'`,
  'w2-3': `import copy, json
class CheckpointStore:
    def __init__(self, snapshot=None):
        self.data = json.loads(snapshot) if snapshot else {}
    def save(self, thread_id, state):
        self.data[thread_id] = copy.deepcopy(state)
    def load(self, thread_id):
        return copy.deepcopy(self.data.get(thread_id))
    def dump(self):
        return json.dumps(self.data)`,
  'w2-4': `def write_once(request_id, text, ledger, write):
    if request_id not in ledger:
        ledger[request_id] = write(text)
    return ledger[request_id]`,
  'w3-1': `def approval_step(draft, decision, write):
    if decision is None:
        return {'status': 'paused', 'draft': draft}
    if type(decision) is not bool:
        raise ValueError('decision')
    if decision:
        return {'status': 'approved', 'result': write(draft)}
    return {'status': 'rejected'}`,
  'w3-2': `def apply_decision(request_id, draft, decision, edited_text, ledger, write):
    if request_id in ledger:
        return ledger[request_id]
    if decision not in ['approve', 'reject', 'edit'] or decision == 'edit' and (not isinstance(edited_text, str) or not edited_text.strip()):
        raise ValueError('decision')
    text = None if decision == 'reject' else edited_text if decision == 'edit' else draft
    result = None if decision == 'reject' else write(text)
    record = {'request_id': request_id, 'decision': decision, 'text': text, 'result': result}
    ledger[request_id] = record
    return record`,
  'w3-3': `import copy
class MemoryStore:
    def __init__(self):
        self.data = {}
    def set_preference(self, user_id, key, value):
        self.data[(user_id, key)] = copy.deepcopy(value)
    def get_preference(self, user_id, key):
        return copy.deepcopy(self.data.get((user_id, key)))
    def delete_preference(self, user_id, key):
        self.data.pop((user_id, key), None)`,
  'w3-4': `def update_facts(facts, events):
    result = dict(facts)
    for event in events:
        if event['confirmed'] is True:
            if event['value'] is None:
                result.pop(event['key'], None)
            else:
                result[event['key']] = event['value']
    return result`,
  'w4-1': `def retrieve(query_tokens, chunks, k):
    if type(k) is not int or k < 1:
        raise ValueError('k')
    ranked = [(len(set(query_tokens) & set(c['tokens'])), i, c) for i, c in enumerate(chunks)]
    ranked.sort(key=lambda item: (-item[0], item[1]))
    return [c for score, i, c in ranked if score > 0][:k]`,
  'w4-2': `def grade_evidence(documents):
    docs = [d for d in documents if d['relevant'] is True]
    ids = list(dict.fromkeys(d['id'] for d in docs))
    route = 'clarify' if not docs else 'conflict' if len({d['claim'] for d in docs}) > 1 else 'generate'
    return {'route': route, 'source_ids': ids}`,
  'w4-3': `def retrieve_with_rewrite(query, retrieve, rewrite):
    queries = [query]
    docs = retrieve(query)
    if not docs:
        queries.append(rewrite(query))
        docs = retrieve(queries[-1])
    return {'documents': docs, 'queries': queries, 'needs_clarification': not bool(docs)}`,
  'w4-4': `def check_citations(answer, chunks):
    by_id = {c['id']: c for c in chunks}
    invalid, valid = [], []
    for i in answer['source_ids']:
        c = by_id.get(i)
        if c and c['trusted'] is True and not c['expired'] and c['claim'] == answer['claim']:
            valid.append(i)
        elif i not in invalid:
            invalid.append(i)
    return {'passed': bool(valid) and not invalid, 'invalid_ids': invalid, 'needs_clarification': not bool(valid)}`,
  'w5-1': `def choose_architecture(single, multi):
    return 'multi' if multi['success_rate'] - single['success_rate'] >= 0.1 - 1e-9 and multi['latency_ms'] <= single['latency_ms'] * 1.5 and multi['tokens'] <= single['tokens'] * 2 else 'single'`,
  'w5-2': `def call_retrieval_subgraph(parent_state, subgraph):
    result = subgraph({'query': parent_state['query']})
    docs = result.get('documents')
    if not isinstance(docs, list) or any(not isinstance(d, dict) or any(not isinstance(d.get(k), str) for k in ['id', 'text', 'source_id']) for d in docs):
        raise ValueError('documents')
    return {**parent_state, 'documents': docs, 'source_ids': list(dict.fromkeys(d['source_id'] for d in docs))}`,
  'w5-3': `def merge_results(results):
    docs, errors, seen = [], [], set()
    for result in results:
        if result['error'] is not None:
            errors.append({'task_id': result['task_id'], 'error': result['error']})
        else:
            for doc in result['documents']:
                if doc['source_id'] not in seen:
                    docs.append(doc)
                    seen.add(doc['source_id'])
    return {'documents': docs, 'errors': errors}`,
  'w5-4': `def review_once(draft, review, revise):
    reviews = [review(draft)]
    if not reviews[0]['passed']:
        draft = revise(draft, reviews[0]['issues'])
        reviews.append(review(draft))
    return {'draft': draft, 'passed': reviews[-1]['passed'], 'reviews': reviews}`,
  'w6-1': `def evaluate_dataset(rows):
    if len({r['id'] for r in rows}) != len(rows):
        raise ValueError('duplicate')
    failures = {}
    for r in rows:
        if not r['passed']:
            k = r.get('failure_type') or 'unknown'
            failures[k] = failures.get(k, 0) + 1
    return {'count': len(rows), 'success_rate': sum(r['passed'] for r in rows) / len(rows) if rows else 0, 'failures': failures}`,
  'w6-2': `def reduce_stream(state, event):
    result = dict(state)
    if state['status'] in ['completed', 'failed']:
        return result
    t = event['type']
    if t == 'update': result['node'] = event['node']
    elif t == 'token' and state['status'] != 'waiting': result['text'] += event['text']
    elif t == 'interrupt': result['status'] = 'waiting'
    elif t == 'resume': result['status'] = 'running'
    elif t == 'error': result.update(status='failed', error=event['message'])
    elif t == 'done': result['status'] = 'completed'
    return result`,
  'w6-3': `def handle_request(user_id, thread_id, request_id, text, sessions, seen):
    if any(not isinstance(i, str) or not i.strip() for i in [user_id, thread_id, request_id]):
        raise ValueError('id')
    key, request = (user_id, thread_id), (user_id, thread_id, request_id)
    if request not in seen:
        sessions.setdefault(key, []).append(text)
        seen[request] = True
    return list(sessions.get(key, []))`,
  'w6-4': `import math
def build_release_report(rows, checks):
    n = len(rows)
    success = sum(r['passed'] for r in rows) / n if n else 0
    citations = sum(r['citation_valid'] for r in rows) / n if n else 0
    p95 = sorted(r['latency_ms'] for r in rows)[math.ceil(.95 * n) - 1] if n else 0
    return {'count': n, 'success_rate': success, 'citation_rate': citations, 'p95_latency_ms': p95, 'total_cost': sum(r['cost'] for r in rows), 'ready': n >= 30 and success >= .8 and citations >= .9 and all(checks.get(k) is True for k in ['reproducible', 'approval', 'recovery'])}`,
};

const python = process.env.CHALLENGE_PYTHON || 'python';
function grade(code, tests) {
  const script = buildGradingScript(code, tests) + '\nprint(_grading_result)\n';
  const run = spawnSync(python, ['-c', script], { encoding: 'utf8', timeout: 10000, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
  assert.equal(run.status, 0, run.stderr || String(run.error));
  return JSON.parse(run.stdout);
}

const lessonIds = [...readFileSync(new URL('../app/curriculum.ts', import.meta.url), 'utf8').matchAll(/L\('(w\d-\d)'/g)].map(match => match[1]);
assert.equal(lessonIds.length, 24);
assert.deepEqual(Object.keys(codeChallenges), lessonIds);
let count = 0;
for (const [id, challenge] of Object.entries(codeChallenges)) {
  const correct = grade(solutions[id], challenge.tests);
  assert.equal(correct.error, null, id);
  assert.ok(correct.tests.every(test => test.passed), `${id}: ${JSON.stringify(correct.tests.filter(test => !test.passed))}`);
  const unfinished = grade(challenge.starter, challenge.tests);
  assert.ok(unfinished.tests.every(test => !test.passed), `${id}: starter incorrectly accepted`);
  const wrong = grade(solutions[id].replace(/return /g, 'return None # '), challenge.tests);
  assert.ok(wrong.error || wrong.tests.some(test => !test.passed), `${id}: incorrect implementation accepted`);
  count += challenge.tests.length;
}
const syntax = grade('def broken(:', codeChallenges['w1-1'].tests);
assert.ok(syntax.error.includes('SyntaxError'));
assert.equal(syntax.tests.length, 0);
const output = grade('print("x" * 10000)', [{ name: 'capture', code: 'expect_equal(1, 1)' }]);
assert.equal(output.output.length, 4000);
const exit = grade('raise SystemExit(0)', [{ name: 'exit', code: 'expect_equal(1, 1)' }]);
assert.equal(exit.tests[0].passed, false);
console.log(`Verified ${lessonIds.length} challenges / ${count} acceptance cases; unfinished and incorrect code rejected; syntax errors and output limits checked.`);
