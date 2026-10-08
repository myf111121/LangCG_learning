import { snippetCompletion, type Completion, type CompletionContext, type CompletionResult, type CompletionSource } from '@codemirror/autocomplete';

const item = (label: string, type: string, detail: string, info: string, boost = 0): Completion => ({ label, type, detail, info, boost });
const call = (label: string, template: string, detail: string, info: string, boost = 0): Completion => snippetCompletion(template, { label, type: 'method', detail, info, boost });

const statementSnippets: Completion[] = [
  snippetCompletion('def ${name}(${parameters}):\n\t${pass}', { label: 'def', type: 'keyword', detail: '定义函数', info: '创建同步函数并自动缩进函数体。', boost: 90 }),
  snippetCompletion('async def ${name}(${parameters}):\n\t${pass}', { label: 'async def', type: 'keyword', detail: '定义异步函数', info: '创建可以使用 await 的异步函数。', boost: 88 }),
  snippetCompletion('if ${condition}:\n\t${pass}', { label: 'if', type: 'keyword', detail: '条件判断', info: '创建带自动缩进的条件分支。', boost: 82 }),
  snippetCompletion('for ${item} in ${items}:\n\t${pass}', { label: 'for', type: 'keyword', detail: '遍历数据', info: '遍历可迭代对象。', boost: 80 }),
  snippetCompletion('while ${condition}:\n\t${pass}', { label: 'while', type: 'keyword', detail: '条件循环', info: '按条件重复执行代码。', boost: 76 }),
  snippetCompletion('try:\n\t${pass}\nexcept ${Exception} as ${error}:\n\t${pass}', { label: 'try', type: 'keyword', detail: '处理异常', info: '创建 try/except 异常处理结构。', boost: 78 }),
  snippetCompletion('with ${expression} as ${name}:\n\t${pass}', { label: 'with', type: 'keyword', detail: '上下文管理', info: '安全管理文件、连接等资源。', boost: 74 }),
  snippetCompletion('class ${Name}:\n\tdef __init__(self, ${parameters}):\n\t\t${pass}', { label: 'class', type: 'keyword', detail: '定义类', info: '创建包含初始化方法的类。', boost: 72 }),
];

const graphBuilderMembers: Completion[] = [
  call('add_node', 'add_node("${name}", ${action})', '(name, action)', '向 StateGraph 注册一个执行节点。', 100),
  call('add_edge', 'add_edge(${start}, ${end})', '(start, end)', '连接两个节点；也可以使用 START 和 END。', 98),
  call('add_conditional_edges', 'add_conditional_edges("${source}", ${path})', '(source, path, path_map=None)', '根据路由函数的结果选择下一节点。', 96),
  call('compile', 'compile()', '(checkpointer=None, store=None)', '把图构建器编译为可执行图。', 94),
  call('set_entry_point', 'set_entry_point("${node}")', '(node)', '设置入口节点。新代码通常优先连接 START。', 70),
  call('set_finish_point', 'set_finish_point("${node}")', '(node)', '设置结束节点。新代码通常优先连接 END。', 68),
];

const compiledGraphMembers: Completion[] = [
  call('invoke', 'invoke(${input}, ${config})', '(input, config=None)', '同步执行图并返回最终状态。', 100),
  call('ainvoke', 'ainvoke(${input}, ${config})', '(input, config=None)', '异步执行图并返回最终状态。', 98),
  call('stream', 'stream(${input}, ${config}, stream_mode="${updates}")', '(input, config=None, stream_mode=...)', '同步迭代图的流式事件。', 96),
  call('astream', 'astream(${input}, ${config}, stream_mode="${updates}")', '(input, config=None, stream_mode=...)', '异步迭代图的流式事件。', 94),
  call('get_state', 'get_state(${config})', '(config)', '读取指定线程的最新状态快照。', 88),
  call('get_state_history', 'get_state_history(${config})', '(config)', '按时间倒序读取线程历史状态。', 86),
  call('update_state', 'update_state(${config}, ${values})', '(config, values, as_node=None)', '更新状态并创建新的检查点。', 84),
  call('get_graph', 'get_graph()', '()', '读取编译后的图结构。', 60),
];

