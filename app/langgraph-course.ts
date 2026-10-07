import type { Lesson, Phase } from './curriculum';
import { langgraphChallenges } from './langgraph-challenges.ts';
const official='https://docs.langchain.com/oss/python/langgraph/';
const learn='https://www.learngraph.online/LearnGraph%201.X/';
const source=(id:string,title:string,url:string,kind:string,note:string)=>({id,title,url,kind,note});
export const langgraphSources=[
  source('lg-overview','LangGraph · Overview',official+'overview','官方文档','从最小图开始，理解图运行时与 Agent 框架的分工。'),
  source('lg-use','LangGraph · Use the Graph API',official+'use-graph-api','官方文档','顺序、条件边、循环、Send、Command、异步、重试与缓存。'),
  source('lg-quick','LangGraph · Quickstart',official+'quickstart','官方文档','消息与模型—工具循环；本课先使用固定模型动作。'),
  source('lg-check','LangGraph · Checkpointers',official+'checkpointers','官方文档','线程、快照、历史、持久化后端与恢复。'),
  source('lg-store','LangGraph · Stores',official+'stores','官方文档','跨线程数据的 namespace、键与 Runtime.store。'),
  source('lg-time','LangGraph · Time travel',official+'use-time-travel','官方文档','从指定历史快照修改状态并创建新分支。'),
  source('lg-functional','LangGraph · Functional API',official+'functional-api','官方文档','entrypoint、task、任务结果复用与中断恢复。'),
  source('lg-add-memory','LangGraph · Add memory',official+'add-memory','官方文档','实际添加线程记忆、数据库后端与长期记忆。'),
  source('lg-structure','LangGraph · Application structure',official+'application-structure','官方文档','图入口、依赖声明、langgraph.json 与目录结构。'),
  source('lg-test','LangGraph · Test',official+'test','官方文档','用固定输入、独立 checkpointer 与测试夹具验证图。'),
  source('lg-local','LangSmith · Local development & testing','https://docs.langchain.com/langsmith/local-dev-testing','官方文档','本地服务与 Studio；环境及凭据要求以当前官方说明为准。'),
  source('learn-basics','LearnGraph · 1.4 LangGraph basics',learn+'module-1-langgraph-basics/1.4%20LangGraph%20basics.html','中文教程','基础概念导读；接口对照本课固定版本和官方资料。'),
  source('learn-simple','LearnGraph · 2.1 Simple graph',learn+'module-2-agent-chain-router/2.1%20Simple%20graph.html','中文教程','用状态、节点和边串起第一个图。'),
  source('learn-reducer','LearnGraph · 3.2 Reducers',learn+'module-3-state-reducer-memory/3.2%20Reducers.html','中文教程','理解更新覆盖、累积与按 ID 合并。'),
  source('learn-schema','LearnGraph · 3.3 Multiple Schemas',learn+'module-3-state-reducer-memory/3.3%20Multiple%20Schemas.html','中文教程','输入、内部状态和输出之间的边界。'),
  source('learn-time','LearnGraph · 4.5 Time Travel',learn+'module-4-human-in-the-loop/4.5%20Time%20Travel.html','中文教程','使用历史状态调试新的执行路径。'),
  source('learn-parallel','LearnGraph · 5.1 Parallelization',learn+'module-5-advanced-patterns/5.1%20Parallelization.html','中文教程','并行分支、reducer 与汇合节点。'),
  source('learn-map','LearnGraph · 5.3 Map-Reduce',learn+'module-5-advanced-patterns/5.3%20Map-Reduce.html','中文教程','动态任务分发与结果归并。'),
  source('learn-store','LearnGraph · 6.2 Memory Store',learn+'module-6-memory-system/6.2%20Memory%20Store.html','中文教程','跨会话保存和读取用户偏好。'),
  source('learn-command','LearnGraph · 11.5 Command',learn+'module-11-subgraph-mermaid-mcp-agent-node-tool/11.5%20Command.html','中文教程','状态更新、跳转与父图交接。'),
  source('learn-deploy','LearnGraph · 7.1 Creating Deployment',learn+'module-7-production-deployment/7.1%20Creating%20Deployment.html','中文教程','部署导读；配置与凭据要求对照官方文档。'),
  source('lg-academy','LangChain Academy · 官方课程源码','https://github.com/langchain-ai/langchain-academy','专业课程','配合原始 notebook 做状态、记忆、审批与部署实验。'),
  source('hf-graph','Hugging Face · Agents Course / LangGraph','https://huggingface.co/learn/agents-course/unit2/langgraph/introduction','专业课程','复习图构件与 Agent 工作流，运行前核对依赖版本。'),
];

