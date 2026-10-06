# LangChain 与 LangGraph：6 周进阶路线

Python · 每周约 12 小时 · 共 72 小时

主线：带审批与记忆的知识库助手。每周 4 个学习任务（阅读 4h + 编码 4h），另有项目实战 4h。

每个学习任务提供业务背景、上下游调用链、示例数据和完整 Python 程序，在“你的任务”区域补全本节组件。运行场景可观察整个流程和业务输出；运行并验收会检查接口边界与上下游集成，全部通过才完成任务，无需手动勾选。已保存的旧版函数代码会保留并放入场景模板。场景使用固定数据，无需 API Key；真实框架集成在每周项目中完成。

## 第 1 周：可靠的单 Agent

LearnGraph 2.4 / 15.1

交付：v0.1 · 工具与结构化输出

在一个 Python 项目中完成文档查询、结果结构化和错误反馈。对正常查询、无结果和非法参数各准备一组输入，保存 trace 与输出。

### 重新理解 Agent 的执行循环

模型选择动作，工具返回结果，执行框架组织下一轮。先能解释一次 trace，再判断哪些步骤需要固定工作流。

代码场景：执行一次模型—工具循环

业务背景：用户询问如何恢复会话。模型已选择查询笔记，再返回答案；你要把这些动作接到真实的工具函数上，让界面同时拿到回答和执行记录。

调用链：用户问题 → 模型动作 → 你实现：run_agent → 工具结果 → 回答与 trace

功能关系：本节负责执行工具。下一节的 search_notes 可以替换这里的查询工具，第 4 节会汇总这些执行记录。

已提供：模型动作样例、笔记查询工具、回答展示器和运行入口。完整程序通过 run_scenario() 连接各组件。

知识库助手收到预先生成的模型动作。实现 run_agent(actions, tools)，执行工具调用，记录 trace，并在模型给出 final 时结束。actions 是动作字典列表，tools 是工具名到函数的映射。

接口与要求：

- 返回 {answer, trace}；trace 每项包含 tool、args、result。
- tool 动作包含 name、args；final 动作包含 answer。final 之后不再调用工具。
- 工具不存在时抛出 ValueError；遍历结束仍没有 final 也抛出 ValueError。

自动验收（全部通过）：

- 完整业务场景：上下游组件协作得到预期结果
- 工具结果与参数完整进入 trace
- 最终回答之后不再调用工具
- 未知工具与未结束的循环明确报错

### 工具契约与失败处理

为工具定义输入边界和可解释的返回值。区分可纠正的参数错误、暂时性失败和实现缺陷。

代码场景：为查询工具加边界与重试

业务背景：助手已经决定搜索笔记，但后端第一次请求超时。你实现工具适配层，让上游使用统一接口，下游仍能收到文档，而不是立即失败。

调用链：Agent 提交查询参数 → 你实现：search_notes → 后端重试 → 文档交给回答节点

功能关系：这是上一节 tools 字典里的工具实现。它输出的来源 ID 会交给下一节的回答校验器。

已提供：会超时一次的查询服务、工具调用节点和文档展示代码。完整程序通过 run_scenario() 连接各组件。

查询服务有时会超时。实现 search_notes(query, limit, backend, max_attempts=3)。backend(query, limit) 由测试提供，返回笔记列表或抛出异常。

接口与要求：

- query 必须是非空字符串，调用前去除首尾空白；limit 必须是 1–5 的整数，布尔值不算整数。
- max_attempts 必须是 1–3 的整数；所有非法参数在调用 backend 前抛出 ValueError。
- 仅重试 TimeoutError，总调用次数不超过 max_attempts。最后一次超时原样抛出；其他异常直接抛出。

自动验收（全部通过）：

- 完整业务场景：上下游组件协作得到预期结果
- 合法查询、空结果与空白清理
- 非法参数不会调用服务
- 临时超时可以重试并在成功后结束
- 重试次数有界，其他错误不重试

### 结构化输出与上下文

稳定字段让下游能够验证结果。只传任务需要的上下文，并保留消息与工具结果的关联。

代码场景：校验带证据的结构化回答

业务背景：检索节点找到了真实笔记，模型返回了带额外字段的 JSON。你要在模型与页面之间建立数据边界，避免伪来源或格式错误进入界面。

调用链：检索文档 + 模型 JSON → 你实现：validate_answer → 固定结构 → 答案与引用页面

功能关系：上游来源来自查询工具；本节校验结构，第 4 周会继续检查引用是否真正支持答案。

已提供：检索结果、模型输出样例和只接收三字段的页面适配器。完整程序通过 run_scenario() 连接各组件。

下游只接收固定格式的回答。实现 validate_answer(payload, available_ids)，校验模型输出并返回新的三字段字典。available_ids 是本次真实检索到的来源 ID 列表。

接口与要求：

