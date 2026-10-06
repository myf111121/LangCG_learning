# LangChain 与 LangGraph：6 周进阶路线

Python · 每周约 12 小时 · 共 72 小时

主线：带审批与记忆的知识库助手。每周 4 个学习任务（阅读 4h + 编码 4h），另有项目实战 4h。

每个学习任务在页面内提供代码场景和初始代码。编写 Python 后运行自动测试，全部通过才完成任务，无需手动勾选。场景用固定数据模拟关键行为，无需 API Key；真实框架集成在每周项目中完成。

## 第 1 周：可靠的单 Agent

LearnGraph 2.4 / 15.1

交付：v0.1 · 工具与结构化输出

在一个 Python 项目中完成文档查询、结果结构化和错误反馈。对正常查询、无结果和非法参数各准备一组输入，保存 trace 与输出。

### 重新理解 Agent 的执行循环

模型选择动作，工具返回结果，执行框架组织下一轮。先能解释一次 trace，再判断哪些步骤需要固定工作流。

代码场景：执行一次模型—工具循环

知识库助手收到预先生成的模型动作。实现 run_agent(actions, tools)，执行工具调用，记录 trace，并在模型给出 final 时结束。actions 是动作字典列表，tools 是工具名到函数的映射。

接口与要求：

- 返回 {answer, trace}；trace 每项包含 tool、args、result。
- tool 动作包含 name、args；final 动作包含 answer。final 之后不再调用工具。
- 工具不存在时抛出 ValueError；遍历结束仍没有 final 也抛出 ValueError。

自动验收（全部通过）：

- 工具结果与参数完整进入 trace
- 最终回答之后不再调用工具
- 未知工具与未结束的循环明确报错

### 工具契约与失败处理

为工具定义输入边界和可解释的返回值。区分可纠正的参数错误、暂时性失败和实现缺陷。

代码场景：为查询工具加边界与重试

查询服务有时会超时。实现 search_notes(query, limit, backend, max_attempts=3)。backend(query, limit) 由测试提供，返回笔记列表或抛出异常。

接口与要求：

- query 必须是非空字符串，调用前去除首尾空白；limit 必须是 1–5 的整数，布尔值不算整数。
- max_attempts 必须是 1–3 的整数；所有非法参数在调用 backend 前抛出 ValueError。
- 仅重试 TimeoutError，总调用次数不超过 max_attempts。最后一次超时原样抛出；其他异常直接抛出。

自动验收（全部通过）：

- 合法查询、空结果与空白清理
- 非法参数不会调用服务
- 临时超时可以重试并在成功后结束
- 重试次数有界，其他错误不重试

### 结构化输出与上下文

稳定字段让下游能够验证结果。只传任务需要的上下文，并保留消息与工具结果的关联。

代码场景：校验带证据的结构化回答

下游只接收固定格式的回答。实现 validate_answer(payload, available_ids)，校验模型输出并返回新的三字段字典。available_ids 是本次真实检索到的来源 ID 列表。

接口与要求：

- answer 为非空字符串，source_ids 为字符串列表，needs_clarification 为布尔值；缺少字段或类型不符抛出 ValueError。
- 所有来源都必须在 available_ids 中；无来源时 needs_clarification 必须为 True。
- 只返回这三个字段，不修改输入。

自动验收（全部通过）：

- 合法回答返回固定字段且不修改输入
- 无证据时必须澄清
- 伪来源、缺失字段与错误类型被拒绝

### Middleware 与观测基线

将横切行为放进 middleware。实验一次改变一个因素，记录质量、延迟与成本，建立可比较的基线。

代码场景：汇总同一输入集的观测基线

两次实验返回样本记录，每条有 id、passed、latency_ms、tokens。实现 summarize_runs(runs)，为后续策略比较生成统一指标。

接口与要求：

- 返回 count、success_rate、mean_latency_ms、total_tokens。成功率和平均延迟保留原始数值，不做百分比换算。
- 空列表时四项均为 0。重复 id 抛出 ValueError，避免同一输入被重复统计。

自动验收（全部通过）：

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

图节点只返回增量更新。实现 merge_state(state, update)：普通字段覆盖，events 按事件 id 合并，模拟多个节点的 reducer。

接口与要求：

- 返回新字典，未更新的字段保留；不能修改 state、update 及其中的事件列表。
- events 按首次出现顺序排列，同一 id 的后续事件不再追加。

自动验收（全部通过）：

