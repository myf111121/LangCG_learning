# LangChain 与 LangGraph：12 周完整路线

Python · 每周约 12 小时 · 共 144 小时

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

## LangGraph 框架实战：第 7–12 周

前 6 周保留原有 Agent 工程场景；以下新增 24 个真实 LangGraph API 任务、96 组验收和 6 次项目交付。每周阅读 4h、编码 4h、项目 4h。代码使用 LangGraph 1.2.14，Python 3.11+。

网页可编辑、全屏与保存草稿。下载运行包后安装 requirements.txt，执行 solution.py 查看场景，执行 verify.py 生成 result.json，再导入网页验收。若在本地改代码，先导入 solution.py。任务、代码和用例版本必须匹配，全部通过后保存完成记录。无需模型 API Key。官方文档校准接口，LearnGraph、LangChain Academy 与 Hugging Face Agents Course 补充案例。

## 第 7 周：LangGraph 基础与图建模

从真实 StateGraph 开始，掌握状态、节点、边与循环

章节：LearnGraph 1.4 / 2.1 / 3.1–3.3 · 官方 Graph API

### w7-1 · 用 StateGraph 编译第一个工作流

学习重点：用 StateGraph、START、END、节点更新和 compile 构建真正可执行的顺序图。

#### 从构建器到运行对象

StateGraph 描述图；add_node 注册函数，add_edge 表达先后关系，compile 产生可 invoke 的对象。清理查询、生成回答和最终结果是不同阶段。用固定函数理解执行顺序后，再在节点中接入模型。

#### 节点只提交自己的更新

查看已提供的 normalize 与 answer：输入是当前状态，返回值是局部更新。将 START → normalize → answer → END 连起来，确认空白被清理，输入对象没有被原地修改，并检查返回对象是 CompiledStateGraph。

#### 自己的第一次图实验

画出图并记录一次输入、每个节点的更新和最终输出。在 answer 节点换成自己的笔记函数，保持图结构和验收不变。模型不是运行最小图的必要条件。

业务场景：知识库收到带空白的查询。把清理与回答两个普通函数连接成真正可运行的 LangGraph。

调用链：业务输入与真实 LangGraph 运行时 → 你实现：build_graph → 图输出、快照或事件 → 下游使用

功能关系：把前六周的普通组件接到图运行时；后续 schema、分支和 checkpoint 都在这个图上扩展。

接口与要求：

- 返回 CompiledStateGraph，而不是直接计算答案。
- 节点命名为 normalize、answer；按 START → normalize → answer → END 连接。
- 节点只返回更新，输入字典不能被原地修改。

初始程序：

```python
# === SCENARIO: 知识库助手 ===
# 用 StateGraph 编译第一个工作流
import json

# --- 已提供：业务数据与上下游组件 ---
import asyncio
import json
from typing import TypedDict, Annotated, Literal
from operator import add
from dataclasses import dataclass
from langgraph.graph import StateGraph, START, END, MessagesState
from langgraph.graph.state import CompiledStateGraph
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command, Send, interrupt, RetryPolicy, CachePolicy
from langgraph.runtime import Runtime
from langgraph.store.memory import InMemoryStore
from langgraph.cache.memory import InMemoryCache

class State(TypedDict):
    query: str
    answer: str
def normalize(state):
    return {"query": state["query"].strip()}
def answer(state):
    return {"answer": "笔记：" + state["query"]}

# --- 你的任务：补全本节组件，保持函数接口 ---
def build_graph():
    """按要求使用真实 LangGraph API 完成组件。"""
    raise NotImplementedError("请完成 LangGraph 组件")

# --- 已提供：完整调用流程；补全组件后可直接运行 ---
def run_scenario():
    graph = build_graph()
    return graph.invoke({"query": "  checkpoint  "})

if __name__ == "__main__":
    print(json.dumps(run_scenario(), ensure_ascii=False, indent=2))

```

自动验收：

**真正编译图，并按顺序运行**

```python
g = build_graph()
expect_equal(isinstance(g, CompiledStateGraph), True)
expect_equal(g.invoke({"query":" graph "})["answer"], "笔记：graph")
```

**空输入文本与输入对象保留**

```python
data = {"query":"   "}
g = build_graph()
expect_equal(g.invoke(data), {"query":"", "answer":"笔记："})
expect_equal(data, {"query":"   "})
```

**结构中包含入口、业务节点与出口**

```python
g = build_graph()
expect_equal(set(g.get_graph().nodes), {START, "normalize", "answer", END})
```

**完整场景：真实图与上下游得到预期结果**

```python
expect_equal(run_scenario(), json.loads("{\"query\":\"checkpoint\",\"answer\":\"笔记：checkpoint\"}"))
```

参考资料：