- answer 为非空字符串，source_ids 为字符串列表，needs_clarification 为布尔值；缺少字段或类型不符抛出 ValueError。
- 所有来源都必须在 available_ids 中；无来源时 needs_clarification 必须为 True。
- 只返回这三个字段，不修改输入。

自动验收（全部通过）：

- 完整业务场景：上下游组件协作得到预期结果
- 合法回答返回固定字段且不修改输入
- 无证据时必须澄清
- 伪来源、缺失字段与错误类型被拒绝

### Middleware 与观测基线

将横切行为放进 middleware。实验一次改变一个因素，记录质量、延迟与成本，建立可比较的基线。

代码场景：汇总同一输入集的观测基线

业务背景：团队想比较是否给助手增加重试。两个策略在相同问题上留下成功、延迟和 token 记录；你负责将记录变成可以比较的指标。

调用链：固定问题 → 两组执行记录 → 你实现：summarize_runs → 统一指标 → 策略比较面板

功能关系：记录来自前面工具循环和重试节点；这些指标会在第 5 周用于决定是否增加多 Agent。

已提供：同一输入集的实验记录和策略比较面板。完整程序通过 run_scenario() 连接各组件。

两次实验返回样本记录，每条有 id、passed、latency_ms、tokens。实现 summarize_runs(runs)，为后续策略比较生成统一指标。

接口与要求：

- 返回 count、success_rate、mean_latency_ms、total_tokens。成功率和平均延迟保留原始数值，不做百分比换算。
- 空列表时四项均为 0。重复 id 抛出 ValueError，避免同一输入被重复统计。

自动验收（全部通过）：

- 完整业务场景：上下游组件协作得到预期结果
- 成功率、延迟和成本计算正确
- 空实验也有完整结果
- 重复样本被拒绝

本周项目验收：

- [ ] 三个工具边界用例有明确输出
- [ ] 回答包含 answer、source_ids、needs_clarification
- [ ] 记录调用次数与一条失败 trace

## 第 2 周：状态、路由与恢复

LearnGraph 3.1–3.3 / 2.5

交付：v0.2 · 显式状态与 checkpoint

把助手拆成 classify、retrieve、answer 节点。加入知识查询与澄清分支，保存线程状态，并演示进程重启后的恢复。

### State schema 与 reducer

状态表达任务事实；临时变量留在节点内部。默认更新覆盖，需要合并的字段应定义明确 reducer。

代码场景：实现状态更新与事件 reducer

业务背景：检索节点追加证据事件，回答节点追加生成事件。节点重放可能重复提交事件；你要合并状态，让回答节点拿到文档，并保持执行历史稳定。

调用链：检索节点返回局部更新 → 你实现：merge_state → 回答节点读状态 → 新事件合并

功能关系：合并后的 documents 供下一节路由使用，events 会随 checkpoint 一起保存。

已提供：检索节点、回答节点与一个包含重放事件的运行入口。完整程序通过 run_scenario() 连接各组件。

图节点只返回增量更新。实现 merge_state(state, update)：普通字段覆盖，events 按事件 id 合并，模拟多个节点的 reducer。

接口与要求：

- 返回新字典，未更新的字段保留；不能修改 state、update 及其中的事件列表。
- events 按首次出现顺序排列，同一 id 的后续事件不再追加。

自动验收（全部通过）：

- 完整业务场景：上下游组件协作得到预期结果
- 普通字段覆盖，历史字段保留
- 并行事件合并且重复重放不追加
- 空状态接受第一次增量

### 条件边与循环终止

路由依赖明确状态信号，循环必须有业务退出条件。递归限制作为最后保护。

代码场景：为无结果检索设计有界路由

业务背景：用户使用“断点”提问，笔记只收录 checkpoint。你要连接检索、改写和回答节点；当查询仍无结果时，工作流也必须有退出路径。

调用链：检索节点更新 documents → 你实现：route_query → 改写再检索 / 回答 / 澄清

功能关系：路由读取上一节定义的状态字段；第 4 周会将简单的有无证据判断升级为证据质量检查。

已提供：固定检索服务、改写节点、回答与澄清节点及工作流循环。完整程序通过 run_scenario() 连接各组件。

检索节点返回 documents 和 rewrite_count。实现 route_query(state)，让有证据的查询进入回答，无证据的查询最多改写两次。

接口与要求：

- documents 非空返回 "answer"；否则 rewrite_count 小于 2 返回 "rewrite"，达到 2 返回 "clarify"。
- 缺少 documents 和 rewrite_count 时分别按 []、0 处理；不得修改 state。

自动验收（全部通过）：

- 完整业务场景：上下游组件协作得到预期结果
- 有证据直接回答
- 无结果路径具有退出条件
- 初始状态可路由

### Checkpoint 与 thread_id

checkpoint 保存某一线程的图状态。复用 thread_id 可延续任务，跨进程恢复需要持久化后端。

