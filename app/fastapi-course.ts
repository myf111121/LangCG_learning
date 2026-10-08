import type { Lesson, Phase } from './curriculum.ts';
import { fastapiChallenges } from './fastapi-challenges.ts';

const official = 'https://fastapi.tiangolo.com/';
const source = (id: string, title: string, path: string, note: string) => ({ id, title, url: official + path, kind: '官方文档', note });

export const fastapiSources = [
  source('fa-tutorial', 'FastAPI · Tutorial', 'tutorial/', '官方教程总目录；按学习任务进入对应章节。'),
  source('fa-first', 'FastAPI · First Steps', 'tutorial/first-steps/', '应用实例、路径操作、开发服务与自动文档。'),
  source('fa-path', 'FastAPI · Path Parameters', 'tutorial/path-params/', '路径参数类型、顺序、枚举与校验。'),
  source('fa-query', 'FastAPI · Query Parameters and String Validations', 'tutorial/query-params-str-validations/', 'Annotated、Query、默认值与边界。'),
  source('fa-body', 'FastAPI · Request Body', 'tutorial/body/', '用 Pydantic 模型声明和验证 JSON 请求体。'),
  source('fa-response', 'FastAPI · Response Model', 'tutorial/response-model/', '响应验证、序列化、OpenAPI 与字段过滤。'),
  source('fa-status', 'FastAPI · Response Status Code', 'tutorial/response-status-code/', '用 HTTP 状态表达创建、无内容与错误语义。'),
  source('fa-errors', 'FastAPI · Handling Errors', 'tutorial/handling-errors/', 'HTTPException、自定义异常处理器和验证错误。'),
  source('fa-deps', 'FastAPI · Dependencies', 'tutorial/dependencies/', '依赖注入、子依赖、参数契约与复用。'),
  source('fa-yield', 'FastAPI · Dependencies with yield', 'tutorial/dependencies/dependencies-with-yield/', '资源获取、清理顺序与请求/函数作用域。'),
  source('fa-bigger', 'FastAPI · Bigger Applications', 'tutorial/bigger-applications/', 'APIRouter、多文件结构、前缀、标签与共享依赖。'),
  source('fa-middleware', 'FastAPI · Middleware', 'tutorial/middleware/', 'HTTP middleware 的请求、响应和执行顺序。'),
  source('fa-cors', 'FastAPI · CORS', 'tutorial/cors/', 'origin、预检、凭据和显式允许列表。'),
  source('fa-sql', 'FastAPI · SQL Databases', 'tutorial/sql-databases/', 'SQLModel 模型、Session 依赖与 CRUD 示例。'),
  source('fa-security', 'FastAPI · Security', 'tutorial/security/', 'OpenAPI security schemes、OAuth2 与认证授权边界。'),
  source('fa-jwt', 'FastAPI · OAuth2 with JWT', 'tutorial/security/oauth2-jwt/', '密码哈希、token 签发、JWT 校验与当前用户。'),
  source('fa-scopes', 'FastAPI · OAuth2 Scopes', 'advanced/security/oauth2-scopes/', 'SecurityScopes 与路径级细粒度权限。'),
  source('fa-async', 'FastAPI · Concurrency and async / await', 'async/', '依据依赖库选择 def 或 async def，理解并发与阻塞。'),
  source('fa-lifespan', 'FastAPI · Lifespan Events', 'advanced/events/', '推荐的启动/关闭资源生命周期管理。'),
  source('fa-background', 'FastAPI · Background Tasks', 'tutorial/background-tasks/', '响应后执行轻量任务及其适用范围。'),
  source('fa-websocket', 'FastAPI · WebSockets', 'advanced/websockets/', '接受连接、收发消息、依赖与断开处理。'),
  source('fa-testing', 'FastAPI · Testing', 'tutorial/testing/', '基于 HTTPX 的 TestClient 与 pytest 风格断言。'),
  source('fa-test-deps', 'FastAPI · Testing Dependencies', 'advanced/testing-dependencies/', '使用 dependency_overrides 隔离外部依赖。'),
  source('fa-async-tests', 'FastAPI · Async Tests', 'advanced/async-tests/', 'ASGITransport、AsyncClient 与异步测试边界。'),
  source('fa-deploy', 'FastAPI · Deployment Concepts', 'deployment/concepts/', 'HTTPS、启动、重启、复制、内存和迁移步骤。'),
  source('fa-docker', 'FastAPI · Containers', 'deployment/docker/', '基于官方 Python 镜像构建容器及进程策略。'),
  source('fa-workers', 'FastAPI · Server Workers', 'deployment/server-workers/', '单机多 worker 与容器编排下的复制选择。'),
  source('fa-otel', 'FastAPI · OpenTelemetry', 'advanced/opentelemetry/', '框架级 tracing、依赖、序列化和后台任务 span。'),
];