type Topic={concept:string;refs:string[];tags:string[];reading:[string,string][]};
const topics:Topic[]=[
  {concept:'用 StateGraph、START、END、节点更新和 compile 构建真正可执行的顺序图。',refs:['lg-overview','graph','learn-basics','learn-simple','hf-graph'],tags:['基础','StateGraph','compile'],reading:[
    ['从构建器到运行对象','StateGraph 描述图；add_node 注册函数，add_edge 表达先后关系，compile 产生可 invoke 的对象。清理查询、生成回答和最终结果是不同阶段。用固定函数理解执行顺序后，再在节点中接入模型。'],
    ['节点只提交自己的更新','查看已提供的 normalize 与 answer：输入是当前状态，返回值是局部更新。将 START → normalize → answer → END 连起来，确认空白被清理，输入对象没有被原地修改，并检查返回对象是 CompiledStateGraph。'],
    ['自己的第一次图实验','画出图并记录一次输入、每个节点的更新和最终输出。在 answer 节点换成自己的笔记函数，保持图结构和验收不变。模型不是运行最小图的必要条件。']]},
  {concept:'区分 Input、内部 State 和 Output，让调试数据留在工作流内部。',refs:['graph','learn-schema','lg-use'],tags:['基础','TypedDict','Schema'],reading:[
    ['字段属于哪个边界','query 是调用者输入，debug 是内部诊断，answer 是公开输出。定义独立 schema，向 StateGraph 传 input_schema 和 output_schema。TypedDict 描述类型；严格校验外部请求时另设验证层。'],
    ['观察输出过滤','对同一输入比较 invoke 结果与节点更新流：debug 能出现在内部更新，却不应出现在公开输出。不要把私有状态全部复制到服务响应里。验收分别检查公开字段和内部诊断。'],
    ['扩展实验','增加内部检索分数字段，确认公开接口不变。为状态、日志、缓存和 API 响应分别确定所需字段，再写一条防止意外泄漏的测试。']]},
  {concept:'使用 Annotated 指定 reducer，正确区分覆盖更新与累积更新。',refs:['graph','learn-reducer','lg-use'],tags:['基础','Annotated','Reducer'],reading:[
    ['合并是字段的规则','本例 log 使用 operator.add，将两个节点新增记录追加到 seed 后；普通字段采用覆盖更新。reducer 是运行时的状态合并规则，节点无需手动拼接已有列表。'],
    ['为什么旧记录会重复','如果节点先返回旧列表加新记录，追加 reducer 又会把旧项合并一次。clean 和 retrieve 只返回自己的新增记录，分别用空列表和已有记录验证没有重复。'],
    ['业务上的合并选择','日志追加、集合去重和按 ID 更新需要不同 reducer。追加顺序不应替代业务时间；带稳定 ID 和序号的事件更容易审计。用小输入先解释规则，再放进并行图。']]},
  {concept:'通过条件边组织澄清、检索重试和兜底，循环必须有业务上限。',refs:['lg-use','workflow','lg-academy'],tags:['基础','Conditional edges','Loop'],reading:[
    ['先定义出口','空查询进入 clarify，找到 graph 证据则回答，其他查询最多检索两次后拒答。把 found 与 attempts 放进状态，路由函数据此返回下一节点，避免隐藏无限循环。'],
    ['业务预算与递归限制','尝试次数决定用户会看到的结果，recursion_limit 是运行时最后保护，二者不能互相替代。避免同一节点配置相互冲突的静态边和条件边。验收涵盖三个出口。'],
    ['追踪一次失败','打印每次检索 attempts，解释最后为何进入兜底。把相同预算原则迁移到模型修订流程，增加始终失败输入，确认仍然能够终止。']]},
  {concept:'用 MessagesState 与消息 ID 合并真实消息，理解追加和替换。',refs:['lg-quick','graph','lg-add-memory'],tags:['基础','MessagesState','add_messages'],reading:[
    ['消息有结构','HumanMessage、AIMessage、ToolMessage 包含角色、ID 与工具调用。MessagesState 的 reducer 合并消息更新；固定 ID 为 answer-1 时，更新应替换对应旧回答。'],
    ['验收合并行为','新 ID 表示新增消息，相同 ID 更新已有消息。给图一条旧回答再运行 respond，确认用户消息保留、回答被替换且不重复。人工编辑历史同样需要正确 ID。'],
    ['接入模型之前','固定回复无需 API Key；项目可替换为模型生成的 AIMessage。保留角色与调用结构，裁剪历史时维护工具请求和结果配对，不随意把所有消息转成字符串。']]},
  {concept:'组合 ToolNode 与 tools_condition，执行真实的模型—工具—模型图循环。',refs:['lg-quick','lg-use','tools'],tags:['基础','ToolNode','Tool calling'],reading:[
    ['工具怎么进入图','固定 agent 返回带 tool_calls 的 AIMessage；lookup_note 是有类型和说明的工具。ToolNode 执行调用并返回 ToolMessage，tools_condition 根据最后消息选择工具节点或结束。'],
    ['正确连接与关联','连接 START → agent、agent 的条件出口和 tools → agent。tool_call_id 与请求 ID 必须一致；检查四条消息的完整序列，最终回答后不能再执行工具。'],
    ['替换固定 agent','接入绑定工具的聊天模型时保留图结构，继续测试工具错误与终止行为。先验证执行循环，再评估模型决策的质量，本节无需购买模型服务。']]},
  {concept:'通过 context_schema 和 Runtime 注入用户身份、资源与配置。',refs:['lg-use','lg-store'],tags:['基础','Runtime','Context'],reading:[
    ['状态与上下文有不同职责','查询与回答在节点之间更新，用户身份和依赖由调用者传 context。定义 Context 数据类，通过 Runtime[Context] 和 runtime.context 读取 user_id；连接对象不应存到 checkpoint。'],
    ['复用图但隔离用户','alice 与 bob 的笔记不同。复用编译图，分别传入两个 context，确认身份没有泄漏到公开输出，另一个用户也不会拿到前一用户的结果。'],
    ['服务中的身份','服务端从已认证会话确定用户，再构造 context。context 不会替代身份认证；数据库客户端和模型配置也可用同样方法注入，使节点便于独立测试。']]},
  {concept:'区分 updates、values、消息与自定义事件，让界面知道当前运行状态。',refs:['stream','lg-use'],tags:['基础','stream','Updates'],reading:[
    ['选择事件语义','本节用 graph.stream(..., stream_mode="updates") 收集节点局部更新。values 展示完整状态，模型消息流则用于逐 token 输出。中间更新不代表最终任务已经完成。'],
    ['输出可消费事件','collect_updates 返回 node 和 update。验收检查 normalize、answer 的顺序和字段，防止把全部事件拍平成最终回答。异常、待审批和最终完成应有各自的界面状态。'],
    ['继续到当前接口','官方文档还介绍消息、自定义数据与新版事件接口。本课先掌握固定版本的同步 stream，周项目再加入异步消费、断开连接与取消，按需要选择事件形式。']]},
  {concept:'加入 InMemorySaver，用 thread_id 延续状态并检查 checkpoint 历史。',refs:['lg-check','persist','lg-add-memory'],tags:['进阶','Checkpoint','Thread'],reading:[
    ['同一线程继续执行','compile 时注入 checkpointer，invoke 配置 configurable.thread_id。total 用加法 reducer，同一线程依次输入 delta=2 和 3 得到 5；另一个线程从自己的状态开始。'],
    ['直接查看快照','用 get_state 查看 values、next、metadata，用 get_state_history 查看历史。线程 ID 是恢复定位信息；一次请求 ID 与持久会话线程 ID 应有明确关系。'],
    ['内存后端的范围','InMemorySaver 适合实验，进程退出后不保留数据。保存配置与快照记录，下一节换 SQLite，比较业务行为相同而生命周期不同的两种后端。']]},
  {concept:'通过 SQLite checkpointer，在关闭并重新打开后端后延续真实线程。',refs:['lg-check','lg-add-memory','persist'],tags:['进阶','SQLite','Persistence'],reading:[
    ['连接有生命周期','SqliteSaver 来自 checkpoint-sqlite 包，使用 from_conn_string 上下文管理器关闭连接。图通过参数接受 saver，使编排逻辑不绑定固定数据库路径。'],
    ['验证重新打开','首次写 delta=4 后关闭连接，再打开同一文件写 delta=3，结果应为 7。测试使用独立临时文件，不让前一组线程状态污染后一组。周项目再做独立进程重启。'],
    ['选择生产后端','多人服务按官方后端文档确定数据库、初始化方式和连接管理。SQLite 教学结果能证明保存与重新打开，服务容量需要独立测量与验证。']]},
  {concept:'用 interrupt 暂停审阅，用 Command 恢复经过校验的批准、拒绝或编辑。',refs:['interrupt','learn-hitl','learn-command'],tags:['进阶','HITL','Command'],reading:[
    ['暂停在写入之前','review 把 draft 交给 interrupt，首次执行返回中断信息，待批准写入为空。恢复用同一线程和 Command(resume=...)，提交 approved 与编辑后的 draft。'],
    ['校验决策并保留证据','approved 必须为布尔值，字符串 "yes" 不合法。批准后 commit 使用编辑内容，拒绝直接结束。验收分别检查暂停、编辑、拒绝与非法恢复输入。'],
    ['恢复会重放节点','中断节点可能从开头重新执行。中断前代码应能重复，外部写入使用业务幂等键或事务，记录决策与实际内容，不能靠按钮只点击一次保证没有重复。']]},
  {concept:'从历史 checkpoint 更新状态并分叉，保留旧执行结果。',refs:['lg-time','learn-time','lg-check'],tags:['进阶','Time travel','Replay'],reading:[
    ['选择正确的分叉点','在 get_state_history 找到 next 指向 answer 的快照，保留它的 config。update_state 写 new_query，as_node 指明更新来自 normalize，再从返回配置继续执行。'],
    ['历史不会自动消失','比较原完成结果和新分支，旧查询的快照仍存在。后续节点重放可能再次发起网络请求或外部写入，需要记录成本并保护副作用。'],
    ['让调试可解释','在同一检索快照上尝试两种回答策略，保存 checkpoint_id 和结果差异。周项目展示历史分支和恢复，避免随意改当前线程后无法解释实验条件。']]},
  {concept:'理解 super-step 并行、共享字段 reducer 与多个分支的汇合。',refs:['lg-use','learn-parallel','workflow'],tags:['高阶','Parallel','Super-step'],reading:[
    ['独立分支共享规则','lookup 与 policy 从 START 启动，都向 flags 写新增记录，用追加 reducer 合并。结果需要显式顺序时进行排序，不依赖任务完成速度。'],
    ['汇合依赖明确表达','add_edge(["lookup","policy"],"join") 表示等待两个前置节点。测试两份贡献、join 的答案与执行次数，避免先完成的分支过早触发业务写入。'],
    ['观察故障与恢复','阅读 checkpoint 的 pending writes，再注入一个分支故障观察恢复。super-step 是批次执行边界；性能收益用并发计数和耗时证明，不能只根据图形判断。']]},
  {concept:'使用 Send 动态分发工作项，通过 reducer 汇总为稳定输出。',refs:['lg-use','learn-map'],tags:['高阶','Send','Map-reduce'],reading:[
    ['工作项数量来自输入','每个文档生成 Send("measure", {index,text})，工作节点只处理自己的输入。results 累积后由 summarize 按原 index 排序，完成速度不会改变业务输出顺序。'],
    ['空任务也有出口','空列表直接进入 summarize，返回空结果。测试空文本、多文档和重复文本，用稳定 index 区分内容相同的任务，确认没有丢失或重复。'],
    ['扩展到批量检索','将 measure 换成检索或评审，记录任务 ID 并限制外部服务并发。动态分发解决规模变化，去重、预算和部分失败策略仍需要应用显式定义。']]},
  {concept:'接入真实编译子图，在父图与子图不同 schema 之间转换字段。',refs:['subgraph','learn-sub','lg-use'],tags:['高阶','Subgraph','Schema boundary'],reading:[
    ['两个图有不同字段','父图使用 topic/result，子图使用 question/answer。包装节点转换输入、调用 child.invoke，再转换输出，父图无需了解子图内部节点。'],
    ['验证子图可替换','验收注入不同回答前缀的 child，确认真实调用并返回正确结果。子图内部字段不应混入父图公开输出；边界同时约束数据与职责。'],
    ['继续学习子图恢复','阅读 checkpointer 继承与子图状态查看方式。周项目加一次子图中断，说明父图怎样暂停与恢复，以及每次独立调用和多轮会话的持久化需求。']]},
  {concept:'通过 Command.PARENT 更新共享状态，把控制权交回父图。',refs:['lg-use','learn-command','subgraph'],tags:['高阶','Command.PARENT','Handoff'],reading:[
    ['同时更新与跳转','handoff 返回 Command(update=...,goto="finish",graph=Command.PARENT)，父图 finish 处理结果。子图注册时明确本图目标，父图跳转由 Command 指定，避免多条出口造成重复执行。'],
    ['共享字段的合并','父子图 notes 使用明确 reducer。先检查返回 Command 的目标与更新，再运行真实父子图，确认子图记录只出现一次、最终答案由父图生成。'],
    ['形成交接协议','多 Agent 交接需要任务、证据与状态，不能无限转发历史。限制交接次数并定义终止条件，用实际质量和成本比较单图方案。']]},
  {concept:'用 entrypoint/task 组织函数式工作流，观察实际任务结果与事件。',refs:['lg-functional','lg-academy'],tags:['高阶','Functional API','Task'],reading:[
    ['普通函数也能组织流程','清理与检索定义为 @task，在 @entrypoint 内提交任务并取 .result()。Functional API 与 Graph API 都使用图运行时，用不同代码组织方式表达执行。'],
    ['给任务清楚边界','invoke 检查结果，stream 检查任务名。可复用或有副作用的步骤需要独立边界；不要把所有工作藏进一个大函数。异步调用使用相应接口而非阻塞取结果。'],
    ['选择合适表达方式','复杂分支可以用图式表达，已有命令式逻辑可尝试函数式表达。把同一个流程各写一次，对比测试、调试和暂停能力，而不是只比较行数。']]},
  {concept:'编写异步节点，用 ainvoke 与 asyncio.gather 并发等待独立 I/O。',refs:['lg-use','stream'],tags:['高阶','Async','ainvoke'],reading:[
    ['依赖和节点一起异步','fetch 是异步函数，节点用 asyncio.gather，外部 await graph.ainvoke。避免在异步节点里调用阻塞网络库；同步执行和异步执行应保持清楚的入口。'],
    ['通过行为验证并发','测试活动调用的峰值为 2，不仅依赖波动较大的耗时。空列表返回空结果；fetch 的 ValueError 应传播，不能静默改成成功输出。'],
    ['给 I/O 设置边界','正式服务用信号量限制并发，配置超时并处理取消。有事件循环的应用直接 await，本地独立脚本才使用 asyncio.run 启动顶层循环。']]},
  {concept:'使用 Runtime.store 与用户 namespace 保存已确认偏好，跨线程读取。',refs:['lg-store','learn-store','lg-add-memory'],tags:['高阶','Store','Namespace'],reading:[
    ['长期记忆的地址','使用 (user_id,"preferences") namespace 与 profile 键，通过 runtime.store 读写。只写 confirmed 为真的事实，未知用户返回默认值，不把线程状态当成跨会话数据库。'],
    ['验证作用域','alice 保存中文偏好后，新图或新线程从同一 Store 读取；bob 保持默认值。未确认输入不得覆盖已确认事实，验收检查写入值与返回值。'],
    ['从内存到持久化','InMemoryStore 用于教学，长期服务选择持久化 Store。身份由认证用户确定，应用定义更正、删除和过期规则；用户隔离不能只靠调用者随意提交 ID。']]},
  {concept:'把中断前副作用封装为 task，验证恢复复用已经完成的任务结果。',refs:['lg-functional','interrupt','lg-check'],tags:['高阶','Durable execution','Idempotency'],reading:[
    ['定义可恢复步骤','先执行 prepare_event task，再 interrupt 请求确认。使用 checkpointer 的 entrypoint，恢复时复用已完成任务结果，测试调用计数确认这一恢复路径没有重复准备。'],
    ['稳定的恢复路径','保持任务和中断次序稳定，用相同 thread_id 恢复，避免随机分支改变重放顺序。两个线程各执行自己的准备步骤；测试批准值和线程隔离。'],
    ['仍需业务幂等','任务结果复用不保证外部写入恰好一次。写入成功而结果尚未保存时崩溃，恢复可能重复写入。外部服务采用幂等键或事务，周项目演示这一故障窗口。']]},
  {concept:'用真实图组织检索、改写、引用和拒答，证据不足时有界退出。',refs:['workflow','learn-rag','lg-use'],tags:['高阶','Agentic RAG','Evidence'],reading:[
    ['把质量决策放入图','retrieve 更新 doc_id，路由进入 answer 或 rewrite。graphs 可改成 graph 一次，再失败则拒答。先用固定笔记验证编排，再替换成真实索引和模型。'],
    ['引用要对应证据','命中回答包含来源 ID，没有证据不能伪造编号。验收覆盖直接命中、改写命中、预算耗尽与空查询，保留原查询与改写次数方便比较收益。'],
    ['自己的检索项目','以 20 篇笔记与固定问题集替换检索模块，分别评价召回、回答和引用支持关系。加入不可信文档内容的处理，报告失败类别而不只给总成功率。']]},
  {concept:'构建 evaluator–optimizer 图，评审修订有明确预算和失败出口。',refs:['workflow','multi','eval'],tags:['高阶','Reviewer','Bounded revision'],reading:[
    ['反馈推动修订','reviewer 返回 passed，失败时 revise 添加缺失引用再回评审。最多修订一次，仍失败输出 needs_review，不把未达标结果写成 accepted。'],
    ['注入评审器便于测试','分别使用首轮成功、第二轮成功和始终失败的 reviewer。固定实现避免模型随机性掩盖边和状态问题，保留每次评审依据与最终状态。'],
    ['比较真实收益','接入评审模型时记录 token、延迟、修订次数和质量，保留无评审基线。约束评审可改字段并处理解析失败，用可验证结果决定是否保留复杂度。']]},
  {concept:'使用 RetryPolicy 与 CachePolicy，限制短暂失败重试并隔离缓存作用域。',refs:['lg-use','lg-test'],tags:['高阶','RetryPolicy','CachePolicy'],reading:[
    ['只重试约定错误','节点最多尝试 3 次，只重试 TimeoutError，ValueError 直接失败。测试后端前两次超时、第三次成功，精确检查次数，不吞掉实现缺陷。'],
    ['缓存键包含结果作用域','key_func 同时编码 user_id 和 query，CachePolicy 指定 TTL，compile 注入 InMemoryCache。同用户复用，不同用户重新计算，用户相关结果不能只按文本缓存。'],
    ['三种机制不同目的','缓存减少重复计算，重试处理短暂错误，checkpoint 支持恢复。为外部 I/O 加超时与幂等，观察缓存命中、陈旧结果和失败次数，再调整参数。']]},
  {concept:'运行固定数据集评测真实图，完成图入口、应用配置和部署验收。',refs:['lg-test','eval','lg-structure','lg-local','deploy','learn-deploy','lg-academy'],tags:['高阶','Evaluation','Deployment'],reading:[
    ['每条样本独立执行','evaluate_graph 调用真实 graph.invoke，使用 eval:<id> 区分线程，对比 expected。异常样本加入 failures 而其他样本继续；空集成功率为 0，重复 ID 在执行前拒绝。'],
    ['组织可交付应用','导出 agent.py:graph，准备依赖、langgraph.json、环境变量示例和 README。按官方本地开发文档启动服务，验证入口、线程与中断；凭据和环境要求以当前文档为准。'],
    ['提交工程证据','固定 30 条样本，报告失败分类、质量和 p95 延迟；演示两个用户、两个线程、重启恢复、审批与一次故障。检查日志和持久化配置，按部署目标选择服务方案。']]},
];
const weeks=[
  {title:'LangGraph 基础与图建模',subtitle:'从真实 StateGraph 开始，掌握状态、节点、边与循环',color:'#7565df',chapters:'LearnGraph 1.4 / 2.1 / 3.1–3.3 · 官方 Graph API',deliverable:'LG v0.1 · 真正可执行的工作流',lab:'建立独立 Python 环境，把清理、检索与回答编译成真实图。提供输入/输出 schema、累积日志、澄清与有界兜底，保存图形和三条路径记录。',labChecks:['使用真实 StateGraph，新环境可运行','空查询、命中与兜底均可终止','解释 reducer 合并与输出过滤']},
  {title:'消息、工具与运行时',subtitle:'运行真实工具循环，并将节点事件提供给界面',color:'#278b86',chapters:'LearnGraph 2 · 官方 Quickstart、Runtime、Streaming',deliverable:'LG v0.2 · 工具 Agent 与事件流',lab:'用 MessagesState、ToolNode 与条件边构建工具 Agent，先用固定模型动作，再可选接入模型。Runtime 注入用户配置，展示节点更新、消息和最终完成状态。',labChecks:['工具请求和结果 ID 对应','两个用户上下文不串用','展示 updates 与明确的最终状态']},
  {title:'持久化、审批与时间旅行',subtitle:'让真实图可以暂停、重启和从历史状态分叉',color:'#c28031',chapters:'LearnGraph 4 · 官方 Checkpointers、Interrupts、Time travel',deliverable:'LG v0.3 · 可恢复的审批助手',lab:'把内存 checkpoint 换成持久化后端，实现批准、拒绝与编辑。以独立进程重启验证恢复，从历史快照创建新回答分支，为外部写入加入幂等保护。',labChecks:['独立进程重启后延续线程','审批前没有待批准写入','历史快照保留且副作用有幂等键']},
  {title:'并行、动态分发与子图',subtitle:'掌握 super-step、Send、状态转换与父图交接',color:'#5b79c8',chapters:'LearnGraph 5 / 11.5 · 官方 Graph API、Subgraphs',deliverable:'LG v0.4 · 可组合的并行流水线',lab:'并行检索和策略检查，用 Send 分发文档任务。将审阅封装为不同 schema 子图，以边界转换或 Command.PARENT 回传结果，检查汇合、顺序和故障路径。',labChecks:['并行共享字段有 reducer','空任务和乱序完成汇总稳定','真实子图可替换且边界有测试']},
  {title:'函数式、异步与长期记忆',subtitle:'组织可恢复任务，控制异步 I/O 并隔离用户记忆',color:'#9767b6',chapters:'LearnGraph 6 · 官方 Functional API、Stores、异步图',deliverable:'LG v0.5 · 可恢复的记忆工作流',lab:'用 entrypoint/task 组织流程并加入中断。异步节点并发检索，Store 按用户隔离；用计数和故障注入验证恢复，说明外部副作用的幂等策略。',labChecks:['恢复复用已完成 task 且线程独立','I/O 有并发上限和失败处理','只写已确认事实，新线程可读且用户隔离']},
  {title:'高阶模式与工程交付',subtitle:'将 RAG、评审、重试和缓存落到可验收项目',color:'#518069',chapters:'LearnGraph 7 / 13 · 官方 Workflows、Test、Application structure',deliverable:'LG v1.0 · 可评测与部署的 LangGraph 应用',lab:'整合真实 RAG、有界评审、节点重试和用户缓存。建立固定评测集与故障分类，准备图入口、langgraph.json、锁定依赖和部署说明，按官方资料验证本地服务。',labChecks:['至少 30 条样本，报告质量与 p95 延迟','重试有上限，缓存作用域正确','新环境可运行并展示恢复、审批与本地服务']},
];
const ids=Object.keys(langgraphChallenges);
const lessons:Lesson[]=topics.map((t,index)=>{const id=ids[index];const c=langgraphChallenges[id];return {id,title:c.title,...t,reading:t.reading.map(([title,body])=>({title,body})),exercise:c.scenario,checks:c.tests.map(test=>test.name)}});
export const langgraphPhases:Phase[]=weeks.map((w,index)=>({...w,track:'langgraph',week:index+7,lessons:lessons.slice(index*4,index*4+4)}));
export const langgraphQuizzes=[
  {week:7,q:'StateGraph.compile() 返回什么？',options:['可 invoke 的编译图','一次模型回答','必须连接模型的字符串'],answer:0,why:'构建器描述图，compile 产生运行对象；固定函数也能运行。',ref:'graph'},
  {week:7,q:'追加 reducer 的节点应返回什么？',options:['旧列表加新增记录','仅本节点新增记录','总是空列表'],answer:1,why:'运行时会合并旧状态，再返回旧项会造成重复。',ref:'learn-reducer'},
  {week:8,q:'ToolMessage 的 tool_call_id 用于什么？',options:['保存所有用户身份','代替 thread_id','关联对应的工具请求'],answer:2,why:'请求和结果应保持对应，供后续模型解释。',ref:'lg-quick'},
  {week:8,q:'updates 流主要表达什么？',options:['节点的局部更新','最终任务已完成','只有模型 token'],answer:0,why:'更新、完整状态、消息与最终状态语义不同。',ref:'stream'},
  {week:9,q:'怎样恢复一次 interrupt？',options:['换随机新线程','同一线程使用 Command(resume=...)','仅重新发送查询'],answer:1,why:'恢复值交给同一暂停执行，节点可能重新运行。',ref:'interrupt'},
  {week:9,q:'历史 checkpoint 分叉会怎样？',options:['自动删掉旧快照','不会重复外部请求','形成新路径并保留历史'],answer:2,why:'后续节点重放仍需考虑副作用。',ref:'lg-time'},
  {week:10,q:'Send 最适合什么？',options:['按输入动态分发工作项','仅连接一个固定节点','替代 reducer'],answer:0,why:'动态工作项有各自输入，再按规则归并结果。',ref:'learn-map'},
  {week:10,q:'父子图 schema 不同时如何连接？',options:['自动传入全部状态','包装节点显式转换字段','删除父图 schema'],answer:1,why:'清楚的边界让子图可替换。',ref:'subgraph'},
  {week:11,q:'task 复用保证外部写入恰好一次吗？',options:['总是保证','开缓存即可','不能，故障窗口仍需幂等保护'],answer:2,why:'外部写入与 checkpoint 保存之间仍可能故障。',ref:'lg-functional'},
  {week:11,q:'用户偏好如何隔离？',options:['认证用户的 Store namespace','所有人共用线程','只按随机请求'],answer:0,why:'跨线程读取仍需要用户边界。',ref:'lg-store'},
  {week:12,q:'用户相关缓存键应包含什么？',options:['只有 query','user_id 与 query 等相关字段','仅节点名'],answer:1,why:'缓存作用域与结果作用域应一致。',ref:'lg-use'},
  {week:12,q:'工程验收应交付什么？',options:['只有成功截图','只有复杂图形','固定评测、锁定依赖与恢复部署说明'],answer:2,why:'可复现环境、输入和故障行为才能验证系统。',ref:'lg-test'},
];
