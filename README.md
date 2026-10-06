# Graph Study · LangChain 与 LangGraph 学习工作台

为已学过基础的 Python 学习者设计：6 周、每周约 12 小时、24 个学习任务、6 次项目验收。主线项目是带人工审批、记忆与引用的知识库助手。

## 使用

网站提供今日任务、完整路线、实战验收、15 道自测题、21 个资料入口，以及任务 / 项目 / 复盘笔记和 Markdown 导出。进度和笔记保存在 D1，按当前 ChatGPT 用户隔离。代码与任务进度一同保存到当前账户。保存草稿会将该任务设为待验收。旧版仅手动标记的任务需通过代码测试，才计入新版任务进度；笔记和每周项目记录保留。自测结果与概念演示是本次页面的临时练习状态。

完整路线见 LEARNING_PATH.md。24 个任务都包含学习重点、具体代码场景、初始 Python 代码、接口约定、自动验收用例和参考资料。用户在页面内实现代码，点击“运行并验收”，73 组测试检查正常路径、边界与失败行为；全部通过才自动完成任务。资料核对日期为 2026-10-07；中文教程用于理解和案例索引，接口以当前官方文档为准。

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
- app/study-workspace.tsx：学习界面与交互。
- app/code-challenges.ts：24 个代码场景、函数骨架和 73 组自动验收用例。
- app/code-practice.tsx、app/python-grader.ts、public/python-worker.js：编辑器、测试反馈和 Python 执行。
- scripts/check-challenges.mjs：用参考实现和错误实现验证判题规则。
- app/globals.css：主题和响应式布局。
- app/api/learning/route.ts：认证、验证与保存接口。
- db/schema.ts、drizzle/：学习记录结构与迁移。
- .openai/hosting.json：网站身份和逻辑 DB 绑定。

## 示例验证

实战页的 approval_demo.py 无需模型或 API Key。它演示 interrupt、Command(resume=...) 与内存 checkpoint，已验证批准和拒绝路径。真正的外部写入和跨进程恢复在自己的 Python 项目中实现。

```sh
python -m venv .venv
# 激活虚拟环境后
pip install "langgraph>=1,<2"
python approval_demo.py
```

## 学习节奏

每周四次学习各约 2 小时（1h 阅读 + 1h 编码），另留 4h 完成项目与验收。先通过基础校准，按需要回顾；自行调整节奏，不根据日历自动判定完成。

## 验证

开发验证：`npm run check:challenges`（需要本地 Python，或通过 CHALLENGE_PYTHON 指定解释器），以及 TypeScript 检查和生产构建。判题验证覆盖 24 个正确实现、未完成代码、错误实现、语法错误、异常和输出长度限制。

页面通过 Pyodide 在独立 Web Worker 中运行 Python 标准库练习，不调用付费模型。首次执行从官方文档使用的 jsDelivr CDN 加载固定版本 v314.0.7；加载失败或超时会保留代码并支持重试。运行超过 10 秒会终止 Worker，也可主动停止。每次运行使用新环境，各测试重新执行用户代码，避免状态互相污染。测试失败显示实际值、预期值或异常；测试结果仅用于个人学习进度。实际 LangChain / LangGraph 集成和每周项目仍在自己的 Python 环境运行。