const fastapiAppMembers: Completion[] = [
  call('get', 'get("${path}")', '(path, ...)', '注册 GET 路径操作。', 100),
  call('post', 'post("${path}")', '(path, ...)', '注册 POST 路径操作。', 100),
  call('patch', 'patch("${path}")', '(path, ...)', '注册 PATCH 路径操作。', 94),
  call('delete', 'delete("${path}")', '(path, ...)', '注册 DELETE 路径操作。', 94),
  call('websocket', 'websocket("${path}")', '(path, ...)', '注册 WebSocket 路径。', 88),
  call('include_router', 'include_router(${router}, prefix="${prefix}")', '(router, ...)', '把 APIRouter 装配进应用。', 90),
  call('add_middleware', 'add_middleware(${Middleware})', '(middleware_class, ...)', '为应用添加 ASGI middleware。', 82),
  call('exception_handler', 'exception_handler(${Exception})', '(exc_class_or_status_code)', '注册异常处理器。', 78),
  call('openapi', 'openapi()', '()', '生成或读取 OpenAPI schema。', 72),
];

const testClientMembers: Completion[] = [
  call('get', 'get("${path}")', '(url, ...)', '向测试应用发送 GET 请求。', 92),
  call('post', 'post("${path}", json=${payload})', '(url, ...)', '向测试应用发送 POST 请求。', 92),
  call('patch', 'patch("${path}", json=${payload})', '(url, ...)', '向测试应用发送 PATCH 请求。', 86),
  call('delete', 'delete("${path}")', '(url, ...)', '向测试应用发送 DELETE 请求。', 86),
  call('websocket_connect', 'websocket_connect("${path}")', '(url, ...)', '打开测试 WebSocket 连接。', 80),
];

const dictMembers: Completion[] = [
  call('get', 'get(${key}, ${default})', '(key, default=None)', '读取键；不存在时返回默认值。', 80),
  call('items', 'items()', '()', '迭代键和值。', 72),
  call('keys', 'keys()', '()', '迭代所有键。', 68),
  call('values', 'values()', '()', '迭代所有值。', 68),
  call('update', 'update(${other})', '(other)', '批量更新字典。', 64),
  call('setdefault', 'setdefault(${key}, ${default})', '(key, default=None)', '读取键并在缺失时写入默认值。', 60),
  call('copy', 'copy()', '()', '创建浅拷贝。', 52),
];

const listMembers: Completion[] = [
  call('append', 'append(${item})', '(item)', '把一个元素添加到列表末尾。', 82),
  call('extend', 'extend(${items})', '(items)', '把多个元素添加到列表末尾。', 76),
  call('insert', 'insert(${index}, ${item})', '(index, item)', '在指定位置插入元素。', 64),
  call('pop', 'pop(${index})', '(index=-1)', '删除并返回指定位置的元素。', 62),
  call('sort', 'sort(key=${key}, reverse=${False})', '(key=None, reverse=False)', '原地排序列表。', 60),
  call('copy', 'copy()', '()', '创建浅拷贝。', 52),
];

const stringMembers: Completion[] = [
  call('strip', 'strip()', '(chars=None)', '移除两端空白或指定字符。', 82),
  call('split', 'split(${separator})', '(sep=None, maxsplit=-1)', '把字符串拆分为列表。', 76),
  call('join', 'join(${items})', '(iterable)', '使用当前字符串连接多个元素。', 72),
  call('replace', 'replace(${old}, ${new})', '(old, new, count=-1)', '替换字符串片段。', 70),
  call('startswith', 'startswith(${prefix})', '(prefix)', '判断字符串是否以指定前缀开始。', 60),
  call('lower', 'lower()', '()', '转换为小写。', 52),
];