- [LangGraph · Overview](https://docs.langchain.com/oss/python/langgraph/overview) · 官方文档
- [LangGraph · Graph API](https://docs.langchain.com/oss/python/langgraph/graph-api) · 官方文档
- [LearnGraph · 1.4 LangGraph basics](https://www.learngraph.online/LearnGraph%201.X/module-1-langgraph-basics/1.4%20LangGraph%20basics.html) · 中文教程
- [LearnGraph · 2.1 Simple graph](https://www.learngraph.online/LearnGraph%201.X/module-2-agent-chain-router/2.1%20Simple%20graph.html) · 中文教程
- [Hugging Face · Agents Course / LangGraph](https://huggingface.co/learn/agents-course/unit2/langgraph/introduction) · 专业课程

### w7-2 · 区分输入、内部状态与公开输出

学习重点：区分 Input、内部 State 和 Output，让调试数据留在工作流内部。

#### 字段属于哪个边界

query 是调用者输入，debug 是内部诊断，answer 是公开输出。定义独立 schema，向 StateGraph 传 input_schema 和 output_schema。TypedDict 描述类型；严格校验外部请求时另设验证层。

#### 观察输出过滤

对同一输入比较 invoke 结果与节点更新流：debug 能出现在内部更新，却不应出现在公开输出。不要把私有状态全部复制到服务响应里。验收分别检查公开字段和内部诊断。

#### 扩展实验

增加内部检索分数字段，确认公开接口不变。为状态、日志、缓存和 API 响应分别确定所需字段，再写一条防止意外泄漏的测试。

业务场景：检索节点要保留调试来源，界面只应该得到 answer。用独立的输入和输出 schema 建立图的公开契约。

调用链：业务输入与真实 LangGraph 运行时 → 你实现：build_graph → 图输出、快照或事件 → 下游使用

功能关系：公开输出和内部协作分开；部署接口与后续子图转换沿用这个边界。

接口与要求：

- 使用 StateGraph(State, input_schema=Input, output_schema=Output)。
- 注册 respond 节点并编译；invoke 只返回 answer。
- 输出 schema 负责过滤字段，不能把它当作鉴权或流式脱敏机制。

初始程序：

```python
# === SCENARIO: 知识库助手 ===
# 区分输入、内部状态与公开输出
import json

# --- 已提供：业务数据与上下游组件 ---
import asyncio
import json
from typing import TypedDict, Annotated, Literal
from operator import add
from dataclasses import dataclass
from langgraph.graph import StateGraph, START, END, MessagesState
from langgraph.graph.state import CompiledStateGraph
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command, Send, interrupt, RetryPolicy, CachePolicy
from langgraph.runtime import Runtime
from langgraph.store.memory import InMemoryStore
from langgraph.cache.memory import InMemoryCache

class Input(TypedDict):
    query: str
class Output(TypedDict):
    answer: str
class State(Input, Output):
    debug: str
def respond(state):
    return {"answer":"结果：" + state["query"], "debug":"internal-index"}

# --- 你的任务：补全本节组件，保持函数接口 ---
def build_graph():
    """按要求使用真实 LangGraph API 完成组件。"""
    raise NotImplementedError("请完成 LangGraph 组件")

# --- 已提供：完整调用流程；补全组件后可直接运行 ---
def run_scenario():
    return build_graph().invoke({"query":"interrupt"})

if __name__ == "__main__":
    print(json.dumps(run_scenario(), ensure_ascii=False, indent=2))

```

自动验收：

**只公开约定输出**

```python
g = build_graph()
expect_equal(isinstance(g, CompiledStateGraph), True)
expect_equal(g.invoke({"query":"a"}), {"answer":"结果：a"})
```

**内部节点仍然产生调试字段**

```python
updates = list(build_graph().stream({"query":"b"}, stream_mode="updates"))
expect_equal(updates[0]["respond"]["debug"], "internal-index")
```

**不依赖固定查询或旧状态**

```python
g = build_graph()
expect_equal(g.invoke({"query":"x"}), {"answer":"结果：x"})
expect_equal(g.invoke({"query":"y"}), {"answer":"结果：y"})
```

**完整场景：真实图与上下游得到预期结果**

```python
expect_equal(run_scenario(), json.loads("{\"answer\":\"结果：interrupt\"}"))
```

参考资料：

- [LangGraph · Graph API](https://docs.langchain.com/oss/python/langgraph/graph-api) · 官方文档
- [LearnGraph · 3.3 Multiple Schemas](https://www.learngraph.online/LearnGraph%201.X/module-3-state-reducer-memory/3.3%20Multiple%20Schemas.html) · 中文教程
- [LangGraph · Use the Graph API](https://docs.langchain.com/oss/python/langgraph/use-graph-api) · 官方文档

### w7-3 · 用 Annotated 和 reducer 累积更新

学习重点：使用 Annotated 指定 reducer，正确区分覆盖更新与累积更新。

#### 合并是字段的规则

本例 log 使用 operator.add，将两个节点新增记录追加到 seed 后；普通字段采用覆盖更新。reducer 是运行时的状态合并规则，节点无需手动拼接已有列表。

#### 为什么旧记录会重复

如果节点先返回旧列表加新记录，追加 reducer 又会把旧项合并一次。clean 和 retrieve 只返回自己的新增记录，分别用空列表和已有记录验证没有重复。

#### 业务上的合并选择

日志追加、集合去重和按 ID 更新需要不同 reducer。追加顺序不应替代业务时间；带稳定 ID 和序号的事件更容易审计。用小输入先解释规则，再放进并行图。

业务场景：清理与检索节点分别记录日志。为日志字段声明追加 reducer，避免后一个节点覆盖已有记录。

调用链：业务输入与真实 LangGraph 运行时 → 你实现：build_graph → 图输出、快照或事件 → 下游使用

功能关系：并行和 Send 的多个写入也需要 reducer；日志合并契约先在顺序图中验证。

接口与要求：

- 在函数内定义 State，log 为 Annotated[list[str], add]。
- 节点只返回本次新增日志；图按 clean → retrieve 顺序运行。
- 已有日志要保留；再次运行新图时不能共享之前的列表。

初始程序：

```python
# === SCENARIO: 知识库助手 ===
# 用 Annotated 和 reducer 累积更新
import json

# --- 已提供：业务数据与上下游组件 ---
import asyncio
import json
from typing import TypedDict, Annotated, Literal
from operator import add
from dataclasses import dataclass
from langgraph.graph import StateGraph, START, END, MessagesState
from langgraph.graph.state import CompiledStateGraph
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command, Send, interrupt, RetryPolicy, CachePolicy
from langgraph.runtime import Runtime
from langgraph.store.memory import InMemoryStore
from langgraph.cache.memory import InMemoryCache

def clean(state):
    return {"log":["clean"]}
def retrieve(state):
    return {"log":["retrieve"]}

# --- 你的任务：补全本节组件，保持函数接口 ---
def build_graph():
    """按要求使用真实 LangGraph API 完成组件。"""
    raise NotImplementedError("请完成 LangGraph 组件")

# --- 已提供：完整调用流程；补全组件后可直接运行 ---
def run_scenario():
    return build_graph().invoke({"log":["request"]})

if __name__ == "__main__":
    print(json.dumps(run_scenario(), ensure_ascii=False, indent=2))

```

自动验收：

**已有记录和两个节点的增量都保留**

```python
g = build_graph()
expect_equal(isinstance(g, CompiledStateGraph), True)
expect_equal(g.invoke({"log":["seed"]})["log"], ["seed","clean","retrieve"])
```

**空列表和不同调用互不污染**

```python
g = build_graph()
expect_equal(g.invoke({"log":[]})["log"], ["clean","retrieve"])
expect_equal(g.invoke({"log":["new"]})["log"], ["new","clean","retrieve"])
```

**节点返回增量，不重复追加旧日志**

```python
updates = list(build_graph().stream({"log":["old"]}, stream_mode="updates"))
expect_equal(updates, [{"clean":{"log":["clean"]}}, {"retrieve":{"log":["retrieve"]}}])
```

**完整场景：真实图与上下游得到预期结果**

```python
expect_equal(run_scenario(), json.loads("{\"log\":[\"request\",\"clean\",\"retrieve\"]}"))
```

参考资料：

- [LangGraph · Graph API](https://docs.langchain.com/oss/python/langgraph/graph-api) · 官方文档
- [LearnGraph · 3.2 Reducers](https://www.learngraph.online/LearnGraph%201.X/module-3-state-reducer-memory/3.2%20Reducers.html) · 中文教程
- [LangGraph · Use the Graph API](https://docs.langchain.com/oss/python/langgraph/use-graph-api) · 官方文档

### w7-4 · 条件边、有界循环与兜底出口

学习重点：通过条件边组织澄清、检索重试和兜底，循环必须有业务上限。

#### 先定义出口

空查询进入 clarify，找到 graph 证据则回答，其他查询最多检索两次后拒答。把 found 与 attempts 放进状态，路由函数据此返回下一节点，避免隐藏无限循环。

#### 业务预算与递归限制

尝试次数决定用户会看到的结果，recursion_limit 是运行时最后保护，二者不能互相替代。避免同一节点配置相互冲突的静态边和条件边。验收涵盖三个出口。

#### 追踪一次失败

打印每次检索 attempts，解释最后为何进入兜底。把相同预算原则迁移到模型修订流程，增加始终失败输入，确认仍然能够终止。

业务场景：查询可能为空或暂时无结果。让图选择澄清、回答或最多两次检索后的拒答，避免无限循环。

调用链：业务输入与真实 LangGraph 运行时 → 你实现：build_graph → 图输出、快照或事件 → 下游使用

功能关系：把第 2 周的路由逻辑转为真正的条件边；后续 RAG 会加入查询改写。

接口与要求：

- 空 query 走 clarify；非空走 retrieve。
- 找到证据走 respond；未找到且 attempts < 2 再检索，否则走 refuse。
- 出口都连接 END，调用设置 recursion_limit=20。

初始程序：

```python
# === SCENARIO: 知识库助手 ===
# 条件边、有界循环与兜底出口
import json

# --- 已提供：业务数据与上下游组件 ---
import asyncio
import json
from typing import TypedDict, Annotated, Literal
from operator import add
from dataclasses import dataclass
from langgraph.graph import StateGraph, START, END, MessagesState
from langgraph.graph.state import CompiledStateGraph
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command, Send, interrupt, RetryPolicy, CachePolicy
from langgraph.runtime import Runtime
from langgraph.store.memory import InMemoryStore
from langgraph.cache.memory import InMemoryCache

class State(TypedDict):
    query: str
    attempts: int
    found: bool
    answer: str
def inspect_query(state):
    return {"query":state["query"].strip()}
def retrieve(state):
    return {"attempts":state.get("attempts",0)+1, "found":state["query"]=="graph"}
def respond(state):
    return {"answer":"有依据的回答"}
def clarify(state):
    return {"answer":"请补充问题"}
def refuse(state):
    return {"answer":"没有足够证据"}

# --- 你的任务：补全本节组件，保持函数接口 ---
def build_graph():
    """按要求使用真实 LangGraph API 完成组件。"""
    raise NotImplementedError("请完成 LangGraph 组件")

# --- 已提供：完整调用流程；补全组件后可直接运行 ---
def run_scenario():
    return build_graph().invoke({"query":"missing","attempts":0}, {"recursion_limit":20})

if __name__ == "__main__":
    print(json.dumps(run_scenario(), ensure_ascii=False, indent=2))

```

自动验收：

**空问题不检索**

```python
r = build_graph().invoke({"query":" ","attempts":0}, {"recursion_limit":20})
expect_equal(r["answer"],"请补充问题")
expect_equal(r["attempts"],0)
```

**找到证据立即结束**

```python
r = build_graph().invoke({"query":" graph ","attempts":0}, {"recursion_limit":20})
expect_equal((r["answer"],r["attempts"]),("有依据的回答",1))
```

**无结果最多检索两次**

```python
r = build_graph().invoke({"query":"x","attempts":0}, {"recursion_limit":20})
expect_equal((r["answer"],r["attempts"]),("没有足够证据",2))
```

**完整场景：真实图与上下游得到预期结果**

```python
expect_equal(run_scenario(), json.loads("{\"query\":\"missing\",\"attempts\":2,\"found\":false,\"answer\":\"没有足够证据\"}"))
```

参考资料：

- [LangGraph · Use the Graph API](https://docs.langchain.com/oss/python/langgraph/use-graph-api) · 官方文档
- [LangGraph · Workflows & agents](https://docs.langchain.com/oss/python/langgraph/workflows-agents) · 官方文档
- [LangChain Academy · 官方课程源码](https://github.com/langchain-ai/langchain-academy) · 专业课程

### 本周交付：LG v0.1 · 真正可执行的工作流

建立独立 Python 环境，把清理、检索与回答编译成真实图。提供输入/输出 schema、累积日志、澄清与有界兜底，保存图形和三条路径记录。

- [ ] 使用真实 StateGraph，新环境可运行
- [ ] 空查询、命中与兜底均可终止
- [ ] 解释 reducer 合并与输出过滤

## 第 8 周：消息、工具与运行时

运行真实工具循环，并将节点事件提供给界面

章节：LearnGraph 2 · 官方 Quickstart、Runtime、Streaming

### w8-1 · MessagesState 与消息 ID 合并

学习重点：用 MessagesState 与消息 ID 合并真实消息，理解追加和替换。

#### 消息有结构

HumanMessage、AIMessage、ToolMessage 包含角色、ID 与工具调用。MessagesState 的 reducer 合并消息更新；固定 ID 为 answer-1 时，更新应替换对应旧回答。

#### 验收合并行为

新 ID 表示新增消息，相同 ID 更新已有消息。给图一条旧回答再运行 respond，确认用户消息保留、回答被替换且不重复。人工编辑历史同样需要正确 ID。

#### 接入模型之前

固定回复无需 API Key；项目可替换为模型生成的 AIMessage。保留角色与调用结构，裁剪历史时维护工具请求和结果配对，不随意把所有消息转成字符串。

业务场景：同一条助手回答被修正时，消息 ID 应替换原内容。使用 MessagesState，保留用户消息且避免重复回答。

调用链：业务输入与真实 LangGraph 运行时 → 你实现：build_graph → 图输出、快照或事件 → 下游使用

功能关系：消息状态将交给 ToolNode；工具调用 ID 与 ToolMessage 必须能够对应。

接口与要求：

- StateGraph 使用 MessagesState，并连接 respond。
- 相同消息 ID 更新已有消息；不同 ID 追加。
- 不能使用普通列表拼接替代 add_messages 的 ID 合并语义。

初始程序：

```python
# === SCENARIO: 知识库助手 ===
# MessagesState 与消息 ID 合并
import json

# --- 已提供：业务数据与上下游组件 ---
import asyncio
import json
from typing import TypedDict, Annotated, Literal
from operator import add
from dataclasses import dataclass
from langgraph.graph import StateGraph, START, END, MessagesState
from langgraph.graph.state import CompiledStateGraph
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command, Send, interrupt, RetryPolicy, CachePolicy
from langgraph.runtime import Runtime
from langgraph.store.memory import InMemoryStore
from langgraph.cache.memory import InMemoryCache

from langchain_core.messages import HumanMessage, AIMessage, ToolMessage
def respond(state):
    return {"messages":[AIMessage(content="更新后的回答", id="answer-1")]}

# --- 你的任务：补全本节组件，保持函数接口 ---
def build_graph():
    """按要求使用真实 LangGraph API 完成组件。"""
    raise NotImplementedError("请完成 LangGraph 组件")

# --- 已提供：完整调用流程；补全组件后可直接运行 ---
def run_scenario():
    r=build_graph().invoke({"messages":[HumanMessage(content="你好",id="user-1"),AIMessage(content="旧回答",id="answer-1")]})
    return {"messages":[[m.id,m.content] for m in r["messages"]]}

if __name__ == "__main__":
    print(json.dumps(run_scenario(), ensure_ascii=False, indent=2))

```

自动验收：

**相同 ID 替换，不重复追加**

```python
r=build_graph().invoke({"messages":[AIMessage(content="old",id="answer-1")]})
expect_equal(len(r["messages"]),1)
expect_equal(r["messages"][0].content,"更新后的回答")
```

**用户消息保留并追加新回答**

```python
r=build_graph().invoke({"messages":[HumanMessage(content="a",id="u")]})
expect_equal([m.id for m in r["messages"]],["u","answer-1"])
```

**字典消息被转换为消息对象**

```python
r=build_graph().invoke({"messages":[{"role":"user","content":"a","id":"u"}]})
expect_equal(isinstance(r["messages"][0],HumanMessage),True)
```

**完整场景：真实图与上下游得到预期结果**

```python
expect_equal(run_scenario(), json.loads("{\"messages\":[[\"user-1\",\"你好\"],[\"answer-1\",\"更新后的回答\"]]}"))
```

参考资料：

- [LangGraph · Quickstart](https://docs.langchain.com/oss/python/langgraph/quickstart) · 官方文档
- [LangGraph · Graph API](https://docs.langchain.com/oss/python/langgraph/graph-api) · 官方文档
- [LangGraph · Add memory](https://docs.langchain.com/oss/python/langgraph/add-memory) · 官方文档

### w8-2 · ToolNode 与 tools_condition 执行循环

学习重点：组合 ToolNode 与 tools_condition，执行真实的模型—工具—模型图循环。

#### 工具怎么进入图

固定 agent 返回带 tool_calls 的 AIMessage；lookup_note 是有类型和说明的工具。ToolNode 执行调用并返回 ToolMessage，tools_condition 根据最后消息选择工具节点或结束。

#### 正确连接与关联

连接 START → agent、agent 的条件出口和 tools → agent。tool_call_id 与请求 ID 必须一致；检查四条消息的完整序列，最终回答后不能再执行工具。

#### 替换固定 agent

接入绑定工具的聊天模型时保留图结构，继续测试工具错误与终止行为。先验证执行循环，再评估模型决策的质量，本节无需购买模型服务。

业务场景：模型输出用固定消息代替付费调用，但工具执行和图路由使用真实 ToolNode。让工具结果返回助手节点后结束。

调用链：业务输入与真实 LangGraph 运行时 → 你实现：build_graph → 图输出、快照或事件 → 下游使用

功能关系：固定模型输入用于稳定验收；实战时可以替换为支持 tool calling 的模型，而图结构保留。

接口与要求：

- 用 MessagesState 注册 agent 与 ToolNode([lookup])。
- agent 通过 tools_condition 选择 tools 或 END；tools 返回 agent。
- 保留真实 ToolMessage 及其 tool_call_id，不手写一个工具循环。

初始程序：

```python
# === SCENARIO: 知识库助手 ===
# ToolNode 与 tools_condition 执行循环
import json

# --- 已提供：业务数据与上下游组件 ---
import asyncio
import json
from typing import TypedDict, Annotated, Literal
from operator import add
from dataclasses import dataclass
from langgraph.graph import StateGraph, START, END, MessagesState
from langgraph.graph.state import CompiledStateGraph
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command, Send, interrupt, RetryPolicy, CachePolicy
from langgraph.runtime import Runtime
from langgraph.store.memory import InMemoryStore
from langgraph.cache.memory import InMemoryCache

from langchain_core.messages import HumanMessage, AIMessage, ToolMessage
from langchain_core.tools import tool
from langgraph.prebuilt import ToolNode, tools_condition
@tool
def lookup(query: str) -> str:
    """查询固定技术笔记。"""
    return "checkpoint 保存状态" if query=="graph" else "没有笔记"
def agent(state):
    last=state["messages"][-1]
    if isinstance(last,ToolMessage):
        return {"messages":[AIMessage(content=last.content)]}
    return {"messages":[AIMessage(content="",tool_calls=[{"name":"lookup","args":{"query":last.content},"id":"call-1","type":"tool_call"}])]}

# --- 你的任务：补全本节组件，保持函数接口 ---
def build_graph():
    """按要求使用真实 LangGraph API 完成组件。"""
    raise NotImplementedError("请完成 LangGraph 组件")

# --- 已提供：完整调用流程；补全组件后可直接运行 ---
def run_scenario():
    r=build_graph().invoke({"messages":[HumanMessage(content="graph")]},{"recursion_limit":12})
    return {"answer":r["messages"][-1].content,"tool_ids":[m.tool_call_id for m in r["messages"] if isinstance(m,ToolMessage)]}

if __name__ == "__main__":
    print(json.dumps(run_scenario(), ensure_ascii=False, indent=2))

```

自动验收：

**工具消息与调用 ID 对应**

```python
r=build_graph().invoke({"messages":[HumanMessage(content="graph")]},{"recursion_limit":12})
expect_equal([m.tool_call_id for m in r["messages"] if isinstance(m,ToolMessage)],["call-1"])
```

**工具执行后模型返回最终消息**

```python
r=build_graph().invoke({"messages":[HumanMessage(content="x")]},{"recursion_limit":12})
expect_equal(len(r["messages"]),4)
expect_equal(r["messages"][-1].content,"没有笔记")
```

**已存在工具结果时不会重复执行工具**

```python
r=build_graph().invoke({"messages":[ToolMessage(content="cached",tool_call_id="old")]},{"recursion_limit":12})
expect_equal(len(r["messages"]),2)
expect_equal(r["messages"][-1].content,"cached")
```

**完整场景：真实图与上下游得到预期结果**

```python
expect_equal(run_scenario(), json.loads("{\"answer\":\"checkpoint 保存状态\",\"tool_ids\":[\"call-1\"]}"))
```

参考资料：

- [LangGraph · Quickstart](https://docs.langchain.com/oss/python/langgraph/quickstart) · 官方文档
- [LangGraph · Use the Graph API](https://docs.langchain.com/oss/python/langgraph/use-graph-api) · 官方文档
- [LangChain · Tools](https://docs.langchain.com/oss/python/langchain/tools) · 官方文档

### w8-3 · Runtime context 与用户边界

学习重点：通过 context_schema 和 Runtime 注入用户身份、资源与配置。

#### 状态与上下文有不同职责

查询与回答在节点之间更新，用户身份和依赖由调用者传 context。定义 Context 数据类，通过 Runtime[Context] 和 runtime.context 读取 user_id；连接对象不应存到 checkpoint。

#### 复用图但隔离用户

alice 与 bob 的笔记不同。复用编译图，分别传入两个 context，确认身份没有泄漏到公开输出，另一个用户也不会拿到前一用户的结果。

#### 服务中的身份

服务端从已认证会话确定用户，再构造 context。context 不会替代身份认证；数据库客户端和模型配置也可用同样方法注入，使节点便于独立测试。

业务场景：同一个图为不同用户查询笔记。把用户身份放入每次调用的 Context，而不是写进共享全局变量。

调用链：业务输入与真实 LangGraph 运行时 → 你实现：answer_node → 图输出、快照或事件 → 下游使用

功能关系：Store 的 namespace 与部署的身份绑定建立在同样的 context 边界上。

接口与要求：

- 使用 runtime.context.user_id 选择 NOTES。
- 返回 answer；未找到用户返回“没有笔记”。
- 身份来自可信调用方；context_schema 本身不执行认证。

初始程序：

```python
# === SCENARIO: 知识库助手 ===
# Runtime context 与用户边界
import json

# --- 已提供：业务数据与上下游组件 ---
import asyncio
import json
from typing import TypedDict, Annotated, Literal
from operator import add
from dataclasses import dataclass
from langgraph.graph import StateGraph, START, END, MessagesState
from langgraph.graph.state import CompiledStateGraph
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command, Send, interrupt, RetryPolicy, CachePolicy
from langgraph.runtime import Runtime
from langgraph.store.memory import InMemoryStore
from langgraph.cache.memory import InMemoryCache

@dataclass
class Context:
    user_id: str
class State(TypedDict):
    query: str
    answer: str
NOTES={"alice":"Alice 的笔记", "bob":"Bob 的笔记"}
def build_graph():
    b=StateGraph(State,context_schema=Context)
    b.add_node("answer",answer_node)
    b.add_edge(START,"answer")
    b.add_edge("answer",END)
    return b.compile()

# --- 你的任务：补全本节组件，保持函数接口 ---
def answer_node(state: State, runtime: Runtime[Context]):
    """按要求使用真实 LangGraph API 完成组件。"""
    raise NotImplementedError("请完成 LangGraph 组件")

# --- 已提供：完整调用流程；补全组件后可直接运行 ---
def run_scenario():
    g=build_graph()
    return {"alice":g.invoke({"query":"graph"},context=Context("alice"))["answer"],"bob":g.invoke({"query":"graph"},context=Context("bob"))["answer"]}

if __name__ == "__main__":
    print(json.dumps(run_scenario(), ensure_ascii=False, indent=2))

```

自动验收：

**同一图两次调用使用不同 context**

```python
g=build_graph()
expect_equal(g.invoke({"query":"x"},context=Context("alice"))["answer"],"Alice 的笔记")
expect_equal(g.invoke({"query":"x"},context=Context("bob"))["answer"],"Bob 的笔记")
```

**不存在的用户没有其他用户数据**

```python
expect_equal(build_graph().invoke({"query":"x"},context=Context("unknown"))["answer"],"没有笔记")
```

**身份不会成为公开状态字段**

```python
r=build_graph().invoke({"query":"x"},context=Context("alice"))
expect_equal(set(r),{"query","answer"})
```

**完整场景：真实图与上下游得到预期结果**

```python
expect_equal(run_scenario(), json.loads("{\"alice\":\"Alice 的笔记\",\"bob\":\"Bob 的笔记\"}"))
```

参考资料：

- [LangGraph · Use the Graph API](https://docs.langchain.com/oss/python/langgraph/use-graph-api) · 官方文档
- [LangGraph · Stores](https://docs.langchain.com/oss/python/langgraph/stores) · 官方文档

### w8-4 · 区分 updates、values 与流式事件

学习重点：区分 updates、values、消息与自定义事件，让界面知道当前运行状态。

#### 选择事件语义

本节用 graph.stream(..., stream_mode="updates") 收集节点局部更新。values 展示完整状态，模型消息流则用于逐 token 输出。中间更新不代表最终任务已经完成。

#### 输出可消费事件

collect_updates 返回 node 和 update。验收检查 normalize、answer 的顺序和字段，防止把全部事件拍平成最终回答。异常、待审批和最终完成应有各自的界面状态。

#### 继续到当前接口

官方文档还介绍消息、自定义数据与新版事件接口。本课先掌握固定版本的同步 stream，周项目再加入异步消费、断开连接与取消，按需要选择事件形式。

业务场景：界面需要观察节点更新。收集真实图的 updates 事件，保留节点名字和本步增量，而不是把它当作最终完整状态。

调用链：业务输入与真实 LangGraph 运行时 → 你实现：collect_updates → 图输出、快照或事件 → 下游使用

功能关系：这是运行界面接图的入口；messages 是模型消息流，custom 可用于业务进度。

接口与要求：

- 调用 graph.stream(data, stream_mode="updates")。
- 返回事件列表 [{node, update}]，按运行顺序保留。
- 节点更新只包含该节点返回的字段；完整状态另用 invoke 或 values。

初始程序：

```python
# === SCENARIO: 知识库助手 ===
# 区分 updates、values 与流式事件
import json

# --- 已提供：业务数据与上下游组件 ---
import asyncio
import json
from typing import TypedDict, Annotated, Literal
from operator import add
from dataclasses import dataclass
from langgraph.graph import StateGraph, START, END, MessagesState
from langgraph.graph.state import CompiledStateGraph
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command, Send, interrupt, RetryPolicy, CachePolicy
from langgraph.runtime import Runtime
from langgraph.store.memory import InMemoryStore
from langgraph.cache.memory import InMemoryCache

class State(TypedDict):
    query: str
    answer: str
def normalize(state):
    return {"query": state["query"].strip()}
def answer(state):
    return {"answer": "笔记：" + state["query"]}
def build_graph():
    builder = StateGraph(State)
    builder.add_node("normalize", normalize)
    builder.add_node("answer", answer)
    builder.add_edge(START, "normalize")
    builder.add_edge("normalize", "answer")
    builder.add_edge("answer", END)
    return builder.compile()

# --- 你的任务：补全本节组件，保持函数接口 ---
def collect_updates(graph, data):
    """按要求使用真实 LangGraph API 完成组件。"""
    raise NotImplementedError("请完成 LangGraph 组件")

# --- 已提供：完整调用流程；补全组件后可直接运行 ---
def run_scenario():
    return {"events":collect_updates(build_graph(),{"query":" graph "})}

if __name__ == "__main__":
    print(json.dumps(run_scenario(), ensure_ascii=False, indent=2))

```

自动验收：

**真实节点顺序和更新字段**

```python
r=collect_updates(build_graph(),{"query":" x "})
expect_equal(r,[{"node":"normalize","update":{"query":"x"}},{"node":"answer","update":{"answer":"笔记：x"}}])
```

**没有伪造初始事件或完整状态**

```python
r=collect_updates(build_graph(),{"query":"a"})
expect_equal(len(r),2)
expect_equal(set(r[1]["update"]),{"answer"})
```

**空文本仍然产生两个节点事件**

```python
expect_equal(collect_updates(build_graph(),{"query":" "})[1]["update"],{"answer":"笔记："})
```

**完整场景：真实图与上下游得到预期结果**

```python
expect_equal(run_scenario(), json.loads("{\"events\":[{\"node\":\"normalize\",\"update\":{\"query\":\"graph\"}},{\"node\":\"answer\",\"update\":{\"answer\":\"笔记：graph\"}}]}"))
```

参考资料：

- [LangGraph · Streaming](https://docs.langchain.com/oss/python/langgraph/streaming) · 官方文档
- [LangGraph · Use the Graph API](https://docs.langchain.com/oss/python/langgraph/use-graph-api) · 官方文档

### 本周交付：LG v0.2 · 工具 Agent 与事件流

用 MessagesState、ToolNode 与条件边构建工具 Agent，先用固定模型动作，再可选接入模型。Runtime 注入用户配置，展示节点更新、消息和最终完成状态。

- [ ] 工具请求和结果 ID 对应
- [ ] 两个用户上下文不串用
- [ ] 展示 updates 与明确的最终状态

## 第 9 周：持久化、审批与时间旅行

让真实图可以暂停、重启和从历史状态分叉

章节：LearnGraph 4 · 官方 Checkpointers、Interrupts、Time travel

### w9-1 · Checkpointer、thread_id 与历史状态

学习重点：加入 InMemorySaver，用 thread_id 延续状态并检查 checkpoint 历史。

#### 同一线程继续执行

compile 时注入 checkpointer，invoke 配置 configurable.thread_id。total 用加法 reducer，同一线程依次输入 delta=2 和 3 得到 5；另一个线程从自己的状态开始。

#### 直接查看快照

用 get_state 查看 values、next、metadata，用 get_state_history 查看历史。线程 ID 是恢复定位信息；一次请求 ID 与持久会话线程 ID 应有明确关系。

#### 内存后端的范围

InMemorySaver 适合实验，进程退出后不保留数据。保存配置与快照记录，下一节换 SQLite，比较业务行为相同而生命周期不同的两种后端。

业务场景：记录同一会话的计数变化，并观察另一个会话独立的 checkpoint。

调用链：业务输入与真实 LangGraph 运行时 → 你实现：build_graph → 图输出、快照或事件 → 下游使用

功能关系：为审批和 time travel 提供线程快照；下一节将保存器换成 SQLite。

接口与要求：

- compile 使用调用方提供的 checkpointer。
- 同 thread_id 在状态基础上继续；不同 thread_id 完全独立。
- 通过 get_state 检查真实快照，内存 saver 不代表跨进程持久化。

初始程序：

```python
# === SCENARIO: 知识库助手 ===
# Checkpointer、thread_id 与历史状态
import json

# --- 已提供：业务数据与上下游组件 ---
import asyncio
import json
from typing import TypedDict, Annotated, Literal
from operator import add
from dataclasses import dataclass
from langgraph.graph import StateGraph, START, END, MessagesState
from langgraph.graph.state import CompiledStateGraph
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command, Send, interrupt, RetryPolicy, CachePolicy
from langgraph.runtime import Runtime
from langgraph.store.memory import InMemoryStore
from langgraph.cache.memory import InMemoryCache

class State(TypedDict):
    delta: int
    total: Annotated[int,add]
def accumulate(state):
    return {"total":state["delta"]}

# --- 你的任务：补全本节组件，保持函数接口 ---
def build_graph(checkpointer):
    """按要求使用真实 LangGraph API 完成组件。"""
    raise NotImplementedError("请完成 LangGraph 组件")

# --- 已提供：完整调用流程；补全组件后可直接运行 ---
def run_scenario():
    g=build_graph(InMemorySaver())
    cfg={"configurable":{"thread_id":"alice"}}
    g.invoke({"delta":2},cfg)
    r=g.invoke({"delta":3},cfg)
    return {"total":r["total"],"next":list(g.get_state(cfg).next)}

if __name__ == "__main__":
    print(json.dumps(run_scenario(), ensure_ascii=False, indent=2))

```

自动验收：

**同线程状态继续累积**

```python
g=build_graph(InMemorySaver())
c={"configurable":{"thread_id":"a"}}
g.invoke({"delta":2},c)
expect_equal(g.invoke({"delta":3},c)["total"],5)
```

**不同线程各自保存**

```python
g=build_graph(InMemorySaver())
a={"configurable":{"thread_id":"a"}}
b={"configurable":{"thread_id":"b"}}
g.invoke({"delta":5},a)
expect_equal(g.invoke({"delta":1},b)["total"],1)
expect_equal(g.get_state(a).values["total"],5)
```

**能读取运行历史和结束快照**

```python
g=build_graph(InMemorySaver())
c={"configurable":{"thread_id":"history"}}
g.invoke({"delta":1},c)
expect_equal(len(list(g.get_state_history(c)))>=3,True)
expect_equal(g.get_state(c).next,())
```

**完整场景：真实图与上下游得到预期结果**

```python
expect_equal(run_scenario(), json.loads("{\"total\":5,\"next\":[]}"))
```

参考资料：

- [LangGraph · Checkpointers](https://docs.langchain.com/oss/python/langgraph/checkpointers) · 官方文档
- [LangGraph · Persistence](https://docs.langchain.com/oss/python/langgraph/persistence) · 官方文档
- [LangGraph · Add memory](https://docs.langchain.com/oss/python/langgraph/add-memory) · 官方文档

### w9-2 · SQLite 保存与重新打开数据库

学习重点：通过 SQLite checkpointer，在关闭并重新打开后端后延续真实线程。

#### 连接有生命周期

SqliteSaver 来自 checkpoint-sqlite 包，使用 from_conn_string 上下文管理器关闭连接。图通过参数接受 saver，使编排逻辑不绑定固定数据库路径。

#### 验证重新打开

首次写 delta=4 后关闭连接，再打开同一文件写 delta=3，结果应为 7。测试使用独立临时文件，不让前一组线程状态污染后一组。周项目再做独立进程重启。

#### 选择生产后端

多人服务按官方后端文档确定数据库、初始化方式和连接管理。SQLite 教学结果能证明保存与重新打开，服务容量需要独立测量与验证。

业务场景：图对象和数据库连接关闭后，重新构建图仍能从文件中的线程状态继续。

调用链：业务输入与真实 LangGraph 运行时 → 你实现：build_graph → 图输出、快照或事件 → 下游使用

功能关系：从内存实验走向持久化；项目验收还要在两个独立 Python 进程间验证恢复。

接口与要求：

- 沿用调用方的 SqliteSaver，不能偷偷创建 InMemorySaver。
- 关闭连接后重新打开同一个文件，total 必须保留。
- SQLite 用于本地实验；生产数据库连接、迁移和备份需另行配置。

初始程序：

```python
# === SCENARIO: 知识库助手 ===
# SQLite 保存与重新打开数据库
import json

# --- 已提供：业务数据与上下游组件 ---
import asyncio
import json
from typing import TypedDict, Annotated, Literal
from operator import add
from dataclasses import dataclass
from langgraph.graph import StateGraph, START, END, MessagesState
from langgraph.graph.state import CompiledStateGraph
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command, Send, interrupt, RetryPolicy, CachePolicy
from langgraph.runtime import Runtime
from langgraph.store.memory import InMemoryStore
from langgraph.cache.memory import InMemoryCache

import tempfile
from pathlib import Path
from langgraph.checkpoint.sqlite import SqliteSaver
class State(TypedDict):
    delta: int
    total: Annotated[int,add]
def accumulate(state):
    return {"total":state["delta"]}

# --- 你的任务：补全本节组件，保持函数接口 ---
def build_graph(checkpointer):
    """按要求使用真实 LangGraph API 完成组件。"""
    raise NotImplementedError("请完成 LangGraph 组件")

# --- 已提供：完整调用流程；补全组件后可直接运行 ---
def run_scenario():
    with tempfile.TemporaryDirectory() as folder:
        path=str(Path(folder)/"checkpoints.sqlite")
        cfg={"configurable":{"thread_id":"resume"}}
        with SqliteSaver.from_conn_string(path) as saver:
            build_graph(saver).invoke({"delta":4},cfg)
        with SqliteSaver.from_conn_string(path) as saver:
            return {"total":build_graph(saver).invoke({"delta":3},cfg)["total"]}

if __name__ == "__main__":
    print(json.dumps(run_scenario(), ensure_ascii=False, indent=2))

```

自动验收：

**重新打开文件后继续运行**

```python
with tempfile.TemporaryDirectory() as folder:
    p=str(Path(folder)/"a.db")
    c={"configurable":{"thread_id":"a"}}
    with SqliteSaver.from_conn_string(p) as s:
        build_graph(s).invoke({"delta":6},c)
    with SqliteSaver.from_conn_string(p) as s:
        expect_equal(build_graph(s).invoke({"delta":2},c)["total"],8)
```

**保存器能独立检索 checkpoint**

```python
with SqliteSaver.from_conn_string(":memory:") as s:
    c={"configurable":{"thread_id":"b"}}
    build_graph(s).invoke({"delta":3},c)
    expect_equal(s.get_tuple(c) is not None,True)
```

**另一个文件没有旧状态**

```python
with SqliteSaver.from_conn_string(":memory:") as s:
    expect_equal(build_graph(s).invoke({"delta":1},{"configurable":{"thread_id":"new"}})["total"],1)
```

**完整场景：真实图与上下游得到预期结果**

```python
expect_equal(run_scenario(), json.loads("{\"total\":7}"))
```

参考资料：

- [LangGraph · Checkpointers](https://docs.langchain.com/oss/python/langgraph/checkpointers) · 官方文档
- [LangGraph · Add memory](https://docs.langchain.com/oss/python/langgraph/add-memory) · 官方文档
- [LangGraph · Persistence](https://docs.langchain.com/oss/python/langgraph/persistence) · 官方文档

### w9-3 · interrupt、批准拒绝与 Command 恢复

学习重点：用 interrupt 暂停审阅，用 Command 恢复经过校验的批准、拒绝或编辑。

#### 暂停在写入之前

review 把 draft 交给 interrupt，首次执行返回中断信息，待批准写入为空。恢复用同一线程和 Command(resume=...)，提交 approved 与编辑后的 draft。

#### 校验决策并保留证据

approved 必须为布尔值，字符串 "yes" 不合法。批准后 commit 使用编辑内容，拒绝直接结束。验收分别检查暂停、编辑、拒绝与非法恢复输入。

#### 恢复会重放节点

中断节点可能从开头重新执行。中断前代码应能重复，外部写入使用业务幂等键或事务，记录决策与实际内容，不能靠按钮只点击一次保证没有重复。

业务场景：保存知识前让图暂停。批准后写入编辑后的文本，拒绝时结束且不写入。

调用链：业务输入与真实 LangGraph 运行时 → 你实现：review → 图输出、快照或事件 → 下游使用

功能关系：中断节点会重放；生产写入还需业务幂等键，不能依赖暂停位置保证恰好一次。

接口与要求：

- 用 interrupt({"draft":...}) 请求人工决策。
- 恢复值必须是含布尔 approved 的字典，否则抛 ValueError；可选 draft 用于编辑。
- review 不执行写入；恢复调用使用同 thread_id 和 Command(resume=...)。

初始程序：

```python
# === SCENARIO: 知识库助手 ===
# interrupt、批准拒绝与 Command 恢复
import json

# --- 已提供：业务数据与上下游组件 ---
import asyncio
import json
from typing import TypedDict, Annotated, Literal
from operator import add
from dataclasses import dataclass
from langgraph.graph import StateGraph, START, END, MessagesState
from langgraph.graph.state import CompiledStateGraph
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command, Send, interrupt, RetryPolicy, CachePolicy
from langgraph.runtime import Runtime
from langgraph.store.memory import InMemoryStore
from langgraph.cache.memory import InMemoryCache

class State(TypedDict):
    draft: str
    approved: bool
    writes: Annotated[list[str],add]
def commit(state):
    return {"writes":[state["draft"]]}
def build_graph():
    b=StateGraph(State)
    b.add_node("review",review)
    b.add_node("commit",commit)
    b.add_edge(START,"review")
    b.add_conditional_edges("review",lambda s:"commit" if s["approved"] else END,{"commit":"commit",END:END})
    b.add_edge("commit",END)
    return b.compile(checkpointer=InMemorySaver())

# --- 你的任务：补全本节组件，保持函数接口 ---
def review(state: State):
    """按要求使用真实 LangGraph API 完成组件。"""
    raise NotImplementedError("请完成 LangGraph 组件")

# --- 已提供：完整调用流程；补全组件后可直接运行 ---
def run_scenario():
    g=build_graph()
    c={"configurable":{"thread_id":"approval"}}
    pause=g.invoke({"draft":"旧文本"},c)
    resumed=g.invoke(Command(resume={"approved":True,"draft":"修正文本"}),c)
    return {"paused":bool(pause.get("__interrupt__")),"writes":resumed["writes"]}

if __name__ == "__main__":
    print(json.dumps(run_scenario(), ensure_ascii=False, indent=2))

```

自动验收：

**审批前不写，批准后用编辑文本**

```python
g=build_graph()
c={"configurable":{"thread_id":"a"}}
r=g.invoke({"draft":"old"},c)
expect_equal(bool(r.get("__interrupt__")),True)
expect_equal(g.get_state(c).values["writes"],[])
r=g.invoke(Command(resume={"approved":True,"draft":"new"}),c)
expect_equal(r["writes"],["new"])
```

**拒绝不会执行写入节点**

```python
g=build_graph()
c={"configurable":{"thread_id":"b"}}
g.invoke({"draft":"x"},c)
r=g.invoke(Command(resume={"approved":False}),c)
expect_equal(r["writes"],[])
expect_equal(g.get_state(c).next,())
```

**恢复值也有边界校验**

```python
g=build_graph()
c={"configurable":{"thread_id":"c"}}
g.invoke({"draft":"x"},c)
expect_raises(ValueError,lambda:g.invoke(Command(resume={"approved":"yes"}),c))
```

**完整场景：真实图与上下游得到预期结果**

```python
expect_equal(run_scenario(), json.loads("{\"paused\":true,\"writes\":[\"修正文本\"]}"))
```

参考资料：

- [LangGraph · Interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts) · 官方文档
- [LearnGraph · 4.2 动态中断](https://www.learngraph.online/LearnGraph%201.X/module-4-human-in-the-loop/4.2%20Dynamic%20Breakpoints.html) · 中文教程
- [LearnGraph · 11.5 Command](https://www.learngraph.online/LearnGraph%201.X/module-11-subgraph-mermaid-mcp-agent-node-tool/11.5%20Command.html) · 中文教程

### w9-4 · Time travel、update_state 与分叉

学习重点：从历史 checkpoint 更新状态并分叉，保留旧执行结果。

#### 选择正确的分叉点

在 get_state_history 找到 next 指向 answer 的快照，保留它的 config。update_state 写 new_query，as_node 指明更新来自 normalize，再从返回配置继续执行。

#### 历史不会自动消失

比较原完成结果和新分支，旧查询的快照仍存在。后续节点重放可能再次发起网络请求或外部写入，需要记录成本并保护副作用。

#### 让调试可解释

在同一检索快照上尝试两种回答策略，保存 checkpoint_id 和结果差异。周项目展示历史分支和恢复，避免随意改当前线程后无法解释实验条件。

业务场景：在回答节点前的历史快照上修改查询，运行一个新分支，并保留原始完成快照供比较。

调用链：业务输入与真实 LangGraph 运行时 → 你实现：fork_answer → 图输出、快照或事件 → 下游使用

功能关系：分叉用于比较替代路径；重放也可能再次触发模型调用或副作用，需要记录实验边界。

接口与要求：

- 从 get_state_history 找到 next 包含 answer 的快照。
- 在这个历史 config 上 update_state({"query":query}, as_node="normalize")。
- invoke(None, 新 config) 继续执行；返回新分支的完整 values，不能修改旧快照。

初始程序：

```python
# === SCENARIO: 知识库助手 ===
# Time travel、update_state 与分叉
import json

# --- 已提供：业务数据与上下游组件 ---
import asyncio
import json
from typing import TypedDict, Annotated, Literal
from operator import add
from dataclasses import dataclass
from langgraph.graph import StateGraph, START, END, MessagesState
from langgraph.graph.state import CompiledStateGraph
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command, Send, interrupt, RetryPolicy, CachePolicy
from langgraph.runtime import Runtime
from langgraph.store.memory import InMemoryStore
from langgraph.cache.memory import InMemoryCache

class State(TypedDict):
    query: str
    answer: str
def normalize(state):
    return {"query": state["query"].strip()}
def answer(state):
    return {"answer": "笔记：" + state["query"]}
def build_graph():
    builder = StateGraph(State)
    builder.add_node("normalize", normalize)
    builder.add_node("answer", answer)
    builder.add_edge(START, "normalize")
    builder.add_edge("normalize", "answer")
    builder.add_edge("answer", END)
    return builder.compile(checkpointer=InMemorySaver())

# --- 你的任务：补全本节组件，保持函数接口 ---
def fork_answer(graph, config, query):
    """按要求使用真实 LangGraph API 完成组件。"""
    raise NotImplementedError("请完成 LangGraph 组件")

# --- 已提供：完整调用流程；补全组件后可直接运行 ---
def run_scenario():
    g=build_graph()
    c={"configurable":{"thread_id":"fork"}}
    g.invoke({"query":"original"},c)
    original=g.get_state(c)
    new=fork_answer(g,c,"alternative")
    return {"original":g.get_state(original.config).values["answer"],"fork":new["answer"]}

if __name__ == "__main__":
    print(json.dumps(run_scenario(), ensure_ascii=False, indent=2))

```

自动验收：

**分支使用新查询，旧快照保留**

```python
g=build_graph()
c={"configurable":{"thread_id":"a"}}
g.invoke({"query":"old"},c)
old=g.get_state(c)
expect_equal(fork_answer(g,c,"new")["answer"],"笔记：new")
expect_equal(g.get_state(old.config).values["answer"],"笔记：old")
```

**修改状态产生真实的新历史**

```python
g=build_graph()
c={"configurable":{"thread_id":"b"}}
g.invoke({"query":"x"},c)
before=len(list(g.get_state_history(c)))
fork_answer(g,c,"y")
expect_equal(len(list(g.get_state_history(c)))>before,True)
```

**新分支继续运行回答节点**

```python
g=build_graph()
c={"configurable":{"thread_id":"c"}}
g.invoke({"query":"a"},c)
r=fork_answer(g,c,"")
expect_equal(r["answer"],"笔记：")
expect_equal(g.get_state(c).next,())
```

**完整场景：真实图与上下游得到预期结果**

```python
expect_equal(run_scenario(), json.loads("{\"original\":\"笔记：original\",\"fork\":\"笔记：alternative\"}"))
```

参考资料：

- [LangGraph · Time travel](https://docs.langchain.com/oss/python/langgraph/use-time-travel) · 官方文档
- [LearnGraph · 4.5 Time Travel](https://www.learngraph.online/LearnGraph%201.X/module-4-human-in-the-loop/4.5%20Time%20Travel.html) · 中文教程
- [LangGraph · Checkpointers](https://docs.langchain.com/oss/python/langgraph/checkpointers) · 官方文档

### 本周交付：LG v0.3 · 可恢复的审批助手

把内存 checkpoint 换成持久化后端，实现批准、拒绝与编辑。以独立进程重启验证恢复，从历史快照创建新回答分支，为外部写入加入幂等保护。

- [ ] 独立进程重启后延续线程
- [ ] 审批前没有待批准写入
- [ ] 历史快照保留且副作用有幂等键

## 第 10 周：并行、动态分发与子图

掌握 super-step、Send、状态转换与父图交接

章节：LearnGraph 5 / 11.5 · 官方 Graph API、Subgraphs

### w10-1 · 并行分支、reducer 与汇合屏障

学习重点：理解 super-step 并行、共享字段 reducer 与多个分支的汇合。

#### 独立分支共享规则

lookup 与 policy 从 START 启动，都向 flags 写新增记录，用追加 reducer 合并。结果需要显式顺序时进行排序，不依赖任务完成速度。

#### 汇合依赖明确表达

add_edge(["lookup","policy"],"join") 表示等待两个前置节点。测试两份贡献、join 的答案与执行次数，避免先完成的分支过早触发业务写入。

#### 观察故障与恢复

阅读 checkpoint 的 pending writes，再注入一个分支故障观察恢复。super-step 是批次执行边界；性能收益用并发计数和耗时证明，不能只根据图形判断。

业务场景：同时检查证据与权限，等两个分支完成后再生成回答。不能因为其中一个先结束就提前汇总。

调用链：业务输入与真实 LangGraph 运行时 → 你实现：build_graph → 图输出、快照或事件 → 下游使用

功能关系：固定分支后再学习 Send 动态分发；任何多个写入都要明确合并规则。

接口与要求：

- START 同时连接 lookup 和 policy。
- add_edge(["lookup", "policy"], "merge") 等待两个分支。
- 共享 flags 使用 reducer；最终按字母排序，避免依赖并行完成顺序。

初始程序：

```python
# === SCENARIO: 知识库助手 ===
# 并行分支、reducer 与汇合屏障
import json

# --- 已提供：业务数据与上下游组件 ---
import asyncio
import json
from typing import TypedDict, Annotated, Literal
from operator import add
from dataclasses import dataclass
from langgraph.graph import StateGraph, START, END, MessagesState
from langgraph.graph.state import CompiledStateGraph
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command, Send, interrupt, RetryPolicy, CachePolicy
from langgraph.runtime import Runtime
from langgraph.store.memory import InMemoryStore
from langgraph.cache.memory import InMemoryCache

class State(TypedDict):
    flags: Annotated[list[str],add]
    answer: str
def lookup(state):
    return {"flags":["evidence"]}
def policy(state):
    return {"flags":["allowed"]}
def merge(state):
    return {"answer":" + ".join(sorted(state["flags"]))}

# --- 你的任务：补全本节组件，保持函数接口 ---
def build_graph():
    """按要求使用真实 LangGraph API 完成组件。"""
    raise NotImplementedError("请完成 LangGraph 组件")

# --- 已提供：完整调用流程；补全组件后可直接运行 ---
def run_scenario():
    return build_graph().invoke({"flags":[]})

if __name__ == "__main__":
    print(json.dumps(run_scenario(), ensure_ascii=False, indent=2))

```

自动验收：

**汇总看到两个分支的结果**

```python
r=build_graph().invoke({"flags":[]})
expect_equal(sorted(r["flags"]),["allowed","evidence"])
expect_equal(r["answer"],"allowed + evidence")
```

**汇总只执行一次**

```python
events=list(build_graph().stream({"flags":[]},stream_mode="updates"))
expect_equal(sum("merge" in e for e in events),1)
```

**保留调用方输入日志**

```python
r=build_graph().invoke({"flags":["seed"]})
expect_equal(r["answer"],"allowed + evidence + seed")
```

**完整场景：真实图与上下游得到预期结果**

```python
expect_equal(run_scenario(), json.loads("{\"flags\":[\"evidence\",\"allowed\"],\"answer\":\"allowed + evidence\"}"))
```

参考资料：

- [LangGraph · Use the Graph API](https://docs.langchain.com/oss/python/langgraph/use-graph-api) · 官方文档
- [LearnGraph · 5.1 Parallelization](https://www.learngraph.online/LearnGraph%201.X/module-5-advanced-patterns/5.1%20Parallelization.html) · 中文教程
- [LangGraph · Workflows & agents](https://docs.langchain.com/oss/python/langgraph/workflows-agents) · 官方文档

### w10-2 · Send 动态 Map-Reduce

学习重点：使用 Send 动态分发工作项，通过 reducer 汇总为稳定输出。

#### 工作项数量来自输入

每个文档生成 Send("measure", {index,text})，工作节点只处理自己的输入。results 累积后由 summarize 按原 index 排序，完成速度不会改变业务输出顺序。

#### 空任务也有出口

空列表直接进入 summarize，返回空结果。测试空文本、多文档和重复文本，用稳定 index 区分内容相同的任务，确认没有丢失或重复。

#### 扩展到批量检索

将 measure 换成检索或评审，记录任务 ID 并限制外部服务并发。动态分发解决规模变化，去重、预算和部分失败策略仍需要应用显式定义。

业务场景：输入文档数量不固定。为每篇文档分发独立任务，合并长度结果，空列表也能正常结束。

调用链：业务输入与真实 LangGraph 运行时 → 你实现：build_graph → 图输出、快照或事件 → 下游使用

功能关系：动态任务独立输入与父图共享输出是 Send 的核心；研究助手可把测量替换为检索。

接口与要求：

- 使用 Send("measure", {index, text}) 为每篇文档构建任务输入。
- measure 的 results 用 reducer 合并，并连接 summarize。
- 空 documents 直接运行 summarize；结果恢复输入顺序。

初始程序：

```python
# === SCENARIO: 知识库助手 ===
# Send 动态 Map-Reduce
import json

# --- 已提供：业务数据与上下游组件 ---
import asyncio
import json
from typing import TypedDict, Annotated, Literal
from operator import add
from dataclasses import dataclass
from langgraph.graph import StateGraph, START, END, MessagesState
from langgraph.graph.state import CompiledStateGraph
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command, Send, interrupt, RetryPolicy, CachePolicy
from langgraph.runtime import Runtime
from langgraph.store.memory import InMemoryStore
from langgraph.cache.memory import InMemoryCache

class State(TypedDict):
    documents: list[str]
    results: Annotated[list[tuple[int,int]],add]
    lengths: list[int]
def measure(state):
    return {"results":[(state["index"],len(state["text"]))]}
def summarize(state):
    return {"lengths":[n for _,n in sorted(state.get("results",[]))]}

# --- 你的任务：补全本节组件，保持函数接口 ---
def build_graph():
    """按要求使用真实 LangGraph API 完成组件。"""
    raise NotImplementedError("请完成 LangGraph 组件")

# --- 已提供：完整调用流程；补全组件后可直接运行 ---
def run_scenario():
    r=build_graph().invoke({"documents":["graph","","state"],"results":[]})
    return {"lengths":r["lengths"]}

if __name__ == "__main__":
    print(json.dumps(run_scenario(), ensure_ascii=False, indent=2))

```

自动验收：

**任意数量任务返回输入顺序**

```python
r=build_graph().invoke({"documents":["aaa","b","cc"],"results":[]})
expect_equal(r["lengths"],[3,1,2])
```

**空任务集合也能结束**

```python
r=build_graph().invoke({"documents":[],"results":[]})
expect_equal(r["lengths"],[])
```

**每篇文档只有一个结果**

```python
r=build_graph().invoke({"documents":["x"]*5,"results":[]})
expect_equal(len(r["results"]),5)
expect_equal(sorted(i for i,_ in r["results"]),list(range(5)))
```

**完整场景：真实图与上下游得到预期结果**

```python
expect_equal(run_scenario(), json.loads("{\"lengths\":[5,0,5]}"))
```

参考资料：

- [LangGraph · Use the Graph API](https://docs.langchain.com/oss/python/langgraph/use-graph-api) · 官方文档
- [LearnGraph · 5.3 Map-Reduce](https://www.learngraph.online/LearnGraph%201.X/module-5-advanced-patterns/5.3%20Map-Reduce.html) · 中文教程

### w10-3 · 父子图不同 schema 的显式转换

学习重点：接入真实编译子图，在父图与子图不同 schema 之间转换字段。

#### 两个图有不同字段

父图使用 topic/result，子图使用 question/answer。包装节点转换输入、调用 child.invoke，再转换输出，父图无需了解子图内部节点。

#### 验证子图可替换

验收注入不同回答前缀的 child，确认真实调用并返回正确结果。子图内部字段不应混入父图公开输出；边界同时约束数据与职责。

#### 继续学习子图恢复

阅读 checkpointer 继承与子图状态查看方式。周项目加一次子图中断，说明父图怎样暂停与恢复，以及每次独立调用和多轮会话的持久化需求。

业务场景：检索子图接受 question、返回 answer，父图接受 topic、返回 result。用节点包装器完成边界映射。

调用链：业务输入与真实 LangGraph 运行时 → 你实现：build_graph → 图输出、快照或事件 → 下游使用

功能关系：封装独立流程；有共同字段时可以直接把已编译子图作为节点。

接口与要求：

- 父图 delegate 节点调用传入的 child.invoke({"question": topic})。
- 只把 child 的 answer 写到父图 result，不扩散子图内部字段。
- 同一个父图工厂应支持不同的子图实现。

初始程序：

```python
# === SCENARIO: 知识库助手 ===
# 父子图不同 schema 的显式转换
import json

# --- 已提供：业务数据与上下游组件 ---
import asyncio
import json
from typing import TypedDict, Annotated, Literal
from operator import add
from dataclasses import dataclass
from langgraph.graph import StateGraph, START, END, MessagesState
from langgraph.graph.state import CompiledStateGraph
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command, Send, interrupt, RetryPolicy, CachePolicy
from langgraph.runtime import Runtime
from langgraph.store.memory import InMemoryStore
from langgraph.cache.memory import InMemoryCache

class ChildState(TypedDict):
    question: str
    answer: str
class State(TypedDict):
    topic: str
    result: str
def make_child(prefix="child:"):
    b=StateGraph(ChildState)
    b.add_node("answer",lambda s:{"answer":prefix+s["question"]})
    b.add_edge(START,"answer")
    b.add_edge("answer",END)
    return b.compile()

# --- 你的任务：补全本节组件，保持函数接口 ---
def build_graph(child):
    """按要求使用真实 LangGraph API 完成组件。"""
    raise NotImplementedError("请完成 LangGraph 组件")

# --- 已提供：完整调用流程；补全组件后可直接运行 ---
def run_scenario():
    return build_graph(make_child()).invoke({"topic":"checkpoint"})

if __name__ == "__main__":
    print(json.dumps(run_scenario(), ensure_ascii=False, indent=2))

```

自动验收：

**转换父图输入到子图输入**

```python
r=build_graph(make_child()).invoke({"topic":"x"})
expect_equal(r,{"topic":"x","result":"child:x"})
```

**尊重调用方提供的子图**

```python
r=build_graph(make_child("other:")).invoke({"topic":"y"})
expect_equal(r["result"],"other:y")
```

**输出没有子图字段泄露**

```python
r=build_graph(make_child()).invoke({"topic":""})
expect_equal(set(r),{"topic","result"})
```

**完整场景：真实图与上下游得到预期结果**

```python
expect_equal(run_scenario(), json.loads("{\"topic\":\"checkpoint\",\"result\":\"child:checkpoint\"}"))
```

参考资料：

- [LangGraph · Subgraphs](https://docs.langchain.com/oss/python/langgraph/use-subgraphs) · 官方文档
- [LearnGraph · 5.2 子图](https://www.learngraph.online/LearnGraph%201.X/module-5-advanced-patterns/5.2%20Sub-Graph.html) · 中文教程
- [LangGraph · Use the Graph API](https://docs.langchain.com/oss/python/langgraph/use-graph-api) · 官方文档

### w10-4 · Command.PARENT 跨图交接

学习重点：通过 Command.PARENT 更新共享状态，把控制权交回父图。

#### 同时更新与跳转

handoff 返回 Command(update=...,goto="finish",graph=Command.PARENT)，父图 finish 处理结果。子图注册时明确本图目标，父图跳转由 Command 指定，避免多条出口造成重复执行。

#### 共享字段的合并

父子图 notes 使用明确 reducer。先检查返回 Command 的目标与更新，再运行真实父子图，确认子图记录只出现一次、最终答案由父图生成。

#### 形成交接协议

多 Agent 交接需要任务、证据与状态，不能无限转发历史。限制交接次数并定义终止条件，用实际质量和成本比较单图方案。

业务场景：子图完成检索后，把结果交给父图 finish 节点。用 Command 同时更新共享状态并改变执行位置。

调用链：业务输入与真实 LangGraph 运行时 → 你实现：handoff → 图输出、快照或事件 → 下游使用

功能关系：这是多 Agent 的交接机制；传递可验证数据和权限边界比角色名字更重要。

接口与要求：

- 返回 Command(update={"notes":[query]}, goto="finish", graph=Command.PARENT)。
- 父图共享 notes 已定义 reducer。
- 不要额外增加 delegate → finish 静态边，避免混用两条路由。

初始程序：

```python
# === SCENARIO: 知识库助手 ===
# Command.PARENT 跨图交接
import json

# --- 已提供：业务数据与上下游组件 ---
import asyncio
import json
from typing import TypedDict, Annotated, Literal
from operator import add
from dataclasses import dataclass
from langgraph.graph import StateGraph, START, END, MessagesState
from langgraph.graph.state import CompiledStateGraph
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command, Send, interrupt, RetryPolicy, CachePolicy
from langgraph.runtime import Runtime
from langgraph.store.memory import InMemoryStore
from langgraph.cache.memory import InMemoryCache

class State(TypedDict):
    query: str
    notes: Annotated[list[str],add]
    answer: str
def finish(state):
    return {"answer":"|".join(state["notes"])}
def build_graph():
    child=StateGraph(State)
    child.add_node("handoff",handoff, destinations=(END,))
    child.add_edge(START,"handoff")
    parent=StateGraph(State)
    parent.add_node("delegate",child.compile())
    parent.add_node("finish",finish)
    parent.add_edge(START,"delegate")
    parent.add_edge("finish",END)
    return parent.compile()

# --- 你的任务：补全本节组件，保持函数接口 ---
def handoff(state) -> Command[Literal["finish"]]:
    """按要求使用真实 LangGraph API 完成组件。"""
    raise NotImplementedError("请完成 LangGraph 组件")

# --- 已提供：完整调用流程；补全组件后可直接运行 ---
def run_scenario():
    return build_graph().invoke({"query":"graph","notes":[]})

if __name__ == "__main__":
    print(json.dumps(run_scenario(), ensure_ascii=False, indent=2))

```

自动验收：

**返回的是父图路由 Command**

```python
cmd=handoff({"query":"x"})
expect_equal(isinstance(cmd,Command),True)
expect_equal((cmd.goto,cmd.graph),("finish",Command.PARENT))
```

**子图更新交给父图 finish**

```python
r=build_graph().invoke({"query":"x","notes":["seed"]})
expect_equal(r["answer"],"seed|x")
```

**父图共享字段不会重复合并**

```python
r=build_graph().invoke({"query":"y","notes":[]})
expect_equal(r["notes"],["y"])
```

**完整场景：真实图与上下游得到预期结果**

```python
expect_equal(run_scenario(), json.loads("{\"query\":\"graph\",\"notes\":[\"graph\"],\"answer\":\"graph\"}"))
```

参考资料：

- [LangGraph · Use the Graph API](https://docs.langchain.com/oss/python/langgraph/use-graph-api) · 官方文档
- [LearnGraph · 11.5 Command](https://www.learngraph.online/LearnGraph%201.X/module-11-subgraph-mermaid-mcp-agent-node-tool/11.5%20Command.html) · 中文教程
- [LangGraph · Subgraphs](https://docs.langchain.com/oss/python/langgraph/use-subgraphs) · 官方文档

### 本周交付：LG v0.4 · 可组合的并行流水线

并行检索和策略检查，用 Send 分发文档任务。将审阅封装为不同 schema 子图，以边界转换或 Command.PARENT 回传结果，检查汇合、顺序和故障路径。

- [ ] 并行共享字段有 reducer
- [ ] 空任务和乱序完成汇总稳定
- [ ] 真实子图可替换且边界有测试

## 第 11 周：函数式、异步与长期记忆

组织可恢复任务，控制异步 I/O 并隔离用户记忆

章节：LearnGraph 6 · 官方 Functional API、Stores、异步图

### w11-1 · Functional API：entrypoint 与 task

学习重点：用 entrypoint/task 组织函数式工作流，观察实际任务结果与事件。

#### 普通函数也能组织流程

清理与检索定义为 @task，在 @entrypoint 内提交任务并取 .result()。Functional API 与 Graph API 都使用图运行时，用不同代码组织方式表达执行。

#### 给任务清楚边界

invoke 检查结果，stream 检查任务名。可复用或有副作用的步骤需要独立边界；不要把所有工作藏进一个大函数。异步调用使用相应接口而非阻塞取结果。

#### 选择合适表达方式

复杂分支可以用图式表达，已有命令式逻辑可尝试函数式表达。把同一个流程各写一次，对比测试、调试和暂停能力，而不是只比较行数。

业务场景：已有 Python 调用链无需重写成显式图。使用 task 包装清理与检索，用 entrypoint 管理工作流。

调用链：业务输入与真实 LangGraph 运行时 → 你实现：build_workflow → 图输出、快照或事件 → 下游使用

功能关系：Graph API 和 Functional API 共享运行时；选择适合现有项目控制流的表达方式。

接口与要求：

- 函数返回 @entrypoint() 装饰后的工作流对象。
- 调用 normalize_task(...).result() 后，把结果传给 retrieve_task(...).result()。
- 保留 task 边界，为后面的持久执行和恢复做准备。

初始程序：

```python
# === SCENARIO: 知识库助手 ===
# Functional API：entrypoint 与 task
import json

# --- 已提供：业务数据与上下游组件 ---
import asyncio
import json
from typing import TypedDict, Annotated, Literal
from operator import add
from dataclasses import dataclass
from langgraph.graph import StateGraph, START, END, MessagesState
from langgraph.graph.state import CompiledStateGraph
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command, Send, interrupt, RetryPolicy, CachePolicy
from langgraph.runtime import Runtime
from langgraph.store.memory import InMemoryStore
from langgraph.cache.memory import InMemoryCache

from langgraph.func import entrypoint, task
from langgraph.pregel import Pregel
@task
def normalize_task(query):
    return query.strip()
@task
def retrieve_task(query):
    return {"answer":"task:"+query}

# --- 你的任务：补全本节组件，保持函数接口 ---
def build_workflow():
    """按要求使用真实 LangGraph API 完成组件。"""
    raise NotImplementedError("请完成 LangGraph 组件")

# --- 已提供：完整调用流程；补全组件后可直接运行 ---
def run_scenario():
    return build_workflow().invoke(" graph ")

if __name__ == "__main__":
    print(json.dumps(run_scenario(), ensure_ascii=False, indent=2))

```

自动验收：

**返回真实 Pregel 工作流**

```python
w=build_workflow()
expect_equal(isinstance(w,Pregel),True)
expect_equal(w.invoke(" a "),{"answer":"task:a"})
```

**空文本和重复调用独立**

```python
w=build_workflow()
expect_equal(w.invoke(" "),{"answer":"task:"})
expect_equal(w.invoke("b"),{"answer":"task:b"})
```

**task 事件能被流式观察**

```python
events=list(build_workflow().stream("x",stream_mode="updates"))
expect_equal(any("normalize_task" in e for e in events),True)
expect_equal(any("retrieve_task" in e for e in events),True)
```

**完整场景：真实图与上下游得到预期结果**

```python
expect_equal(run_scenario(), json.loads("{\"answer\":\"task:graph\"}"))
```

参考资料：

- [LangGraph · Functional API](https://docs.langchain.com/oss/python/langgraph/functional-api) · 官方文档
- [LangChain Academy · 官方课程源码](https://github.com/langchain-ai/langchain-academy) · 专业课程

### w11-2 · 异步节点、ainvoke 与并发 I/O

学习重点：编写异步节点，用 ainvoke 与 asyncio.gather 并发等待独立 I/O。

#### 依赖和节点一起异步

fetch 是异步函数，节点用 asyncio.gather，外部 await graph.ainvoke。避免在异步节点里调用阻塞网络库；同步执行和异步执行应保持清楚的入口。

#### 通过行为验证并发

测试活动调用的峰值为 2，不仅依赖波动较大的耗时。空列表返回空结果；fetch 的 ValueError 应传播，不能静默改成成功输出。

#### 给 I/O 设置边界

正式服务用信号量限制并发，配置超时并处理取消。有事件循环的应用直接 await，本地独立脚本才使用 asyncio.run 启动顶层循环。

业务场景：同一节点要查询多个数据源。让异步图节点并发等待，并验证有异常时运行不会被误报成功。

调用链：业务输入与真实 LangGraph 运行时 → 你实现：build_graph → 图输出、快照或事件 → 下游使用

功能关系：网络客户端必须支持异步；下一阶段把重试、并发限制和超时作为独立策略。

接口与要求：

- 节点使用 async def，并 await asyncio.gather 处理所有 queries。
- 返回编译后的图，通过 await graph.ainvoke 调用。
- 保持输入顺序；空输入返回空列表；请求异常原样抛出。

初始程序：

```python
# === SCENARIO: 知识库助手 ===
# 异步节点、ainvoke 与并发 I/O
import json

# --- 已提供：业务数据与上下游组件 ---
import asyncio
import json
from typing import TypedDict, Annotated, Literal
from operator import add
from dataclasses import dataclass
from langgraph.graph import StateGraph, START, END, MessagesState
from langgraph.graph.state import CompiledStateGraph
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command, Send, interrupt, RetryPolicy, CachePolicy
from langgraph.runtime import Runtime
from langgraph.store.memory import InMemoryStore
from langgraph.cache.memory import InMemoryCache

class State(TypedDict):
    queries: list[str]
    documents: list[str]
async def example_fetch(query):
    await asyncio.sleep(0)
    return "doc:"+query

# --- 你的任务：补全本节组件，保持函数接口 ---
def build_graph(fetch):
    """按要求使用真实 LangGraph API 完成组件。"""
    raise NotImplementedError("请完成 LangGraph 组件")

# --- 已提供：完整调用流程；补全组件后可直接运行 ---
def run_scenario():
    r=asyncio.run(build_graph(example_fetch).ainvoke({"queries":["a","b"]}))
    return {"documents":r["documents"]}

if __name__ == "__main__":
    print(json.dumps(run_scenario(), ensure_ascii=False, indent=2))

```

自动验收：

**实际存在重叠的异步请求**

```python
async def check():
    active=0
    peak=0
    async def fetch(q):
        nonlocal active,peak
        active+=1
        peak=max(peak,active)
        await asyncio.sleep(0.01)
        active-=1
        return q
    r=await build_graph(fetch).ainvoke({"queries":["a","b","c"]})
    expect_equal(peak>=2,True)
    expect_equal(r["documents"],["a","b","c"])
asyncio.run(check())
```

**空输入不调用 fetch**

```python
expect_equal(asyncio.run(build_graph(example_fetch).ainvoke({"queries":[]}))["documents"],[])
```

**异常不会变成成功的文档**

```python
async def fail(q):
    raise ValueError("bad source")
expect_raises(ValueError,lambda:asyncio.run(build_graph(fail).ainvoke({"queries":["a"]})))
```

**完整场景：真实图与上下游得到预期结果**

```python
expect_equal(run_scenario(), json.loads("{\"documents\":[\"doc:a\",\"doc:b\"]}"))
```

参考资料：

- [LangGraph · Use the Graph API](https://docs.langchain.com/oss/python/langgraph/use-graph-api) · 官方文档
- [LangGraph · Streaming](https://docs.langchain.com/oss/python/langgraph/streaming) · 官方文档

### w11-3 · Store 跨线程记忆与 namespace

学习重点：使用 Runtime.store 与用户 namespace 保存已确认偏好，跨线程读取。

#### 长期记忆的地址

使用 (user_id,"preferences") namespace 与 profile 键，通过 runtime.store 读写。只写 confirmed 为真的事实，未知用户返回默认值，不把线程状态当成跨会话数据库。

#### 验证作用域

alice 保存中文偏好后，新图或新线程从同一 Store 读取；bob 保持默认值。未确认输入不得覆盖已确认事实，验收检查写入值与返回值。

#### 从内存到持久化

InMemoryStore 用于教学，长期服务选择持久化 Store。身份由认证用户确定，应用定义更正、删除和过期规则；用户隔离不能只靠调用者随意提交 ID。

业务场景：用户确认的偏好需要跨会话保留。把它写到按 user_id 隔离的 Store，未确认的信息不能覆盖偏好。

调用链：业务输入与真实 LangGraph 运行时 → 你实现：memory_node → 图输出、快照或事件 → 下游使用

功能关系：Checkpointer 保存线程过程，Store 保存跨线程事实；生产改用持久 Store 并执行删除与更新策略。

接口与要求：

- namespace=(user_id, "preferences")，key="profile"。
- confirmed 为 True 才把 {language} 写入 runtime.store。
- 读取同一 namespace 的 profile；没有时返回 default。

初始程序：

```python
# === SCENARIO: 知识库助手 ===
# Store 跨线程记忆与 namespace
import json

# --- 已提供：业务数据与上下游组件 ---
import asyncio
import json
from typing import TypedDict, Annotated, Literal
from operator import add
from dataclasses import dataclass
from langgraph.graph import StateGraph, START, END, MessagesState
from langgraph.graph.state import CompiledStateGraph
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command, Send, interrupt, RetryPolicy, CachePolicy
from langgraph.runtime import Runtime
from langgraph.store.memory import InMemoryStore
from langgraph.cache.memory import InMemoryCache

@dataclass
class Context:
    user_id: str
class State(TypedDict):
    language: str
    confirmed: bool
    preference: str
def build_graph(store):
    b=StateGraph(State,context_schema=Context)
    b.add_node("memory",memory_node)
    b.add_edge(START,"memory")
    b.add_edge("memory",END)
    return b.compile(store=store)

# --- 你的任务：补全本节组件，保持函数接口 ---
def memory_node(state: State, runtime: Runtime[Context]):
    """按要求使用真实 LangGraph API 完成组件。"""
    raise NotImplementedError("请完成 LangGraph 组件")

# --- 已提供：完整调用流程；补全组件后可直接运行 ---
def run_scenario():
    store=InMemoryStore()
    g=build_graph(store)
    g.invoke({"language":"zh","confirmed":True},context=Context("alice"))
    return {"alice":g.invoke({"confirmed":False},context=Context("alice"))["preference"],"bob":g.invoke({"confirmed":False},context=Context("bob"))["preference"]}

if __name__ == "__main__":
    print(json.dumps(run_scenario(), ensure_ascii=False, indent=2))

```

自动验收：

**换一张图仍能读取同用户记忆**

```python
s=InMemoryStore()
build_graph(s).invoke({"language":"zh","confirmed":True},context=Context("a"))
r=build_graph(s).invoke({"confirmed":False},context=Context("a"))
expect_equal(r["preference"],"zh")
```

**不同 namespace 不共享偏好**

```python
s=InMemoryStore()
g=build_graph(s)
g.invoke({"language":"en","confirmed":True},context=Context("a"))
expect_equal(g.invoke({"confirmed":False},context=Context("b"))["preference"],"default")
```

**未确认信息不覆盖已确认记忆**

```python
s=InMemoryStore()
g=build_graph(s)
g.invoke({"language":"zh","confirmed":True},context=Context("a"))
r=g.invoke({"language":"en","confirmed":False},context=Context("a"))
expect_equal(r["preference"],"zh")
```

**完整场景：真实图与上下游得到预期结果**

```python
expect_equal(run_scenario(), json.loads("{\"alice\":\"zh\",\"bob\":\"default\"}"))
```

参考资料：

- [LangGraph · Stores](https://docs.langchain.com/oss/python/langgraph/stores) · 官方文档
- [LearnGraph · 6.2 Memory Store](https://www.learngraph.online/LearnGraph%201.X/module-6-memory-system/6.2%20Memory%20Store.html) · 中文教程
- [LangGraph · Add memory](https://docs.langchain.com/oss/python/langgraph/add-memory) · 官方文档

### w11-4 · 持久执行、task 重用与副作用边界

学习重点：把中断前副作用封装为 task，验证恢复复用已经完成的任务结果。

#### 定义可恢复步骤

先执行 prepare_event task，再 interrupt 请求确认。使用 checkpointer 的 entrypoint，恢复时复用已完成任务结果，测试调用计数确认这一恢复路径没有重复准备。

#### 稳定的恢复路径

保持任务和中断次序稳定，用相同 thread_id 恢复，避免随机分支改变重放顺序。两个线程各执行自己的准备步骤；测试批准值和线程隔离。

#### 仍需业务幂等

任务结果复用不保证外部写入恰好一次。写入成功而结果尚未保存时崩溃，恢复可能重复写入。外部服务采用幂等键或事务，周项目演示这一故障窗口。

业务场景：准备研究资料会产生一次本地事件记录，之后等待确认。恢复工作流时，已完成的准备任务不能再次执行。

调用链：业务输入与真实 LangGraph 运行时 → 你实现：build_workflow → 图输出、快照或事件 → 下游使用

功能关系：task 重用减少正常恢复时的重复执行；数据库写入仍要用幂等键处理提交与 checkpoint 之间的故障窗口。

接口与要求：

- 把 prepare(request_id) 包装为 @task。
- @entrypoint(checkpointer=...) 内先取 task 结果，再 interrupt 请求确认。
- 恢复后返回 {event, approved}；不要把外部副作用直接写在会重放的 entrypoint 中。

初始程序：

```python
# === SCENARIO: 知识库助手 ===
# 持久执行、task 重用与副作用边界
import json

# --- 已提供：业务数据与上下游组件 ---
import asyncio
import json
from typing import TypedDict, Annotated, Literal
from operator import add
from dataclasses import dataclass
from langgraph.graph import StateGraph, START, END, MessagesState
from langgraph.graph.state import CompiledStateGraph
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command, Send, interrupt, RetryPolicy, CachePolicy
from langgraph.runtime import Runtime
from langgraph.store.memory import InMemoryStore
from langgraph.cache.memory import InMemoryCache

from langgraph.func import entrypoint, task

# --- 你的任务：补全本节组件，保持函数接口 ---
def build_workflow(checkpointer, prepare):
    """按要求使用真实 LangGraph API 完成组件。"""
    raise NotImplementedError("请完成 LangGraph 组件")

# --- 已提供：完整调用流程；补全组件后可直接运行 ---
def run_scenario():
    calls=[]
    w=build_workflow(InMemorySaver(),lambda key:calls.append(key) or "event:"+key)
    c={"configurable":{"thread_id":"durable"}}
    w.invoke("r1",c)
    r=w.invoke(Command(resume=True),c)
    return {"result":r,"calls":calls}

if __name__ == "__main__":
    print(json.dumps(run_scenario(), ensure_ascii=False, indent=2))

```

自动验收：

**恢复时已完成 task 不重做**

```python
calls=[]
w=build_workflow(InMemorySaver(),lambda k:calls.append(k) or k)
c={"configurable":{"thread_id":"a"}}
w.invoke("r1",c)
expect_equal(w.invoke(Command(resume=True),c),{"event":"r1","approved":True})
expect_equal(calls,["r1"])
```

**拒绝值被保留且不会重复准备**

```python
calls=[]
w=build_workflow(InMemorySaver(),lambda k:calls.append(k) or k)
c={"configurable":{"thread_id":"b"}}
w.invoke("r2",c)
expect_equal(w.invoke(Command(resume=False),c)["approved"],False)
expect_equal(calls,["r2"])
```

**不同线程独立执行准备**

```python
calls=[]
w=build_workflow(InMemorySaver(),lambda k:calls.append(k) or k)
for key in ["a","b"]:
    c={"configurable":{"thread_id":key}}
    w.invoke(key,c)
    w.invoke(Command(resume=True),c)
expect_equal(calls,["a","b"])
```

**完整场景：真实图与上下游得到预期结果**

```python
expect_equal(run_scenario(), json.loads("{\"result\":{\"event\":\"event:r1\",\"approved\":true},\"calls\":[\"r1\"]}"))
```

参考资料：

- [LangGraph · Functional API](https://docs.langchain.com/oss/python/langgraph/functional-api) · 官方文档
- [LangGraph · Interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts) · 官方文档
- [LangGraph · Checkpointers](https://docs.langchain.com/oss/python/langgraph/checkpointers) · 官方文档

### 本周交付：LG v0.5 · 可恢复的记忆工作流

用 entrypoint/task 组织流程并加入中断。异步节点并发检索，Store 按用户隔离；用计数和故障注入验证恢复，说明外部副作用的幂等策略。

- [ ] 恢复复用已完成 task 且线程独立
- [ ] I/O 有并发上限和失败处理
- [ ] 只写已确认事实，新线程可读且用户隔离

## 第 12 周：高阶模式与工程交付

将 RAG、评审、重试和缓存落到可验收项目

章节：LearnGraph 7 / 13 · 官方 Workflows、Test、Application structure

### w12-1 · 用图构建有证据门槛的 Agentic RAG

学习重点：用真实图组织检索、改写、引用和拒答，证据不足时有界退出。

#### 把质量决策放入图

retrieve 更新 doc_id，路由进入 answer 或 rewrite。graphs 可改成 graph 一次，再失败则拒答。先用固定笔记验证编排，再替换成真实索引和模型。

#### 引用要对应证据

命中回答包含来源 ID，没有证据不能伪造编号。验收覆盖直接命中、改写命中、预算耗尽与空查询，保留原查询与改写次数方便比较收益。

#### 自己的检索项目

以 20 篇笔记与固定问题集替换检索模块，分别评价召回、回答和引用支持关系。加入不可信文档内容的处理，报告失败类别而不只给总成功率。

业务场景：先检索，再检查证据；最多改写一次查询，没有证据就拒答。这里的检索数据固定，图控制流是真实 LangGraph。

调用链：业务输入与真实 LangGraph 运行时 → 你实现：build_graph → 图输出、快照或事件 → 下游使用

功能关系：在第 4 周的基础逻辑上使用真实图；生产时分别评估检索命中与答案引用支持关系。

接口与要求：

- retrieve 后有 docs 就 answer；无 docs 且 rewrites<1 则 rewrite，否则 refuse。
- rewrite 返回 retrieve；answer 和 refuse 结束。
- 回答必须使用实际检索来源，不能给无证据查询编造引用。

初始程序：

```python
# === SCENARIO: 知识库助手 ===
# 用图构建有证据门槛的 Agentic RAG
import json

# --- 已提供：业务数据与上下游组件 ---
import asyncio
import json
from typing import TypedDict, Annotated, Literal
from operator import add
from dataclasses import dataclass
from langgraph.graph import StateGraph, START, END, MessagesState
from langgraph.graph.state import CompiledStateGraph
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command, Send, interrupt, RetryPolicy, CachePolicy
from langgraph.runtime import Runtime
from langgraph.store.memory import InMemoryStore
from langgraph.cache.memory import InMemoryCache

class State(TypedDict):
    query: str
    rewrites: int
    docs: list[str]
    answer: str
def retrieve(state):
    return {"docs":["note:graph"] if state["query"]=="graph" else []}
def rewrite(state):
    return {"query":"graph" if state["query"]=="graphs" else state["query"],"rewrites":state["rewrites"]+1}
def answer(state):
    return {"answer":"依据 "+state["docs"][0]}
def refuse(state):
    return {"answer":"证据不足"}

# --- 你的任务：补全本节组件，保持函数接口 ---
def build_graph():
    """按要求使用真实 LangGraph API 完成组件。"""
    raise NotImplementedError("请完成 LangGraph 组件")

# --- 已提供：完整调用流程；补全组件后可直接运行 ---
def run_scenario():
    return build_graph().invoke({"query":"graphs","rewrites":0},{"recursion_limit":20})

if __name__ == "__main__":
    print(json.dumps(run_scenario(), ensure_ascii=False, indent=2))

```

自动验收：

**已有证据不需要改写**

```python
r=build_graph().invoke({"query":"graph","rewrites":0},{"recursion_limit":20})
expect_equal((r["answer"],r["rewrites"]),("依据 note:graph",0))
```

**一次改写补足证据**

```python
r=build_graph().invoke({"query":"graphs","rewrites":0},{"recursion_limit":20})
expect_equal((r["answer"],r["rewrites"]),("依据 note:graph",1))
```

**无证据有明确退出**

```python
r=build_graph().invoke({"query":"unknown","rewrites":0},{"recursion_limit":20})
expect_equal((r["answer"],r["rewrites"]),("证据不足",1))
```

**完整场景：真实图与上下游得到预期结果**

```python
expect_equal(run_scenario(), json.loads("{\"query\":\"graph\",\"rewrites\":1,\"docs\":[\"note:graph\"],\"answer\":\"依据 note:graph\"}"))
```

参考资料：

- [LangGraph · Workflows & agents](https://docs.langchain.com/oss/python/langgraph/workflows-agents) · 官方文档
- [LearnGraph · 13.1 Agentic RAG](https://www.learngraph.online/LearnGraph%201.X/module-13-agentic-rag/13.1%20Introduction.html) · 中文教程
- [LangGraph · Use the Graph API](https://docs.langchain.com/oss/python/langgraph/use-graph-api) · 官方文档

### w12-2 · Evaluator-Optimizer 有界评审循环

学习重点：构建 evaluator–optimizer 图，评审修订有明确预算和失败出口。

#### 反馈推动修订

reviewer 返回 passed，失败时 revise 添加缺失引用再回评审。最多修订一次，仍失败输出 needs_review，不把未达标结果写成 accepted。

#### 注入评审器便于测试

分别使用首轮成功、第二轮成功和始终失败的 reviewer。固定实现避免模型随机性掩盖边和状态问题，保留每次评审依据与最终状态。

#### 比较真实收益

接入评审模型时记录 token、延迟、修订次数和质量，保留无评审基线。约束评审可改字段并处理解析失败，用可验证结果决定是否保留复杂度。

业务场景：草稿由评审器检查，最多修订一次。即使第二次评审仍失败，也要进入明确的失败出口。

调用链：业务输入与真实 LangGraph 运行时 → 你实现：build_graph → 图输出、快照或事件 → 下游使用

功能关系：评审循环也是多 Agent 协议的一部分；上限、证据与成本都应进入验收。

接口与要求：

- review 节点调用传入评审器并写入 passed。
- 不通过且 revisions<1 才 revise，然后回到 review。
- 通过或达到上限都进入 finish，避免两个角色无限互相调用。

初始程序：

```python
# === SCENARIO: 知识库助手 ===
# Evaluator-Optimizer 有界评审循环
import json

# --- 已提供：业务数据与上下游组件 ---
import asyncio
import json
from typing import TypedDict, Annotated, Literal
from operator import add
from dataclasses import dataclass
from langgraph.graph import StateGraph, START, END, MessagesState
from langgraph.graph.state import CompiledStateGraph
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command, Send, interrupt, RetryPolicy, CachePolicy
from langgraph.runtime import Runtime
from langgraph.store.memory import InMemoryStore
from langgraph.cache.memory import InMemoryCache

class State(TypedDict):
    draft: str
    revisions: int
    passed: bool
    status: str
def revise(state):
    return {"draft":state["draft"]+" [citation]","revisions":state["revisions"]+1}
def finish(state):
    return {"status":"accepted" if state["passed"] else "needs_review"}

# --- 你的任务：补全本节组件，保持函数接口 ---
def build_graph(review):
    """按要求使用真实 LangGraph API 完成组件。"""
    raise NotImplementedError("请完成 LangGraph 组件")

# --- 已提供：完整调用流程；补全组件后可直接运行 ---
def run_scenario():
    return build_graph(lambda draft:"[citation]" in draft).invoke({"draft":"answer","revisions":0},{"recursion_limit":20})

if __name__ == "__main__":
    print(json.dumps(run_scenario(), ensure_ascii=False, indent=2))

```

自动验收：

**一次修订后通过**

```python
r=build_graph(lambda d:"[citation]" in d).invoke({"draft":"x","revisions":0},{"recursion_limit":20})
expect_equal((r["revisions"],r["status"]),(1,"accepted"))
```

**原草稿通过则不修订**

```python
r=build_graph(lambda d:True).invoke({"draft":"x","revisions":0},{"recursion_limit":20})
expect_equal((r["draft"],r["revisions"]),("x",0))
```

**持续失败也有次数上限**

```python
calls=[]
g=build_graph(lambda d:calls.append(d) or False)
r=g.invoke({"draft":"x","revisions":0},{"recursion_limit":20})
expect_equal((len(calls),r["revisions"],r["status"]),(2,1,"needs_review"))
```

**完整场景：真实图与上下游得到预期结果**

```python
expect_equal(run_scenario(), json.loads("{\"draft\":\"answer [citation]\",\"revisions\":1,\"passed\":true,\"status\":\"accepted\"}"))
```

参考资料：

- [LangGraph · Workflows & agents](https://docs.langchain.com/oss/python/langgraph/workflows-agents) · 官方文档
- [LangChain · Multi-agent](https://docs.langchain.com/oss/python/langchain/multi-agent) · 官方文档
- [LangSmith · Evaluation](https://docs.langchain.com/langsmith/evaluation) · 官方文档

### w12-3 · RetryPolicy 与按用户隔离的节点缓存

学习重点：使用 RetryPolicy 与 CachePolicy，限制短暂失败重试并隔离缓存作用域。

#### 只重试约定错误

节点最多尝试 3 次，只重试 TimeoutError，ValueError 直接失败。测试后端前两次超时、第三次成功，精确检查次数，不吞掉实现缺陷。

#### 缓存键包含结果作用域

key_func 同时编码 user_id 和 query，CachePolicy 指定 TTL，compile 注入 InMemoryCache。同用户复用，不同用户重新计算，用户相关结果不能只按文本缓存。

#### 三种机制不同目的

缓存减少重复计算，重试处理短暂错误，checkpoint 支持恢复。为外部 I/O 加超时与幂等，观察缓存命中、陈旧结果和失败次数，再调整参数。

业务场景：检索会暂时超时，重复请求又不应浪费调用。让框架执行有限重试，并为不同用户使用不同缓存键。

调用链：业务输入与真实 LangGraph 运行时 → 你实现：build_graph → 图输出、快照或事件 → 下游使用

功能关系：缓存键必须包含影响输出的上下文；持久化、缓存和幂等解决不同问题，不能互相替代。

接口与要求：

- retrieve 节点使用 RetryPolicy：最多 3 次，只重试 TimeoutError。
- CachePolicy ttl=60；key_func 使用 user 与 query 的 JSON 字符串。
- compile(cache=cache)，ValueError 不重试，不同用户不能命中对方缓存。

初始程序：

```python
# === SCENARIO: 知识库助手 ===
# RetryPolicy 与按用户隔离的节点缓存
import json

# --- 已提供：业务数据与上下游组件 ---
import asyncio
import json
from typing import TypedDict, Annotated, Literal
from operator import add
from dataclasses import dataclass
from langgraph.graph import StateGraph, START, END, MessagesState
from langgraph.graph.state import CompiledStateGraph
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command, Send, interrupt, RetryPolicy, CachePolicy
from langgraph.runtime import Runtime
from langgraph.store.memory import InMemoryStore
from langgraph.cache.memory import InMemoryCache

class State(TypedDict):
    user: str
    query: str
    answer: str

# --- 你的任务：补全本节组件，保持函数接口 ---
def build_graph(backend, cache):
    """按要求使用真实 LangGraph API 完成组件。"""
    raise NotImplementedError("请完成 LangGraph 组件")

# --- 已提供：完整调用流程；补全组件后可直接运行 ---
def run_scenario():
    calls=[]
    g=build_graph(lambda u,q:calls.append([u,q]) or u+":"+q,InMemoryCache())
    a=g.invoke({"user":"alice","query":"graph"})
    g.invoke({"user":"alice","query":"graph"})
    b=g.invoke({"user":"bob","query":"graph"})
    return {"answers":[a["answer"],b["answer"]],"backend_calls":calls}

if __name__ == "__main__":
    print(json.dumps(run_scenario(), ensure_ascii=False, indent=2))

```

自动验收：

**暂时超时由框架重试**

```python
calls=[]
def backend(u,q):
    calls.append(q)
    if len(calls)<3: raise TimeoutError("busy")
    return "ok"
g=build_graph(backend,InMemoryCache())
expect_equal(g.invoke({"user":"a","query":"x"})["answer"],"ok")
expect_equal(len(calls),3)
```

**参数错误不重试**

```python
calls=[]
def backend(u,q):
    calls.append(q)
    raise ValueError("bad")
g=build_graph(backend,InMemoryCache())
expect_raises(ValueError,lambda:g.invoke({"user":"a","query":"x"}))
expect_equal(len(calls),1)
```

**缓存命中与租户隔离**

```python
calls=[]
g=build_graph(lambda u,q:calls.append(u) or u,InMemoryCache())
g.invoke({"user":"a","query":"x"})
g.invoke({"user":"a","query":"x"})
expect_equal(g.invoke({"user":"b","query":"x"})["answer"],"b")
expect_equal(calls,["a","b"])
```

**完整场景：真实图与上下游得到预期结果**

```python
expect_equal(run_scenario(), json.loads("{\"answers\":[\"alice:graph\",\"bob:graph\"],\"backend_calls\":[[\"alice\",\"graph\"],[\"bob\",\"graph\"]]}"))
```

参考资料：

- [LangGraph · Use the Graph API](https://docs.langchain.com/oss/python/langgraph/use-graph-api) · 官方文档
- [LangGraph · Test](https://docs.langchain.com/oss/python/langgraph/test) · 官方文档

### w12-4 · 图回归评测与发布契约

学习重点：运行固定数据集评测真实图，完成图入口、应用配置和部署验收。

#### 每条样本独立执行

evaluate_graph 调用真实 graph.invoke，使用 eval:<id> 区分线程，对比 expected。异常样本加入 failures 而其他样本继续；空集成功率为 0，重复 ID 在执行前拒绝。

#### 组织可交付应用

导出 agent.py:graph，准备依赖、langgraph.json、环境变量示例和 README。按官方本地开发文档启动服务，验证入口、线程与中断；凭据和环境要求以当前文档为准。

#### 提交工程证据

固定 30 条样本，报告失败分类、质量和 p95 延迟；演示两个用户、两个线程、重启恢复、审批与一次故障。检查日志和持久化配置，按部署目标选择服务方案。

业务场景：发布前用固定数据集运行真实图，收集失败样本。每个评测样本使用独立 thread_id，避免记忆让测试互相污染。

调用链：业务输入与真实 LangGraph 运行时 → 你实现：evaluate_graph → 图输出、快照或事件 → 下游使用

功能关系：本周实战把图导出为 agent.py:graph，编写 langgraph.json、依赖锁与故障演示，再按官方本地服务文档验证部署。

接口与要求：

- rows 每项包含 id、input、expected；id 重复抛 ValueError。
- 每行调用 graph.invoke(input, {configurable:{thread_id:"eval:"+id}})。
- 异常计为该样本失败；返回 count、success_rate 和失败 id 列表，空集成功率为 0。

初始程序：

```python
# === SCENARIO: 知识库助手 ===
# 图回归评测与发布契约
import json

# --- 已提供：业务数据与上下游组件 ---
import asyncio
import json
from typing import TypedDict, Annotated, Literal
from operator import add
from dataclasses import dataclass
from langgraph.graph import StateGraph, START, END, MessagesState
from langgraph.graph.state import CompiledStateGraph
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command, Send, interrupt, RetryPolicy, CachePolicy
from langgraph.runtime import Runtime
from langgraph.store.memory import InMemoryStore
from langgraph.cache.memory import InMemoryCache

class State(TypedDict):
    query: str
    answer: str
def normalize(state):
    return {"query": state["query"].strip()}
def answer(state):
    return {"answer": "笔记：" + state["query"]}
def build_graph():
    builder = StateGraph(State)
    builder.add_node("normalize", normalize)
    builder.add_node("answer", answer)
    builder.add_edge(START, "normalize")
    builder.add_edge("normalize", "answer")
    builder.add_edge("answer", END)
    return builder.compile()

# --- 你的任务：补全本节组件，保持函数接口 ---
def evaluate_graph(graph, rows):
    """按要求使用真实 LangGraph API 完成组件。"""
    raise NotImplementedError("请完成 LangGraph 组件")

# --- 已提供：完整调用流程；补全组件后可直接运行 ---
def run_scenario():
    rows=[{"id":"good","input":{"query":" graph "},"expected":{"query":"graph","answer":"笔记：graph"}},{"id":"bad","input":{"query":"x"},"expected":{"query":"x","answer":"错误预期"}}]
    return evaluate_graph(build_graph(),rows)

if __name__ == "__main__":
    print(json.dumps(run_scenario(), ensure_ascii=False, indent=2))

```

自动验收：

**真实图结果与固定预期比较**

```python
g=build_graph()
rows=[{"id":"a","input":{"query":" x "},"expected":{"query":"x","answer":"笔记：x"}}]
expect_equal(evaluate_graph(g,rows),{"count":1,"success_rate":1,"failures":[]})
```

**异常样本不会中断整个评测**

```python
rows=[{"id":"bad","input":{},"expected":{}},{"id":"good","input":{"query":"a"},"expected":{"query":"a","answer":"笔记：a"}}]
expect_equal(evaluate_graph(build_graph(),rows),{"count":2,"success_rate":0.5,"failures":["bad"]})
```

**空集与重复 ID 有明确约定**

```python
g=build_graph()
expect_equal(evaluate_graph(g,[]),{"count":0,"success_rate":0,"failures":[]})
row={"id":"x","input":{"query":"x"},"expected":{}}
expect_raises(ValueError,lambda:evaluate_graph(g,[row,row]))
```

**完整场景：真实图与上下游得到预期结果**

```python
expect_equal(run_scenario(), json.loads("{\"count\":2,\"success_rate\":0.5,\"failures\":[\"bad\"]}"))
```

参考资料：

- [LangGraph · Test](https://docs.langchain.com/oss/python/langgraph/test) · 官方文档
- [LangSmith · Evaluation](https://docs.langchain.com/langsmith/evaluation) · 官方文档
- [LangGraph · Application structure](https://docs.langchain.com/oss/python/langgraph/application-structure) · 官方文档
- [LangSmith · Local development & testing](https://docs.langchain.com/langsmith/local-dev-testing) · 官方文档
- [LangSmith · Deployment](https://docs.langchain.com/langsmith/deployment) · 官方文档
- [LearnGraph · 7.1 Creating Deployment](https://www.learngraph.online/LearnGraph%201.X/module-7-production-deployment/7.1%20Creating%20Deployment.html) · 中文教程
- [LangChain Academy · 官方课程源码](https://github.com/langchain-ai/langchain-academy) · 专业课程

### 本周交付：LG v1.0 · 可评测与部署的 LangGraph 应用

整合真实 RAG、有界评审、节点重试和用户缓存。建立固定评测集与故障分类，准备图入口、langgraph.json、锁定依赖和部署说明，按官方资料验证本地服务。

- [ ] 至少 30 条样本，报告质量与 p95 延迟
- [ ] 重试有上限，缓存作用域正确
- [ ] 新环境可运行并展示恢复、审批与本地服务