- 普通字段覆盖，历史字段保留
- 并行事件合并且重复重放不追加
- 空状态接受第一次增量

### 条件边与循环终止

路由依赖明确状态信号，循环必须有业务退出条件。递归限制作为最后保护。

代码场景：为无结果检索设计有界路由

检索节点返回 documents 和 rewrite_count。实现 route_query(state)，让有证据的查询进入回答，无证据的查询最多改写两次。

接口与要求：

- documents 非空返回 "answer"；否则 rewrite_count 小于 2 返回 "rewrite"，达到 2 返回 "clarify"。
- 缺少 documents 和 rewrite_count 时分别按 []、0 处理；不得修改 state。

自动验收（全部通过）：

- 有证据直接回答
- 无结果路径具有退出条件
- 初始状态可路由

### Checkpoint 与 thread_id

checkpoint 保存某一线程的图状态。复用 thread_id 可延续任务，跨进程恢复需要持久化后端。

代码场景：隔离并恢复线程 checkpoint

实现 CheckpointStore，以字典模拟持久化保存器。save(thread_id, state) 保存快照，load(thread_id) 返回快照，dump() 返回 JSON 字符串；构造函数可接收该字符串恢复。

接口与要求：

- 不同 thread_id 相互隔离；未知线程返回 None。
- 保存与加载均使用深拷贝，调用者修改嵌套状态不能污染快照。
- CheckpointStore(snapshot=None)；dump 后新建实例仍能读取保存的状态。

自动验收（全部通过）：

- 不同线程互不混淆
- 嵌套状态与返回值不会污染快照
- 序列化后重建实例可恢复

### 重试、重放与幂等

恢复可能再次运行部分节点代码。外部写入要有业务幂等键，避免重复副作用。

代码场景：避免恢复时重复写入

服务在写入之后可能故障，恢复会再次执行节点。实现 write_once(request_id, text, ledger, write)，ledger 记录已执行请求的结果，write(text) 由测试提供。

接口与要求：

- 相同 request_id 返回第一次 write 的结果，只调用一次 write。不同请求分别写入。
- write 失败时不登记成功，后续可以重试；不能吞掉异常。

自动验收（全部通过）：

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

实现 approval_step(draft, decision, write)。decision 为 None 代表尚未审批，True 代表批准，False 代表拒绝。用固定状态模拟 interrupt 与恢复的关键行为。

接口与要求：

- 未审批返回 {status: "paused", draft}，不调用 write。
- 批准调用 write(draft)，返回 {status: "approved", result: 写入结果}；拒绝返回 {status: "rejected"}，不写入。
- 其他 decision 抛出 ValueError；只接受真正的布尔值。

自动验收（全部通过）：

- 暂停与拒绝都没有写入
- 批准后才执行动作
- 非法审批输入被拒绝

### 编辑、拒绝与审计

审批输入也需要校验。决策与执行内容要可追踪；编辑后应使用修改后的内容。

代码场景：处理编辑、拒绝与审批审计

审批者可以 approve、reject 或 edit。实现 apply_decision(request_id, draft, decision, edited_text, ledger, write)，返回审计字典，并按请求 ID 防止重复恢复。

接口与要求：

- 审计结果为 {request_id, decision, text, result}。approve 使用 draft，edit 使用非空 edited_text，reject 的 text、result 均为 None。
- 未知决策或非法编辑内容在写入前抛出 ValueError。
- ledger 保存首次审计结果；重复请求直接返回首次结果，不能重复写入。

自动验收（全部通过）：

- 编辑使用修改后的内容并可追溯
- 拒绝没有写入，批准保留原文
- 非法决策不会写入或登记

### 短期与长期记忆

线程状态维持当前任务；Store 保存跨线程应用数据。定义记忆的用户边界、更新条件与删除策略。

代码场景：按用户隔离长期偏好

实现 MemoryStore。set_preference(user_id, key, value) 保存偏好，get_preference(user_id, key) 读取，delete_preference(user_id, key) 删除。长期偏好不绑定 thread_id。

接口与要求：

- 同一用户跨会话可读取；不同用户使用相同 key 也必须隔离。
- 缺少偏好返回 None；删除不存在的偏好不报错。
- 保存和读取均深拷贝，防止用户间意外共享可变对象。

自动验收（全部通过）：

- 跨会话偏好可读，用户边界隔离
- 删除只影响指定用户
- 可变偏好不会污染已保存事实

### 消息压缩与记忆质量