代码场景：隔离并恢复线程 checkpoint

业务背景：助手检索完证据后服务重启。你负责保存会话状态；新的服务实例应读取原线程的快照，跳过已完成的检索，继续生成答案。

调用链：检索完成 → 保存线程状态 → 你实现：CheckpointStore → 新实例恢复 → 回答节点

功能关系：快照保存前两节的图状态；下一节会处理恢复时重放外部写入的问题。

已提供：检索完成状态、模拟磁盘序列化与恢复后的回答节点。完整程序通过 run_scenario() 连接各组件。

实现 CheckpointStore，以字典模拟持久化保存器。save(thread_id, state) 保存快照，load(thread_id) 返回快照，dump() 返回 JSON 字符串；构造函数可接收该字符串恢复。

接口与要求：

- 不同 thread_id 相互隔离；未知线程返回 None。
- 保存与加载均使用深拷贝，调用者修改嵌套状态不能污染快照。
- CheckpointStore(snapshot=None)；dump 后新建实例仍能读取保存的状态。

自动验收（全部通过）：

- 完整业务场景：上下游组件协作得到预期结果
- 不同线程互不混淆
- 嵌套状态与返回值不会污染快照
- 序列化后重建实例可恢复

### 重试、重放与幂等

恢复可能再次运行部分节点代码。外部写入要有业务幂等键，避免重复副作用。

代码场景：避免恢复时重复写入

业务背景：笔记已写入，服务却在返回响应前断线。恢复后的节点再次收到相同请求；你要让两次执行指向同一条笔记。

调用链：恢复节点再次提交 request_id → 你实现：write_once → 笔记服务 → 首次结果复用

功能关系：checkpoint 恢复会重放节点，本节保护副作用；审批通过后的写入也需要这个保护。

已提供：内存笔记服务和模拟执行后重放的工作流。完整程序通过 run_scenario() 连接各组件。

服务在写入之后可能故障，恢复会再次执行节点。实现 write_once(request_id, text, ledger, write)，ledger 记录已执行请求的结果，write(text) 由测试提供。

接口与要求：

- 相同 request_id 返回第一次 write 的结果，只调用一次 write。不同请求分别写入。
- write 失败时不登记成功，后续可以重试；不能吞掉异常。

自动验收（全部通过）：

- 完整业务场景：上下游组件协作得到预期结果
- 重复恢复只产生一次副作用
- 写入失败后仍能重试
- 空值结果也代表已经执行

本周项目验收：

- [ ] 两条路由能运行且可终止
- [ ] 两个 thread_id 互不混淆
- [ ] 持久化后端重启恢复成功

## 第 3 周：人工审批与记忆

LearnGraph 4.2–4.6 / 6.1–6.4

交付：v0.3 · 审批与用户偏好

为保存知识增加人工审批，支持批准、拒绝、编辑。用 Store 保存偏好，在新线程与另一个用户下验证作用域。

### interrupt 与 Command 恢复

在关键动作前暂停，用相同线程和 Command(resume=...) 恢复。中断所在节点可能从开头重新运行。

代码场景：在审批之前暂停执行

业务背景：助手生成了待保存的笔记。页面先展示审批卡片，用户批准后才触发笔记服务；你实现暂停与恢复之间的执行边界。

调用链：生成草稿 → 暂无审批 → 你实现：approval_step → 审批卡片 → 批准后写入

功能关系：暂停状态可以由 checkpoint 保存；写入节点可再接上一周的幂等保护。

已提供：草稿生成器、审批页面适配器和内存写入服务。完整程序通过 run_scenario() 连接各组件。

实现 approval_step(draft, decision, write)。decision 为 None 代表尚未审批，True 代表批准，False 代表拒绝。用固定状态模拟 interrupt 与恢复的关键行为。

接口与要求：

- 未审批返回 {status: "paused", draft}，不调用 write。
- 批准调用 write(draft)，返回 {status: "approved", result: 写入结果}；拒绝返回 {status: "rejected"}，不写入。
- 其他 decision 抛出 ValueError；只接受真正的布尔值。

自动验收（全部通过）：

- 完整业务场景：上下游组件协作得到预期结果
- 暂停与拒绝都没有写入
- 批准后才执行动作
- 非法审批输入被拒绝

### 编辑、拒绝与审计

审批输入也需要校验。决策与执行内容要可追踪；编辑后应使用修改后的内容。

代码场景：处理编辑、拒绝与审批审计

业务背景：审批者修正了助手草稿后提交，网络重试又提交一次。你负责将编辑后的内容交给写入服务，并让审计页面看到唯一的操作记录。

调用链：审批表单提交编辑决策 → 你实现：apply_decision → 保存修改文本 → 审计页面

功能关系：这是上一节审批卡片的提交处理器，将编辑、幂等恢复和审计串在一起。

