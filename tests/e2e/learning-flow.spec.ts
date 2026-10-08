import { expect, test, type Page, type Route } from '@playwright/test';

type StoredRecord = {
  item_id: string;
  completed: number;
  note: string;
  code: string;
  updated_at: string;
};

async function mockLearningApi(page: Page, initial: StoredRecord[] = []) {
  const records = new Map(initial.map(record => [record.item_id, record]));
  const writes: Array<Record<string, unknown>> = [];

  await page.route('**/api/learning', async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: { records: [...records.values()] } });
      return;
    }

    const body = route.request().postDataJSON() as Record<string, unknown>;
    writes.push(body);
    const id = String(body.id);
    const previous = records.get(id) ?? {
      item_id: id,
      completed: 0,
      note: '',
      code: '',
      updated_at: '',
    };
    records.set(id, {
      ...previous,
      completed: body.completed === undefined ? previous.completed : body.completed ? 1 : 0,
      note: typeof body.note === 'string' ? body.note : previous.note,
      code: typeof body.code === 'string' ? body.code : previous.code,
      updated_at: '2026-10-08T08:00:00.000Z',
    });
    await route.fulfill({ json: { ok: true, updated_at: '2026-10-08T08:00:00.000Z' } });
  });

  return { records, writes };
}

test('学习者可以浏览路线并从独立地址打开任务', async ({ page }) => {
  await mockLearningApi(page);
  await page.goto('/');

  await expect(page.getByRole('heading', { name: '把知识，变成可交付的系统。' })).toBeVisible();
  await expect(page.getByText('进度与笔记保存到当前账户')).toBeVisible();

  await page.getByRole('button', { name: /学习路线/ }).click();
  await expect(page).toHaveURL(/view=roadmap/);
  await expect(page.getByRole('heading', { name: '每一步，都有可运行的成果。' })).toBeVisible();

  await page.getByRole('link', { name: /重新理解 Agent 的执行循环/ }).click();
  await expect(page).toHaveURL(/\/learn\/w1-1/);
  await expect(page.getByRole('heading', { name: '重新理解 Agent 的执行循环' })).toBeVisible();
  await expect(page.getByRole('tab', { name: /理解与阅读/ })).toHaveAttribute('aria-selected', 'true');
});

test('代码草稿通过 API 保存，并在重新加载后恢复', async ({ page }) => {
  const api = await mockLearningApi(page);
  await page.goto('/learn/w1-1?tab=practice&from=roadmap&week=1');

  const editor = page.getByLabel('Python 代码编辑器');
  await expect(editor).toBeVisible();
  await expect(page.getByText('代码、进度与笔记保存到当前账户')).toBeVisible();
  const draft = '# restored draft\ndef run_agent(actions, tools):\n    return {"answer": "draft", "trace": []}\n';
  await editor.fill(draft);
  await page.getByRole('button', { name: '保存草稿' }).click();

  await expect.poll(() => api.writes.length).toBe(1);
  expect(api.writes[0]).toMatchObject({ id: 'w1-1', code: draft, completed: false });
  await expect(page.getByText('代码已保存')).toBeVisible();

  await page.reload();
  await expect(editor).toContainText('# restored draft');
  await expect(editor).toContainText('return {"answer": "draft", "trace": []}');
  await expect(page.getByText('已保存', { exact: true })).toBeVisible();
});

test('Python 编辑器提供自动缩进和上下文代码提示', async ({ page }) => {
  await mockLearningApi(page);
  await page.goto('/learn/w1-1?tab=practice&from=roadmap&week=1');

  const editor = page.getByLabel('Python 代码编辑器');
  await editor.fill('def greet(name):');
  await editor.press('End');
  await editor.press('Enter');
  await editor.pressSequentially('return name');
  await expect.poll(() => editor.evaluate(element => (element as HTMLElement).innerText)).toContain('def greet(name):\n    return name');

  await editor.fill('pri');
  await page.getByRole('button', { name: '智能提示' }).click();
  await expect(page.locator('.cm-tooltip-autocomplete')).toContainText('print');

  await editor.fill('from langgraph.graph import Sta');
  await page.getByRole('button', { name: '智能提示' }).click();
  await expect(page.locator('.cm-tooltip-autocomplete')).toContainText('StateGraph');

  await editor.fill('from langgraph.graph import StateGraph\nbuilder = StateGraph(dict)\nbuilder.add_n');
  await page.getByRole('button', { name: '智能提示' }).click();
  await expect(page.locator('.cm-tooltip-autocomplete')).toContainText('add_node');
  await page.keyboard.press('Tab');
  await expect.poll(() => editor.evaluate(element => (element as HTMLElement).innerText)).toContain('builder.add_node("name", action)');

  await editor.fill('class State(TypedDict):\n    query: str\n    answer: str\n\ndef node(state):\n    return state["qu');
  await page.getByRole('button', { name: '智能提示' }).click();
  await expect(page.locator('.cm-tooltip-autocomplete')).toContainText('query');

  await editor.fill('from fastapi import Fast');
  await page.getByRole('button', { name: '智能提示' }).click();
  await expect(page.locator('.cm-tooltip-autocomplete')).toContainText('FastAPI');

  await editor.fill('from fastapi import FastAPI\napp = FastAPI()\napp.inc');
  await page.getByRole('button', { name: '智能提示' }).click();
  await expect(page.locator('.cm-tooltip-autocomplete')).toContainText('include_router');
});