压缩保留任务所需信息；长期记忆只写已确认事实。用更正和未确认信息测试质量。

代码场景：提取已确认的最新记忆

对话摘要器已把消息变成 {key, value, confirmed} 事件。实现 update_facts(facts, events)，把经过确认的事实合入长期记忆。

接口与要求：

- 仅 confirmed 为 True 的事件能更新记忆；同一 key 的最新确认事件覆盖旧值。
- 已确认且 value 为 None 时删除该 key；未确认的推测既不覆盖也不删除。
- 返回新字典，不修改原 facts。

自动验收（全部通过）：

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

每个文档片段为 {id, source_id, tokens}，tokens 是已切分的词列表。实现 retrieve(query_tokens, chunks, k)，以不同查询词和片段词的交集大小评分。

接口与要求：

- 只返回分数大于 0 的片段，按分数降序；同分保持输入顺序，最多 k 条。
- 重复查询词不增加分数；k 必须为正整数，布尔值不合法，否则抛出 ValueError。
- 返回原片段的完整字段，让来源可追踪；不修改输入。

自动验收（全部通过）：

- 排序、top-k 和来源完整保留
- 重复词不加分，同分保留原顺序
- 非法 k 被拒绝

### 把检索变成图

显式表达检索、证据检查与回答，把证据是否充足变成可测试的路由条件。

代码场景：把证据检查变成明确分支

每条检索证据有 id、claim、relevant。实现 grade_evidence(documents)，先过滤不相关文档，再检查观点冲突，返回下一节点和有效证据 ID。

接口与要求：

- 返回 {route, source_ids}，只使用 relevant 为 True 的文档，source_ids 按出现顺序去重。
- 没有相关证据返回 clarify；相关证据的 claim 有多个不同值时返回 conflict，否则返回 generate。

自动验收（全部通过）：

- 充足证据进入回答且过滤无关来源
- 冲突观点进入专门分支
- 无证据会澄清，重复来源不追加

### 查询改写与有界纠错

改写可能提升召回，也会增加延迟。固定输入，记录新增证据是否真的帮助回答。

代码场景：只允许一次查询纠错

实现 retrieve_with_rewrite(query, retrieve, rewrite)。retrieve(query) 返回文档列表，rewrite(query) 返回新查询。首次无结果时允许改写一次。

接口与要求：

- 返回 {documents, queries, needs_clarification}；queries 记录实际查询的顺序。
- 首查命中时不改写；首查无结果时只改写一次，再无结果就澄清。

自动验收（全部通过）：

- 首查命中不会增加改写成本
- 改写后命中，记录两个查询
- 持续无结果也只改写一次

### 引用、拒答与检索评测

分别评测检索和答案。无答案、冲突和文档中的不可信指令都要专项测试。

代码场景：校验引用能否支持回答

每个片段包含 id、claim、trusted、expired，回答包含 claim、source_ids。实现 check_citations(answer, chunks)，检查来源存在、可信、未过期且支持该观点。

接口与要求：

- 返回 {passed, invalid_ids, needs_clarification}。invalid_ids 按引用顺序去重。
- 不存在、不可信、过期或 claim 不匹配的引用均无效。全部引用有效且非空才 passed=True。
- 没有任何有效引用时 needs_clarification=True；文档内额外 instruction 字段不改变规则。

自动验收（全部通过）：

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

单 Agent 与多 Agent 的实验指标均有 success_rate、latency_ms、tokens。实现 choose_architecture(single, multi)，按已声明的收益和预算条件选择方案。

接口与要求：

- 多 Agent 成功率至少提高 0.1、延迟不超过单 Agent 的 1.5 倍、tokens 不超过 2 倍时返回 "multi"；否则返回 "single"。
- 门槛包含等号。成功率增益比较允许 1e-9 的浮点误差。

自动验收（全部通过）：

- 收益与成本都达标才采用多 Agent
- 收益不足保留基线
- 延迟或 token 超预算保留单 Agent

### 子图与状态边界

子图封装独立流程；边界只传必要字段。schema 不同时显式转换输入输出。

代码场景：转换父图与子图的状态

父图包含 query、messages、secret 等字段，检索子图只需要 query。实现 call_retrieval_subgraph(parent_state, subgraph)，转换输入并校验子图返回的 documents。

接口与要求：

- 只向 subgraph 传 {query}；每个返回 document 必须包含字符串 id、text、source_id，否则抛出 ValueError。
- 返回新的父状态，更新 documents 与按出现顺序去重的 source_ids；保留其余父字段且不修改输入。