已提供：审批表单样例、笔记写入服务和审计页面适配器。完整程序通过 run_scenario() 连接各组件。

审批者可以 approve、reject 或 edit。实现 apply_decision(request_id, draft, decision, edited_text, ledger, write)，返回审计字典，并按请求 ID 防止重复恢复。

接口与要求：

- 审计结果为 {request_id, decision, text, result}。approve 使用 draft，edit 使用非空 edited_text，reject 的 text、result 均为 None。
- 未知决策或非法编辑内容在写入前抛出 ValueError。
- ledger 保存首次审计结果；重复请求直接返回首次结果，不能重复写入。

自动验收（全部通过）：

- 完整业务场景：上下游组件协作得到预期结果
- 编辑使用修改后的内容并可追溯
- 拒绝没有写入，批准保留原文
- 非法决策不会写入或登记

### 短期与长期记忆

线程状态维持当前任务；Store 保存跨线程应用数据。定义记忆的用户边界、更新条件与删除策略。

代码场景：按用户隔离长期偏好

业务背景：Alice 在设置页面选择中文，Bob 选择英文。两人打开新的聊天线程时，提示词构建器要读取各自的长期偏好。

调用链：设置页面保存用户偏好 → 你实现：MemoryStore → 新会话读取 → 构建提示词

功能关系：checkpoint 按线程保存运行状态，长期记忆按用户保存偏好；下一节会从已确认的对话中更新这些记忆。

已提供：设置输入、新线程入口与提示词构建器。完整程序通过 run_scenario() 连接各组件。

实现 MemoryStore。set_preference(user_id, key, value) 保存偏好，get_preference(user_id, key) 读取，delete_preference(user_id, key) 删除。长期偏好不绑定 thread_id。

接口与要求：

- 同一用户跨会话可读取；不同用户使用相同 key 也必须隔离。
- 缺少偏好返回 None；删除不存在的偏好不报错。
- 保存和读取均深拷贝，防止用户间意外共享可变对象。

自动验收（全部通过）：

- 完整业务场景：上下游组件协作得到预期结果
- 跨会话偏好可读，用户边界隔离
- 删除只影响指定用户
- 可变偏好不会污染已保存事实

### 消息压缩与记忆质量

压缩保留任务所需信息；长期记忆只写已确认事实。用更正和未确认信息测试质量。

代码场景：提取已确认的最新记忆

业务背景：对话摘要器提取出用户更正和未经确认的推测。你要只把确认的信息写入长期事实，让下一轮建议使用最新资料。

调用链：对话摘要 → 确认事件 → 你实现：update_facts → 长期事实 → 个性化建议

功能关系：本节决定哪些事实可以写入上一节的长期存储；审批、确认信息和提示词构建因此连成一条链。

已提供：摘要事件、旧用户事实和个性化回答节点。完整程序通过 run_scenario() 连接各组件。

对话摘要器已把消息变成 {key, value, confirmed} 事件。实现 update_facts(facts, events)，把经过确认的事实合入长期记忆。

接口与要求：

- 仅 confirmed 为 True 的事件能更新记忆；同一 key 的最新确认事件覆盖旧值。
- 已确认且 value 为 None 时删除该 key；未确认的推测既不覆盖也不删除。
- 返回新字典，不修改原 facts。

自动验收（全部通过）：

- 完整业务场景：上下游组件协作得到预期结果
- 最新确认的更正覆盖旧事实
- 推测不能覆盖或删除事实
- 确认删除与空事件正确处理

本周项目验收：

- [ ] 批准、拒绝、编辑三条路径通过
- [ ] 审批前不执行需审批的写入
- [ ] 记忆按用户 namespace 隔离

## 第 4 周：Agentic RAG

LearnGraph 13.1–13.11 / 8.3

交付：v0.4 · 引用与检索纠错

用自己的 20 篇技术笔记建立检索库。固定 30 个问题，对比基础检索与一次查询改写，报告正确率、引用有效率、延迟与成本。

### 建立检索基线

先独立检验切分、索引和检索，再加入 Agent 决策。保留文档来源与片段标识。

代码场景：保留来源的确定性检索

业务背景：知识库中有多个片段。用户询问 graph state，预处理已经把文本切词；你负责选出最相关的片段并保留来源，供生成节点引用。

调用链：查询切词 + 文档片段 → 你实现：retrieve → top-k 证据 → 回答上下文

功能关系：本节替换第 1 周的简单查询工具；结果会进入下一节的证据检查，再交给回答生成与引用校验。

已提供：查询切词器、三条知识库片段和上下文构建器。完整程序通过 run_scenario() 连接各组件。

每个文档片段为 {id, source_id, tokens}，tokens 是已切分的词列表。实现 retrieve(query_tokens, chunks, k)，以不同查询词和片段词的交集大小评分。

接口与要求：