const storeMembers: Completion[] = [
  call('put', 'put(${namespace}, ${key}, ${value})', '(namespace, key, value)', '向长期记忆 Store 写入数据。', 90),
  call('get', 'get(${namespace}, ${key})', '(namespace, key)', '读取长期记忆 Store 中的数据。', 88),
  call('search', 'search(${namespace_prefix})', '(namespace_prefix, ...)', '搜索 namespace 下的记忆。', 82),
  call('delete', 'delete(${namespace}, ${key})', '(namespace, key)', '删除一条长期记忆。', 60),
];

const runtimeMembers: Completion[] = [
  item('context', 'property', '运行上下文', '读取本次运行传入的 context_schema 数据。', 90),
  item('store', 'property', '长期记忆 Store', '访问编译图时注入的 Store。', 84),
  item('stream_writer', 'property', '自定义流写入器', '发送自定义流事件。', 70),
];

const messageMembers: Completion[] = [
  item('content', 'property', '消息内容', '读取消息文本或结构化内容。', 86),
  item('id', 'property', '消息 ID', '读取用于消息合并的稳定 ID。', 72),
  item('tool_calls', 'property', '工具调用列表', '读取 AIMessage 请求的工具调用。', 80),
  item('type', 'property', '消息类型', '读取消息的标准类型标识。', 54),
];

const moduleMembers: Record<string, Completion[]> = {
  asyncio: [
    call('gather', 'gather(${tasks})', '(*aws)', '并发等待多个异步任务。', 90),
    call('sleep', 'sleep(${delay})', '(delay)', '异步等待指定时间。', 78),
    call('create_task', 'create_task(${coroutine})', '(coro)', '把协程调度为 Task。', 72),
    call('run', 'run(${coroutine})', '(main)', '从同步入口运行协程。', 62),
  ],
  json: [
    call('dumps', 'dumps(${value}, ensure_ascii=False)', '(obj, ...)', '把 Python 对象编码为 JSON 字符串。', 86),
    call('loads', 'loads(${text})', '(str)', '把 JSON 字符串解析为 Python 对象。', 84),
    call('dump', 'dump(${value}, ${file}, ensure_ascii=False)', '(obj, fp, ...)', '把 JSON 写入文件对象。', 60),
    call('load', 'load(${file})', '(fp)', '从文件对象读取 JSON。', 58),
  ],
  pathlib: [item('Path', 'class', '(path)', '面向对象的文件系统路径。', 80)],
};

