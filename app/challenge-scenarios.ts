export type ChallengeContext = {
  title: string;
  story: string;
  flow: [string, string, string];
  connection: string;
  provided: string;
  setup: string;
  entry: string;
  expected: Record<string, unknown>;
};

const scene = (title: string, story: string, flow: ChallengeContext['flow'], connection: string, provided: string, setup: string, entry: string, expected: ChallengeContext['expected']): ChallengeContext =>
  ({ title, story, flow, connection, provided, setup, entry, expected });

// Each exercise fills one component of the same knowledge assistant. Supplied
// adapters use deterministic local data so the entire program runs without keys.
export const challengeContexts: Record<string, ChallengeContext> = {
  'w1-1': scene('用户提问如何变成工具调用',
    '用户询问如何恢复会话。模型已选择查询笔记，再返回答案；你要把这些动作接到真实的工具函数上，让界面同时拿到回答和执行记录。',
    ['用户问题 → 模型动作', '你实现：run_agent', '工具结果 → 回答与 trace'],
    '本节负责执行工具。下一节的 search_notes 可以替换这里的查询工具，第 4 节会汇总这些执行记录。',
    '模型动作样例、笔记查询工具、回答展示器和运行入口',
    `def model_actions(question):
    return [
        {"type": "tool", "name": "search", "args": {"query": "checkpoint"}},
        {"type": "final", "answer": "使用 checkpoint 恢复会话。"},
    ]

def search_library(query):
    notes = [{"id": "note-1", "text": "checkpoint 保存会话状态"}]
    return [note for note in notes if query in note["text"]]

def render_answer(result):
    return {"message": result["answer"], "tools_used": [step["tool"] for step in result["trace"]]}`,
    `    question = "如何恢复会话？"
    actions = model_actions(question)
    result = run_agent(actions, {"search": search_library})
    return {"question": question, "screen": render_answer(result), "trace": result["trace"]}`,
    { question: '如何恢复会话？', screen: { message: '使用 checkpoint 恢复会话。', tools_used: ['search'] }, trace: [{ tool: 'search', args: { query: 'checkpoint' }, result: [{ id: 'note-1', text: 'checkpoint 保存会话状态' }] }] }),

  'w1-2': scene('查询工具遇到暂时超时',
    '助手已经决定搜索笔记，但后端第一次请求超时。你实现工具适配层，让上游使用统一接口，下游仍能收到文档，而不是立即失败。',
    ['Agent 提交查询参数', '你实现：search_notes', '后端重试 → 文档交给回答节点'],
    '这是上一节 tools 字典里的工具实现。它输出的来源 ID 会交给下一节的回答校验器。',
    '会超时一次的查询服务、工具调用节点和文档展示代码',
    `def make_backend():
    calls = []
    def backend(query, limit):
        calls.append({"query": query, "limit": limit})
        if len(calls) == 1:
            raise TimeoutError("搜索服务暂时繁忙")
        return [{"id": "note-1", "text": "checkpoint 保存状态"}][:limit]
    return backend, calls

def tool_node(arguments, backend):
    return search_notes(arguments["query"], arguments["limit"], backend)`,
    `    backend, calls = make_backend()
    documents = tool_node({"query": "  checkpoint  ", "limit": 2}, backend)
    return {"backend_calls": calls, "source_ids": [doc["id"] for doc in documents], "answer_context": documents[0]["text"]}`,
    { backend_calls: [{ query: 'checkpoint', limit: 2 }, { query: 'checkpoint', limit: 2 }], source_ids: ['note-1'], answer_context: 'checkpoint 保存状态' }),

  'w1-3': scene('模型输出接入回答页面',
    '检索节点找到了真实笔记，模型返回了带额外字段的 JSON。你要在模型与页面之间建立数据边界，避免伪来源或格式错误进入界面。',
    ['检索文档 + 模型 JSON', '你实现：validate_answer', '固定结构 → 答案与引用页面'],
    '上游来源来自查询工具；本节校验结构，第 4 周会继续检查引用是否真正支持答案。',
    '检索结果、模型输出样例和只接收三字段的页面适配器',
    `def retrieve_documents():
    return [{"id": "note-1", "text": "checkpoint 保存会话状态"}]

def generate_payload(documents):
    return {"answer": "使用 checkpoint 恢复会话。", "source_ids": [documents[0]["id"]], "needs_clarification": False, "debug": "模型内部信息"}

def answer_page(answer):
    return {"message": answer["answer"], "citations": answer["source_ids"], "mode": "clarify" if answer["needs_clarification"] else "answer"}`,
    `    documents = retrieve_documents()
    payload = generate_payload(documents)
    answer = validate_answer(payload, [doc["id"] for doc in documents])
    return {"validated_fields": sorted(answer), "screen": answer_page(answer)}`,
    { validated_fields: ['answer', 'needs_clarification', 'source_ids'], screen: { message: '使用 checkpoint 恢复会话。', citations: ['note-1'], mode: 'answer' } }),

  'w1-4': scene('从执行记录到实验面板',
    '团队想比较是否给助手增加重试。两个策略在相同问题上留下成功、延迟和 token 记录；你负责将记录变成可以比较的指标。',
    ['固定问题 → 两组执行记录', '你实现：summarize_runs', '统一指标 → 策略比较面板'],
    '记录来自前面工具循环和重试节点；这些指标会在第 5 周用于决定是否增加多 Agent。',
    '同一输入集的实验记录和策略比较面板',
    `def experiment_runs():
    return {
        "baseline": [{"id": "q1", "passed": True, "latency_ms": 100, "tokens": 20}, {"id": "q2", "passed": False, "latency_ms": 300, "tokens": 40}],
        "retry": [{"id": "q1", "passed": True, "latency_ms": 120, "tokens": 20}, {"id": "q2", "passed": True, "latency_ms": 280, "tokens": 50}],
    }

def comparison_panel(reports):
    return {"success_gain": reports["retry"]["success_rate"] - reports["baseline"]["success_rate"], "extra_tokens": reports["retry"]["total_tokens"] - reports["baseline"]["total_tokens"]}`,
    `    reports = {name: summarize_runs(rows) for name, rows in experiment_runs().items()}
    return {"reports": reports, "comparison": comparison_panel(reports)}`,
    { reports: { baseline: { count: 2, success_rate: 0.5, mean_latency_ms: 200, total_tokens: 60 }, retry: { count: 2, success_rate: 1, mean_latency_ms: 200, total_tokens: 70 } }, comparison: { success_gain: 0.5, extra_tokens: 10 } }),

  'w2-1': scene('多个节点更新同一份图状态',
    '检索节点追加证据事件，回答节点追加生成事件。节点重放可能重复提交事件；你要合并状态，让回答节点拿到文档，并保持执行历史稳定。',
    ['检索节点返回局部更新', '你实现：merge_state', '回答节点读状态 → 新事件合并'],
    '合并后的 documents 供下一节路由使用，events 会随 checkpoint 一起保存。',
    '检索节点、回答节点与一个包含重放事件的运行入口',
    `def retrieval_node(state):
    return {"documents": ["note-1"], "events": [{"id": "search", "node": "retrieve"}]}

def answer_node(state):
    return {"answer": "找到 " + state["documents"][0], "events": [{"id": "search", "node": "retrieve"}, {"id": "answer", "node": "answer"}]}`,
    `    initial = {"query": "checkpoint", "events": []}
    retrieved = merge_state(initial, retrieval_node(initial))
    finished = merge_state(retrieved, answer_node(retrieved))
    return {"answer": finished["answer"], "event_ids": [event["id"] for event in finished["events"]], "initial": initial}`,
    { answer: '找到 note-1', event_ids: ['search', 'answer'], initial: { query: 'checkpoint', events: [] } }),

  'w2-2': scene('检索为空时工作流往哪里走',
    '用户使用“断点”提问，笔记只收录 checkpoint。你要连接检索、改写和回答节点；当查询仍无结果时，工作流也必须有退出路径。',
    ['检索节点更新 documents', '你实现：route_query', '改写再检索 / 回答 / 澄清'],
    '路由读取上一节定义的状态字段；第 4 周会将简单的有无证据判断升级为证据质量检查。',
    '固定检索服务、改写节点、回答与澄清节点及工作流循环',
    `def retrieve_node(state):
    return ["note-1"] if state["query"] == "checkpoint" else []

def rewrite_node(state):
    return {**state, "query": "checkpoint", "rewrite_count": state["rewrite_count"] + 1}

def answer_node(state):
    return "使用 " + state["documents"][0] + " 回答"

def clarify_node(state):
    return "请补充问题"`,
    `    state = {"query": "断点", "rewrite_count": 0}
    visited = []
    for _ in range(4):
        state["documents"] = retrieve_node(state)
        destination = route_query(state)
        visited.append(destination)
        if destination == "rewrite":
            state = rewrite_node(state)
        else:
            message = answer_node(state) if destination == "answer" else clarify_node(state)
            return {"visited": visited, "query": state["query"], "message": message}
    raise RuntimeError("工作流没有收敛")`,
    { visited: ['rewrite', 'answer'], query: 'checkpoint', message: '使用 note-1 回答' }),

  'w2-3': scene('服务重启后接着回答',
    '助手检索完证据后服务重启。你负责保存会话状态；新的服务实例应读取原线程的快照，跳过已完成的检索，继续生成答案。',
    ['检索完成 → 保存线程状态', '你实现：CheckpointStore', '新实例恢复 → 回答节点'],
    '快照保存前两节的图状态；下一节会处理恢复时重放外部写入的问题。',
    '检索完成状态、模拟磁盘序列化与恢复后的回答节点',
    `def retrieved_state():
    return {"query": "恢复会话", "documents": ["note-1"], "next_node": "answer"}

def resume_answer(state):
    return {"node": state["next_node"], "answer": "依据 " + state["documents"][0] + " 继续回答"}`,
    `    store = CheckpointStore()
    store.save("thread-alice", retrieved_state())
    store.save("thread-bob", {"query": "另一问题"})
    disk_snapshot = store.dump()
    restarted_service = CheckpointStore(disk_snapshot)
    restored = restarted_service.load("thread-alice")
    return {"screen": resume_answer(restored), "other_thread": restarted_service.load("thread-bob")}`,
    { screen: { node: 'answer', answer: '依据 note-1 继续回答' }, other_thread: { query: '另一问题' } }),

  'w2-4': scene('重放工作流只保存一条笔记',
    '笔记已写入，服务却在返回响应前断线。恢复后的节点再次收到相同请求；你要让两次执行指向同一条笔记。',
    ['恢复节点再次提交 request_id', '你实现：write_once', '笔记服务 → 首次结果复用'],
    'checkpoint 恢复会重放节点，本节保护副作用；审批通过后的写入也需要这个保护。',
    '内存笔记服务和模拟执行后重放的工作流',
    `def make_notebook():
    notes = []
    def write(text):
        note = {"id": "note-" + str(len(notes) + 1), "text": text}
        notes.append(note)
        return note["id"]
    return notes, write`,
    `    notes, write = make_notebook()
    ledger = {}
    first = write_once("request-1", "checkpoint 保存状态", ledger, write)
    recovered = write_once("request-1", "checkpoint 保存状态", ledger, write)
    return {"response_ids": [first, recovered], "notebook": notes}`,
    { response_ids: ['note-1', 'note-1'], notebook: [{ id: 'note-1', text: 'checkpoint 保存状态' }] }),

  'w3-1': scene('助手写笔记前等待用户审批',
    '助手生成了待保存的笔记。页面先展示审批卡片，用户批准后才触发笔记服务；你实现暂停与恢复之间的执行边界。',
    ['生成草稿 → 暂无审批', '你实现：approval_step', '审批卡片 → 批准后写入'],
    '暂停状态可以由 checkpoint 保存；写入节点可再接上一周的幂等保护。',
    '草稿生成器、审批页面适配器和内存写入服务',
    `def draft_node():
    return "checkpoint 可以恢复会话"

def approval_card(result):
    return {"show_approval": result["status"] == "paused", "preview": result.get("draft")}`, 
    `    writes = []
    def write(text):
        writes.append(text)
        return "note-1"
    draft = draft_node()
    paused = approval_step(draft, None, write)
    writes_before_approval = len(writes)
    approved = approval_step(draft, True, write)
    return {"card": approval_card(paused), "writes_before_approval": writes_before_approval, "resumed": approved, "writes": writes}`,
    { card: { show_approval: true, preview: 'checkpoint 可以恢复会话' }, writes_before_approval: 0, resumed: { status: 'approved', result: 'note-1' }, writes: ['checkpoint 可以恢复会话'] }),

  'w3-2': scene('编辑审批内容后恢复工作流',
    '审批者修正了助手草稿后提交，网络重试又提交一次。你负责将编辑后的内容交给写入服务，并让审计页面看到唯一的操作记录。',
    ['审批表单提交编辑决策', '你实现：apply_decision', '保存修改文本 → 审计页面'],
    '这是上一节审批卡片的提交处理器，将编辑、幂等恢复和审计串在一起。',
    '审批表单样例、笔记写入服务和审计页面适配器',
    `def approval_form():
    return {"request_id": "approval-1", "draft": "自动保存所有记忆", "decision": "edit", "edited_text": "仅保存已确认的记忆"}

def audit_page(ledger):
    return [{"request_id": row["request_id"], "decision": row["decision"], "text": row["text"]} for row in ledger.values()]`,
    `    writes, ledger = [], {}
    def write(text):
        writes.append(text)
        return "note-1"
    form = approval_form()
    first = apply_decision(**form, ledger=ledger, write=write)
    replay = apply_decision(**form, ledger=ledger, write=write)
    return {"writes": writes, "same_result": first == replay, "audit": audit_page(ledger)}`,
    { writes: ['仅保存已确认的记忆'], same_result: true, audit: [{ request_id: 'approval-1', decision: 'edit', text: '仅保存已确认的记忆' }] }),

  'w3-3': scene('新会话沿用当前用户的语言偏好',
    'Alice 在设置页面选择中文，Bob 选择英文。两人打开新的聊天线程时，提示词构建器要读取各自的长期偏好。',
    ['设置页面保存用户偏好', '你实现：MemoryStore', '新会话读取 → 构建提示词'],
    'checkpoint 按线程保存运行状态，长期记忆按用户保存偏好；下一节会从已确认的对话中更新这些记忆。',
    '设置输入、新线程入口与提示词构建器',
    `def new_chat_prompt(user_id, thread_id, memory):
    language = memory.get_preference(user_id, "language") or "zh"
    return {"thread_id": thread_id, "instruction": "请用中文回答" if language == "zh" else "Answer in English"}`, 
    `    memory = MemoryStore()
    memory.set_preference("alice", "language", "zh")
    memory.set_preference("bob", "language", "en")
    return {"alice": new_chat_prompt("alice", "new-thread-a", memory), "bob": new_chat_prompt("bob", "new-thread-b", memory)}`,
    { alice: { thread_id: 'new-thread-a', instruction: '请用中文回答' }, bob: { thread_id: 'new-thread-b', instruction: 'Answer in English' } }),

  'w3-4': scene('用户更正信息后更新个性化上下文',
    '对话摘要器提取出用户更正和未经确认的推测。你要只把确认的信息写入长期事实，让下一轮建议使用最新资料。',
    ['对话摘要 → 确认事件', '你实现：update_facts', '长期事实 → 个性化建议'],
    '本节决定哪些事实可以写入上一节的长期存储；审批、确认信息和提示词构建因此连成一条链。',
    '摘要事件、旧用户事实和个性化回答节点',
    `def conversation_events():
    return [{"key": "city", "value": "上海", "confirmed": True}, {"key": "job", "value": "工程师", "confirmed": False}, {"key": "nickname", "value": None, "confirmed": True}]

def personalized_answer(facts):
    return "为你推荐" + facts["city"] + "的学习活动"`,
    `    previous = {"city": "北京", "language": "zh", "nickname": "旧称呼"}
    facts = update_facts(previous, conversation_events())
    return {"facts": facts, "message": personalized_answer(facts), "previous_city": previous["city"]}`,
    { facts: { city: '上海', language: 'zh' }, message: '为你推荐上海的学习活动', previous_city: '北京' }),

  'w4-1': scene('文档切片如何进入回答上下文',
    '知识库中有多个片段。用户询问 graph state，预处理已经把文本切词；你负责选出最相关的片段并保留来源，供生成节点引用。',
    ['查询切词 + 文档片段', '你实现：retrieve', 'top-k 证据 → 回答上下文'],
    '本节替换第 1 周的简单查询工具；结果会进入下一节的证据检查，再交给回答生成与引用校验。',
    '查询切词器、三条知识库片段和上下文构建器',
    `def knowledge_chunks():
    return [{"id": "c1", "source_id": "guide", "tokens": ["graph"], "text": "图组织节点"}, {"id": "c2", "source_id": "state-guide", "tokens": ["graph", "state"], "text": "状态在节点间传递"}, {"id": "c3", "source_id": "memory-guide", "tokens": ["memory"], "text": "长期记忆按用户隔离"}]

def build_answer_context(documents):
    return {"context": [doc["text"] for doc in documents], "citations": [doc["source_id"] for doc in documents]}`, 
    `    query = "graph state"
    documents = retrieve(query.split(), knowledge_chunks(), 2)
    return {"selected_chunks": [doc["id"] for doc in documents], "generation_input": build_answer_context(documents)}`,
    { selected_chunks: ['c2', 'c1'], generation_input: { context: ['状态在节点间传递', '图组织节点'], citations: ['state-guide', 'guide'] } }),

  'w4-2': scene('检索到矛盾文档时进入冲突处理',
    '知识库同时保留旧政策和新政策。你负责证据检查节点，让相互矛盾的结果进入冲突提示，而不是直接生成确定答案。',
    ['检索得到多条观点', '你实现：grade_evidence', '生成 / 冲突提示 / 澄清节点'],
    '本节位于检索与生成之间，沿用第 2 周条件路由；证据不足时可以进入下一节的查询纠错。',
    '包含冲突与无关文档的检索结果及路由后节点',
    `def retrieved_evidence():
    return [{"id": "old", "claim": "需要人工审批", "relevant": True}, {"id": "new", "claim": "可以自动审批", "relevant": True}, {"id": "other", "claim": "周末放假", "relevant": False}]

def next_node(decision):
    messages = {"generate": "可以生成回答", "conflict": "发现冲突，请确认政策版本", "clarify": "请补充问题"}
    return {"node": decision["route"], "message": messages[decision["route"]], "citations": decision["source_ids"]}`, 
    `    decision = grade_evidence(retrieved_evidence())
    return {"screen": next_node(decision)}`,
    { screen: { node: 'conflict', message: '发现冲突，请确认政策版本', citations: ['old', 'new'] } }),

  'w4-3': scene('用户用不同说法提问时纠错一次',
    '用户询问“断点”，而知识库采用 checkpoint 这个术语。你连接检索器与改写器，让命中的文档继续进入回答，同时保留查询路径。',
    ['原查询 → 固定检索器', '你实现：retrieve_with_rewrite', '一次改写 → 回答或澄清'],
    '该组件把检索和有界循环封装起来，可替换第 2 周的改写分支；输出文档仍交给证据检查。',
    '术语检索器、查询改写器与回答页面适配器',
    `def library_retrieve(query):
    return [{"id": "note-1", "text": "checkpoint 保存状态"}] if query == "checkpoint" else []

def rewrite_query(query):
    return "checkpoint" if query == "断点" else query

def retrieval_screen(result):
    return "请补充问题" if result["needs_clarification"] else result["documents"][0]["text"]`,
    `    result = retrieve_with_rewrite("断点", library_retrieve, rewrite_query)
    return {"queries": result["queries"], "source_ids": [doc["id"] for doc in result["documents"]], "message": retrieval_screen(result)}`,
    { queries: ['断点', 'checkpoint'], source_ids: ['note-1'], message: 'checkpoint 保存状态' }),

  'w4-4': scene('答案显示前拦住过期引用',
    '模型给出“可以自动审批”的答案，却引用了过期文档。你在生成节点与页面之间加一道校验，决定展示回答还是要求补充有效证据。',
    ['模型答案 + 原始证据', '你实现：check_citations', '通过才展示 / 请求补充证据'],
    '第 1 周校验输出结构，本节校验事实支撑；校验结果也会进入第 6 周的评测与交付报告。',
    '模型答案、过期证据与依据校验结果显示内容的页面',
    `def generated_answer():
    return {"claim": "可以自动审批", "source_ids": ["policy-old"]}

def evidence_chunks():
    return [{"id": "policy-old", "claim": "可以自动审批", "trusted": True, "expired": True}]

def publish_answer(answer, verdict):
    if verdict["passed"]:
        return {"status": "answer", "message": answer["claim"]}
    return {"status": "clarify" if verdict["needs_clarification"] else "review", "message": "请补充有效政策来源"}`, 
    `    answer = generated_answer()
    verdict = check_citations(answer, evidence_chunks())
    return {"verdict": verdict, "screen": publish_answer(answer, verdict)}`,
    { verdict: { passed: false, invalid_ids: ['policy-old'], needs_clarification: true }, screen: { status: 'clarify', message: '请补充有效政策来源' } }),

  'w5-1': scene('实验结果决定路由到哪个架构',
    '团队已经跑完单 Agent 和多 Agent 的对照实验。你负责读取质量与成本指标，选择实际处理请求的工作流。',
    ['同一数据集的实验指标', '你实现：choose_architecture', '选定工作流 → 处理请求'],
    '指标来自第 1 周观测基线；选择 multi 后，接下来会用子图和分发组件组织它。',
    '对照指标、两个工作流入口和应用路由器',
    `def architecture_metrics():
    return {"single": {"success_rate": 0.7, "latency_ms": 100, "tokens": 100}, "multi": {"success_rate": 0.85, "latency_ms": 140, "tokens": 180}}

def single_workflow(query):
    return {"query": query, "nodes": ["agent"]}

def multi_workflow(query):
    return {"query": query, "nodes": ["retrieve", "review", "answer"]}`, 
    `    metrics = architecture_metrics()
    selected = choose_architecture(metrics["single"], metrics["multi"])
    workflows = {"single": single_workflow, "multi": multi_workflow}
    return {"selected": selected, "execution": workflows[selected]("如何恢复会话？")}`,
    { selected: 'multi', execution: { query: '如何恢复会话？', nodes: ['retrieve', 'review', 'answer'] } }),

  'w5-2': scene('父工作流调用独立检索子图',
    '父图拥有聊天历史和内部配置，检索子图只需查询文本。你实现边界适配器，让子图得到最少输入，返回证据再供父图回答。',
    ['父图 query 与私有状态', '你实现：call_retrieval_subgraph', '子图证据 → 父图回答节点'],
    '子图复用第 4 周检索逻辑；下一节会同时调用多个检索任务并合并结果。',
    '父图状态、记录输入的检索子图和父图回答节点',
    `def make_retrieval_subgraph():
    inputs = []
    def subgraph(state):
        inputs.append(state)
        return {"documents": [{"id": "c1", "text": "checkpoint 保存状态", "source_id": "guide"}]}
    return subgraph, inputs

def parent_answer_node(state):
    return {"message": state["documents"][0]["text"], "citations": state["source_ids"], "history_kept": state["messages"]}`, 
    `    parent = {"query": "checkpoint", "messages": ["历史问题"], "secret": "internal-only"}
    subgraph, inputs = make_retrieval_subgraph()
    updated = call_retrieval_subgraph(parent, subgraph)
    return {"subgraph_inputs": inputs, "screen": parent_answer_node(updated)}`,
    { subgraph_inputs: [{ query: 'checkpoint' }], screen: { message: 'checkpoint 保存状态', citations: ['guide'], history_kept: ['历史问题'] } }),

  'w5-3': scene('多路检索有一条失败仍能交付',
    '文档库、FAQ 和归档服务分别检索。其中归档服务超时，其他服务又返回重复来源；你负责合并可用证据并报告失败任务。',
    ['分发任务 → 多路返回', '你实现：merge_results', '去重证据 → 回答与错误提示'],
    '这是多个检索子图的汇合点；去重后的证据交给生成节点，再进入下一节评审。',
    '三个检索任务的返回值和同时展示证据与警告的回答节点',
    `def dispatched_results():
    return [{"task_id": "docs", "documents": [{"source_id": "guide", "text": "checkpoint 保存状态"}], "error": None}, {"task_id": "faq", "documents": [{"source_id": "guide", "text": "重复说明"}, {"source_id": "faq", "text": "使用 thread_id 恢复"}], "error": None}, {"task_id": "archive", "documents": [], "error": "timeout"}]

def partial_answer(result):
    return {"context": [doc["text"] for doc in result["documents"]], "warning_tasks": [error["task_id"] for error in result["errors"]]}`, 
    `    result = merge_results(dispatched_results())
    return {"screen": partial_answer(result), "citations": [doc["source_id"] for doc in result["documents"]]}`,
    { screen: { context: ['checkpoint 保存状态', '使用 thread_id 恢复'], warning_tasks: ['archive'] }, citations: ['guide', 'faq'] }),

  'w5-4': scene('评审发现缺少引用后修订回答',
    '生成节点写出了答案但漏掉来源。评审器返回明确问题，修订器可补充引用；你负责组织这两个角色并限制循环次数。',
    ['生成节点给出草稿', '你实现：review_once', '评审反馈 → 一次修订 → 页面'],
    '评审消费前面合并的证据；有界修订避免无限成本，评审结果会用于离线评测。',
    '检查引用的评审器、按反馈补引用的修订器和发布节点',
    `def review_draft(text):
    passed = "[guide]" in text
    return {"passed": passed, "issues": [] if passed else ["missing_citation:guide"]}

def revise_draft(text, issues):
    return text + " [guide]" if "missing_citation:guide" in issues else text

def publish_reviewed(result):
    return {"status": "answer" if result["passed"] else "manual_review", "message": result["draft"]}`, 
    `    result = review_once("checkpoint 保存状态", review_draft, revise_draft)
    return {"screen": publish_reviewed(result), "reviews": result["reviews"]}`,
    { screen: { status: 'answer', message: 'checkpoint 保存状态 [guide]' }, reviews: [{ passed: false, issues: ['missing_citation:guide'] }, { passed: true, issues: [] }] }),

  'w6-1': scene('评测报告告诉团队先修哪里',
    '固定评测集已有逐题结果。你把它们聚合成报告，供质量面板显示成功率，并指出当前最常见的失败类别。',
    ['固定样本 → 逐题评测记录', '你实现：evaluate_dataset', '失败分布 → 修复优先级'],
    '评测覆盖前面工具、引用与审批组件；报告是最后交付判断的质量依据。',
    '逐题评测数据和根据失败类别给出修复重点的面板',
    `def evaluation_rows():
    return [{"id": "q1", "passed": True, "failure_type": None}, {"id": "q2", "passed": False, "failure_type": "citation"}, {"id": "q3", "passed": False, "failure_type": "citation"}, {"id": "q4", "passed": False, "failure_type": "tool"}]

def quality_panel(report):
    focus = max(report["failures"], key=report["failures"].get) if report["failures"] else None
    return {"success_percent": report["success_rate"] * 100, "fix_first": focus}`, 
    `    report = evaluate_dataset(evaluation_rows())
    return {"report": report, "panel": quality_panel(report)}`,
    { report: { count: 4, success_rate: 0.25, failures: { citation: 2, tool: 1 } }, panel: { success_percent: 25, fix_first: 'citation' } }),

  'w6-2': scene('流式页面显示审批与恢复过程',
    '后端连续推送节点、文本和审批事件。你负责将事件变成前端状态，让页面在审批期间暂停文本，恢复后继续，并忽略结束后的迟到消息。',
    ['图执行 → 后端事件流', '你实现：reduce_stream', '页面状态 → 审批按钮与答案'],
    '事件来自第 2 周图节点和第 3 周审批组件；本节把运行过程接到可交互页面。',
    '包含审批、恢复和迟到 token 的事件流与页面渲染器',
    `def backend_events():
    return [{"type": "update", "node": "write"}, {"type": "token", "text": "草稿"}, {"type": "interrupt"}, {"type": "token", "text": "不应显示"}, {"type": "resume"}, {"type": "token", "text": "已保存"}, {"type": "done"}, {"type": "token", "text": "迟到消息"}]

def stream_screen(state):
    return {"text": state["text"], "show_approval": state["status"] == "waiting", "status": state["status"]}`, 
    `    state = {"status": "running", "text": "", "node": None, "error": None}
    screens = []
    for event in backend_events():
        state = reduce_stream(state, event)
        screens.append(stream_screen(state))
    return {"approval_screen": screens[2], "final_screen": screens[-1], "node": state["node"]}`,
    { approval_screen: { text: '草稿', show_approval: true, status: 'waiting' }, final_screen: { text: '草稿已保存', show_approval: false, status: 'completed' }, node: 'write' }),

  'w6-3': scene('聊天 API 隔离用户并处理网络重试',
    'Alice 的聊天请求被客户端重发，Bob 恰好使用相同线程名和请求 ID。你实现 API 的会话层，确保两人历史独立，重试也不会重复添加消息。',
    ['登录用户 + API 请求', '你实现：handle_request', '当前会话历史 → Agent 输入'],
    '该层位于图执行之前，提供用户和线程边界；线程 ID 随后用于 checkpoint，用户 ID 用于长期记忆。',
    '模拟认证后的请求、会话存储和读取历史的 Agent 节点',
    `def agent_input(messages):
    return {"current_question": messages[-1], "history_size": len(messages)}

def chat_api(request, sessions, seen):
    messages = handle_request(request["user_id"], request["thread_id"], request["request_id"], request["text"], sessions, seen)
    return agent_input(messages)`,
    `    sessions, seen = {}, {}
    alice = {"user_id": "alice", "thread_id": "chat-1", "request_id": "r1", "text": "如何恢复？"}
    first = chat_api(alice, sessions, seen)
    retry = chat_api(alice, sessions, seen)
    bob = chat_api({**alice, "user_id": "bob", "text": "如何审批？"}, sessions, seen)
    return {"alice": first, "retry": retry, "bob": bob, "session_count": len(sessions)}`,
    { alice: { current_question: '如何恢复？', history_size: 1 }, retry: { current_question: '如何恢复？', history_size: 1 }, bob: { current_question: '如何审批？', history_size: 1 }, session_count: 2 }),

  'w6-4': scene('质量与恢复检查共同决定交付',
    '助手已经完成评测、审批和恢复验证。你生成统一交付报告，让发布面板根据样本量、质量和检查结果决定是否开放发布。',
    ['评测样本 + 系统检查结果', '你实现：build_release_report', '交付报告 → 发布面板'],
    '报告汇总引用、审批、恢复与评测，把六周各组件连接成完整的交付条件。',
    '30 条固定评测记录、三个系统检查结果和发布面板',
    `def release_inputs():
    rows = [{"passed": n < 24, "citation_valid": n < 27, "latency_ms": (n + 1) * 10, "cost": 1} for n in range(30)]
    checks = {"reproducible": True, "approval": True, "recovery": True}
    return rows, checks

def release_panel(report):
    return {"action": "允许发布" if report["ready"] else "继续修复", "p95_label": str(report["p95_latency_ms"]) + " ms"}`, 
    `    rows, checks = release_inputs()
    report = build_release_report(rows, checks)
    return {"report": report, "panel": release_panel(report)}`,
    { report: { count: 30, success_rate: 0.8, citation_rate: 0.9, p95_latency_ms: 290, total_cost: 30, ready: true }, panel: { action: '允许发布', p95_label: '290 ms' } }),
};

const scenarioMarker = '# === SCENARIO: 知识库助手 ===';

export function contextualizeCode(context: ChallengeContext, implementation: string): string {
  if (implementation.includes(scenarioMarker)) return implementation;
  return `${scenarioMarker}\n# ${context.title}\nimport json\n\n# --- 已提供：业务数据与上下游组件 ---\n${context.setup}\n\n# --- 你的任务：补全本节组件，保持函数接口 ---\n${implementation.trim()}\n\n# --- 已提供：完整调用流程；补全组件后可直接运行 ---\ndef run_scenario():\n${context.entry}\n\nif __name__ == "__main__":\n    print(json.dumps(run_scenario(), ensure_ascii=False, indent=2))\n`;
}