- 只返回分数大于 0 的片段，按分数降序；同分保持输入顺序，最多 k 条。
- 重复查询词不增加分数；k 必须为正整数，布尔值不合法，否则抛出 ValueError。
- 返回原片段的完整字段，让来源可追踪；不修改输入。

自动验收（全部通过）：

- 完整业务场景：上下游组件协作得到预期结果
- 排序、top-k 和来源完整保留
- 重复词不加分，同分保留原顺序
- 非法 k 被拒绝

### 把检索变成图

显式表达检索、证据检查与回答，把证据是否充足变成可测试的路由条件。

代码场景：把证据检查变成明确分支

业务背景：知识库同时保留旧政策和新政策。你负责证据检查节点，让相互矛盾的结果进入冲突提示，而不是直接生成确定答案。

调用链：检索得到多条观点 → 你实现：grade_evidence → 生成 / 冲突提示 / 澄清节点

功能关系：本节位于检索与生成之间，沿用第 2 周条件路由；证据不足时可以进入下一节的查询纠错。

已提供：包含冲突与无关文档的检索结果及路由后节点。完整程序通过 run_scenario() 连接各组件。

每条检索证据有 id、claim、relevant。实现 grade_evidence(documents)，先过滤不相关文档，再检查观点冲突，返回下一节点和有效证据 ID。

接口与要求：

- 返回 {route, source_ids}，只使用 relevant 为 True 的文档，source_ids 按出现顺序去重。
- 没有相关证据返回 clarify；相关证据的 claim 有多个不同值时返回 conflict，否则返回 generate。

自动验收（全部通过）：

- 完整业务场景：上下游组件协作得到预期结果
- 充足证据进入回答且过滤无关来源
- 冲突观点进入专门分支
- 无证据会澄清，重复来源不追加

### 查询改写与有界纠错

改写可能提升召回，也会增加延迟。固定输入，记录新增证据是否真的帮助回答。

代码场景：只允许一次查询纠错

业务背景：用户询问“断点”，而知识库采用 checkpoint 这个术语。你连接检索器与改写器，让命中的文档继续进入回答，同时保留查询路径。

调用链：原查询 → 固定检索器 → 你实现：retrieve_with_rewrite → 一次改写 → 回答或澄清

功能关系：该组件把检索和有界循环封装起来，可替换第 2 周的改写分支；输出文档仍交给证据检查。

已提供：术语检索器、查询改写器与回答页面适配器。完整程序通过 run_scenario() 连接各组件。

实现 retrieve_with_rewrite(query, retrieve, rewrite)。retrieve(query) 返回文档列表，rewrite(query) 返回新查询。首次无结果时允许改写一次。

接口与要求：

- 返回 {documents, queries, needs_clarification}；queries 记录实际查询的顺序。
- 首查命中时不改写；首查无结果时只改写一次，再无结果就澄清。

自动验收（全部通过）：

- 完整业务场景：上下游组件协作得到预期结果
- 首查命中不会增加改写成本
- 改写后命中，记录两个查询
- 持续无结果也只改写一次

### 引用、拒答与检索评测

分别评测检索和答案。无答案、冲突和文档中的不可信指令都要专项测试。

代码场景：校验引用能否支持回答

业务背景：模型给出“可以自动审批”的答案，却引用了过期文档。你在生成节点与页面之间加一道校验，决定展示回答还是要求补充有效证据。

调用链：模型答案 + 原始证据 → 你实现：check_citations → 通过才展示 / 请求补充证据

功能关系：第 1 周校验输出结构，本节校验事实支撑；校验结果也会进入第 6 周的评测与交付报告。

已提供：模型答案、过期证据与依据校验结果显示内容的页面。完整程序通过 run_scenario() 连接各组件。

每个片段包含 id、claim、trusted、expired，回答包含 claim、source_ids。实现 check_citations(answer, chunks)，检查来源存在、可信、未过期且支持该观点。

接口与要求：

- 返回 {passed, invalid_ids, needs_clarification}。invalid_ids 按引用顺序去重。
- 不存在、不可信、过期或 claim 不匹配的引用均无效。全部引用有效且非空才 passed=True。
- 没有任何有效引用时 needs_clarification=True；文档内额外 instruction 字段不改变规则。

自动验收（全部通过）：

- 完整业务场景：上下游组件协作得到预期结果
- 真实有效引用支持回答
- 伪引用、过期与不可信文档均被拒绝
- 部分有效与无引用分别处理

本周项目验收：

- [ ] 引用可定位到原文片段
- [ ] 无证据会拒答或澄清
- [ ] 改写有上限，比较使用同一测试集

## 第 5 周：多 Agent 与子图

LearnGraph 5.1–5.4 / 9.4 / 12

交付：v0.5 · 检索与审阅协作

让检索与审阅 Agent 协作，失败最多修订一次。和单 Agent 比较质量、延迟与 token，用结果决定是否保留多 Agent 架构。

