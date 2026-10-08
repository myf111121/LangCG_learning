# Graph Study · Agent、LangGraph 与 FastAPI 学习工作台

为 Python 学习者设计：18 周、每周约 12 小时、72 个学习任务、18 次项目验收。第 1–6 周建立 Agent 工程基础，第 7–12 周完成 LangGraph 基础与高阶实战，第 13–18 周用 FastAPI 将能力封装为可测试、可部署的后端服务。主线项目从带人工审批、记忆与引用的知识库助手，逐步扩展为多用户 API。

## 使用

网站提供今日任务、完整路线、实战验收、39 道自测题、72 个资料入口，以及任务 / 项目 / 复盘笔记和 Markdown 导出。进度和笔记保存在 D1，按当前 ChatGPT 用户隔离。代码与任务进度一同保存到当前账户。第 1–6 周可保存草稿并在线验收；第 7–18 周先独立编写真实框架代码，再按需揭示正确实现并查看逐行 diff。现有任务 ID、代码、笔记和项目记录保持兼容。自测结果与概念演示是本次页面的临时练习状态。

完整路线见 LEARNING_PATH.md。72 个任务都包含学习重点、具体场景、接口约定与参考资料；真实框架任务各有三节专题讲解。独立任务页面 `/learn/<任务ID>` 支持直接访问、刷新与相邻任务导航。第 1–6 周在网页运行 97 组标准库测试；第 7–18 周保留可编辑草稿，用户主动显示答案后才展示 24 份 LangGraph 与 24 份 FastAPI 正确实现，并与当前代码生成双栏 diff。页面不要求下载运行环境，也不检测本地代码。资料核对日期为 2026-10-08；FastAPI 路线与内容按当前官方教程、进阶指南和部署文档设计。

## 本地开发

需要 Node.js 22.13+ 和 npm。保留 package-lock.json。

```sh
npm run install:ci
npm run db:generate
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_chief_katie_power.sql
npm run dev
```

迁移只需对新的本地数据库执行一次。开发服务地址以命令输出为准（默认 http://127.0.0.1:5173）。本地预览访问 /signin-with-chatgpt?return_to=/ 使用开发模拟身份。模拟登录仅用于 loopback 开发，不包含在生产代码中。部署后的私有网站由 Sites 提供真实登录与访问控制。

## 文件

- app/curriculum.ts：课程、来源、自测与 Python 示例。
- app/langgraph-course.ts、app/langgraph-challenges.ts、app/langgraph-solutions.ts：第 7–12 周的专题讲解、真实 API 场景与正确参考实现。
- app/fastapi-course.ts、app/fastapi-challenges.ts、app/fastapi-solutions.ts：第 13–18 周的官方文档路线、真实 FastAPI 场景与正确参考实现。
- app/study-workspace.tsx：学习界面、账户记录与导航。
- app/learn/[lessonId]/page.tsx、app/lesson-workspace.tsx：独立任务页面与整页学习布局。
- app/learning-navigation.ts：任务地址和返回位置。
- app/code-challenges.ts、app/challenge-scenarios.ts：24 个完整业务场景、上下游组件、调用入口和 97 组自动验收用例。
- app/code-practice.tsx、app/python-grader.ts、public/python-worker.js：编辑器、测试反馈和 Python 执行。
- scripts/check-challenges.mjs：用参考实现和错误实现验证判题规则。
- scripts/check-langgraph.mjs：用真实 LangGraph 验证页面提供的参考实现。
- scripts/check-fastapi.mjs：用 FastAPI、SQLModel、HTTPX、PyJWT 与 pwdlib 验证 24 份参考实现。
- app/globals.css、app/scenario-practice.css：主题、场景调用链和响应式布局。
- app/api/learning/route.ts：认证、验证与保存接口。
- db/schema.ts、drizzle/：学习记录结构与迁移。
- .openai/hosting.json：网站身份和逻辑 DB 绑定。

## 示例验证

实战页的 approval_demo.py 无需模型或 API Key。它演示 interrupt、Command(resume=...) 与内存 checkpoint，已验证批准和拒绝路径。真正的外部写入和跨进程恢复在自己的 Python 项目中实现。

```sh
python -m venv .venv
# 激活虚拟环境后
pip install "langgraph==1.2.14"
python approval_demo.py
```

