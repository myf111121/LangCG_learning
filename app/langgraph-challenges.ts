import type { CodeChallenge } from './code-challenges';
import { contextualizeCode, type ChallengeContext } from './challenge-scenarios.ts';

const exercises = [
  {
    "id": "w7-1",
    "title": "用 StateGraph 编译第一个工作流",
    "story": "知识库收到带空白的查询。把清理与回答两个普通函数连接成真正可运行的 LangGraph。",
    "setup": "import asyncio\nimport json\nfrom typing import TypedDict, Annotated, Literal\nfrom operator import add\nfrom dataclasses import dataclass\nfrom langgraph.graph import StateGraph, START, END, MessagesState\nfrom langgraph.graph.state import CompiledStateGraph\nfrom langgraph.checkpoint.memory import InMemorySaver\nfrom langgraph.types import Command, Send, interrupt, RetryPolicy, CachePolicy\nfrom langgraph.runtime import Runtime\nfrom langgraph.store.memory import InMemoryStore\nfrom langgraph.cache.memory import InMemoryCache\n\nclass State(TypedDict):\n    query: str\n    answer: str\ndef normalize(state):\n    return {\"query\": state[\"query\"].strip()}\ndef answer(state):\n    return {\"answer\": \"笔记：\" + state[\"query\"]}",
    "signature": "def build_graph():",
    "requirements": [
      "返回 CompiledStateGraph，而不是直接计算答案。",
      "节点命名为 normalize、answer；按 START → normalize → answer → END 连接。",
      "节点只返回更新，输入字典不能被原地修改。"
    ],
    "entry": "    graph = build_graph()\n    return graph.invoke({\"query\": \"  checkpoint  \"})",
    "expected": {
      "query": "checkpoint",
      "answer": "笔记：checkpoint"
    },
    "tests": [
      {
        "name": "真正编译图，并按顺序运行",
        "code": "g = build_graph()\nexpect_equal(isinstance(g, CompiledStateGraph), True)\nexpect_equal(g.invoke({\"query\":\" graph \"})[\"answer\"], \"笔记：graph\")"
      },
      {
        "name": "空输入文本与输入对象保留",
        "code": "data = {\"query\":\"   \"}\ng = build_graph()\nexpect_equal(g.invoke(data), {\"query\":\"\", \"answer\":\"笔记：\"})\nexpect_equal(data, {\"query\":\"   \"})"
      },
      {
        "name": "结构中包含入口、业务节点与出口",
        "code": "g = build_graph()\nexpect_equal(set(g.get_graph().nodes), {START, \"normalize\", \"answer\", END})"
      }
    ],
    "provided": "State、两个节点与业务调用入口",
    "connection": "把前六周的普通组件接到图运行时；后续 schema、分支和 checkpoint 都在这个图上扩展。",
    "flow": [
      "业务输入与真实 LangGraph 运行时",
      "你实现：build_graph",
      "图输出、快照或事件 → 下游使用"
    ]
  },
  {
    "id": "w7-2",
    "title": "区分输入、内部状态与公开输出",
    "story": "检索节点要保留调试来源，界面只应该得到 answer。用独立的输入和输出 schema 建立图的公开契约。",
    "setup": "import asyncio\nimport json\nfrom typing import TypedDict, Annotated, Literal\nfrom operator import add\nfrom dataclasses import dataclass\nfrom langgraph.graph import StateGraph, START, END, MessagesState\nfrom langgraph.graph.state import CompiledStateGraph\nfrom langgraph.checkpoint.memory import InMemorySaver\nfrom langgraph.types import Command, Send, interrupt, RetryPolicy, CachePolicy\nfrom langgraph.runtime import Runtime\nfrom langgraph.store.memory import InMemoryStore\nfrom langgraph.cache.memory import InMemoryCache\n\nclass Input(TypedDict):\n    query: str\nclass Output(TypedDict):\n    answer: str\nclass State(Input, Output):\n    debug: str\ndef respond(state):\n    return {\"answer\":\"结果：\" + state[\"query\"], \"debug\":\"internal-index\"}",
    "signature": "def build_graph():",
    "requirements": [
      "使用 StateGraph(State, input_schema=Input, output_schema=Output)。",
      "注册 respond 节点并编译；invoke 只返回 answer。",
      "输出 schema 负责过滤字段，不能把它当作鉴权或流式脱敏机制。"
    ],
    "entry": "    return build_graph().invoke({\"query\":\"interrupt\"})",
    "expected": {
      "answer": "结果：interrupt"
    },
    "tests": [
      {
        "name": "只公开约定输出",
        "code": "g = build_graph()\nexpect_equal(isinstance(g, CompiledStateGraph), True)\nexpect_equal(g.invoke({\"query\":\"a\"}), {\"answer\":\"结果：a\"})"
      },
      {
        "name": "内部节点仍然产生调试字段",
        "code": "updates = list(build_graph().stream({\"query\":\"b\"}, stream_mode=\"updates\"))\nexpect_equal(updates[0][\"respond\"][\"debug\"], \"internal-index\")"
      },
      {
        "name": "不依赖固定查询或旧状态",
        "code": "g = build_graph()\nexpect_equal(g.invoke({\"query\":\"x\"}), {\"answer\":\"结果：x\"})\nexpect_equal(g.invoke({\"query\":\"y\"}), {\"answer\":\"结果：y\"})"
      }
    ],
    "provided": "三种 schema、包含内部字段的 respond 节点",
    "connection": "公开输出和内部协作分开；部署接口与后续子图转换沿用这个边界。",
    "flow": [
      "业务输入与真实 LangGraph 运行时",
      "你实现：build_graph",
      "图输出、快照或事件 → 下游使用"
    ]
  },
  {
    "id": "w7-3",
    "title": "用 Annotated 和 reducer 累积更新",
    "story": "清理与检索节点分别记录日志。为日志字段声明追加 reducer，避免后一个节点覆盖已有记录。",
    "setup": "import asyncio\nimport json\nfrom typing import TypedDict, Annotated, Literal\nfrom operator import add\nfrom dataclasses import dataclass\nfrom langgraph.graph import StateGraph, START, END, MessagesState\nfrom langgraph.graph.state import CompiledStateGraph\nfrom langgraph.checkpoint.memory import InMemorySaver\nfrom langgraph.types import Command, Send, interrupt, RetryPolicy, CachePolicy\nfrom langgraph.runtime import Runtime\nfrom langgraph.store.memory import InMemoryStore\nfrom langgraph.cache.memory import InMemoryCache\n\ndef clean(state):\n    return {\"log\":[\"clean\"]}\ndef retrieve(state):\n    return {\"log\":[\"retrieve\"]}",
    "signature": "def build_graph():",
    "requirements": [
      "在函数内定义 State，log 为 Annotated[list[str], add]。",
      "节点只返回本次新增日志；图按 clean → retrieve 顺序运行。",
      "已有日志要保留；再次运行新图时不能共享之前的列表。"
    ],
    "entry": "    return build_graph().invoke({\"log\":[\"request\"]})",
    "expected": {
      "log": [
        "request",
        "clean",
        "retrieve"
      ]
    },
    "tests": [
      {
        "name": "已有记录和两个节点的增量都保留",
        "code": "g = build_graph()\nexpect_equal(isinstance(g, CompiledStateGraph), True)\nexpect_equal(g.invoke({\"log\":[\"seed\"]})[\"log\"], [\"seed\",\"clean\",\"retrieve\"])"
      },
      {
        "name": "空列表和不同调用互不污染",
        "code": "g = build_graph()\nexpect_equal(g.invoke({\"log\":[]})[\"log\"], [\"clean\",\"retrieve\"])\nexpect_equal(g.invoke({\"log\":[\"new\"]})[\"log\"], [\"new\",\"clean\",\"retrieve\"])"
      },
      {
        "name": "节点返回增量，不重复追加旧日志",
        "code": "updates = list(build_graph().stream({\"log\":[\"old\"]}, stream_mode=\"updates\"))\nexpect_equal(updates, [{\"clean\":{\"log\":[\"clean\"]}}, {\"retrieve\":{\"log\":[\"retrieve\"]}}])"
      }
    ],
    "provided": "两个返回增量的节点",
    "connection": "并行和 Send 的多个写入也需要 reducer；日志合并契约先在顺序图中验证。",
    "flow": [
      "业务输入与真实 LangGraph 运行时",
      "你实现：build_graph",
      "图输出、快照或事件 → 下游使用"
    ]
  },
  {
    "id": "w7-4",
    "title": "条件边、有界循环与兜底出口",
    "story": "查询可能为空或暂时无结果。让图选择澄清、回答或最多两次检索后的拒答，避免无限循环。",
    "setup": "import asyncio\nimport json\nfrom typing import TypedDict, Annotated, Literal\nfrom operator import add\nfrom dataclasses import dataclass\nfrom langgraph.graph import StateGraph, START, END, MessagesState\nfrom langgraph.graph.state import CompiledStateGraph\nfrom langgraph.checkpoint.memory import InMemorySaver\nfrom langgraph.types import Command, Send, interrupt, RetryPolicy, CachePolicy\nfrom langgraph.runtime import Runtime\nfrom langgraph.store.memory import InMemoryStore\nfrom langgraph.cache.memory import InMemoryCache\n\nclass State(TypedDict):\n    query: str\n    attempts: int\n    found: bool\n    answer: str\ndef inspect_query(state):\n    return {\"query\":state[\"query\"].strip()}\ndef retrieve(state):\n    return {\"attempts\":state.get(\"attempts\",0)+1, \"found\":state[\"query\"]==\"graph\"}\ndef respond(state):\n    return {\"answer\":\"有依据的回答\"}\ndef clarify(state):\n    return {\"answer\":\"请补充问题\"}\ndef refuse(state):\n    return {\"answer\":\"没有足够证据\"}",
    "signature": "def build_graph():",
    "requirements": [
      "空 query 走 clarify；非空走 retrieve。",
      "找到证据走 respond；未找到且 attempts < 2 再检索，否则走 refuse。",
      "出口都连接 END，调用设置 recursion_limit=20。"
    ],
    "entry": "    return build_graph().invoke({\"query\":\"missing\",\"attempts\":0}, {\"recursion_limit\":20})",
    "expected": {
      "query": "missing",
      "attempts": 2,
      "found": false,
      "answer": "没有足够证据"
    },
    "tests": [
      {
        "name": "空问题不检索",
        "code": "r = build_graph().invoke({\"query\":\" \",\"attempts\":0}, {\"recursion_limit\":20})\nexpect_equal(r[\"answer\"],\"请补充问题\")\nexpect_equal(r[\"attempts\"],0)"
      },
      {
        "name": "找到证据立即结束",
        "code": "r = build_graph().invoke({\"query\":\" graph \",\"attempts\":0}, {\"recursion_limit\":20})\nexpect_equal((r[\"answer\"],r[\"attempts\"]),(\"有依据的回答\",1))"
      },
      {
        "name": "无结果最多检索两次",
        "code": "r = build_graph().invoke({\"query\":\"x\",\"attempts\":0}, {\"recursion_limit\":20})\nexpect_equal((r[\"answer\"],r[\"attempts\"]),(\"没有足够证据\",2))"
      }
    ],
    "provided": "检索、澄清、回答和拒答节点",
    "connection": "把第 2 周的路由逻辑转为真正的条件边；后续 RAG 会加入查询改写。",
    "flow": [
      "业务输入与真实 LangGraph 运行时",
      "你实现：build_graph",
      "图输出、快照或事件 → 下游使用"
    ]
  },
  {
    "id": "w8-1",
    "title": "MessagesState 与消息 ID 合并",
    "story": "同一条助手回答被修正时，消息 ID 应替换原内容。使用 MessagesState，保留用户消息且避免重复回答。",
    "setup": "import asyncio\nimport json\nfrom typing import TypedDict, Annotated, Literal\nfrom operator import add\nfrom dataclasses import dataclass\nfrom langgraph.graph import StateGraph, START, END, MessagesState\nfrom langgraph.graph.state import CompiledStateGraph\nfrom langgraph.checkpoint.memory import InMemorySaver\nfrom langgraph.types import Command, Send, interrupt, RetryPolicy, CachePolicy\nfrom langgraph.runtime import Runtime\nfrom langgraph.store.memory import InMemoryStore\nfrom langgraph.cache.memory import InMemoryCache\n\nfrom langchain_core.messages import HumanMessage, AIMessage, ToolMessage\ndef respond(state):\n    return {\"messages\":[AIMessage(content=\"更新后的回答\", id=\"answer-1\")]}",
    "signature": "def build_graph():",
    "requirements": [
      "StateGraph 使用 MessagesState，并连接 respond。",
      "相同消息 ID 更新已有消息；不同 ID 追加。",
      "不能使用普通列表拼接替代 add_messages 的 ID 合并语义。"
    ],
    "entry": "    r=build_graph().invoke({\"messages\":[HumanMessage(content=\"你好\",id=\"user-1\"),AIMessage(content=\"旧回答\",id=\"answer-1\")]})\n    return {\"messages\":[[m.id,m.content] for m in r[\"messages\"]]}",
    "expected": {
      "messages": [
        [
          "user-1",
          "你好"
        ],
        [
          "answer-1",
          "更新后的回答"
        ]
      ]
    },
    "tests": [
      {
        "name": "相同 ID 替换，不重复追加",
        "code": "r=build_graph().invoke({\"messages\":[AIMessage(content=\"old\",id=\"answer-1\")]})\nexpect_equal(len(r[\"messages\"]),1)\nexpect_equal(r[\"messages\"][0].content,\"更新后的回答\")"
      },
      {
        "name": "用户消息保留并追加新回答",
        "code": "r=build_graph().invoke({\"messages\":[HumanMessage(content=\"a\",id=\"u\")]})\nexpect_equal([m.id for m in r[\"messages\"]],[\"u\",\"answer-1\"])"
      },
      {
        "name": "字典消息被转换为消息对象",
        "code": "r=build_graph().invoke({\"messages\":[{\"role\":\"user\",\"content\":\"a\",\"id\":\"u\"}]})\nexpect_equal(isinstance(r[\"messages\"][0],HumanMessage),True)"
      }
    ],
    "provided": "LangChain 消息对象与回答节点",
    "connection": "消息状态将交给 ToolNode；工具调用 ID 与 ToolMessage 必须能够对应。",
    "flow": [
      "业务输入与真实 LangGraph 运行时",
      "你实现：build_graph",
      "图输出、快照或事件 → 下游使用"
    ]
  },
  {
    "id": "w8-2",
    "title": "ToolNode 与 tools_condition 执行循环",
    "story": "模型输出用固定消息代替付费调用，但工具执行和图路由使用真实 ToolNode。让工具结果返回助手节点后结束。",
    "setup": "import asyncio\nimport json\nfrom typing import TypedDict, Annotated, Literal\nfrom operator import add\nfrom dataclasses import dataclass\nfrom langgraph.graph import StateGraph, START, END, MessagesState\nfrom langgraph.graph.state import CompiledStateGraph\nfrom langgraph.checkpoint.memory import InMemorySaver\nfrom langgraph.types import Command, Send, interrupt, RetryPolicy, CachePolicy\nfrom langgraph.runtime import Runtime\nfrom langgraph.store.memory import InMemoryStore\nfrom langgraph.cache.memory import InMemoryCache\n\nfrom langchain_core.messages import HumanMessage, AIMessage, ToolMessage\nfrom langchain_core.tools import tool\nfrom langgraph.prebuilt import ToolNode, tools_condition\n@tool\ndef lookup(query: str) -> str:\n    \"\"\"查询固定技术笔记。\"\"\"\n    return \"checkpoint 保存状态\" if query==\"graph\" else \"没有笔记\"\ndef agent(state):\n    last=state[\"messages\"][-1]\n    if isinstance(last,ToolMessage):\n        return {\"messages\":[AIMessage(content=last.content)]}\n    return {\"messages\":[AIMessage(content=\"\",tool_calls=[{\"name\":\"lookup\",\"args\":{\"query\":last.content},\"id\":\"call-1\",\"type\":\"tool_call\"}])]}",
    "signature": "def build_graph():",
    "requirements": [
      "用 MessagesState 注册 agent 与 ToolNode([lookup])。",
      "agent 通过 tools_condition 选择 tools 或 END；tools 返回 agent。",
      "保留真实 ToolMessage 及其 tool_call_id，不手写一个工具循环。"
    ],
    "entry": "    r=build_graph().invoke({\"messages\":[HumanMessage(content=\"graph\")]},{\"recursion_limit\":12})\n    return {\"answer\":r[\"messages\"][-1].content,\"tool_ids\":[m.tool_call_id for m in r[\"messages\"] if isinstance(m,ToolMessage)]}",
    "expected": {
      "answer": "checkpoint 保存状态",
      "tool_ids": [
        "call-1"
      ]
    },
    "tests": [
      {
        "name": "工具消息与调用 ID 对应",
        "code": "r=build_graph().invoke({\"messages\":[HumanMessage(content=\"graph\")]},{\"recursion_limit\":12})\nexpect_equal([m.tool_call_id for m in r[\"messages\"] if isinstance(m,ToolMessage)],[\"call-1\"])"
      },
      {
        "name": "工具执行后模型返回最终消息",
        "code": "r=build_graph().invoke({\"messages\":[HumanMessage(content=\"x\")]},{\"recursion_limit\":12})\nexpect_equal(len(r[\"messages\"]),4)\nexpect_equal(r[\"messages\"][-1].content,\"没有笔记\")"
      },
      {
        "name": "已存在工具结果时不会重复执行工具",
        "code": "r=build_graph().invoke({\"messages\":[ToolMessage(content=\"cached\",tool_call_id=\"old\")]},{\"recursion_limit\":12})\nexpect_equal(len(r[\"messages\"]),2)\nexpect_equal(r[\"messages\"][-1].content,\"cached\")"
      }
    ],
    "provided": "异步外部模型的固定替身、真实工具定义和消息类型",
    "connection": "固定模型输入用于稳定验收；实战时可以替换为支持 tool calling 的模型，而图结构保留。",
    "flow": [
      "业务输入与真实 LangGraph 运行时",
      "你实现：build_graph",
      "图输出、快照或事件 → 下游使用"
    ]
  },
  {
    "id": "w8-3",
    "title": "Runtime context 与用户边界",
    "story": "同一个图为不同用户查询笔记。把用户身份放入每次调用的 Context，而不是写进共享全局变量。",
    "setup": "import asyncio\nimport json\nfrom typing import TypedDict, Annotated, Literal\nfrom operator import add\nfrom dataclasses import dataclass\nfrom langgraph.graph import StateGraph, START, END, MessagesState\nfrom langgraph.graph.state import CompiledStateGraph\nfrom langgraph.checkpoint.memory import InMemorySaver\nfrom langgraph.types import Command, Send, interrupt, RetryPolicy, CachePolicy\nfrom langgraph.runtime import Runtime\nfrom langgraph.store.memory import InMemoryStore\nfrom langgraph.cache.memory import InMemoryCache\n\n@dataclass\nclass Context:\n    user_id: str\nclass State(TypedDict):\n    query: str\n    answer: str\nNOTES={\"alice\":\"Alice 的笔记\", \"bob\":\"Bob 的笔记\"}\ndef build_graph():\n    b=StateGraph(State,context_schema=Context)\n    b.add_node(\"answer\",answer_node)\n    b.add_edge(START,\"answer\")\n    b.add_edge(\"answer\",END)\n    return b.compile()",
    "signature": "def answer_node(state: State, runtime: Runtime[Context]):",
    "requirements": [
      "使用 runtime.context.user_id 选择 NOTES。",
      "返回 answer；未找到用户返回“没有笔记”。",
      "身份来自可信调用方；context_schema 本身不执行认证。"
    ],
    "entry": "    g=build_graph()\n    return {\"alice\":g.invoke({\"query\":\"graph\"},context=Context(\"alice\"))[\"answer\"],\"bob\":g.invoke({\"query\":\"graph\"},context=Context(\"bob\"))[\"answer\"]}",
    "expected": {
      "alice": "Alice 的笔记",
      "bob": "Bob 的笔记"
    },
    "tests": [
      {
        "name": "同一图两次调用使用不同 context",
        "code": "g=build_graph()\nexpect_equal(g.invoke({\"query\":\"x\"},context=Context(\"alice\"))[\"answer\"],\"Alice 的笔记\")\nexpect_equal(g.invoke({\"query\":\"x\"},context=Context(\"bob\"))[\"answer\"],\"Bob 的笔记\")"
      },
      {
        "name": "不存在的用户没有其他用户数据",
        "code": "expect_equal(build_graph().invoke({\"query\":\"x\"},context=Context(\"unknown\"))[\"answer\"],\"没有笔记\")"
      },
      {
        "name": "身份不会成为公开状态字段",
        "code": "r=build_graph().invoke({\"query\":\"x\"},context=Context(\"alice\"))\nexpect_equal(set(r),{\"query\",\"answer\"})"
      }
    ],
    "provided": "Context、用户笔记与已编译的图工厂",
    "connection": "Store 的 namespace 与部署的身份绑定建立在同样的 context 边界上。",
    "flow": [
      "业务输入与真实 LangGraph 运行时",
      "你实现：answer_node",
      "图输出、快照或事件 → 下游使用"
    ]
  },
  {
    "id": "w8-4",
    "title": "区分 updates、values 与流式事件",
    "story": "界面需要观察节点更新。收集真实图的 updates 事件，保留节点名字和本步增量，而不是把它当作最终完整状态。",
    "setup": "import asyncio\nimport json\nfrom typing import TypedDict, Annotated, Literal\nfrom operator import add\nfrom dataclasses import dataclass\nfrom langgraph.graph import StateGraph, START, END, MessagesState\nfrom langgraph.graph.state import CompiledStateGraph\nfrom langgraph.checkpoint.memory import InMemorySaver\nfrom langgraph.types import Command, Send, interrupt, RetryPolicy, CachePolicy\nfrom langgraph.runtime import Runtime\nfrom langgraph.store.memory import InMemoryStore\nfrom langgraph.cache.memory import InMemoryCache\n\nclass State(TypedDict):\n    query: str\n    answer: str\ndef normalize(state):\n    return {\"query\": state[\"query\"].strip()}\ndef answer(state):\n    return {\"answer\": \"笔记：\" + state[\"query\"]}\ndef build_graph():\n    builder = StateGraph(State)\n    builder.add_node(\"normalize\", normalize)\n    builder.add_node(\"answer\", answer)\n    builder.add_edge(START, \"normalize\")\n    builder.add_edge(\"normalize\", \"answer\")\n    builder.add_edge(\"answer\", END)\n    return builder.compile()",
    "signature": "def collect_updates(graph, data):",
    "requirements": [
      "调用 graph.stream(data, stream_mode=\"updates\")。",
      "返回事件列表 [{node, update}]，按运行顺序保留。",
      "节点更新只包含该节点返回的字段；完整状态另用 invoke 或 values。"
    ],
    "entry": "    return {\"events\":collect_updates(build_graph(),{\"query\":\" graph \"})}",
    "expected": {
      "events": [
        {
          "node": "normalize",
          "update": {
            "query": "graph"
          }
        },
        {
          "node": "answer",
          "update": {
            "answer": "笔记：graph"
          }
        }
      ]
    },
    "tests": [
      {
        "name": "真实节点顺序和更新字段",
        "code": "r=collect_updates(build_graph(),{\"query\":\" x \"})\nexpect_equal(r,[{\"node\":\"normalize\",\"update\":{\"query\":\"x\"}},{\"node\":\"answer\",\"update\":{\"answer\":\"笔记：x\"}}])"
      },
      {
        "name": "没有伪造初始事件或完整状态",
        "code": "r=collect_updates(build_graph(),{\"query\":\"a\"})\nexpect_equal(len(r),2)\nexpect_equal(set(r[1][\"update\"]),{\"answer\"})"
      },
      {
        "name": "空文本仍然产生两个节点事件",
        "code": "expect_equal(collect_updates(build_graph(),{\"query\":\" \"})[1][\"update\"],{\"answer\":\"笔记：\"})"
      }
    ],
    "provided": "顺序图与两个业务节点",
    "connection": "这是运行界面接图的入口；messages 是模型消息流，custom 可用于业务进度。",
    "flow": [
      "业务输入与真实 LangGraph 运行时",
      "你实现：collect_updates",
      "图输出、快照或事件 → 下游使用"
    ]
  },
  {
    "id": "w9-1",
    "title": "Checkpointer、thread_id 与历史状态",
    "story": "记录同一会话的计数变化，并观察另一个会话独立的 checkpoint。",
    "setup": "import asyncio\nimport json\nfrom typing import TypedDict, Annotated, Literal\nfrom operator import add\nfrom dataclasses import dataclass\nfrom langgraph.graph import StateGraph, START, END, MessagesState\nfrom langgraph.graph.state import CompiledStateGraph\nfrom langgraph.checkpoint.memory import InMemorySaver\nfrom langgraph.types import Command, Send, interrupt, RetryPolicy, CachePolicy\nfrom langgraph.runtime import Runtime\nfrom langgraph.store.memory import InMemoryStore\nfrom langgraph.cache.memory import InMemoryCache\n\nclass State(TypedDict):\n    delta: int\n    total: Annotated[int,add]\ndef accumulate(state):\n    return {\"total\":state[\"delta\"]}",
    "signature": "def build_graph(checkpointer):",
    "requirements": [
      "compile 使用调用方提供的 checkpointer。",
      "同 thread_id 在状态基础上继续；不同 thread_id 完全独立。",
      "通过 get_state 检查真实快照，内存 saver 不代表跨进程持久化。"
    ],
    "entry": "    g=build_graph(InMemorySaver())\n    cfg={\"configurable\":{\"thread_id\":\"alice\"}}\n    g.invoke({\"delta\":2},cfg)\n    r=g.invoke({\"delta\":3},cfg)\n    return {\"total\":r[\"total\"],\"next\":list(g.get_state(cfg).next)}",
    "expected": {
      "total": 5,
      "next": []
    },
    "tests": [
      {
        "name": "同线程状态继续累积",
        "code": "g=build_graph(InMemorySaver())\nc={\"configurable\":{\"thread_id\":\"a\"}}\ng.invoke({\"delta\":2},c)\nexpect_equal(g.invoke({\"delta\":3},c)[\"total\"],5)"
      },
      {
        "name": "不同线程各自保存",
        "code": "g=build_graph(InMemorySaver())\na={\"configurable\":{\"thread_id\":\"a\"}}\nb={\"configurable\":{\"thread_id\":\"b\"}}\ng.invoke({\"delta\":5},a)\nexpect_equal(g.invoke({\"delta\":1},b)[\"total\"],1)\nexpect_equal(g.get_state(a).values[\"total\"],5)"
      },
      {
        "name": "能读取运行历史和结束快照",
        "code": "g=build_graph(InMemorySaver())\nc={\"configurable\":{\"thread_id\":\"history\"}}\ng.invoke({\"delta\":1},c)\nexpect_equal(len(list(g.get_state_history(c)))>=3,True)\nexpect_equal(g.get_state(c).next,())"
      }
    ],
    "provided": "计数 reducer、累积节点与 saver 参数",
    "connection": "为审批和 time travel 提供线程快照；下一节将保存器换成 SQLite。",
    "flow": [
      "业务输入与真实 LangGraph 运行时",
      "你实现：build_graph",
      "图输出、快照或事件 → 下游使用"
    ]
  },
  {
    "id": "w9-2",
    "title": "SQLite 保存与重新打开数据库",
    "story": "图对象和数据库连接关闭后，重新构建图仍能从文件中的线程状态继续。",
    "setup": "import asyncio\nimport json\nfrom typing import TypedDict, Annotated, Literal\nfrom operator import add\nfrom dataclasses import dataclass\nfrom langgraph.graph import StateGraph, START, END, MessagesState\nfrom langgraph.graph.state import CompiledStateGraph\nfrom langgraph.checkpoint.memory import InMemorySaver\nfrom langgraph.types import Command, Send, interrupt, RetryPolicy, CachePolicy\nfrom langgraph.runtime import Runtime\nfrom langgraph.store.memory import InMemoryStore\nfrom langgraph.cache.memory import InMemoryCache\n\nimport tempfile\nfrom pathlib import Path\nfrom langgraph.checkpoint.sqlite import SqliteSaver\nclass State(TypedDict):\n    delta: int\n    total: Annotated[int,add]\ndef accumulate(state):\n    return {\"total\":state[\"delta\"]}",
    "signature": "def build_graph(checkpointer):",
    "requirements": [
      "沿用调用方的 SqliteSaver，不能偷偷创建 InMemorySaver。",
      "关闭连接后重新打开同一个文件，total 必须保留。",
      "SQLite 用于本地实验；生产数据库连接、迁移和备份需另行配置。"
    ],
    "entry": "    with tempfile.TemporaryDirectory() as folder:\n        path=str(Path(folder)/\"checkpoints.sqlite\")\n        cfg={\"configurable\":{\"thread_id\":\"resume\"}}\n        with SqliteSaver.from_conn_string(path) as saver:\n            build_graph(saver).invoke({\"delta\":4},cfg)\n        with SqliteSaver.from_conn_string(path) as saver:\n            return {\"total\":build_graph(saver).invoke({\"delta\":3},cfg)[\"total\"]}",
    "expected": {
      "total": 7
    },
    "tests": [
      {
        "name": "重新打开文件后继续运行",
        "code": "with tempfile.TemporaryDirectory() as folder:\n    p=str(Path(folder)/\"a.db\")\n    c={\"configurable\":{\"thread_id\":\"a\"}}\n    with SqliteSaver.from_conn_string(p) as s:\n        build_graph(s).invoke({\"delta\":6},c)\n    with SqliteSaver.from_conn_string(p) as s:\n        expect_equal(build_graph(s).invoke({\"delta\":2},c)[\"total\"],8)"
      },
      {
        "name": "保存器能独立检索 checkpoint",
        "code": "with SqliteSaver.from_conn_string(\":memory:\") as s:\n    c={\"configurable\":{\"thread_id\":\"b\"}}\n    build_graph(s).invoke({\"delta\":3},c)\n    expect_equal(s.get_tuple(c) is not None,True)"
      },
      {
        "name": "另一个文件没有旧状态",
        "code": "with SqliteSaver.from_conn_string(\":memory:\") as s:\n    expect_equal(build_graph(s).invoke({\"delta\":1},{\"configurable\":{\"thread_id\":\"new\"}})[\"total\"],1)"
      }
    ],
    "provided": "真实 SqliteSaver、临时数据库与累积节点",
    "connection": "从内存实验走向持久化；项目验收还要在两个独立 Python 进程间验证恢复。",
    "flow": [
      "业务输入与真实 LangGraph 运行时",
      "你实现：build_graph",
      "图输出、快照或事件 → 下游使用"
    ]
  },
  {
    "id": "w9-3",
    "title": "interrupt、批准拒绝与 Command 恢复",
    "story": "保存知识前让图暂停。批准后写入编辑后的文本，拒绝时结束且不写入。",
    "setup": "import asyncio\nimport json\nfrom typing import TypedDict, Annotated, Literal\nfrom operator import add\nfrom dataclasses import dataclass\nfrom langgraph.graph import StateGraph, START, END, MessagesState\nfrom langgraph.graph.state import CompiledStateGraph\nfrom langgraph.checkpoint.memory import InMemorySaver\nfrom langgraph.types import Command, Send, interrupt, RetryPolicy, CachePolicy\nfrom langgraph.runtime import Runtime\nfrom langgraph.store.memory import InMemoryStore\nfrom langgraph.cache.memory import InMemoryCache\n\nclass State(TypedDict):\n    draft: str\n    approved: bool\n    writes: Annotated[list[str],add]\ndef commit(state):\n    return {\"writes\":[state[\"draft\"]]}\ndef build_graph():\n    b=StateGraph(State)\n    b.add_node(\"review\",review)\n    b.add_node(\"commit\",commit)\n    b.add_edge(START,\"review\")\n    b.add_conditional_edges(\"review\",lambda s:\"commit\" if s[\"approved\"] else END,{\"commit\":\"commit\",END:END})\n    b.add_edge(\"commit\",END)\n    return b.compile(checkpointer=InMemorySaver())",
    "signature": "def review(state: State):",
    "requirements": [
      "用 interrupt({\"draft\":...}) 请求人工决策。",
      "恢复值必须是含布尔 approved 的字典，否则抛 ValueError；可选 draft 用于编辑。",
      "review 不执行写入；恢复调用使用同 thread_id 和 Command(resume=...)。"
    ],
    "entry": "    g=build_graph()\n    c={\"configurable\":{\"thread_id\":\"approval\"}}\n    pause=g.invoke({\"draft\":\"旧文本\"},c)\n    resumed=g.invoke(Command(resume={\"approved\":True,\"draft\":\"修正文本\"}),c)\n    return {\"paused\":bool(pause.get(\"__interrupt__\")),\"writes\":resumed[\"writes\"]}",
    "expected": {
      "paused": true,
      "writes": [
        "修正文本"
      ]
    },
    "tests": [
      {
        "name": "审批前不写，批准后用编辑文本",
        "code": "g=build_graph()\nc={\"configurable\":{\"thread_id\":\"a\"}}\nr=g.invoke({\"draft\":\"old\"},c)\nexpect_equal(bool(r.get(\"__interrupt__\")),True)\nexpect_equal(g.get_state(c).values[\"writes\"],[])\nr=g.invoke(Command(resume={\"approved\":True,\"draft\":\"new\"}),c)\nexpect_equal(r[\"writes\"],[\"new\"])"
      },
      {
        "name": "拒绝不会执行写入节点",
        "code": "g=build_graph()\nc={\"configurable\":{\"thread_id\":\"b\"}}\ng.invoke({\"draft\":\"x\"},c)\nr=g.invoke(Command(resume={\"approved\":False}),c)\nexpect_equal(r[\"writes\"],[])\nexpect_equal(g.get_state(c).next,())"
      },
      {
        "name": "恢复值也有边界校验",
        "code": "g=build_graph()\nc={\"configurable\":{\"thread_id\":\"c\"}}\ng.invoke({\"draft\":\"x\"},c)\nexpect_raises(ValueError,lambda:g.invoke(Command(resume={\"approved\":\"yes\"}),c))"
      }
    ],
    "provided": "写入节点、审批分支和带 checkpointer 的图",
    "connection": "中断节点会重放；生产写入还需业务幂等键，不能依赖暂停位置保证恰好一次。",
    "flow": [
      "业务输入与真实 LangGraph 运行时",
      "你实现：review",
      "图输出、快照或事件 → 下游使用"
    ]
  },
  {
    "id": "w9-4",
    "title": "Time travel、update_state 与分叉",
    "story": "在回答节点前的历史快照上修改查询，运行一个新分支，并保留原始完成快照供比较。",
    "setup": "import asyncio\nimport json\nfrom typing import TypedDict, Annotated, Literal\nfrom operator import add\nfrom dataclasses import dataclass\nfrom langgraph.graph import StateGraph, START, END, MessagesState\nfrom langgraph.graph.state import CompiledStateGraph\nfrom langgraph.checkpoint.memory import InMemorySaver\nfrom langgraph.types import Command, Send, interrupt, RetryPolicy, CachePolicy\nfrom langgraph.runtime import Runtime\nfrom langgraph.store.memory import InMemoryStore\nfrom langgraph.cache.memory import InMemoryCache\n\nclass State(TypedDict):\n    query: str\n    answer: str\ndef normalize(state):\n    return {\"query\": state[\"query\"].strip()}\ndef answer(state):\n    return {\"answer\": \"笔记：\" + state[\"query\"]}\ndef build_graph():\n    builder = StateGraph(State)\n    builder.add_node(\"normalize\", normalize)\n    builder.add_node(\"answer\", answer)\n    builder.add_edge(START, \"normalize\")\n    builder.add_edge(\"normalize\", \"answer\")\n    builder.add_edge(\"answer\", END)\n    return builder.compile(checkpointer=InMemorySaver())",
    "signature": "def fork_answer(graph, config, query):",
    "requirements": [
      "从 get_state_history 找到 next 包含 answer 的快照。",
      "在这个历史 config 上 update_state({\"query\":query}, as_node=\"normalize\")。",
      "invoke(None, 新 config) 继续执行；返回新分支的完整 values，不能修改旧快照。"
    ],
    "entry": "    g=build_graph()\n    c={\"configurable\":{\"thread_id\":\"fork\"}}\n    g.invoke({\"query\":\"original\"},c)\n    original=g.get_state(c)\n    new=fork_answer(g,c,\"alternative\")\n    return {\"original\":g.get_state(original.config).values[\"answer\"],\"fork\":new[\"answer\"]}",
    "expected": {
      "original": "笔记：original",
      "fork": "笔记：alternative"
    },
    "tests": [
      {
        "name": "分支使用新查询，旧快照保留",
        "code": "g=build_graph()\nc={\"configurable\":{\"thread_id\":\"a\"}}\ng.invoke({\"query\":\"old\"},c)\nold=g.get_state(c)\nexpect_equal(fork_answer(g,c,\"new\")[\"answer\"],\"笔记：new\")\nexpect_equal(g.get_state(old.config).values[\"answer\"],\"笔记：old\")"
      },
      {
        "name": "修改状态产生真实的新历史",
        "code": "g=build_graph()\nc={\"configurable\":{\"thread_id\":\"b\"}}\ng.invoke({\"query\":\"x\"},c)\nbefore=len(list(g.get_state_history(c)))\nfork_answer(g,c,\"y\")\nexpect_equal(len(list(g.get_state_history(c)))>before,True)"
      },
      {
        "name": "新分支继续运行回答节点",
        "code": "g=build_graph()\nc={\"configurable\":{\"thread_id\":\"c\"}}\ng.invoke({\"query\":\"a\"},c)\nr=fork_answer(g,c,\"\")\nexpect_equal(r[\"answer\"],\"笔记：\")\nexpect_equal(g.get_state(c).next,())"
      }
    ],
    "provided": "顺序图、历史快照和原始输出",
    "connection": "分叉用于比较替代路径；重放也可能再次触发模型调用或副作用，需要记录实验边界。",
    "flow": [
      "业务输入与真实 LangGraph 运行时",
      "你实现：fork_answer",
      "图输出、快照或事件 → 下游使用"
    ]
  },
  {
    "id": "w10-1",
    "title": "并行分支、reducer 与汇合屏障",
    "story": "同时检查证据与权限，等两个分支完成后再生成回答。不能因为其中一个先结束就提前汇总。",
    "setup": "import asyncio\nimport json\nfrom typing import TypedDict, Annotated, Literal\nfrom operator import add\nfrom dataclasses import dataclass\nfrom langgraph.graph import StateGraph, START, END, MessagesState\nfrom langgraph.graph.state import CompiledStateGraph\nfrom langgraph.checkpoint.memory import InMemorySaver\nfrom langgraph.types import Command, Send, interrupt, RetryPolicy, CachePolicy\nfrom langgraph.runtime import Runtime\nfrom langgraph.store.memory import InMemoryStore\nfrom langgraph.cache.memory import InMemoryCache\n\nclass State(TypedDict):\n    flags: Annotated[list[str],add]\n    answer: str\ndef lookup(state):\n    return {\"flags\":[\"evidence\"]}\ndef policy(state):\n    return {\"flags\":[\"allowed\"]}\ndef merge(state):\n    return {\"answer\":\" + \".join(sorted(state[\"flags\"]))}",
    "signature": "def build_graph():",
    "requirements": [
      "START 同时连接 lookup 和 policy。",
      "add_edge([\"lookup\", \"policy\"], \"merge\") 等待两个分支。",
      "共享 flags 使用 reducer；最终按字母排序，避免依赖并行完成顺序。"
    ],
    "entry": "    return build_graph().invoke({\"flags\":[]})",
    "expected": {
      "flags": [
        "evidence",
        "allowed"
      ],
      "answer": "allowed + evidence"
    },
    "tests": [
      {
        "name": "汇总看到两个分支的结果",
        "code": "r=build_graph().invoke({\"flags\":[]})\nexpect_equal(sorted(r[\"flags\"]),[\"allowed\",\"evidence\"])\nexpect_equal(r[\"answer\"],\"allowed + evidence\")"
      },
      {
        "name": "汇总只执行一次",
        "code": "events=list(build_graph().stream({\"flags\":[]},stream_mode=\"updates\"))\nexpect_equal(sum(\"merge\" in e for e in events),1)"
      },
      {
        "name": "保留调用方输入日志",
        "code": "r=build_graph().invoke({\"flags\":[\"seed\"]})\nexpect_equal(r[\"answer\"],\"allowed + evidence + seed\")"
      }
    ],
    "provided": "两个并行节点、共享 reducer 和汇总函数",
    "connection": "固定分支后再学习 Send 动态分发；任何多个写入都要明确合并规则。",
    "flow": [
      "业务输入与真实 LangGraph 运行时",
      "你实现：build_graph",
      "图输出、快照或事件 → 下游使用"
    ]
  },
  {
    "id": "w10-2",
    "title": "Send 动态 Map-Reduce",
    "story": "输入文档数量不固定。为每篇文档分发独立任务，合并长度结果，空列表也能正常结束。",
    "setup": "import asyncio\nimport json\nfrom typing import TypedDict, Annotated, Literal\nfrom operator import add\nfrom dataclasses import dataclass\nfrom langgraph.graph import StateGraph, START, END, MessagesState\nfrom langgraph.graph.state import CompiledStateGraph\nfrom langgraph.checkpoint.memory import InMemorySaver\nfrom langgraph.types import Command, Send, interrupt, RetryPolicy, CachePolicy\nfrom langgraph.runtime import Runtime\nfrom langgraph.store.memory import InMemoryStore\nfrom langgraph.cache.memory import InMemoryCache\n\nclass State(TypedDict):\n    documents: list[str]\n    results: Annotated[list[tuple[int,int]],add]\n    lengths: list[int]\ndef measure(state):\n    return {\"results\":[(state[\"index\"],len(state[\"text\"]))]}\ndef summarize(state):\n    return {\"lengths\":[n for _,n in sorted(state.get(\"results\",[]))]}",
    "signature": "def build_graph():",
    "requirements": [
      "使用 Send(\"measure\", {index, text}) 为每篇文档构建任务输入。",
      "measure 的 results 用 reducer 合并，并连接 summarize。",
      "空 documents 直接运行 summarize；结果恢复输入顺序。"
    ],
    "entry": "    r=build_graph().invoke({\"documents\":[\"graph\",\"\",\"state\"],\"results\":[]})\n    return {\"lengths\":r[\"lengths\"]}",
    "expected": {
      "lengths": [
        5,
        0,
        5
      ]
    },
    "tests": [
      {
        "name": "任意数量任务返回输入顺序",
        "code": "r=build_graph().invoke({\"documents\":[\"aaa\",\"b\",\"cc\"],\"results\":[]})\nexpect_equal(r[\"lengths\"],[3,1,2])"
      },
      {
        "name": "空任务集合也能结束",
        "code": "r=build_graph().invoke({\"documents\":[],\"results\":[]})\nexpect_equal(r[\"lengths\"],[])"
      },
      {
        "name": "每篇文档只有一个结果",
        "code": "r=build_graph().invoke({\"documents\":[\"x\"]*5,\"results\":[]})\nexpect_equal(len(r[\"results\"]),5)\nexpect_equal(sorted(i for i,_ in r[\"results\"]),list(range(5)))"
      }
    ],
    "provided": "文档测量节点和排序汇总节点",
    "connection": "动态任务独立输入与父图共享输出是 Send 的核心；研究助手可把测量替换为检索。",
    "flow": [
      "业务输入与真实 LangGraph 运行时",
      "你实现：build_graph",
      "图输出、快照或事件 → 下游使用"
    ]
  },
  {
    "id": "w10-3",
    "title": "父子图不同 schema 的显式转换",
    "story": "检索子图接受 question、返回 answer，父图接受 topic、返回 result。用节点包装器完成边界映射。",
    "setup": "import asyncio\nimport json\nfrom typing import TypedDict, Annotated, Literal\nfrom operator import add\nfrom dataclasses import dataclass\nfrom langgraph.graph import StateGraph, START, END, MessagesState\nfrom langgraph.graph.state import CompiledStateGraph\nfrom langgraph.checkpoint.memory import InMemorySaver\nfrom langgraph.types import Command, Send, interrupt, RetryPolicy, CachePolicy\nfrom langgraph.runtime import Runtime\nfrom langgraph.store.memory import InMemoryStore\nfrom langgraph.cache.memory import InMemoryCache\n\nclass ChildState(TypedDict):\n    question: str\n    answer: str\nclass State(TypedDict):\n    topic: str\n    result: str\ndef make_child(prefix=\"child:\"):\n    b=StateGraph(ChildState)\n    b.add_node(\"answer\",lambda s:{\"answer\":prefix+s[\"question\"]})\n    b.add_edge(START,\"answer\")\n    b.add_edge(\"answer\",END)\n    return b.compile()",
    "signature": "def build_graph(child):",
    "requirements": [
      "父图 delegate 节点调用传入的 child.invoke({\"question\": topic})。",
      "只把 child 的 answer 写到父图 result，不扩散子图内部字段。",
      "同一个父图工厂应支持不同的子图实现。"
    ],
    "entry": "    return build_graph(make_child()).invoke({\"topic\":\"checkpoint\"})",
    "expected": {
      "topic": "checkpoint",
      "result": "child:checkpoint"
    },
    "tests": [
      {
        "name": "转换父图输入到子图输入",
        "code": "r=build_graph(make_child()).invoke({\"topic\":\"x\"})\nexpect_equal(r,{\"topic\":\"x\",\"result\":\"child:x\"})"
      },
      {
        "name": "尊重调用方提供的子图",
        "code": "r=build_graph(make_child(\"other:\")).invoke({\"topic\":\"y\"})\nexpect_equal(r[\"result\"],\"other:y\")"
      },
      {
        "name": "输出没有子图字段泄露",
        "code": "r=build_graph(make_child()).invoke({\"topic\":\"\"})\nexpect_equal(set(r),{\"topic\",\"result\"})"
      }
    ],
    "provided": "子图工厂、两套 schema 与父图输入",
    "connection": "封装独立流程；有共同字段时可以直接把已编译子图作为节点。",
    "flow": [
      "业务输入与真实 LangGraph 运行时",
      "你实现：build_graph",
      "图输出、快照或事件 → 下游使用"
    ]
  },
  {
    "id": "w10-4",
    "title": "Command.PARENT 跨图交接",
    "story": "子图完成检索后，把结果交给父图 finish 节点。用 Command 同时更新共享状态并改变执行位置。",
    "setup": "import asyncio\nimport json\nfrom typing import TypedDict, Annotated, Literal\nfrom operator import add\nfrom dataclasses import dataclass\nfrom langgraph.graph import StateGraph, START, END, MessagesState\nfrom langgraph.graph.state import CompiledStateGraph\nfrom langgraph.checkpoint.memory import InMemorySaver\nfrom langgraph.types import Command, Send, interrupt, RetryPolicy, CachePolicy\nfrom langgraph.runtime import Runtime\nfrom langgraph.store.memory import InMemoryStore\nfrom langgraph.cache.memory import InMemoryCache\n\nclass State(TypedDict):\n    query: str\n    notes: Annotated[list[str],add]\n    answer: str\ndef finish(state):\n    return {\"answer\":\"|\".join(state[\"notes\"])}\ndef build_graph():\n    child=StateGraph(State)\n    child.add_node(\"handoff\",handoff, destinations=(END,))\n    child.add_edge(START,\"handoff\")\n    parent=StateGraph(State)\n    parent.add_node(\"delegate\",child.compile())\n    parent.add_node(\"finish\",finish)\n    parent.add_edge(START,\"delegate\")\n    parent.add_edge(\"finish\",END)\n    return parent.compile()",
    "signature": "def handoff(state) -> Command[Literal[\"finish\"]]:",
    "requirements": [
      "返回 Command(update={\"notes\":[query]}, goto=\"finish\", graph=Command.PARENT)。",
      "父图共享 notes 已定义 reducer。",
      "不要额外增加 delegate → finish 静态边，避免混用两条路由。"
    ],
    "entry": "    return build_graph().invoke({\"query\":\"graph\",\"notes\":[]})",
    "expected": {
      "query": "graph",
      "notes": [
        "graph"
      ],
      "answer": "graph"
    },
    "tests": [
      {
        "name": "返回的是父图路由 Command",
        "code": "cmd=handoff({\"query\":\"x\"})\nexpect_equal(isinstance(cmd,Command),True)\nexpect_equal((cmd.goto,cmd.graph),(\"finish\",Command.PARENT))"
      },
      {
        "name": "子图更新交给父图 finish",
        "code": "r=build_graph().invoke({\"query\":\"x\",\"notes\":[\"seed\"]})\nexpect_equal(r[\"answer\"],\"seed|x\")"
      },
      {
        "name": "父图共享字段不会重复合并",
        "code": "r=build_graph().invoke({\"query\":\"y\",\"notes\":[]})\nexpect_equal(r[\"notes\"],[\"y\"])"
      }
    ],
    "provided": "编译好的父子图、共享 reducer 和 finish 节点",
    "connection": "这是多 Agent 的交接机制；传递可验证数据和权限边界比角色名字更重要。",
    "flow": [
      "业务输入与真实 LangGraph 运行时",
      "你实现：handoff",
      "图输出、快照或事件 → 下游使用"
    ]
  },
  {
    "id": "w11-1",
    "title": "Functional API：entrypoint 与 task",
    "story": "已有 Python 调用链无需重写成显式图。使用 task 包装清理与检索，用 entrypoint 管理工作流。",
    "setup": "import asyncio\nimport json\nfrom typing import TypedDict, Annotated, Literal\nfrom operator import add\nfrom dataclasses import dataclass\nfrom langgraph.graph import StateGraph, START, END, MessagesState\nfrom langgraph.graph.state import CompiledStateGraph\nfrom langgraph.checkpoint.memory import InMemorySaver\nfrom langgraph.types import Command, Send, interrupt, RetryPolicy, CachePolicy\nfrom langgraph.runtime import Runtime\nfrom langgraph.store.memory import InMemoryStore\nfrom langgraph.cache.memory import InMemoryCache\n\nfrom langgraph.func import entrypoint, task\nfrom langgraph.pregel import Pregel\n@task\ndef normalize_task(query):\n    return query.strip()\n@task\ndef retrieve_task(query):\n    return {\"answer\":\"task:\"+query}",
    "signature": "def build_workflow():",
    "requirements": [
      "函数返回 @entrypoint() 装饰后的工作流对象。",
      "调用 normalize_task(...).result() 后，把结果传给 retrieve_task(...).result()。",
      "保留 task 边界，为后面的持久执行和恢复做准备。"
    ],
    "entry": "    return build_workflow().invoke(\" graph \")",
    "expected": {
      "answer": "task:graph"
    },
    "tests": [
      {
        "name": "返回真实 Pregel 工作流",
        "code": "w=build_workflow()\nexpect_equal(isinstance(w,Pregel),True)\nexpect_equal(w.invoke(\" a \"),{\"answer\":\"task:a\"})"
      },
      {
        "name": "空文本和重复调用独立",
        "code": "w=build_workflow()\nexpect_equal(w.invoke(\" \"),{\"answer\":\"task:\"})\nexpect_equal(w.invoke(\"b\"),{\"answer\":\"task:b\"})"
      },
      {
        "name": "task 事件能被流式观察",
        "code": "events=list(build_workflow().stream(\"x\",stream_mode=\"updates\"))\nexpect_equal(any(\"normalize_task\" in e for e in events),True)\nexpect_equal(any(\"retrieve_task\" in e for e in events),True)"
      }
    ],
    "provided": "两个真实 task 与 Pregel 类型",
    "connection": "Graph API 和 Functional API 共享运行时；选择适合现有项目控制流的表达方式。",
    "flow": [
      "业务输入与真实 LangGraph 运行时",
      "你实现：build_workflow",
      "图输出、快照或事件 → 下游使用"
    ]
  },
  {
    "id": "w11-2",
    "title": "异步节点、ainvoke 与并发 I/O",
    "story": "同一节点要查询多个数据源。让异步图节点并发等待，并验证有异常时运行不会被误报成功。",
    "setup": "import asyncio\nimport json\nfrom typing import TypedDict, Annotated, Literal\nfrom operator import add\nfrom dataclasses import dataclass\nfrom langgraph.graph import StateGraph, START, END, MessagesState\nfrom langgraph.graph.state import CompiledStateGraph\nfrom langgraph.checkpoint.memory import InMemorySaver\nfrom langgraph.types import Command, Send, interrupt, RetryPolicy, CachePolicy\nfrom langgraph.runtime import Runtime\nfrom langgraph.store.memory import InMemoryStore\nfrom langgraph.cache.memory import InMemoryCache\n\nclass State(TypedDict):\n    queries: list[str]\n    documents: list[str]\nasync def example_fetch(query):\n    await asyncio.sleep(0)\n    return \"doc:\"+query",
    "signature": "def build_graph(fetch):",
    "requirements": [
      "节点使用 async def，并 await asyncio.gather 处理所有 queries。",
      "返回编译后的图，通过 await graph.ainvoke 调用。",
      "保持输入顺序；空输入返回空列表；请求异常原样抛出。"
    ],
    "entry": "    r=asyncio.run(build_graph(example_fetch).ainvoke({\"queries\":[\"a\",\"b\"]}))\n    return {\"documents\":r[\"documents\"]}",
    "expected": {
      "documents": [
        "doc:a",
        "doc:b"
      ]
    },
    "tests": [
      {
        "name": "实际存在重叠的异步请求",
        "code": "async def check():\n    active=0\n    peak=0\n    async def fetch(q):\n        nonlocal active,peak\n        active+=1\n        peak=max(peak,active)\n        await asyncio.sleep(0.01)\n        active-=1\n        return q\n    r=await build_graph(fetch).ainvoke({\"queries\":[\"a\",\"b\",\"c\"]})\n    expect_equal(peak>=2,True)\n    expect_equal(r[\"documents\"],[\"a\",\"b\",\"c\"])\nasyncio.run(check())"
      },
      {
        "name": "空输入不调用 fetch",
        "code": "expect_equal(asyncio.run(build_graph(example_fetch).ainvoke({\"queries\":[]}))[\"documents\"],[])"
      },
      {
        "name": "异常不会变成成功的文档",
        "code": "async def fail(q):\n    raise ValueError(\"bad source\")\nexpect_raises(ValueError,lambda:asyncio.run(build_graph(fail).ainvoke({\"queries\":[\"a\"]})))"
      }
    ],
    "provided": "异步数据源与标准 asyncio",
    "connection": "网络客户端必须支持异步；下一阶段把重试、并发限制和超时作为独立策略。",
    "flow": [
      "业务输入与真实 LangGraph 运行时",
      "你实现：build_graph",
      "图输出、快照或事件 → 下游使用"
    ]
  },
  {
    "id": "w11-3",
    "title": "Store 跨线程记忆与 namespace",
    "story": "用户确认的偏好需要跨会话保留。把它写到按 user_id 隔离的 Store，未确认的信息不能覆盖偏好。",
    "setup": "import asyncio\nimport json\nfrom typing import TypedDict, Annotated, Literal\nfrom operator import add\nfrom dataclasses import dataclass\nfrom langgraph.graph import StateGraph, START, END, MessagesState\nfrom langgraph.graph.state import CompiledStateGraph\nfrom langgraph.checkpoint.memory import InMemorySaver\nfrom langgraph.types import Command, Send, interrupt, RetryPolicy, CachePolicy\nfrom langgraph.runtime import Runtime\nfrom langgraph.store.memory import InMemoryStore\nfrom langgraph.cache.memory import InMemoryCache\n\n@dataclass\nclass Context:\n    user_id: str\nclass State(TypedDict):\n    language: str\n    confirmed: bool\n    preference: str\ndef build_graph(store):\n    b=StateGraph(State,context_schema=Context)\n    b.add_node(\"memory\",memory_node)\n    b.add_edge(START,\"memory\")\n    b.add_edge(\"memory\",END)\n    return b.compile(store=store)",
    "signature": "def memory_node(state: State, runtime: Runtime[Context]):",
    "requirements": [
      "namespace=(user_id, \"preferences\")，key=\"profile\"。",
      "confirmed 为 True 才把 {language} 写入 runtime.store。",
      "读取同一 namespace 的 profile；没有时返回 default。"
    ],
    "entry": "    store=InMemoryStore()\n    g=build_graph(store)\n    g.invoke({\"language\":\"zh\",\"confirmed\":True},context=Context(\"alice\"))\n    return {\"alice\":g.invoke({\"confirmed\":False},context=Context(\"alice\"))[\"preference\"],\"bob\":g.invoke({\"confirmed\":False},context=Context(\"bob\"))[\"preference\"]}",
    "expected": {
      "alice": "zh",
      "bob": "default"
    },
    "tests": [
      {
        "name": "换一张图仍能读取同用户记忆",
        "code": "s=InMemoryStore()\nbuild_graph(s).invoke({\"language\":\"zh\",\"confirmed\":True},context=Context(\"a\"))\nr=build_graph(s).invoke({\"confirmed\":False},context=Context(\"a\"))\nexpect_equal(r[\"preference\"],\"zh\")"
      },
      {
        "name": "不同 namespace 不共享偏好",
        "code": "s=InMemoryStore()\ng=build_graph(s)\ng.invoke({\"language\":\"en\",\"confirmed\":True},context=Context(\"a\"))\nexpect_equal(g.invoke({\"confirmed\":False},context=Context(\"b\"))[\"preference\"],\"default\")"
      },
      {
        "name": "未确认信息不覆盖已确认记忆",
        "code": "s=InMemoryStore()\ng=build_graph(s)\ng.invoke({\"language\":\"zh\",\"confirmed\":True},context=Context(\"a\"))\nr=g.invoke({\"language\":\"en\",\"confirmed\":False},context=Context(\"a\"))\nexpect_equal(r[\"preference\"],\"zh\")"
      }
    ],
    "provided": "Runtime、InMemoryStore、身份 Context 与图工厂",
    "connection": "Checkpointer 保存线程过程，Store 保存跨线程事实；生产改用持久 Store 并执行删除与更新策略。",
    "flow": [
      "业务输入与真实 LangGraph 运行时",
      "你实现：memory_node",
      "图输出、快照或事件 → 下游使用"
    ]
  },
  {
    "id": "w11-4",
    "title": "持久执行、task 重用与副作用边界",
    "story": "准备研究资料会产生一次本地事件记录，之后等待确认。恢复工作流时，已完成的准备任务不能再次执行。",
    "setup": "import asyncio\nimport json\nfrom typing import TypedDict, Annotated, Literal\nfrom operator import add\nfrom dataclasses import dataclass\nfrom langgraph.graph import StateGraph, START, END, MessagesState\nfrom langgraph.graph.state import CompiledStateGraph\nfrom langgraph.checkpoint.memory import InMemorySaver\nfrom langgraph.types import Command, Send, interrupt, RetryPolicy, CachePolicy\nfrom langgraph.runtime import Runtime\nfrom langgraph.store.memory import InMemoryStore\nfrom langgraph.cache.memory import InMemoryCache\n\nfrom langgraph.func import entrypoint, task",
    "signature": "def build_workflow(checkpointer, prepare):",
    "requirements": [
      "把 prepare(request_id) 包装为 @task。",
      "@entrypoint(checkpointer=...) 内先取 task 结果，再 interrupt 请求确认。",
      "恢复后返回 {event, approved}；不要把外部副作用直接写在会重放的 entrypoint 中。"
    ],
    "entry": "    calls=[]\n    w=build_workflow(InMemorySaver(),lambda key:calls.append(key) or \"event:\"+key)\n    c={\"configurable\":{\"thread_id\":\"durable\"}}\n    w.invoke(\"r1\",c)\n    r=w.invoke(Command(resume=True),c)\n    return {\"result\":r,\"calls\":calls}",
    "expected": {
      "result": {
        "event": "event:r1",
        "approved": true
      },
      "calls": [
        "r1"
      ]
    },
    "tests": [
      {
        "name": "恢复时已完成 task 不重做",
        "code": "calls=[]\nw=build_workflow(InMemorySaver(),lambda k:calls.append(k) or k)\nc={\"configurable\":{\"thread_id\":\"a\"}}\nw.invoke(\"r1\",c)\nexpect_equal(w.invoke(Command(resume=True),c),{\"event\":\"r1\",\"approved\":True})\nexpect_equal(calls,[\"r1\"])"
      },
      {
        "name": "拒绝值被保留且不会重复准备",
        "code": "calls=[]\nw=build_workflow(InMemorySaver(),lambda k:calls.append(k) or k)\nc={\"configurable\":{\"thread_id\":\"b\"}}\nw.invoke(\"r2\",c)\nexpect_equal(w.invoke(Command(resume=False),c)[\"approved\"],False)\nexpect_equal(calls,[\"r2\"])"
      },
      {
        "name": "不同线程独立执行准备",
        "code": "calls=[]\nw=build_workflow(InMemorySaver(),lambda k:calls.append(k) or k)\nfor key in [\"a\",\"b\"]:\n    c={\"configurable\":{\"thread_id\":key}}\n    w.invoke(key,c)\n    w.invoke(Command(resume=True),c)\nexpect_equal(calls,[\"a\",\"b\"])"
      }
    ],
    "provided": "准备函数参数、真实 task、entrypoint 与 saver",
    "connection": "task 重用减少正常恢复时的重复执行；数据库写入仍要用幂等键处理提交与 checkpoint 之间的故障窗口。",
    "flow": [
      "业务输入与真实 LangGraph 运行时",
      "你实现：build_workflow",
      "图输出、快照或事件 → 下游使用"
    ]
  },
  {
    "id": "w12-1",
    "title": "用图构建有证据门槛的 Agentic RAG",
    "story": "先检索，再检查证据；最多改写一次查询，没有证据就拒答。这里的检索数据固定，图控制流是真实 LangGraph。",
    "setup": "import asyncio\nimport json\nfrom typing import TypedDict, Annotated, Literal\nfrom operator import add\nfrom dataclasses import dataclass\nfrom langgraph.graph import StateGraph, START, END, MessagesState\nfrom langgraph.graph.state import CompiledStateGraph\nfrom langgraph.checkpoint.memory import InMemorySaver\nfrom langgraph.types import Command, Send, interrupt, RetryPolicy, CachePolicy\nfrom langgraph.runtime import Runtime\nfrom langgraph.store.memory import InMemoryStore\nfrom langgraph.cache.memory import InMemoryCache\n\nclass State(TypedDict):\n    query: str\n    rewrites: int\n    docs: list[str]\n    answer: str\ndef retrieve(state):\n    return {\"docs\":[\"note:graph\"] if state[\"query\"]==\"graph\" else []}\ndef rewrite(state):\n    return {\"query\":\"graph\" if state[\"query\"]==\"graphs\" else state[\"query\"],\"rewrites\":state[\"rewrites\"]+1}\ndef answer(state):\n    return {\"answer\":\"依据 \"+state[\"docs\"][0]}\ndef refuse(state):\n    return {\"answer\":\"证据不足\"}",
    "signature": "def build_graph():",
    "requirements": [
      "retrieve 后有 docs 就 answer；无 docs 且 rewrites<1 则 rewrite，否则 refuse。",
      "rewrite 返回 retrieve；answer 和 refuse 结束。",
      "回答必须使用实际检索来源，不能给无证据查询编造引用。"
    ],
    "entry": "    return build_graph().invoke({\"query\":\"graphs\",\"rewrites\":0},{\"recursion_limit\":20})",
    "expected": {
      "query": "graph",
      "rewrites": 1,
      "docs": [
        "note:graph"
      ],
      "answer": "依据 note:graph"
    },
    "tests": [
      {
        "name": "已有证据不需要改写",
        "code": "r=build_graph().invoke({\"query\":\"graph\",\"rewrites\":0},{\"recursion_limit\":20})\nexpect_equal((r[\"answer\"],r[\"rewrites\"]),(\"依据 note:graph\",0))"
      },
      {
        "name": "一次改写补足证据",
        "code": "r=build_graph().invoke({\"query\":\"graphs\",\"rewrites\":0},{\"recursion_limit\":20})\nexpect_equal((r[\"answer\"],r[\"rewrites\"]),(\"依据 note:graph\",1))"
      },
      {
        "name": "无证据有明确退出",
        "code": "r=build_graph().invoke({\"query\":\"unknown\",\"rewrites\":0},{\"recursion_limit\":20})\nexpect_equal((r[\"answer\"],r[\"rewrites\"]),(\"证据不足\",1))"
      }
    ],
    "provided": "固定检索库、改写器与回答节点",
    "connection": "在第 4 周的基础逻辑上使用真实图；生产时分别评估检索命中与答案引用支持关系。",
    "flow": [
      "业务输入与真实 LangGraph 运行时",
      "你实现：build_graph",
      "图输出、快照或事件 → 下游使用"
    ]
  },
  {
    "id": "w12-2",
    "title": "Evaluator-Optimizer 有界评审循环",
    "story": "草稿由评审器检查，最多修订一次。即使第二次评审仍失败，也要进入明确的失败出口。",
    "setup": "import asyncio\nimport json\nfrom typing import TypedDict, Annotated, Literal\nfrom operator import add\nfrom dataclasses import dataclass\nfrom langgraph.graph import StateGraph, START, END, MessagesState\nfrom langgraph.graph.state import CompiledStateGraph\nfrom langgraph.checkpoint.memory import InMemorySaver\nfrom langgraph.types import Command, Send, interrupt, RetryPolicy, CachePolicy\nfrom langgraph.runtime import Runtime\nfrom langgraph.store.memory import InMemoryStore\nfrom langgraph.cache.memory import InMemoryCache\n\nclass State(TypedDict):\n    draft: str\n    revisions: int\n    passed: bool\n    status: str\ndef revise(state):\n    return {\"draft\":state[\"draft\"]+\" [citation]\",\"revisions\":state[\"revisions\"]+1}\ndef finish(state):\n    return {\"status\":\"accepted\" if state[\"passed\"] else \"needs_review\"}",
    "signature": "def build_graph(review):",
    "requirements": [
      "review 节点调用传入评审器并写入 passed。",
      "不通过且 revisions<1 才 revise，然后回到 review。",
      "通过或达到上限都进入 finish，避免两个角色无限互相调用。"
    ],
    "entry": "    return build_graph(lambda draft:\"[citation]\" in draft).invoke({\"draft\":\"answer\",\"revisions\":0},{\"recursion_limit\":20})",
    "expected": {
      "draft": "answer [citation]",
      "revisions": 1,
      "passed": true,
      "status": "accepted"
    },
    "tests": [
      {
        "name": "一次修订后通过",
        "code": "r=build_graph(lambda d:\"[citation]\" in d).invoke({\"draft\":\"x\",\"revisions\":0},{\"recursion_limit\":20})\nexpect_equal((r[\"revisions\"],r[\"status\"]),(1,\"accepted\"))"
      },
      {
        "name": "原草稿通过则不修订",
        "code": "r=build_graph(lambda d:True).invoke({\"draft\":\"x\",\"revisions\":0},{\"recursion_limit\":20})\nexpect_equal((r[\"draft\"],r[\"revisions\"]),(\"x\",0))"
      },
      {
        "name": "持续失败也有次数上限",
        "code": "calls=[]\ng=build_graph(lambda d:calls.append(d) or False)\nr=g.invoke({\"draft\":\"x\",\"revisions\":0},{\"recursion_limit\":20})\nexpect_equal((len(calls),r[\"revisions\"],r[\"status\"]),(2,1,\"needs_review\"))"
      }
    ],
    "provided": "可注入的评审器、修订节点与终止节点",
    "connection": "评审循环也是多 Agent 协议的一部分；上限、证据与成本都应进入验收。",
    "flow": [
      "业务输入与真实 LangGraph 运行时",
      "你实现：build_graph",
      "图输出、快照或事件 → 下游使用"
    ]
  },
  {
    "id": "w12-3",
    "title": "RetryPolicy 与按用户隔离的节点缓存",
    "story": "检索会暂时超时，重复请求又不应浪费调用。让框架执行有限重试，并为不同用户使用不同缓存键。",
    "setup": "import asyncio\nimport json\nfrom typing import TypedDict, Annotated, Literal\nfrom operator import add\nfrom dataclasses import dataclass\nfrom langgraph.graph import StateGraph, START, END, MessagesState\nfrom langgraph.graph.state import CompiledStateGraph\nfrom langgraph.checkpoint.memory import InMemorySaver\nfrom langgraph.types import Command, Send, interrupt, RetryPolicy, CachePolicy\nfrom langgraph.runtime import Runtime\nfrom langgraph.store.memory import InMemoryStore\nfrom langgraph.cache.memory import InMemoryCache\n\nclass State(TypedDict):\n    user: str\n    query: str\n    answer: str",
    "signature": "def build_graph(backend, cache):",
    "requirements": [
      "retrieve 节点使用 RetryPolicy：最多 3 次，只重试 TimeoutError。",
      "CachePolicy ttl=60；key_func 使用 user 与 query 的 JSON 字符串。",
      "compile(cache=cache)，ValueError 不重试，不同用户不能命中对方缓存。"
    ],
    "entry": "    calls=[]\n    g=build_graph(lambda u,q:calls.append([u,q]) or u+\":\"+q,InMemoryCache())\n    a=g.invoke({\"user\":\"alice\",\"query\":\"graph\"})\n    g.invoke({\"user\":\"alice\",\"query\":\"graph\"})\n    b=g.invoke({\"user\":\"bob\",\"query\":\"graph\"})\n    return {\"answers\":[a[\"answer\"],b[\"answer\"]],\"backend_calls\":calls}",
    "expected": {
      "answers": [
        "alice:graph",
        "bob:graph"
      ],
      "backend_calls": [
        [
          "alice",
          "graph"
        ],
        [
          "bob",
          "graph"
        ]
      ]
    },
    "tests": [
      {
        "name": "暂时超时由框架重试",
        "code": "calls=[]\ndef backend(u,q):\n    calls.append(q)\n    if len(calls)<3: raise TimeoutError(\"busy\")\n    return \"ok\"\ng=build_graph(backend,InMemoryCache())\nexpect_equal(g.invoke({\"user\":\"a\",\"query\":\"x\"})[\"answer\"],\"ok\")\nexpect_equal(len(calls),3)"
      },
      {
        "name": "参数错误不重试",
        "code": "calls=[]\ndef backend(u,q):\n    calls.append(q)\n    raise ValueError(\"bad\")\ng=build_graph(backend,InMemoryCache())\nexpect_raises(ValueError,lambda:g.invoke({\"user\":\"a\",\"query\":\"x\"}))\nexpect_equal(len(calls),1)"
      },
      {
        "name": "缓存命中与租户隔离",
        "code": "calls=[]\ng=build_graph(lambda u,q:calls.append(u) or u,InMemoryCache())\ng.invoke({\"user\":\"a\",\"query\":\"x\"})\ng.invoke({\"user\":\"a\",\"query\":\"x\"})\nexpect_equal(g.invoke({\"user\":\"b\",\"query\":\"x\"})[\"answer\"],\"b\")\nexpect_equal(calls,[\"a\",\"b\"])"
      }
    ],
    "provided": "可注入后端、真实 Cache 与 RetryPolicy",
    "connection": "缓存键必须包含影响输出的上下文；持久化、缓存和幂等解决不同问题，不能互相替代。",
    "flow": [
      "业务输入与真实 LangGraph 运行时",
      "你实现：build_graph",
      "图输出、快照或事件 → 下游使用"
    ]
  },
  {
    "id": "w12-4",
    "title": "图回归评测与发布契约",
    "story": "发布前用固定数据集运行真实图，收集失败样本。每个评测样本使用独立 thread_id，避免记忆让测试互相污染。",
    "setup": "import asyncio\nimport json\nfrom typing import TypedDict, Annotated, Literal\nfrom operator import add\nfrom dataclasses import dataclass\nfrom langgraph.graph import StateGraph, START, END, MessagesState\nfrom langgraph.graph.state import CompiledStateGraph\nfrom langgraph.checkpoint.memory import InMemorySaver\nfrom langgraph.types import Command, Send, interrupt, RetryPolicy, CachePolicy\nfrom langgraph.runtime import Runtime\nfrom langgraph.store.memory import InMemoryStore\nfrom langgraph.cache.memory import InMemoryCache\n\nclass State(TypedDict):\n    query: str\n    answer: str\ndef normalize(state):\n    return {\"query\": state[\"query\"].strip()}\ndef answer(state):\n    return {\"answer\": \"笔记：\" + state[\"query\"]}\ndef build_graph():\n    builder = StateGraph(State)\n    builder.add_node(\"normalize\", normalize)\n    builder.add_node(\"answer\", answer)\n    builder.add_edge(START, \"normalize\")\n    builder.add_edge(\"normalize\", \"answer\")\n    builder.add_edge(\"answer\", END)\n    return builder.compile()",
    "signature": "def evaluate_graph(graph, rows):",
    "requirements": [
      "rows 每项包含 id、input、expected；id 重复抛 ValueError。",
      "每行调用 graph.invoke(input, {configurable:{thread_id:\"eval:\"+id}})。",
      "异常计为该样本失败；返回 count、success_rate 和失败 id 列表，空集成功率为 0。"
    ],
    "entry": "    rows=[{\"id\":\"good\",\"input\":{\"query\":\" graph \"},\"expected\":{\"query\":\"graph\",\"answer\":\"笔记：graph\"}},{\"id\":\"bad\",\"input\":{\"query\":\"x\"},\"expected\":{\"query\":\"x\",\"answer\":\"错误预期\"}}]\n    return evaluate_graph(build_graph(),rows)",
    "expected": {
      "count": 2,
      "success_rate": 0.5,
      "failures": [
        "bad"
      ]
    },
    "tests": [
      {
        "name": "真实图结果与固定预期比较",
        "code": "g=build_graph()\nrows=[{\"id\":\"a\",\"input\":{\"query\":\" x \"},\"expected\":{\"query\":\"x\",\"answer\":\"笔记：x\"}}]\nexpect_equal(evaluate_graph(g,rows),{\"count\":1,\"success_rate\":1,\"failures\":[]})"
      },
      {
        "name": "异常样本不会中断整个评测",
        "code": "rows=[{\"id\":\"bad\",\"input\":{},\"expected\":{}},{\"id\":\"good\",\"input\":{\"query\":\"a\"},\"expected\":{\"query\":\"a\",\"answer\":\"笔记：a\"}}]\nexpect_equal(evaluate_graph(build_graph(),rows),{\"count\":2,\"success_rate\":0.5,\"failures\":[\"bad\"]})"
      },
      {
        "name": "空集与重复 ID 有明确约定",
        "code": "g=build_graph()\nexpect_equal(evaluate_graph(g,[]),{\"count\":0,\"success_rate\":0,\"failures\":[]})\nrow={\"id\":\"x\",\"input\":{\"query\":\"x\"},\"expected\":{}}\nexpect_raises(ValueError,lambda:evaluate_graph(g,[row,row]))"
      }
    ],
    "provided": "真实顺序图、评测输入与预期结果",
    "connection": "本周实战把图导出为 agent.py:graph，编写 langgraph.json、依赖锁与故障演示，再按官方本地服务文档验证部署。",
    "flow": [
      "业务输入与真实 LangGraph 运行时",
      "你实现：evaluate_graph",
      "图输出、快照或事件 → 下游使用"
    ]
  }
] as const;

export const langgraphChallenges: Record<string, CodeChallenge> = Object.fromEntries(exercises.map(item => {
  const context: ChallengeContext = { title: item.title, story: item.story, flow: [...item.flow], connection: item.connection, provided: item.provided, setup: item.setup, entry: item.entry, expected: item.expected };
  return [item.id, { runtime: 'langgraph', title: item.title, scenario: item.story, requirements: [...item.requirements], context,
    starter: contextualizeCode(context, item.signature + '\n    """按要求使用真实 LangGraph API 完成组件。"""\n    raise NotImplementedError("请完成 LangGraph 组件")\n'),
    tests: [...item.tests, {name:'完整场景：真实图与上下游得到预期结果', code: 'expect_equal(run_scenario(), json.loads(' + JSON.stringify(JSON.stringify(item.expected)) + '))'}] }];
}));