### 先判断是否需要多 Agent

分工应解决具体的职责或上下文问题。保留单 Agent 基线，用实验判断额外复杂度是否值得。

代码场景：用指标决定是否保留多 Agent

业务背景：团队已经跑完单 Agent 和多 Agent 的对照实验。你负责读取质量与成本指标，选择实际处理请求的工作流。

调用链：同一数据集的实验指标 → 你实现：choose_architecture → 选定工作流 → 处理请求

功能关系：指标来自第 1 周观测基线；选择 multi 后，接下来会用子图和分发组件组织它。

已提供：对照指标、两个工作流入口和应用路由器。完整程序通过 run_scenario() 连接各组件。

单 Agent 与多 Agent 的实验指标均有 success_rate、latency_ms、tokens。实现 choose_architecture(single, multi)，按已声明的收益和预算条件选择方案。

接口与要求：

- 多 Agent 成功率至少提高 0.1、延迟不超过单 Agent 的 1.5 倍、tokens 不超过 2 倍时返回 "multi"；否则返回 "single"。
- 门槛包含等号。成功率增益比较允许 1e-9 的浮点误差。

自动验收（全部通过）：

- 完整业务场景：上下游组件协作得到预期结果
- 收益与成本都达标才采用多 Agent
- 收益不足保留基线
- 延迟或 token 超预算保留单 Agent

### 子图与状态边界

子图封装独立流程；边界只传必要字段。schema 不同时显式转换输入输出。

代码场景：转换父图与子图的状态

业务背景：父图拥有聊天历史和内部配置，检索子图只需查询文本。你实现边界适配器，让子图得到最少输入，返回证据再供父图回答。

调用链：父图 query 与私有状态 → 你实现：call_retrieval_subgraph → 子图证据 → 父图回答节点

功能关系：子图复用第 4 周检索逻辑；下一节会同时调用多个检索任务并合并结果。

已提供：父图状态、记录输入的检索子图和父图回答节点。完整程序通过 run_scenario() 连接各组件。

父图包含 query、messages、secret 等字段，检索子图只需要 query。实现 call_retrieval_subgraph(parent_state, subgraph)，转换输入并校验子图返回的 documents。

接口与要求：

- 只向 subgraph 传 {query}；每个返回 document 必须包含字符串 id、text、source_id，否则抛出 ValueError。
- 返回新的父状态，更新 documents 与按出现顺序去重的 source_ids；保留其余父字段且不修改输入。

自动验收（全部通过）：

- 完整业务场景：上下游组件协作得到预期结果
- 只传必要字段，保留父图状态
- 无结果返回空证据
- 子图输出在边界校验

### 并行、Send 与结果合并

独立任务可以并行，动态任务可以分发。合并结果时定义去重、顺序和部分失败策略。

代码场景：合并分发任务与部分失败

业务背景：文档库、FAQ 和归档服务分别检索。其中归档服务超时，其他服务又返回重复来源；你负责合并可用证据并报告失败任务。

调用链：分发任务 → 多路返回 → 你实现：merge_results → 去重证据 → 回答与错误提示

功能关系：这是多个检索子图的汇合点；去重后的证据交给生成节点，再进入下一节评审。

已提供：三个检索任务的返回值和同时展示证据与警告的回答节点。完整程序通过 run_scenario() 连接各组件。

分发检索返回 {task_id, documents, error} 列表，每个文档有 source_id。实现 merge_results(results)，合并成功任务的证据，并保留失败任务信息。

接口与要求：

- 返回 {documents, errors}。文档按 source_id 去重，保持首次出现的顺序和完整文档。
- error 非 None 的任务整体视为失败，不合并其 documents；errors 包含 {task_id, error}。

自动验收（全部通过）：

- 完整业务场景：上下游组件协作得到预期结果
- 来源去重且保持顺序
- 部分失败保留成功结果并报告错误
- 全部失败和空分发也能收敛

### 协作协议与评审循环

传递可验证结果和证据，评审反馈要指向具体问题。修订次数必须受控。

代码场景：实现最多一次修订的评审循环

业务背景：生成节点写出了答案但漏掉来源。评审器返回明确问题，修订器可补充引用；你负责组织这两个角色并限制循环次数。

调用链：生成节点给出草稿 → 你实现：review_once → 评审反馈 → 一次修订 → 页面

功能关系：评审消费前面合并的证据；有界修订避免无限成本，评审结果会用于离线评测。

已提供：检查引用的评审器、按反馈补引用的修订器和发布节点。完整程序通过 run_scenario() 连接各组件。

实现 review_once(draft, review, revise)。review(text) 返回 {passed, issues}，revise(text, issues) 返回修订后的文本；最多修订一次并再次评审。

接口与要求：

- 返回 {draft, passed, reviews}；reviews 按顺序保留每次评审结果。
- 第一次通过不修订；第一次失败把具体 issues 交给 revise；第二次失败也必须结束。

