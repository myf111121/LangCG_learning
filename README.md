# Graph Study · LangChain 与 LangGraph 学习工作台

为 Python 学习者设计：12 周、每周约 12 小时、48 个学习任务、12 次项目验收。前 6 周建立 Agent 工程基础，后 6 周从 LangGraph 基础进入高阶实战。主线项目是带人工审批、记忆与引用的知识库助手。

## 使用

网站提供今日任务、完整路线、实战验收、27 道自测题、44 个资料入口，以及任务 / 项目 / 复盘笔记和 Markdown 导出。进度和笔记保存在 D1，按当前 ChatGPT 用户隔离。代码与任务进度一同保存到当前账户。保存草稿会将该任务设为待验收。现有任务 ID、代码、笔记和项目记录保持兼容。自测结果与概念演示是本次页面的临时练习状态。

完整路线见 LEARNING_PATH.md。48 个任务都包含学习重点、具体场景、初始代码、接口约定、自动验收与参考资料；新增任务各有三节专题讲解。独立任务页面 `/learn/<任务ID>` 支持直接访问、刷新与相邻任务导航。第 1–6 周在网页运行 97 组标准库测试，第 7–12 周使用真实 LangGraph API，在本地运行 96 组测试并导回结果，全部通过后保存完成记录。资料核对日期为 2026-10-07；官方文档校准接口，LearnGraph、LangChain Academy 与 Hugging Face Agents Course 补充理解和案例。

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
- app/langgraph-course.ts、app/langgraph-challenges.ts：第 7–12 周的专题讲解、真实 API 场景、参考来源与 96 组测试。
- app/study-workspace.tsx：学习界面、账户记录与导航。
- app/learn/[lessonId]/page.tsx、app/lesson-workspace.tsx：独立任务页面与整页学习布局。
- app/learning-navigation.ts：任务地址和返回位置。
- app/code-challenges.ts、app/challenge-scenarios.ts：24 个完整业务场景、上下游组件、调用入口和 97 组自动验收用例。
- app/code-practice.tsx、app/python-grader.ts、public/python-worker.js：编辑器、测试反馈和 Python 执行。
- scripts/check-challenges.mjs：用参考实现和错误实现验证判题规则。
- app/local-challenge.ts、scripts/check-langgraph.mjs、scripts/check-local-runner.mjs：本地运行包、导入校验与真实 LangGraph 验证。
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

开发验证：`npm run check:challenges`（需要本地 Python，或通过 CHALLENGE_PYTHON 指定解释器），以及 TypeScript 检查和生产构建。判题验证覆盖 24 个完整程序、未完成代码、错误实现、上下游集成错误、场景输出、旧代码保留、语法错误、异常和输出长度限制。

每个挑战展示业务背景、“上游输入 → 本节组件 → 下游使用”的调用链及与其他任务的联系。编辑器提供业务数据、辅助组件与 `run_scenario()`，学习者补全标记区域。“运行场景”以 `__main__` 执行整个程序，显示业务输出，不修改进度；“运行并验收”检查原有接口边界并增加完整场景集成用例，全部通过后保存代码与完成记录。旧版仅包含函数的已保存代码会自动包入场景模板，保留实现；再次保存时写入完整程序。

第 1–6 周通过 Pyodide 在独立 Web Worker 中运行 Python 标准库练习，不调用付费模型。首次执行从 jsDelivr CDN 加载固定版本 v314.0.7；加载失败或超时会保留代码并支持重试。运行超过 10 秒会终止 Worker，也可主动停止。每次运行使用新环境，各测试重新执行用户代码，避免状态互相污染。测试失败显示实际值、预期值或异常；测试结果仅用于个人学习进度。

## 真实 LangGraph 练习（第 7–12 周）

需要 Python 3.11+；本课验证版本为 LangGraph 1.2.14、langchain-core 1.6.7、checkpoint-sqlite 3.1.1。安装入口是 requirements-langgraph.txt，运行包也包含相同直接依赖。完整部署项目还应锁定全部传递依赖。

网页保留宽编辑器、全屏、草稿、业务调用链和验收详情。点击“下载运行与验收包”，解压后：

```powershell
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python solution.py
.venv\Scripts\python verify.py
```

macOS / Linux 使用 `.venv/bin/python`。`solution.py` 打印完整场景；`verify.py` 在独立进程执行同一组网页验收，限时 45 秒，生成 result.json。返回网页导入结果；若本地改过代码，先导入 solution.py。导入校验任务 ID、代码 SHA-256、测试版本、用例名称与结果类型，拒绝错题、过期或缺项报告。全部通过后保存代码和进度；失败报告显示错误并保留待验收状态。结果用于个人学习，不是受信考试证明。

这些场景使用真正的 StateGraph、ToolNode、checkpointer、interrupt、Send、子图、entrypoint/task、Runtime、Store、RetryPolicy 与 CachePolicy，固定业务数据无需 API Key。LangGraph 原生依赖无法装入当前网页 Pyodide，故在本地 Python 执行。原有在线练习保持原运行方式。

验证新增练习：先安装 requirements-langgraph.txt，再运行 `npm run check:langgraph`。验证覆盖真实场景、参考实现、未完成实现、集成失败、ZIP 解压、本地验收进程、导入匹配与过期报告，以及第 10–12 周导航。