const moduleExports: Record<string, Completion[]> = {
  typing: ['TypedDict', 'Annotated', 'Literal', 'Any', 'Callable', 'Iterable', 'Sequence', 'Protocol'].map(label => item(label, label === 'Any' ? 'type' : 'class', 'typing', 'Python 类型标注工具。', 40)),
  'typing_extensions': ['TypedDict', 'Annotated', 'Literal', 'Protocol'].map(label => item(label, 'class', 'typing_extensions', '兼容版本的类型标注工具。', 40)),
  'operator': [item('add', 'function', '(a, b)', '常用于 Annotated 字段的累加 reducer。', 70)],
  'dataclasses': [item('dataclass', 'function', '@dataclass', '把类转换为数据类。', 70), item('field', 'function', '(...)', '配置数据类字段。', 50)],
  'pathlib': moduleMembers.pathlib,
  'langgraph.graph': [
    item('StateGraph', 'class', '(state_schema, ...)', 'LangGraph 状态图构建器。', 100),
    item('START', 'constant', '图入口', '连接图的虚拟入口节点。', 92),
    item('END', 'constant', '图出口', '连接图的虚拟结束节点。', 92),
    item('MessagesState', 'class', '消息状态', '内置使用 add_messages reducer 的消息状态。', 84),
  ],
  'langgraph.graph.state': [item('CompiledStateGraph', 'class', '已编译状态图', 'StateGraph.compile() 的返回类型。', 80)],
  'langgraph.types': [
    item('Command', 'class', '(update=None, goto=..., resume=...)', '同时更新状态、跳转或恢复中断。', 96),
    item('Send', 'class', '(node, arg)', '动态向节点分发工作项。', 92),
    item('interrupt', 'function', '(value)', '暂停图并向调用方返回审批数据。', 94),
    item('RetryPolicy', 'class', '(...)', '配置节点重试策略。', 76),
    item('CachePolicy', 'class', '(...)', '配置节点缓存策略。', 72),
  ],
  'langgraph.prebuilt': [item('ToolNode', 'class', '(tools)', '执行 AIMessage 中的工具调用。', 92), item('tools_condition', 'function', '(state)', '根据最后一条消息路由到工具或 END。', 90)],
  'langgraph.checkpoint.memory': [item('InMemorySaver', 'class', '()', '用于开发和测试的内存 checkpointer。', 84)],
  'langgraph.checkpoint.sqlite': [item('SqliteSaver', 'class', '(connection)', '将 checkpoint 持久化到 SQLite。', 84)],
  'langgraph.store.memory': [item('InMemoryStore', 'class', '()', '用于开发和测试的内存长期记忆 Store。', 84)],
  'langgraph.runtime': [item('Runtime', 'class', '[ContextT]', '向节点注入上下文、Store 和流写入器。', 84)],
  'langgraph.func': [item('entrypoint', 'function', '装饰器', '声明 Functional API 工作流入口。', 86), item('task', 'function', '装饰器', '声明可重放、可缓存的任务。', 84)],
  'langchain_core.messages': ['HumanMessage', 'AIMessage', 'ToolMessage', 'SystemMessage'].map(label => item(label, 'class', '(content=..., ...)', 'LangChain 结构化消息类型。', 70)),
  'langchain_core.tools': [item('tool', 'function', '装饰器', '把带类型和文档字符串的函数转换为工具。', 82)],
  fastapi: ['FastAPI', 'APIRouter', 'Depends', 'Security', 'HTTPException', 'Path', 'Query', 'Header', 'Request', 'Response', 'BackgroundTasks', 'WebSocket', 'WebSocketDisconnect', 'status'].map(label => item(label, /^(FastAPI|APIRouter|Request|Response|BackgroundTasks|WebSocket|WebSocketDisconnect)$/.test(label) ? 'class' : 'function', 'FastAPI', 'FastAPI 请求、响应、依赖或路由工具。', 78)),
  'fastapi.testclient': [item('TestClient', 'class', '(app)', '同步测试 ASGI 应用。', 88)],
  'fastapi.security': ['OAuth2PasswordBearer', 'OAuth2PasswordRequestForm', 'SecurityScopes'].map(label => item(label, 'class', 'FastAPI security', 'OAuth2 认证与授权工具。', 82)),
  pydantic: [item('BaseModel', 'class', 'Pydantic model', '声明请求或响应数据模型。', 88), item('Field', 'function', '(...)', '声明字段约束与元数据。', 78)],
  sqlmodel: ['SQLModel', 'Field', 'Session', 'create_engine', 'select'].map(label => item(label, label === 'Session' || label === 'SQLModel' ? 'class' : 'function', 'SQLModel', '数据库模型、会话与查询工具。', 76)),
};