自动验收（全部通过）：

- 完整业务场景：上下游组件协作得到预期结果
- 首次通过不触发修订
- 具体反馈传给修订者，再次评审
- 持续失败只修订一次

本周项目验收：

- [ ] 角色有明确输入输出
- [ ] 修订受控，不无限互相调用
- [ ] 报告收益与额外成本

## 第 6 周：评测、流式与交付

LearnGraph 7 / 8.1 / 15

交付：v1.0 · 可复现的完整项目

提交源码、锁定依赖、运行说明、30 题评测报告、审批与恢复演示和架构决策。先声明目标，再运行验收。

### 离线评测与失败分类

固定数据集与评分规则才能比较迭代。为检索、工具、回答和审批分别定义指标。

代码场景：汇总离线评测与失败类别

业务背景：固定评测集已有逐题结果。你把它们聚合成报告，供质量面板显示成功率，并指出当前最常见的失败类别。

调用链：固定样本 → 逐题评测记录 → 你实现：evaluate_dataset → 失败分布 → 修复优先级

功能关系：评测覆盖前面工具、引用与审批组件；报告是最后交付判断的质量依据。

已提供：逐题评测数据和根据失败类别给出修复重点的面板。完整程序通过 run_scenario() 连接各组件。

固定数据集的评测记录包含 id、passed、failure_type。实现 evaluate_dataset(rows)，生成可重复比较的评测报告。

接口与要求：

- 返回 {count, success_rate, failures}；failures 按失败类别计数，只统计 passed=False 的记录。缺少或空 failure_type 归为 "unknown"。
- 空数据集成功率为 0；重复样本 id 抛出 ValueError。

自动验收（全部通过）：

- 完整业务场景：上下游组件协作得到预期结果
- 按失败类别聚合且不统计成功样本
- 空集和缺少失败类别正确处理
- 重复样本不能重复计分

### 流式输出与运行状态

分别观察节点更新与模型消息。界面要区分运行、待审批、失败和最终完成。

代码场景：把流事件转换为运行状态

业务背景：后端连续推送节点、文本和审批事件。你负责将事件变成前端状态，让页面在审批期间暂停文本，恢复后继续，并忽略结束后的迟到消息。

调用链：图执行 → 后端事件流 → 你实现：reduce_stream → 页面状态 → 审批按钮与答案

功能关系：事件来自第 2 周图节点和第 3 周审批组件；本节把运行过程接到可交互页面。

已提供：包含审批、恢复和迟到 token 的事件流与页面渲染器。完整程序通过 run_scenario() 连接各组件。

实现 reduce_stream(state, event)。state 包含 status、text、node、error；event 的 type 为 update、token、interrupt、resume、error、done。

接口与要求：

- 返回新状态；update 只更新 node；token 将 event.text 追加到 text。interrupt 将 status 设为 waiting，resume 设为 running。
- error 将 status 设为 failed 并保存 event.message；done 将 status 设为 completed。
- waiting 时忽略 token；completed 或 failed 后忽略所有事件，避免迟到消息覆盖最终结果。

自动验收（全部通过）：

- 完整业务场景：上下游组件协作得到预期结果
- 节点更新不混入文本，token 正确追加
- 待审批暂停消息，恢复后继续
- 终态不能被迟到事件改写

### 部署与并发边界

把配置与代码分离，明确用户、线程和请求之间的关系。定义持久化与请求限制。

代码场景：隔离用户线程并去重请求

业务背景：Alice 的聊天请求被客户端重发，Bob 恰好使用相同线程名和请求 ID。你实现 API 的会话层，确保两人历史独立，重试也不会重复添加消息。

调用链：登录用户 + API 请求 → 你实现：handle_request → 当前会话历史 → Agent 输入

功能关系：该层位于图执行之前，提供用户和线程边界；线程 ID 随后用于 checkpoint，用户 ID 用于长期记忆。

已提供：模拟认证后的请求、会话存储和读取历史的 Agent 节点。完整程序通过 run_scenario() 连接各组件。

实现 handle_request(user_id, thread_id, request_id, text, sessions, seen)。sessions 与 seen 都是由调用者保存的字典，返回该用户线程中的消息列表。

接口与要求：

- sessions 使用 (user_id, thread_id) 元组作为 key；seen 使用 (user_id, thread_id, request_id) 元组作为 key。
- 同一线程不同请求按顺序追加，相同请求不重复追加；不同用户或线程允许使用相同 request_id。
- 返回列表副本；三个 ID 必须为非空字符串，否则在变更字典前抛出 ValueError。

自动验收（全部通过）：

- 完整业务场景：上下游组件协作得到预期结果
- 同线程连续输入有序，重复请求去重
- 不同用户和线程不会共享消息或请求
- 非法标识不会更改存储

### 项目验收与架构复盘