自动验收（全部通过）：

- 只传必要字段，保留父图状态
- 无结果返回空证据
- 子图输出在边界校验

### 并行、Send 与结果合并

独立任务可以并行，动态任务可以分发。合并结果时定义去重、顺序和部分失败策略。

代码场景：合并分发任务与部分失败

分发检索返回 {task_id, documents, error} 列表，每个文档有 source_id。实现 merge_results(results)，合并成功任务的证据，并保留失败任务信息。

接口与要求：

- 返回 {documents, errors}。文档按 source_id 去重，保持首次出现的顺序和完整文档。
- error 非 None 的任务整体视为失败，不合并其 documents；errors 包含 {task_id, error}。

自动验收（全部通过）：

- 来源去重且保持顺序
- 部分失败保留成功结果并报告错误
- 全部失败和空分发也能收敛

### 协作协议与评审循环

传递可验证结果和证据，评审反馈要指向具体问题。修订次数必须受控。

代码场景：实现最多一次修订的评审循环

实现 review_once(draft, review, revise)。review(text) 返回 {passed, issues}，revise(text, issues) 返回修订后的文本；最多修订一次并再次评审。

接口与要求：

- 返回 {draft, passed, reviews}；reviews 按顺序保留每次评审结果。
- 第一次通过不修订；第一次失败把具体 issues 交给 revise；第二次失败也必须结束。

自动验收（全部通过）：

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

固定数据集的评测记录包含 id、passed、failure_type。实现 evaluate_dataset(rows)，生成可重复比较的评测报告。

接口与要求：

- 返回 {count, success_rate, failures}；failures 按失败类别计数，只统计 passed=False 的记录。缺少或空 failure_type 归为 "unknown"。
- 空数据集成功率为 0；重复样本 id 抛出 ValueError。

自动验收（全部通过）：

- 按失败类别聚合且不统计成功样本
- 空集和缺少失败类别正确处理
- 重复样本不能重复计分

### 流式输出与运行状态

分别观察节点更新与模型消息。界面要区分运行、待审批、失败和最终完成。

代码场景：把流事件转换为运行状态

实现 reduce_stream(state, event)。state 包含 status、text、node、error；event 的 type 为 update、token、interrupt、resume、error、done。

接口与要求：

- 返回新状态；update 只更新 node；token 将 event.text 追加到 text。interrupt 将 status 设为 waiting，resume 设为 running。
- error 将 status 设为 failed 并保存 event.message；done 将 status 设为 completed。
- waiting 时忽略 token；completed 或 failed 后忽略所有事件，避免迟到消息覆盖最终结果。

自动验收（全部通过）：

- 节点更新不混入文本，token 正确追加
- 待审批暂停消息，恢复后继续
- 终态不能被迟到事件改写

### 部署与并发边界

把配置与代码分离，明确用户、线程和请求之间的关系。定义持久化与请求限制。

代码场景：隔离用户线程并去重请求

实现 handle_request(user_id, thread_id, request_id, text, sessions, seen)。sessions 与 seen 都是由调用者保存的字典，返回该用户线程中的消息列表。

接口与要求：

- sessions 使用 (user_id, thread_id) 元组作为 key；seen 使用 (user_id, thread_id, request_id) 元组作为 key。
- 同一线程不同请求按顺序追加，相同请求不重复追加；不同用户或线程允许使用相同 request_id。
- 返回列表副本；三个 ID 必须为非空字符串，否则在变更字典前抛出 ValueError。

自动验收（全部通过）：

- 同线程连续输入有序，重复请求去重
- 不同用户和线程不会共享消息或请求
- 非法标识不会更改存储

### 项目验收与架构复盘

可复现的交付包含演示、指标和决策。用测量证据解释保留哪些架构复杂度。

代码场景：用代码生成交付验收报告

项目评测样本包含 passed、citation_valid、latency_ms、cost。实现 build_release_report(rows, checks)，checks 包含 reproducible、approval、recovery 三个交付检查结果。

接口与要求：

- 返回 count、success_rate、citation_rate、p95_latency_ms、total_cost、ready。p95 使用 nearest-rank：升序排列后取 ceil(0.95*n) 的第一个基位置。
- ready 要求样本至少 30 条、成功率至少 0.8、引用有效率至少 0.9，并且三个交付检查均严格为 True。
- 空样本时数值指标均为 0，ready=False；不要修改样本顺序。

自动验收（全部通过）：

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