## 学习节奏

每周四次学习各约 2 小时（1h 阅读 + 1h 编码），另留 4h 完成项目与验收。先通过基础校准，按需要回顾；自行调整节奏，不根据日历自动判定完成。

## 验证

完整验证使用 `npm run verify`，依次执行 ESLint、TypeScript、前 6 周判题、真实 LangGraph 判题、真实 FastAPI 判题、生产构建和 Playwright 关键流程测试。首次运行前需安装 Node 依赖、`requirements-langgraph.txt`、`requirements-fastapi.txt`，并确保本机有 Chrome；也可先执行 `npx playwright install chromium` 安装测试浏览器。若解释器不在默认位置，通过 `CHALLENGE_PYTHON` 指定，例如：

```sh
CHALLENGE_PYTHON=.venv/bin/python npm run verify
```

浏览器测试会启动本地开发服务，并模拟学习记录 API，覆盖工作台导航、独立任务地址、草稿保存与恢复、在线验收后自动完成、完成状态、读取失败重试，以及 LangGraph 正确代码展示与完成记录。GitHub Actions 会在 push 和 pull request 时运行同一条验证链。

单独验证前 6 周可运行 `npm run check:challenges`（需要本地 Python，或通过 `CHALLENGE_PYTHON` 指定解释器）。判题验证覆盖 24 个完整程序、未完成代码、错误实现、上下游集成错误、场景输出、旧代码保留、语法错误、异常和输出长度限制。

每个挑战展示业务背景、“上游输入 → 本节组件 → 下游使用”的调用链及与其他任务的联系。编辑器提供业务数据、辅助组件与 `run_scenario()`，学习者补全标记区域。“运行场景”以 `__main__` 执行整个程序，显示业务输出，不修改进度；“运行并验收”检查原有接口边界并增加完整场景集成用例，全部通过后保存代码与完成记录。旧版仅包含函数的已保存代码会自动包入场景模板，保留实现；再次保存时写入完整程序。

第 1–6 周通过 Pyodide 在独立 Web Worker 中运行 Python 标准库练习，不调用付费模型。首次执行从 jsDelivr CDN 加载固定版本 v314.0.7；加载失败或超时会保留代码并支持重试。运行超过 10 秒会终止 Worker，也可主动停止。每次运行使用新环境，各测试重新执行用户代码，避免状态互相污染。测试失败显示实际值、预期值或异常；测试结果仅用于个人学习进度。

## 真实 LangGraph 练习（第 7–12 周）

网页先显示可编辑的 `solution.py` 草稿。点击“显示正确代码”后，页面才在双栏 diff 中展示完整答案：左侧保留学习者代码，右侧显示正确实现，支持只看差异、复制答案和隐藏答案。学习页面不下载 Python 或依赖，不执行 LangGraph，也不判断学习者本地代码是否正确。参考实现覆盖 StateGraph、ToolNode、checkpointer、interrupt、Send、子图、entrypoint/task、Runtime、Store、RetryPolicy 与 CachePolicy，固定业务数据无需 API Key。

项目维护者可安装 `requirements-langgraph.txt` 后运行 `npm run check:langgraph`，用真实 LangGraph 1.2.14、langchain-core 1.6.7 与 checkpoint-sqlite 3.1.1 验证页面提供的 24 份参考代码。这是发布前的内容校验，不是学习页面的一部分。

## 真实 FastAPI 练习（第 13–18 周）

FastAPI 路线延续相同的任务页、业务调用链、答案揭示和双栏 diff。24 个任务覆盖路径操作、Pydantic 请求与响应、依赖注入、yield 生命周期、APIRouter、middleware、CORS、SQLModel CRUD、OAuth2/JWT/scopes、异步并发、lifespan、后台任务、WebSocket、同步与异步测试、错误契约和生产探针。路线以 FastAPI 官方文档为主，不依赖第三方视频课程。

维护者可安装 `requirements-fastapi.txt` 后运行 `npm run check:fastapi`。当前校准版本为 FastAPI 0.142.4、SQLModel 0.0.47、PyJWT 2.15.1 与 pwdlib 0.3.1；脚本会用真实 TestClient / AsyncClient 验证 24 份参考实现及完整业务场景。
