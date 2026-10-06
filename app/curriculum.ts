import {codeChallenges} from './code-challenges';
export const checkedOn = '2026-10-07';
const docs = 'https://docs.langchain.com/';
export const sources = [
  {id:'learn',title:'LearnGraph · 中文实战教程',url:'https://www.learngraph.online/LearnGraph%201.X/README.html',kind:'中文教程',note:'学习模块 2–9、12–15；基础章节按需回顾。'},
  {id:'agent',title:'LangChain · Agent harness',url:docs+'oss/python/langchain/overview',kind:'官方文档',note:'create_agent 与框架分工。'},
  {id:'migrate',title:'LangChain · v1 迁移指南',url:docs+'oss/python/migrate/langchain-v1',kind:'版本校准',note:'校准旧教程中的 create_react_agent 与 hooks。'},
  {id:'tools',title:'LangChain · Tools',url:docs+'oss/python/langchain/tools',kind:'官方文档',note:'工具契约、ToolRuntime 与失败处理。'},
  {id:'output',title:'LangChain · Structured output',url:docs+'oss/python/langchain/structured-output',kind:'官方文档',note:'定义可验证的输出结构。'},
  {id:'middleware',title:'LangChain · Middleware',url:docs+'oss/python/langchain/middleware/overview',kind:'官方文档',note:'在执行循环中管理上下文与行为。'},
  {id:'graph',title:'LangGraph · Graph API',url:docs+'oss/python/langgraph/graph-api',kind:'官方文档',note:'状态、reducer、条件边、Send 与 Command。'},
  {id:'persist',title:'LangGraph · Persistence',url:docs+'oss/python/langgraph/persistence',kind:'官方文档',note:'线程 checkpoint 与跨线程 Store。'},
  {id:'interrupt',title:'LangGraph · Interrupts',url:docs+'oss/python/langgraph/interrupts',kind:'官方文档',note:'暂停、人工输入与恢复。'},
  {id:'memory',title:'LangGraph · Memory',url:docs+'oss/python/concepts/memory',kind:'官方文档',note:'记忆的作用域、更新与质量。'},
  {id:'stream',title:'LangGraph · Streaming',url:docs+'oss/python/langgraph/streaming',kind:'官方文档',note:'区分节点更新与消息流。'},
  {id:'rag',title:'Retrieval · 检索增强',url:docs+'oss/python/deepagents/retrieval',kind:'官方文档',note:'检索工具与上下文组织；当前官方页面位于 Deep Agents 文档。'},
  {id:'workflow',title:'LangGraph · Workflows & agents',url:docs+'oss/python/langgraph/workflows-agents',kind:'官方文档',note:'路由、并行、编排与评审模式。'},
  {id:'multi',title:'LangChain · Multi-agent',url:docs+'oss/python/langchain/multi-agent',kind:'官方文档',note:'协作模式与角色边界。'},
  {id:'subgraph',title:'LangGraph · Subgraphs',url:docs+'oss/python/langgraph/use-subgraphs',kind:'官方文档',note:'封装独立职责与转换状态。'},
  {id:'eval',title:'LangSmith · Evaluation',url:docs+'langsmith/evaluation',kind:'官方文档',note:'数据集、评估器与实验比较。'},
  {id:'deploy',title:'LangSmith · Deployment',url:docs+'langsmith/deployment',kind:'官方文档',note:'服务化与部署方案。'},
  {id:'learn-state',title:'LearnGraph · 3.1 State Schema',url:'https://www.learngraph.online/LearnGraph%201.X/module-3-state-reducer-memory/3.1%20State%20schema.html',kind:'中文教程',note:'用中文案例理解状态建模。'},
  {id:'learn-hitl',title:'LearnGraph · 4.2 动态中断',url:'https://www.learngraph.online/LearnGraph%201.X/module-4-human-in-the-loop/4.2%20Dynamic%20Breakpoints.html',kind:'中文教程',note:'示例接口请对照官方 interrupt 文档。'},
  {id:'learn-sub',title:'LearnGraph · 5.2 子图',url:'https://www.learngraph.online/LearnGraph%201.X/module-5-advanced-patterns/5.2%20Sub-Graph.html',kind:'中文教程',note:'父子图边界的中文补充。'},
  {id:'learn-rag',title:'LearnGraph · 13.1 Agentic RAG',url:'https://www.learngraph.online/LearnGraph%201.X/module-13-agentic-rag/13.1%20Introduction.html',kind:'中文教程',note:'高级检索工作流的案例入口。'},
];
export type Lesson={id:string;title:string;concept:string;exercise:string;checks:string[];refs:string[];tags:string[]};
export type Phase={week:number;title:string;subtitle:string;color:string;chapters:string;deliverable:string;lab:string;labChecks:string[];lessons:Lesson[]};
function L(id:string,title:string,concept:string,refs:string[],tags:string[]):Lesson{const challenge=codeChallenges[id];return{id,title,concept,exercise:challenge.scenario,checks:challenge.tests.map(test=>test.name),refs,tags}}
export const phases:Phase[]=[
 {week:1,title:'可靠的单 Agent',subtitle:'把工具调用变成可控的执行流程',color:'#7565df',chapters:'LearnGraph 2.4 / 15.1',deliverable:'v0.1 · 工具与结构化输出',lab:'在一个 Python 项目中完成文档查询、结果结构化和错误反馈。对正常查询、无结果和非法参数各准备一组输入，保存 trace 与输出。',labChecks:['三个工具边界用例有明确输出','回答包含 answer、source_ids、needs_clarification','记录调用次数与一条失败 trace'],lessons:[
 L('w1-1','重新理解 Agent 的执行循环','模型选择动作，工具返回结果，执行框架组织下一轮。先能解释一次 trace，再判断哪些步骤需要固定工作流。',['agent','migrate'],['create_agent','Tracing']),
 L('w1-2','工具契约与失败处理','为工具定义输入边界和可解释的返回值。区分可纠正的参数错误、暂时性失败和实现缺陷。',['tools'],['ToolRuntime','Schema']),
 L('w1-3','结构化输出与上下文','稳定字段让下游能够验证结果。只传任务需要的上下文，并保留消息与工具结果的关联。',['output','middleware'],['Pydantic','Context']),
 L('w1-4','Middleware 与观测基线','将横切行为放进 middleware。实验一次改变一个因素，记录质量、延迟与成本，建立可比较的基线。',['middleware','eval'],['Middleware','Baseline'])]},
 {week:2,title:'状态、路由与恢复',subtitle:'让工作流可以解释，也可以继续',color:'#278b86',chapters:'LearnGraph 3.1–3.3 / 2.5',deliverable:'v0.2 · 显式状态与 checkpoint',lab:'把助手拆成 classify、retrieve、answer 节点。加入知识查询与澄清分支，保存线程状态，并演示进程重启后的恢复。',labChecks:['两条路由能运行且可终止','两个 thread_id 互不混淆','持久化后端重启恢复成功'],lessons:[
 L('w2-1','State schema 与 reducer','状态表达任务事实；临时变量留在节点内部。默认更新覆盖，需要合并的字段应定义明确 reducer。',['graph','learn-state'],['StateGraph','Reducer']),
 L('w2-2','条件边与循环终止','路由依赖明确状态信号，循环必须有业务退出条件。递归限制作为最后保护。',['graph','workflow'],['Routing','Termination']),
 L('w2-3','Checkpoint 与 thread_id','checkpoint 保存某一线程的图状态。复用 thread_id 可延续任务，跨进程恢复需要持久化后端。',['persist'],['Checkpoint','Thread']),
 L('w2-4','重试、重放与幂等','恢复可能再次运行部分节点代码。外部写入要有业务幂等键，避免重复副作用。',['graph','persist'],['Retry','Idempotency'])]},
 {week:3,title:'人工审批与记忆',subtitle:'在关键动作前暂停，跨会话记住事实',color:'#c28031',chapters:'LearnGraph 4.2–4.6 / 6.1–6.4',deliverable:'v0.3 · 审批与用户偏好',lab:'为保存知识增加人工审批，支持批准、拒绝、编辑。用 Store 保存偏好，在新线程与另一个用户下验证作用域。',labChecks:['批准、拒绝、编辑三条路径通过','审批前不执行需审批的写入','记忆按用户 namespace 隔离'],lessons:[
 L('w3-1','interrupt 与 Command 恢复','在关键动作前暂停，用相同线程和 Command(resume=...) 恢复。中断所在节点可能从开头重新运行。',['interrupt','learn-hitl'],['interrupt','Command']),
 L('w3-2','编辑、拒绝与审计','审批输入也需要校验。决策与执行内容要可追踪；编辑后应使用修改后的内容。',['interrupt','graph'],['HITL','Audit']),
 L('w3-3','短期与长期记忆','线程状态维持当前任务；Store 保存跨线程应用数据。定义记忆的用户边界、更新条件与删除策略。',['memory','persist'],['Store','Namespace']),
 L('w3-4','消息压缩与记忆质量','压缩保留任务所需信息；长期记忆只写已确认事实。用更正和未确认信息测试质量。',['memory','middleware'],['Summarization','Memory'])]},
 {week:4,title:'Agentic RAG',subtitle:'让每个回答都有可追溯的证据',color:'#5b79c8',chapters:'LearnGraph 13.1–13.11 / 8.3',deliverable:'v0.4 · 引用与检索纠错',lab:'用自己的 20 篇技术笔记建立检索库。固定 30 个问题，对比基础检索与一次查询改写，报告正确率、引用有效率、延迟与成本。',labChecks:['引用可定位到原文片段','无证据会拒答或澄清','改写有上限，比较使用同一测试集'],lessons:[
 L('w4-1','建立检索基线','先独立检验切分、索引和检索，再加入 Agent 决策。保留文档来源与片段标识。',['rag','learn-rag'],['Chunking','Retrieval']),
 L('w4-2','把检索变成图','显式表达检索、证据检查与回答，把证据是否充足变成可测试的路由条件。',['workflow','learn-rag'],['Agentic RAG','Evidence']),
 L('w4-3','查询改写与有界纠错','改写可能提升召回，也会增加延迟。固定输入，记录新增证据是否真的帮助回答。',['workflow','learn-rag'],['Query rewrite','Fallback']),
 L('w4-4','引用、拒答与检索评测','分别评测检索和答案。无答案、冲突和文档中的不可信指令都要专项测试。',['rag','eval'],['Citation','Evaluation'])]},
 {week:5,title:'多 Agent 与子图',subtitle:'用明确的职责边界降低复杂度',color:'#9767b6',chapters:'LearnGraph 5.1–5.4 / 9.4 / 12',deliverable:'v0.5 · 检索与审阅协作',lab:'让检索与审阅 Agent 协作，失败最多修订一次。和单 Agent 比较质量、延迟与 token，用结果决定是否保留多 Agent 架构。',labChecks:['角色有明确输入输出','修订受控，不无限互相调用','报告收益与额外成本'],lessons:[
 L('w5-1','先判断是否需要多 Agent','分工应解决具体的职责或上下文问题。保留单 Agent 基线，用实验判断额外复杂度是否值得。',['multi'],['Architecture','Tradeoffs']),
 L('w5-2','子图与状态边界','子图封装独立流程；边界只传必要字段。schema 不同时显式转换输入输出。',['subgraph','learn-sub'],['Subgraph','Schema']),
 L('w5-3','并行、Send 与结果合并','独立任务可以并行，动态任务可以分发。合并结果时定义去重、顺序和部分失败策略。',['graph','workflow'],['Send','Map-reduce']),
 L('w5-4','协作协议与评审循环','传递可验证结果和证据，评审反馈要指向具体问题。修订次数必须受控。',['multi','eval'],['Reviewer','Protocol'])]},
 {week:6,title:'评测、流式与交付',subtitle:'用证据证明你的系统可以使用',color:'#518069',chapters:'LearnGraph 7 / 8.1 / 15',deliverable:'v1.0 · 可复现的完整项目',lab:'提交源码、锁定依赖、运行说明、30 题评测报告、审批与恢复演示和架构决策。先声明目标，再运行验收。',labChecks:['新环境能按 README 运行','报告成功率、引用有效率、p95 延迟与成本','展示故障恢复与审批'],lessons:[
 L('w6-1','离线评测与失败分类','固定数据集与评分规则才能比较迭代。为检索、工具、回答和审批分别定义指标。',['eval'],['Dataset','Evaluator']),
 L('w6-2','流式输出与运行状态','分别观察节点更新与模型消息。界面要区分运行、待审批、失败和最终完成。',['stream'],['Streaming','Run state']),
 L('w6-3','部署与并发边界','把配置与代码分离，明确用户、线程和请求之间的关系。定义持久化与请求限制。',['deploy','persist'],['Deployment','Concurrency']),
 L('w6-4','项目验收与架构复盘','可复现的交付包含演示、指标和决策。用测量证据解释保留哪些架构复杂度。',['eval','deploy'],['Delivery','Retrospective'])]}
];
export const allLessons=phases.flatMap(p=>p.lessons);
export const sourceById=(id:string)=>sources.find(s=>s.id===id)!;
export const quizzes=[
 {week:0,q:'工具调用由谁生成，工具由谁执行？',options:['模型生成意图，框架运行工具','模型直接运行 Python','工具决定全部后续步骤'],answer:0,why:'模型输出工具名和参数，框架执行并把结果送回循环。',ref:'agent'},
 {week:0,q:'要实现确定性的审批和恢复，应优先掌握什么？',options:['仅调整提示词','显式状态、编排与 checkpoint','默认拆成多个 Agent'],answer:1,why:'显式状态和编排让审批与恢复可以解释、验证。',ref:'graph'},
 {week:0,q:'怎样证明已掌握基础？',options:['记住导入路径','读完最多文章','独立运行工具与分支示例并解释 trace'],answer:2,why:'可运行结果与解释能力比阅读数量更能证明掌握。',ref:'learn'},
 {week:1,q:'查询工具持续超时，合理策略是什么？',options:['无限重试','有界重试后返回明确失败','伪造一个结果'],answer:1,why:'失败可观测，重试受限；参数错误和暂时失败应分别处理。',ref:'tools'},
 {week:1,q:'结构化输出最直接解决什么？',options:['保证事实正确','替代评测','让下游读取并校验稳定字段'],answer:2,why:'结构保证字段可解析，事实正确仍需证据和评测。',ref:'output'},
 {week:2,q:'并行节点向列表写结果，应如何建模？',options:['定义合并 reducer','默认都自动追加','返回整个旧列表再拼接'],answer:0,why:'合并由 reducer 定义，旧状态重复追加会导致重复数据。',ref:'graph'},
 {week:2,q:'InMemorySaver 能在进程重启后恢复吗？',options:['总能','不能，需要持久化后端','thread_id 足够长就能'],answer:1,why:'内存保存器只适合实验；跨进程恢复需要持久化 checkpoint。',ref:'persist'},
 {week:3,q:'interrupt 恢复时，所在节点可能怎样运行？',options:['从节点开头重新运行','只执行 return','自动撤销所有副作用'],answer:0,why:'中断前代码应可重放，需要审批的动作放在批准之后。',ref:'interrupt'},
 {week:3,q:'跨线程的用户偏好放在哪里？',options:['仅放当前 messages','所有用户共用提示词','按用户 namespace 放入 Store'],answer:2,why:'Store 管跨线程信息，namespace 建立用户边界。',ref:'persist'},
 {week:4,q:'一次查询改写后仍没有证据，应如何结束？',options:['无限改写','澄清或拒答','编造来源编号'],answer:1,why:'设计有界纠错和证据不足的退出路径。',ref:'learn-rag'},
 {week:4,q:'引用有效率应该检查什么？',options:['来源存在且支持断言','编号看起来专业','答案越长越好'],answer:0,why:'有编号不代表有依据；验证来源与支持关系。',ref:'eval'},
 {week:5,q:'什么时候考虑多个 Agent？',options:['所有任务默认拆分','职责边界解决具体问题且实验有收益','为了画复杂的图'],answer:1,why:'先保留单 Agent 基线，再测量收益与成本。',ref:'multi'},
 {week:5,q:'父子图 schema 不同，怎样连接？',options:['假设自动共享','传入全部信息','边界显式转换输入输出'],answer:2,why:'清晰转换减少耦合，让输入输出便于验证。',ref:'subgraph'},
 {week:6,q:'怎样公平比较两版系统？',options:['固定数据集与一致评分','选择不同最佳示例','只报告最佳结果'],answer:0,why:'一致输入与规则才能识别真实改善。',ref:'eval'},
 {week:6,q:'流式界面最需要区分什么？',options:['仅字符颜色','中间更新、待审批与最终结果','仅 token 数'],answer:1,why:'运行状态与最终回答分开，避免误把中间更新当成结论。',ref:'stream'}
];
export const approvalCode=`# Python 3.10+; pip install "langgraph>=1,<2"
# 无需模型或 API Key；内存 checkpoint 只用于演示。
from typing import TypedDict
from langgraph.graph import StateGraph, START, END
from langgraph.types import interrupt, Command
from langgraph.checkpoint.memory import InMemorySaver

class State(TypedDict):
    draft: str
    approved: bool
    result: str

def review(state: State):
    decision = interrupt({"draft": state["draft"]})
    if not isinstance(decision, bool):
        raise ValueError("审批结果必须是 bool")
    return {"approved": decision}

def finish(state: State):
    # 模拟结果；没有执行任何真实外部写入。
    return {"result": "已批准" if state["approved"] else "已拒绝"}

builder = StateGraph(State)
builder.add_node("review", review)
builder.add_node("finish", finish)
builder.add_edge(START, "review")
builder.add_edge("review", "finish")
builder.add_edge("finish", END)
graph = builder.compile(checkpointer=InMemorySaver())
config = {"configurable": {"thread_id": "approval-demo"}}
paused = graph.invoke({"draft": "保存一条知识"}, config)
assert "__interrupt__" in paused
print("待审批：", paused["__interrupt__"])
result = graph.invoke(Command(resume=True), config)
assert result["result"] == "已批准"
print(result["result"])
`;