function unique(options: Completion[]): Completion[] {
  const seen = new Set<string>();
  return options.filter(option => {
    const key = `${option.label}:${option.detail ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function activeScopeSymbols(before: string): Completion[] {
  const lines = before.split('\n');
  const currentIndent = /^\s*/.exec(lines.at(-1) ?? '')?.[0].length ?? 0;
  for (let index = lines.length - 2; index >= 0; index -= 1) {
    const match = /^(\s*)(?:async\s+)?def\s+[A-Za-z_]\w*\s*\(([^)]*)\)/.exec(lines[index]);
    if (!match) continue;
    const functionIndent = match[1].length;
    if (currentIndent <= functionIndent) return [];
    if (lines.slice(index + 1, -1).some(line => line.trim() && (/^\s*/.exec(line)?.[0].length ?? 0) <= functionIndent)) return [];
    const options: Completion[] = [];
    for (const parameter of match[2].split(',')) {
      const name = /^\s*([A-Za-z_]\w*)/.exec(parameter)?.[1];
      if (name && name !== 'self' && name !== 'cls') options.push(item(name, 'variable', '当前函数参数', '当前作用域可用的函数参数。', 118));
    }
    for (const line of lines.slice(index + 1)) {
      const assignment = /^\s+([A-Za-z_]\w*)\s*(?::[^=]+)?=/.exec(line);
      if (assignment) options.push(item(assignment[1], 'variable', '当前作用域', '当前函数中已经定义的变量。', 112));
    }
    return options;
  }
  return [];
}

function documentSymbols(code: string, before: string): Completion[] {
  const options: Completion[] = [];
  for (const match of code.matchAll(/^\s*(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/gm)) {
    options.push(item(match[1], 'function', `(${match[2].trim()})`, '当前文件中定义的函数。', 110));
  }
  for (const match of code.matchAll(/^\s*class\s+([A-Za-z_]\w*)/gm)) options.push(item(match[1], 'class', '当前文件', '当前文件中定义的类。', 108));
  for (const match of code.matchAll(/^([A-Za-z_]\w*)\s*(?::[^=\n]+)?=/gm)) options.push(item(match[1], 'variable', '当前文件', '当前文件中定义的全局变量。', 102));
  for (const match of code.matchAll(/^\s*from\s+[\w.]+\s+import\s+([^\n]+)/gm)) {
    for (const part of match[1].split(',')) {
      const imported = /\b([A-Za-z_]\w*)(?:\s+as\s+([A-Za-z_]\w*))?/.exec(part);
      if (imported) options.push(item(imported[2] ?? imported[1], 'variable', '已导入', '当前文件导入的符号。', 98));
    }
  }
  return unique([...activeScopeSymbols(before), ...options]);
}

function stateKeys(code: string): Completion[] {
  const labels = new Set<string>();
  for (const match of code.matchAll(/^\s{4,}([A-Za-z_]\w*)\s*:\s*[^=\n]+$/gm)) labels.add(match[1]);
  for (const match of code.matchAll(/["']([A-Za-z_]\w*)["']\s*:/g)) labels.add(match[1]);
  for (const match of code.matchAll(/\[["']([A-Za-z_]\w*)["']\]/g)) labels.add(match[1]);
  return [...labels].map(label => item(label, 'property', '状态字段', '从当前任务的 State 或业务数据中识别。', 120));
}

function importAliases(code: string): Map<string, string> {
  const aliases = new Map<string, string>();
  for (const match of code.matchAll(/^\s*import\s+([\w.]+)(?:\s+as\s+([A-Za-z_]\w*))?/gm)) aliases.set(match[2] ?? match[1].split('.')[0], match[1]);
  return aliases;
}

function memberKind(owner: string, code: string): string {
  const aliases = importAliases(code);
  if (aliases.has(owner)) return aliases.get(owner)!;
  if (new RegExp(`\\b${owner}\\s*=\\s*FastAPI\\s*\\(`).test(code)) return 'fastapi-app';
  if (new RegExp(`\\b${owner}\\s*=\\s*TestClient\\s*\\(`).test(code)) return 'test-client';
  if (new RegExp(`\\b${owner}\\s*=\\s*StateGraph\\s*\\(`).test(code)) return 'graph-builder';
  if (new RegExp(`\\b${owner}\\s*=.*\\.compile\\s*\\(`).test(code)) return 'compiled-graph';
  if (new RegExp(`\\b${owner}\\s*=\\s*(?:build_graph|make_graph)\\s*\\(`).test(code)) return 'compiled-graph';
  if (new RegExp(`\\b${owner}\\s*=\\s*(?:InMemoryStore)\\s*\\(`).test(code)) return 'store';
  if (new RegExp(`\\b${owner}\\s*(?::[^=\n]+)?=\\s*\\{`).test(code) || /^(state|result|config|payload|record|data)$/.test(owner)) return 'dict';
  if (new RegExp(`\\b${owner}\\s*(?::[^=\n]+)?=\\s*\\[`).test(code) || /^(items|rows|docs|documents|messages|results|tools|actions)$/.test(owner)) return 'list';
  if (new RegExp(`\\b${owner}\\s*(?::[^=\n]+)?=\\s*["']`).test(code) || /^(text|query|answer|content|name)$/.test(owner)) return 'str';
  if (new RegExp(`\\b${owner}\\s*:\s*Runtime`).test(code) || owner === 'runtime') return 'runtime';
  if (/^(builder|workflow|b)$/.test(owner)) return 'graph-builder';
  if (/^(graph|compiled)$/.test(owner)) return 'compiled-graph';
  if (owner === 'app') return code.includes('FastAPI') ? 'fastapi-app' : 'compiled-graph';
  if (/^(client|test_client)$/.test(owner)) return 'test-client';
  if (owner === 'store') return 'store';
  if (/^(message|last_message|last)$/.test(owner)) return 'message';
  if (owner === 'Command') return 'command';
  return '';
}

function memberOptions(kind: string): Completion[] {
  if (moduleMembers[kind]) return moduleMembers[kind];
  if (kind === 'graph-builder') return graphBuilderMembers;
  if (kind === 'compiled-graph') return compiledGraphMembers;
  if (kind === 'fastapi-app') return fastapiAppMembers;
  if (kind === 'test-client') return testClientMembers;
  if (kind === 'dict') return dictMembers;
  if (kind === 'list') return listMembers;
  if (kind === 'str') return stringMembers;
  if (kind === 'store') return storeMembers;
  if (kind === 'runtime') return runtimeMembers;
  if (kind === 'message') return messageMembers;
  if (kind === 'command') return [item('PARENT', 'constant', '父图', '从子图跳转到父图。', 90)];
  return [];
}

export const smartPythonCompletion: CompletionSource = (context: CompletionContext): CompletionResult | null => {
  const code = context.state.doc.toString();
  const before = code.slice(0, context.pos);

  const importMatch = /from\s+([\w.]+)\s+import\s+([A-Za-z_]\w*)?$/.exec(before);
  if (importMatch) {
    const partial = importMatch[2] ?? '';
    const options = moduleExports[importMatch[1]] ?? [];
    if (options.length) return { from: context.pos - partial.length, options, validFor: /^\w*$/ };
  }

  const keyMatch = /(?:\bstate|\bresult|\bconfig|\bpayload|\brecord|\bdata)\s*\[\s*["']([A-Za-z_]\w*)?$/.exec(before);
  if (keyMatch) {
    const partial = keyMatch[1] ?? '';
    const options = stateKeys(code);
    if (options.length) return { from: context.pos - partial.length, options, validFor: /^\w*$/ };
  }

  const memberMatch = /([A-Za-z_]\w*)\.([A-Za-z_]\w*)?$/.exec(before);
  if (memberMatch) {
    const partial = memberMatch[2] ?? '';
    const options = memberOptions(memberKind(memberMatch[1], code));
    if (options.length) return { from: context.pos - partial.length, options, validFor: /^\w*$/ };
  }

  const word = context.matchBefore(/[A-Za-z_]\w*/);
  if (!word && !context.explicit) return null;
  if (word && word.from === word.to && !context.explicit) return null;
  return {
    from: word?.from ?? context.pos,
    options: unique([...documentSymbols(code, before), ...statementSnippets]),
    validFor: /^\w*$/,
  };
};