可复现的交付包含演示、指标和决策。用测量证据解释保留哪些架构复杂度。

代码场景：用代码生成交付验收报告

业务背景：助手已经完成评测、审批和恢复验证。你生成统一交付报告，让发布面板根据样本量、质量和检查结果决定是否开放发布。

调用链：评测样本 + 系统检查结果 → 你实现：build_release_report → 交付报告 → 发布面板

功能关系：报告汇总引用、审批、恢复与评测，把六周各组件连接成完整的交付条件。

已提供：30 条固定评测记录、三个系统检查结果和发布面板。完整程序通过 run_scenario() 连接各组件。

项目评测样本包含 passed、citation_valid、latency_ms、cost。实现 build_release_report(rows, checks)，checks 包含 reproducible、approval、recovery 三个交付检查结果。

接口与要求：

- 返回 count、success_rate、citation_rate、p95_latency_ms、total_cost、ready。p95 使用 nearest-rank：升序排列后取 ceil(0.95*n) 的第一个基位置。
- ready 要求样本至少 30 条、成功率至少 0.8、引用有效率至少 0.9，并且三个交付检查均严格为 True。
- 空样本时数值指标均为 0，ready=False；不要修改样本顺序。

自动验收（全部通过）：

- 完整业务场景：上下游组件协作得到预期结果
- 完整数据集达标且 p95 计算正确
- 质量门槛包含等号，缺少交付证据不能发布
- 样本不足、质量退化与空集不能通过

本周项目验收：

- [ ] 新环境能按 README 运行
- [ ] 报告成功率、引用有效率、p95 延迟与成本
- [ ] 展示故障恢复与审批

## 阅读资料

- [LearnGraph · 中文实战教程](https://www.learngraph.online/LearnGraph%201.X/README.html)：学习模块 2–9、12–15；基础章节按需回顾。
- [LangChain · Agent harness](https://docs.langchain.com/oss/python/langchain/overview)：create_agent 与框架分工。
- [LangChain · v1 迁移指南](https://docs.langchain.com/oss/python/migrate/langchain-v1)：校准旧教程中的 create_react_agent 与 hooks。
- [LangChain · Tools](https://docs.langchain.com/oss/python/langchain/tools)：工具契约、ToolRuntime 与失败处理。
- [LangChain · Structured output](https://docs.langchain.com/oss/python/langchain/structured-output)：定义可验证的输出结构。
- [LangChain · Middleware](https://docs.langchain.com/oss/python/langchain/middleware/overview)：在执行循环中管理上下文与行为。
- [LangGraph · Graph API](https://docs.langchain.com/oss/python/langgraph/graph-api)：状态、reducer、条件边、Send 与 Command。
- [LangGraph · Persistence](https://docs.langchain.com/oss/python/langgraph/persistence)：线程 checkpoint 与跨线程 Store。
- [LangGraph · Interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts)：暂停、人工输入与恢复。
- [LangGraph · Memory](https://docs.langchain.com/oss/python/concepts/memory)：记忆的作用域、更新与质量。
- [LangGraph · Streaming](https://docs.langchain.com/oss/python/langgraph/streaming)：区分节点更新与消息流。
- [Retrieval · 检索增强](https://docs.langchain.com/oss/python/deepagents/retrieval)：检索工具与上下文组织；当前官方页面位于 Deep Agents 文档。
- [LangGraph · Workflows & agents](https://docs.langchain.com/oss/python/langgraph/workflows-agents)：路由、并行、编排与评审模式。
- [LangChain · Multi-agent](https://docs.langchain.com/oss/python/langchain/multi-agent)：协作模式与角色边界。
- [LangGraph · Subgraphs](https://docs.langchain.com/oss/python/langgraph/use-subgraphs)：封装独立职责与转换状态。
- [LangSmith · Evaluation](https://docs.langchain.com/langsmith/evaluation)：数据集、评估器与实验比较。
- [LangSmith · Deployment](https://docs.langchain.com/langsmith/deployment)：服务化与部署方案。
- [LearnGraph · 3.1 State Schema](https://www.learngraph.online/LearnGraph%201.X/module-3-state-reducer-memory/3.1%20State%20schema.html)：用中文案例理解状态建模。
- [LearnGraph · 4.2 动态中断](https://www.learngraph.online/LearnGraph%201.X/module-4-human-in-the-loop/4.2%20Dynamic%20Breakpoints.html)：示例接口请对照官方 interrupt 文档。
- [LearnGraph · 5.2 子图](https://www.learngraph.online/LearnGraph%201.X/module-5-advanced-patterns/5.2%20Sub-Graph.html)：父子图边界的中文补充。
- [LearnGraph · 13.1 Agentic RAG](https://www.learngraph.online/LearnGraph%201.X/module-13-agentic-rag/13.1%20Introduction.html)：高级检索工作流的案例入口。