type Topic = { concept: string; refs: string[]; tags: string[]; reading: [string, string][] };
const topics: Topic[] = [
  {
    concept: '创建 FastAPI 实例和路径操作，理解 HTTP 方法、路径、返回值与 OpenAPI 的关系。', refs: ['fa-first', 'fa-tutorial'], tags: ['基础', 'FastAPI', 'OpenAPI'], reading: [
      ['从 Python 函数到 HTTP 接口', 'FastAPI 实例是应用入口，装饰器把 HTTP 方法和路径绑定到函数。函数返回的字典会被编码为 JSON；同步 def 和 async def 都可以成为路径操作。'],
      ['自动文档来自声明', 'title、version、tags、参数和响应类型共同生成 OpenAPI，再驱动 /docs。把 schema 当成客户端契约，而不只是调试页面。'],
      ['先建立可运行基线', '用 fastapi dev 启动开发服务，分别请求 /health、/docs 和 /openapi.json。记录状态码、Content-Type 和 schema 路径，为后续改动保留回归样本。'],
    ],
  },
  {
    concept: '用 Annotated、Path 与 Query 声明参数来源、类型、默认值和可验证边界。', refs: ['fa-path', 'fa-query'], tags: ['基础', 'Path', 'Query'], reading: [
      ['来源由函数签名表达', '路径中同名参数来自 URL path，普通标量通常来自 query。Annotated 把 Python 类型与 FastAPI 元数据放在一起，编辑器、验证器和 OpenAPI 使用同一份声明。'],
      ['约束在业务逻辑之前执行', 'ge、le、min_length 等规则让非法输入直接得到 422。业务函数只处理已经转换的 int、str 或 None，避免每个路径重复写解析分支。'],
      ['覆盖边界和默认值', '同时测试最小值、最大值、越界、错误类型、缺失可选值与默认值。固定路径要在动态路径之前声明，避免静态词被当作参数。'],
    ],
  },
  {
    concept: '使用 Pydantic 请求模型校验结构化 JSON，并把输入模型与公开响应模型分开。', refs: ['fa-body', 'fa-response'], tags: ['基础', 'Pydantic', 'Request body'], reading: [
      ['模型是数据边界', 'BaseModel 字段声明类型、必填性和约束。FastAPI 读取 JSON、验证并实例化模型；model_dump() 用于进入业务层或存储层。'],
      ['不要混淆输入与数据库记录', '创建请求没有数据库 ID，公开响应需要 ID，内部记录还可能有敏感字段。不同模型表达不同信任边界，比一个万能模型更清楚。'],
      ['验证失败也属于接口契约', '空字段、错误列表和缺失必填项应返回可预测的 422。检查 OpenAPI 中的 requestBody 与 response schema 是否和代码意图一致。'],
    ],
  },
  {
    concept: '通过 response_model、HTTPException 与状态码建立稳定、最小且不泄漏内部数据的响应。', refs: ['fa-response', 'fa-status', 'fa-errors'], tags: ['基础', 'Response model', 'HTTP errors'], reading: [
      ['响应模型既验证也过滤', 'FastAPI 会按响应声明验证、序列化并过滤返回值。即使存储对象包含 secret，客户端只应收到公开字段；这是数据边界，但不能替代真正的权限检查。'],
      ['状态码表达结果语义', '读取成功常用 200，创建使用 201，无响应体删除使用 204，找不到资源使用 404。状态码同时进入实际响应和 OpenAPI。'],
      ['抛出而不是返回错误对象', 'HTTPException 会立即终止当前请求并交给框架生成错误响应。用一致 detail 或错误 envelope，让客户端不必猜测每个接口的失败格式。'],
    ],
  },
  {
    concept: '用 Depends 和子依赖复用分页、认证、仓库等共享逻辑，并让声明进入 OpenAPI。', refs: ['fa-deps'], tags: ['核心', 'Depends', 'Dependency injection'], reading: [
      ['声明需要什么', '路径操作声明依赖的结果，而不是手工创建所有对象。FastAPI 构建依赖树、解析参数、按请求缓存结果并注入函数。'],
      ['依赖也是请求契约', '依赖中的 Header、Query 和 Security 声明会合并进最终 OpenAPI。分页和 API Key 因而可以复用，而不丢失文档或校验。'],
      ['保持边界可替换', '把 repository 作为 build_app 参数或依赖返回值，在测试中替换 Fake。依赖函数尽量只负责一个生命周期或策略，避免隐藏巨大的全局服务定位器。'],
    ],
  },
  {
    concept: '使用 yield 依赖包住资源生命周期，理解异常、清理时机与作用域。', refs: ['fa-yield', 'fa-deps'], tags: ['核心', 'yield dependency', 'Lifecycle'], reading: [
      ['yield 前获取，之后清理', '生成器依赖把 yield 值注入路径操作，finally 在成功或异常路径都执行。数据库 Session、文件句柄和短期客户端适合这一模式。'],
      ['异常不能被静默吞掉', '依赖捕获路径操作异常时，除非转换为明确 HTTPException，否则应重新抛出。吞掉异常会让错误处理与事务状态变得不可解释。'],
      ['请求资源与后台任务分离', '默认请求作用域的清理发生在响应周期末。后台任务需要自己创建资源，只传稳定 ID 或普通数据，不应继续使用即将关闭的 Session。'],
    ],
  },
  {
    concept: '用 APIRouter 和应用装配拆分模块，同时保持统一前缀、标签、依赖与响应声明。', refs: ['fa-bigger'], tags: ['工程', 'APIRouter', 'Application structure'], reading: [
      ['Router 是模块边界', '用户、笔记、管理等模块分别导出 APIRouter，主应用负责 include_router。prefix、tags、dependencies 和 responses 可在 Router 或装配点统一添加。'],
      ['避免导入副作用', '模块导入应定义路由，而不是立即连接数据库或读取远程资源。外部资源通过依赖或 lifespan 注入，测试和启动更可控。'],
      ['版本路径属于公开契约', '把 /api/v1 放在装配层，可让模块内部路径保持简洁。检查最终 OpenAPI 中只有预期的版本化路径，没有重复前缀和意外公开端点。'],
    ],
  },
  {
    concept: '配置 HTTP middleware 与显式 CORS 策略，理解 origin、预检和执行顺序。', refs: ['fa-middleware', 'fa-cors'], tags: ['工程', 'Middleware', 'CORS'], reading: [
      ['Middleware 包住每个 HTTP 请求', '请求进入时可生成 request ID 或计时，call_next 后再修改响应。依赖 yield 的退出代码和后台任务有各自的执行时序，需要按官方说明理解。'],
      ['Origin 不只是域名', '协议、主机和端口共同构成 origin。携带 Cookie 或 Authorization 时不能依赖宽泛通配符，应列出可信前端并限制方法和头。'],
      ['验证预检与普通请求', '浏览器先发 OPTIONS 预检，服务需要返回允许信息。测试允许来源、拒绝来源、凭据和自定义头，并确认 request ID 能贯穿错误响应。'],
    ],
  },
  {
    concept: '用 SQLModel 分离表模型、创建模型与公开模型，并从 metadata 建立数据库结构。', refs: ['fa-sql', 'fa-body', 'fa-response'], tags: ['数据库', 'SQLModel', 'Schema'], reading: [
      ['一个类可以有两种角色', 'table=True 的 SQLModel 映射数据库表；非表模型只负责验证和序列化。用共享基类减少重复，但不要把数据库主键强加给创建请求。'],
      ['约束分层', 'Pydantic 字段约束提供友好请求错误，数据库主键、唯一性和外键维护持久数据完整性。两层解决不同故障窗口，都需要测试。'],
      ['初始化不是每个 worker 都执行', 'create_all 适合教程和小实验；生产变更使用迁移工具。迁移是部署前置步骤，应由单一进程完成，避免多个 worker 竞态。'],
    ],
  },
  {
    concept: '通过 yield Session 依赖完成创建和查询，明确 add、commit、refresh 与 select。', refs: ['fa-sql', 'fa-yield'], tags: ['数据库', 'Session', 'CRUD'], reading: [
      ['Session 的请求作用域', '每个请求获取 Session，路径操作完成后关闭。不要把同一 Session 缓存在全局并跨请求共享；engine 可以是进程级资源。'],
      ['提交与刷新有不同作用', 'add 把对象加入会话，commit 持久化事务，refresh 读取数据库生成的 ID 等字段。公开响应模型过滤并序列化 ORM 对象。'],
      ['查询顺序要显式', '数据库没有默认稳定顺序。列表接口用 order_by，并为数据量增长预留 offset/limit 或游标；测试不能依赖偶然返回顺序。'],
    ],
  },
  {
    concept: '正确实现部分更新、删除、404 和 204，避免用缺省值覆盖未提交字段。', refs: ['fa-sql', 'fa-status', 'fa-errors'], tags: ['数据库', 'PATCH', 'DELETE'], reading: [
      ['PATCH 只改变出现的字段', 'model_dump(exclude_unset=True) 区分“客户端没有提交”与“提交了空值”。再用 sqlmodel_update 更新已有实体，避免 PUT 式全量覆盖。'],
      ['所有修改都在事务里', '更新和删除后 commit；需要返回实体时 refresh。缺失 ID 在写入前返回 404，删除成功用真正空响应体的 204。'],
      ['为并发更新设计下一步', '简单 CRUD 之后可加入 version 字段、ETag 或数据库锁，防止后写覆盖先写。先写两个客户端读取同一版本的冲突测试。'],
    ],
  },
  {
    concept: '把数据库唯一约束冲突映射为 409，失败后回滚，并实现有界稳定分页。', refs: ['fa-sql', 'fa-errors', 'fa-query'], tags: ['数据库', 'Transaction', 'Pagination'], reading: [
      ['数据库是最终完整性边界', '先查询再插入无法消除并发竞态。让唯一约束裁决，捕获 IntegrityError，rollback 后转成客户端可理解的 409。'],
      ['失败事务必须复位', '数据库错误后的 Session 处于失败状态，继续查询前必须 rollback。测试冲突后立即发列表请求，确认连接与会话仍可使用。'],
      ['分页需要排序与上限', 'offset/limit 教学直观，但必须 order_by 并限制最大 limit。大数据或频繁写入场景再比较基于稳定键的游标分页。'],
    ],
  },
  {
    concept: '使用 OAuth2PasswordBearer 从标准 Authorization 头提取 bearer token，并注入当前用户。', refs: ['fa-security', 'fa-jwt'], tags: ['安全', 'OAuth2', 'Bearer'], reading: [
      ['认证与授权分开', '认证回答用户是谁，授权回答能做什么。OAuth2PasswordBearer 先负责标准化 token 获取，并把 security scheme 写入 OpenAPI。'],
      ['失败响应也有协议', '缺失、无效或未知 token 返回 401，并附 WWW-Authenticate: Bearer。客户端可以据此触发重新认证，而不是把失败误认为 404。'],
      ['身份来自服务端信任链', '不要相信请求体传来的 user_id。服务端验证 token 后得到 subject，再以该身份查询数据库、构造依赖或审计信息。'],
    ],
  },
  {
    concept: '用现代密码哈希库验证密码，统一错误结果，并确保哈希不进入响应。', refs: ['fa-jwt', 'fa-response'], tags: ['安全', 'Password hashing', 'Authentication'], reading: [
      ['密码不以明文存储', '注册时保存慢哈希，登录时使用 PasswordHash.verify。教程使用 pwdlib 推荐配置；实际参数与升级策略要随安全基线维护。'],
      ['避免账号枚举', '未知用户和错误密码应有相同外部状态与消息。日志可以保留内部分类，但响应不要透露账号是否存在。'],
      ['响应模型阻止敏感字段泄漏', '登录成功只返回必要身份或 token，不返回 hashed_password。写一条回归测试检查 JSON 和 OpenAPI 都没有内部凭据字段。'],
    ],
  },
  {
    concept: '签发带 sub 与 exp 的 JWT，限定算法验证，并通过依赖恢复当前用户。', refs: ['fa-jwt'], tags: ['安全', 'JWT', 'Access token'], reading: [
      ['JWT 是签名声明，不是会话数据库', 'token 包含 subject 和过期时间，客户端每次携带。敏感业务数据不要放进可解码 payload，服务端仍要查询用户状态。'],
      ['验证必须限定算法', 'decode 显式指定允许算法，捕获 InvalidTokenError，检查 sub 类型和用户存在。密钥来自环境或密钥服务，不写进源码。'],
      ['设计过期与吊销', '短期 access token 限制泄漏窗口。生产系统还需要刷新、登出、密码变更或用户禁用后的策略，并在 HTTPS 下传输。'],
    ],
  },
  {
    concept: '用 SecurityScopes 将 token 权限与每个路径要求比较，实现可文档化的细粒度授权。', refs: ['fa-scopes', 'fa-security'], tags: ['安全', 'Scopes', 'Authorization'], reading: [
      ['路径声明需要的权限', 'Security(authorize, scopes=[...]) 把要求加入当前依赖树。相同 authorize 函数在不同路径收到不同 SecurityScopes。'],
      ['集合关系决定访问', 'token scopes 必须覆盖路径声明的所有 scopes。构造 WWW-Authenticate challenge 时包含要求范围，OpenAPI 授权界面也会展示选择。'],
      ['Scope 不是资源所有权', 'notes:read 表示动作能力，不自动证明某条笔记属于用户。资源级访问还要查询 owner、组织或策略，避免只靠宽泛角色。'],
    ],
  },
  {
    concept: '依据依赖库选择 async def 或 def，并用 gather 并发等待独立 I/O。', refs: ['fa-async'], tags: ['异步', 'async/await', 'Concurrency'], reading: [
      ['异步用于等待', '调用支持 await 的数据库或 HTTP 客户端时使用 async def；阻塞库可使用普通 def，让 FastAPI 在线程池执行。不要在事件循环里直接做长时间阻塞调用。'],
      ['并发不等于并行计算', 'gather 可让多个独立 I/O 等待重叠，并保持结果位置顺序。CPU 密集工作需要进程或任务系统，并发数量还应由信号量和下游容量限制。'],
      ['异常和取消要传播', '任一子调用失败时定义整体失败或部分结果策略。超时、客户端断开和取消都要可观测，避免把异常静默改成空成功响应。'],
    ],
  },
  {
    concept: '使用 lifespan 在服务开始前加载共享资源，并在退出时可靠清理。', refs: ['fa-lifespan'], tags: ['异步', 'Lifespan', 'Resources'], reading: [
      ['生命周期包住整个应用', 'asynccontextmanager 中 yield 之前是启动阶段，之后是关闭阶段。模型、连接池和共享客户端只有加载完成后应用才接受请求。'],
      ['资源放在 app.state 或闭包', '请求可通过 request.app.state 读取启动资源。保持键名和类型清楚，不要让业务模块任意写全局状态。'],
      ['测试必须触发生命周期', 'TestClient 用上下文管理器才会运行 lifespan。HTTPX ASGITransport 本身不会触发，需要显式 lifespan manager；测试加载失败与清理异常。'],
    ],
  },
  {
    concept: '用 BackgroundTasks 在响应后执行轻量进程内任务，并识别何时需要独立队列。', refs: ['fa-background', 'fa-yield'], tags: ['异步', 'BackgroundTasks', 'Jobs'], reading: [
      ['先返回，再做轻量工作', '路径操作或依赖向同一 BackgroundTasks 添加任务，FastAPI 在响应之后执行。邮件通知、审计落盘等短任务可减少用户等待。'],
      ['不要传请求级资源', '依赖 yield 的 Session 会关闭，后台函数应只收 email、record_id 等普通值，并在需要时自行获取新资源。任务异常也无法改写已经发送的响应。'],
      ['重任务使用队列', '长时间计算、跨进程重试、计划任务和强交付保证需要 Celery 等队列或云任务服务。记录幂等键、重试策略和最终状态查询接口。'],
    ],
  },
  {
    concept: '实现 WebSocket 接受、双向消息循环和断开处理，理解它与普通 HTTP 的不同。', refs: ['fa-websocket'], tags: ['异步', 'WebSocket', 'Realtime'], reading: [
      ['先完成协议升级', 'WebSocket 路径接收 WebSocket 对象，显式 accept 后才能正常收发。receive_text 与 send_json 构成长连接消息循环。'],
      ['断开是正常状态', '客户端关闭会触发 WebSocketDisconnect，应清理连接表而不是记录为未处理 500。广播时还需移除失败连接并限制慢消费者。'],
      ['认证和背压仍然存在', 'WebSocket 可以使用 Query、Cookie、Depends 等，但认证通常发生在握手或第一条消息。生产系统需限制连接数、消息大小、心跳和每用户速率。'],
    ],
  },
  {
    concept: '用 TestClient 发起真实 ASGI 请求，并通过 dependency_overrides 替换数据库、鉴权和外部服务。', refs: ['fa-testing', 'fa-test-deps'], tags: ['测试', 'TestClient', 'Overrides'], reading: [
      ['测试公开行为', 'TestClient 基于 HTTPX，测试函数可用普通 def。断言状态码、JSON、头和副作用，比直接调用路径函数更接近真实请求生命周期。'],
      ['覆盖同一个依赖函数对象', 'app.dependency_overrides 的键是原依赖函数，值是 Fake 提供者。依赖需要稳定导出，测试结束后 clear，避免用例互相污染。'],
      ['建立测试金字塔', '路径合同用 TestClient，业务规则用快速单元测试，数据库用隔离事务或临时实例，少量端到端测试覆盖真实进程和迁移。'],
    ],
  },
  {
    concept: '使用 HTTPX AsyncClient 与 ASGITransport 编写异步测试，并显式处理 lifespan。', refs: ['fa-async-tests', 'fa-testing'], tags: ['测试', 'AsyncClient', 'ASGITransport'], reading: [
      ['异步测试不能直接套同步客户端', '测试本身需要 await 数据库时，使用 pytest.mark.anyio 与 AsyncClient。ASGITransport 让 HTTPX 直接调用应用，无需启动网络端口。'],
      ['同一事件循环检查内外状态', '发完请求后可继续 await 仓库查询，验证持久化结果。并发测试用 gather，但应避免共享会话导致非业务竞态。'],
      ['Lifespan 需要额外管理', '官方文档提醒 AsyncClient 不会自动触发 lifespan。应用依赖启动资源时，用 ASGI lifespan manager 或在测试夹具中显式进入生命周期。'],
    ],
  },
  {
    concept: '用异常处理器和 OpenAPI responses 统一领域错误，同时保留框架验证错误的边界。', refs: ['fa-errors', 'fa-response'], tags: ['测试', 'Error contract', 'OpenAPI'], reading: [
      ['领域异常不等于内部堆栈', '业务层抛 DomainError，应用层 exception_handler 转成稳定 code/message 与 409。未知异常保留为 500 并进入日志，不能把堆栈返回客户端。'],
      ['文档和运行结果一致', 'decorator 的 responses 声明额外错误模型，生成客户端才能识别 409。用测试比较实际 JSON 与 OpenAPI ref，避免只写文档不实现。'],
      ['验证错误单独处理', 'RequestValidationError 表示客户端输入不满足契约。若自定义其格式，要完整保留字段位置与可诊断信息，并避免把服务端 ValidationError 误报成 422。'],
    ],
  },
  {
    concept: '区分 liveness 与 readiness，并从 HTTPS、复制、内存和迁移角度设计生产部署。', refs: ['fa-deploy', 'fa-docker', 'fa-workers', 'fa-otel'], tags: ['部署', 'Health checks', 'Containers'], reading: [
      ['存活与就绪回答不同问题', 'liveness 只判断进程是否需要重启，不访问脆弱下游；readiness 判断是否应该接收流量，可检查数据库并在失败时返回 503。运维端点可从业务 OpenAPI 隐藏。'],
      ['复制策略取决于平台', '单机可用多个 worker；容器编排通常每容器一个进程再横向复制。每个进程都会占用模型和缓存内存，迁移等前置步骤只能执行一次。'],
      ['交付可复现镜像与观测', '从官方 Python 镜像构建、先复制依赖文件利用缓存，再复制应用并用 fastapi run。接入结构化日志、指标和 OpenTelemetry，用负载测试确定并发与资源限制。'],
    ],
  },
];