test('在线验收全部通过后会保存代码并完成任务', async ({ page }) => {
  const api = await mockLearningApi(page);
  await page.route('**/python-worker.js', route => route.fulfill({
    contentType: 'text/javascript',
    body: `self.onmessage = () => {
      self.postMessage({ type: 'running' });
      self.postMessage({
        type: 'result',
        result: {
          error: null,
          output: '',
          tests: [1, 2, 3, 4].map(index => ({ name: 'case-' + index, passed: true, detail: '行为符合预期' }))
        }
      });
    };`,
  }));
  await page.goto('/learn/w1-1?tab=practice&from=roadmap&week=1');
  await expect(page.getByText('代码、进度与笔记保存到当前账户')).toBeVisible();

  await page.getByRole('button', { name: '运行并验收' }).click();
  await expect(page.getByText('全部通过 · 4 / 4')).toBeVisible();
  await expect.poll(() => api.writes.length).toBe(1);
  expect(api.writes[0]).toMatchObject({ id: 'w1-1', completed: true });
  await expect(page.getByText('已通过验收')).toBeVisible();
});

test('已完成记录会恢复，数据库错误也提供可重试状态', async ({ page }) => {
  await mockLearningApi(page, [{
    item_id: 'w1-1',
    completed: 1,
    note: '已验证工具循环',
    code: 'def run_agent(actions, tools):\n    return {"answer": "ok", "trace": []}\n',
    updated_at: '2026-10-08T08:00:00.000Z',
  }]);
  await page.goto('/learn/w1-1?from=roadmap&week=1');
  await expect(page.getByText('已通过验收')).toBeVisible();
  await page.getByRole('tab', { name: '学习笔记' }).click();
  await expect(page.getByLabel('理解与实验结果')).toHaveValue('已验证工具循环');

  await page.unroute('**/api/learning');
  await page.route('**/api/learning', route => route.fulfill({ status: 503, json: { error: '数据库暂时不可用' } }));
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('数据库暂时不可用');
  await expect(page.getByRole('button', { name: '重新读取' })).toBeVisible();
});

test('LangGraph 任务先编辑，再揭示正确代码并显示差异', async ({ page }) => {
  const api = await mockLearningApi(page);
  await page.goto('/learn/w7-1?tab=practice&from=roadmap&week=7');

  await expect(page.getByRole('heading', { name: '用 StateGraph 编译第一个工作流', level: 1 })).toBeVisible();
  await expect(page.getByText('先独立实现，再按需查看答案')).toBeVisible();
  const editor = page.getByLabel('Python 代码编辑器');
  await expect(editor).toContainText('raise NotImplementedError');
  await expect(page.locator('.reference-comparison')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '下载运行与验收包' })).toHaveCount(0);
  await expect(page.getByText('代码、进度与笔记保存到当前账户')).toBeVisible();
  const learnerCode = 'def build_graph():\n    return None\n';
  await editor.fill(learnerCode);
  await page.getByRole('button', { name: '保存草稿' }).click();
  await expect.poll(() => api.writes.length).toBe(1);
  expect(api.writes[0]).toMatchObject({ id: 'w7-1', code: learnerCode, completed: false });

  await page.getByRole('button', { name: '显示正确代码' }).click();
  await expect(page.getByRole('heading', { name: '逐行对照' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: '我的代码' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: '正确代码' })).toBeVisible();
  await expect(page.locator('.reference-diff-line.right', { hasText: 'builder.add_node("normalize", normalize)' })).toBeVisible();
  await expect(page.locator('.reference-diff-row.changed, .reference-diff-row.added, .reference-diff-row.removed').first()).toBeVisible();
  await page.getByRole('button', { name: '只看差异' }).click();
  await expect(page.locator('.reference-diff-row.equal')).toHaveCount(0);

  await page.getByRole('button', { name: '已对照，完成任务' }).click();
  await expect.poll(() => api.writes.length).toBe(2);
  expect(api.writes[1]).toMatchObject({ id: 'w7-1', code: learnerCode, completed: true });
  await expect(page.locator('.learning-status')).toHaveText('已完成');
});

test('FastAPI 路线可进入，任务可揭示经验证的正确代码', async ({ page }) => {
  await mockLearningApi(page);
  await page.goto('/?view=roadmap&week=13');

  await expect(page.getByRole('button', { name: 'W13–18 · FastAPI' })).toHaveClass(/active/);
  await expect(page.getByRole('heading', { name: 'API 契约与数据校验' })).toBeVisible();
  await page.getByRole('link', { name: /创建第一个 FastAPI 应用与路径操作/ }).click();

  await expect(page).toHaveURL(/\/learn\/w13-1/);
  await page.goto('/learn/w13-1?tab=practice&from=roadmap&week=13');
  await expect(page.getByText('FastAPI · 先写后对照')).toBeVisible();
  await expect(page.getByLabel('Python 代码编辑器')).toContainText('raise NotImplementedError');

  await page.getByRole('button', { name: '显示正确代码' }).click();
  await expect(page.getByRole('heading', { name: '逐行对照' })).toBeVisible();
  await expect(page.locator('.reference-diff-line.right', { hasText: 'app = FastAPI(title="Notes API", version="1.0.0")' })).toBeVisible();
  await expect(page.locator('.reference-diff-line.right', { hasText: '@app.get("/health", tags=["system"])' })).toBeVisible();
});