const weeks = [
  { title: 'API 契约与数据校验', subtitle: '从第一个路径操作到稳定的请求、响应和错误模型', color: '#009688', chapters: '官方教程 · First Steps / Parameters / Body / Response', deliverable: 'API v0.1 · 可文档化的笔记接口', lab: '创建独立 FastAPI 项目，实现健康检查和笔记创建/详情接口。保存 OpenAPI schema，为合法、422、404 和字段过滤各写一条测试。', labChecks: ['fastapi dev 可启动且 /docs 可操作', '请求与响应模型不泄漏内部字段', '200、201、404、422 路径均有测试'] },
  { title: '依赖注入与应用结构', subtitle: '复用鉴权和资源生命周期，拆分可维护的 Router', color: '#3f7cac', chapters: '官方教程 · Dependencies / Bigger Applications / Middleware / CORS', deliverable: 'API v0.2 · 模块化服务骨架', lab: '把接口拆到 routers、dependencies、services 模块。加入 Session 占位依赖、API Key、request ID 和显式 CORS，输出最终路由表。', labChecks: ['依赖成功与错误路径都能清理资源', 'Router 前缀、标签和共享依赖正确', 'CORS 允许与拒绝来源均有预检测试'] },
  { title: '数据库与 CRUD 事务', subtitle: '使用 SQLModel 落地模型、会话、更新、冲突与分页', color: '#c47d32', chapters: '官方教程 · SQL Databases / Status Codes / Errors', deliverable: 'API v0.3 · 持久化笔记服务', lab: '用 SQLite 完成迁移前原型，再用 PostgreSQL 运行同一套测试。交付创建、列表、更新、删除、唯一冲突和分页接口，记录事务失败后的恢复结果。', labChecks: ['每个请求独立 Session 且可靠关闭', 'PATCH、DELETE、404、409 语义正确', '分页稳定有上限，冲突后会话仍可查询'] },
  { title: '认证与细粒度授权', subtitle: '从密码哈希到 JWT、当前用户和 OAuth2 scopes', color: '#8b5fbf', chapters: '官方教程 · Security / OAuth2 with JWT / Scopes', deliverable: 'API v0.4 · 受保护的多用户接口', lab: '实现登录、短期 JWT、当前用户和 notes:read / notes:write scopes。加入禁用用户、过期 token、资源所有权和密钥配置测试。', labChecks: ['密码只保存哈希，JWT 有 sub 与 exp', '所有 401 带正确 challenge', 'scope 与资源所有权分别测试'] },
  { title: '异步、生命周期与实时能力', subtitle: '正确选择 async，管理共享资源、后台任务和 WebSocket', color: '#d05d6e', chapters: '官方文档 · Async / Lifespan / Background Tasks / WebSockets', deliverable: 'API v0.5 · 并发与实时服务', lab: '为外部检索增加异步并发、超时和并发上限；lifespan 管理客户端；通知使用后台任务；实现带认证和连接清理的 WebSocket。', labChecks: ['并发通过峰值计数验证且有超时', '启动失败和关闭清理有测试', '后台任务不复用请求 Session，WebSocket 正常断开'] },
  { title: '测试、观测与生产交付', subtitle: '用隔离测试、错误契约、探针和容器证明服务可运行', color: '#4f805d', chapters: '官方文档 · Testing / Async Tests / Deployment / Containers', deliverable: 'API v1.0 · 可测试与部署的生产候选', lab: '建立单元、同步 API、异步数据库和端到端测试；统一错误 envelope；加入 live/ready、结构化日志和 trace；构建容器并完成迁移、重启和并发演示。', labChecks: ['依赖覆盖在每个测试后清理', '全新环境可运行迁移、测试和镜像', '探针、HTTPS、worker、内存和回滚策略有记录'] },
];

const ids = Array.from({ length: 24 }, (_, index) => `w${13 + Math.floor(index / 4)}-${index % 4 + 1}`);
const lessons: Lesson[] = topics.map((topic, index) => {
  const id = ids[index];
  const challenge = fastapiChallenges[id];
  return { id, title: challenge.title, concept: topic.concept, refs: topic.refs, tags: topic.tags, reading: topic.reading.map(([title, body]) => ({ title, body })), exercise: challenge.scenario, checks: challenge.tests.map(item => item.name) };
});

export const fastapiPhases: Phase[] = weeks.map((week, index) => ({ ...week, track: 'fastapi', week: index + 13, lessons: lessons.slice(index * 4, index * 4 + 4) }));

export const fastapiQuizzes = [
  { week: 13, q: 'response_model 最重要的安全作用是什么？', options: ['自动授权资源', '过滤未声明的响应字段', '替代 HTTPS'], answer: 1, why: '响应模型按公开 schema 验证和过滤数据；授权仍需独立依赖。', ref: 'fa-response' },
  { week: 13, q: '非法路径或查询参数通常在何时被拒绝？', options: ['进入业务函数前返回 422', '数据库提交后', 'OpenAPI 下载时'], answer: 0, why: 'FastAPI 先解析并验证请求，再调用路径操作函数。', ref: 'fa-query' },
  { week: 14, q: 'yield 依赖最适合管理什么？', options: ['静态常量', '需要获取与清理的请求资源', '所有后台重任务'], answer: 1, why: 'yield 前获取资源，finally 中可靠清理成功和错误路径。', ref: 'fa-yield' },
  { week: 14, q: '携带凭据的 CORS 请求应如何配置 origin？', options: ['总是使用 *', '显式列出可信 origin', '删除预检'], answer: 1, why: '凭据模式需要明确允许来源、方法和头，宽泛通配符不合适。', ref: 'fa-cors' },
  { week: 15, q: '数据库唯一约束冲突后，继续使用 Session 前要做什么？', options: ['refresh', 'rollback', '只返回 200'], answer: 1, why: '失败事务需要 rollback，才能让会话回到可用状态。', ref: 'fa-sql' },
  { week: 15, q: 'PATCH 为什么使用 exclude_unset？', options: ['只更新客户端实际提交的字段', '自动创建数据库表', '隐藏所有响应'], answer: 0, why: '它区分未提交字段与显式值，避免默认值覆盖现有数据。', ref: 'fa-sql' },
  { week: 16, q: 'JWT 解码时为什么要显式限定 algorithms？', options: ['提高压缩率', '避免接受非预期签名算法', '生成更长用户名'], answer: 1, why: '验证端必须固定允许的算法，而不是信任 token 自己声明的任意算法。', ref: 'fa-jwt' },
  { week: 16, q: 'OAuth2 scope 能自动证明资源属于当前用户吗？', options: ['能', '不能，还需资源级所有权检查', '只有 GET 能'], answer: 1, why: 'scope 表达动作权限，资源所有权需要结合数据库事实单独判断。', ref: 'fa-scopes' },
  { week: 17, q: '阻塞型数据库库应直接放进 async def 吗？', options: ['总是', '不应；用普通 def 或异步驱动', '只需加 gather'], answer: 1, why: '阻塞调用会卡住事件循环；FastAPI 可在线程池运行普通 def。', ref: 'fa-async' },
  { week: 17, q: '什么时候不应只用 BackgroundTasks？', options: ['轻量日志', '需要跨进程重试的重任务', '响应后发短通知'], answer: 1, why: '重任务、强交付和分布式执行需要独立任务队列。', ref: 'fa-background' },
  { week: 18, q: 'dependency_overrides 测试结束后为什么要 clear？', options: ['避免测试间状态污染', '生成 JWT', '关闭 OpenAPI'], answer: 0, why: 'override 保存在 app 上，不清理会让后续测试继续使用 Fake。', ref: 'fa-test-deps' },
  { week: 18, q: 'liveness 探针应检查数据库吗？', options: ['应检查所有下游', '不应；下游就绪属于 readiness', '必须写数据库'], answer: 1, why: 'liveness 用于判断进程是否要重启；下游故障不应造成无意义的重启循环。', ref: 'fa-deploy' },
];
