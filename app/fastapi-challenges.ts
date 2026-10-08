import type { CodeChallenge, CodeTest } from './code-challenges.ts';
import { contextualizeCode, type ChallengeContext } from './challenge-scenarios.ts';
import { fastapiSolutions } from './fastapi-solutions.ts';

type Exercise = {
  id: string;
  title: string;
  story: string;
  setup: string;
  signature: string;
  requirements: string[];
  entry: string;
  expected: Record<string, unknown>;
  tests: CodeTest[];
  provided: string;
  connection: string;
  flow: [string, string, string];
};

const common = `from typing import Annotated
from fastapi import FastAPI, Depends, Header, HTTPException, Path, Query, Request, Response, Security, status
from fastapi.testclient import TestClient
from pydantic import BaseModel, Field as PydanticField`;

const sql = `${common}
from sqlmodel import SQLModel, Field, Session, create_engine, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.pool import StaticPool`;

const security = `${common}
from datetime import datetime, timedelta, timezone
import jwt
from jwt.exceptions import InvalidTokenError
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm, SecurityScopes
from pwdlib import PasswordHash`;

const test = (name: string, code: string): CodeTest => ({ name, code });

const exercises: Exercise[] = [
  {
    id: 'w13-1', title: '创建第一个 FastAPI 应用与路径操作',
    story: '知识服务需要一个能被负载均衡器探测的入口。创建带标题和版本的 FastAPI 应用，并提供稳定的健康检查路径。',
    setup: common,
    signature: 'def build_app():',
    requirements: ['返回 FastAPI 实例，title 为 Notes API、version 为 1.0.0。', '注册 GET /health，返回 {status: "ok"}，并归入 system 标签。', '路径操作同时出现在自动生成的 OpenAPI 文档中。'],
    entry: `    app = build_app()
    response = TestClient(app).get("/health")
    schema = app.openapi()
    return {"status_code": response.status_code, "body": response.json(), "title": schema["info"]["title"], "paths": sorted(schema["paths"])}`,
    expected: { status_code: 200, body: { status: 'ok' }, title: 'Notes API', paths: ['/health'] },
    tests: [
      test('健康检查返回稳定 JSON', `r=TestClient(build_app()).get("/health")\nexpect_equal((r.status_code,r.json()),(200,{"status":"ok"}))`),
      test('元数据与标签进入 OpenAPI', `schema=build_app().openapi()\nexpect_equal(schema["info"],[*schema["info"]] and {"title":"Notes API","version":"1.0.0"})\nexpect_equal(schema["paths"]["/health"]["get"]["tags"],["system"])`),
    ],
    provided: 'FastAPI、TestClient 与 OpenAPI 检查入口',
    connection: '这是后续 24 个接口任务的最小应用入口；下一节开始声明请求参数契约。',
    flow: ['监控系统发送 GET /health', '你实现：build_app', 'JSON 响应与 OpenAPI → 运维和客户端'],
  },
  {
    id: 'w13-2', title: '声明路径参数、查询参数与校验边界',
    story: '笔记详情接口同时接收资源 ID、可选搜索词和分页上限。把约束写进类型声明，让非法请求在进入业务逻辑前被拒绝。',
    setup: common,
    signature: 'def build_app():',
    requirements: ['GET /notes/{note_id} 中 note_id 是大于等于 1 的整数。', 'q 可省略，提供时至少 2 个字符；limit 默认为 10，范围 1–20。', '合法请求原样返回 note_id、q、limit；约束应进入 OpenAPI。'],
    entry: `    client = TestClient(build_app())
    ok = client.get("/notes/7", params={"q":"api","limit":3})
    bad = client.get("/notes/0", params={"limit":21})
    return {"ok": ok.json(), "invalid_status": bad.status_code}`,
    expected: { ok: { note_id: 7, q: 'api', limit: 3 }, invalid_status: 422 },
    tests: [
      test('合法参数被解析为正确类型', `r=TestClient(build_app()).get("/notes/2",params={"q":"db","limit":5})\nexpect_equal((r.status_code,r.json()),(200,{"note_id":2,"q":"db","limit":5}))`),
      test('默认值和可选值正确', `expect_equal(TestClient(build_app()).get("/notes/1").json(),{"note_id":1,"q":None,"limit":10})`),
      test('路径与查询约束拒绝非法输入', `c=TestClient(build_app())\nfor url in ["/notes/0","/notes/x","/notes/1?q=a","/notes/1?limit=0","/notes/1?limit=21"]:\n    expect_equal(c.get(url).status_code,422)`),
    ],
    provided: 'Path、Query、Annotated 与请求场景',
    connection: '类型和约束形成请求契约；下一节用 Pydantic 模型处理结构化请求体。',
    flow: ['客户端提交 URL 与查询串', '你实现：参数声明', '已校验 Python 值 → 路径操作'],
  },
  {
    id: 'w13-3', title: '用 Pydantic 模型校验请求体',
    story: '客户端创建笔记时，标题、正文和标签必须满足统一约束。用输入模型接住 JSON，并返回带 ID 的公开模型。',
    setup: `${common}

class NoteCreate(BaseModel):
    title: str = PydanticField(min_length=1, max_length=80)
    content: str = PydanticField(min_length=1)
    tags: list[str] = []

class NotePublic(NoteCreate):
    id: int`,
    signature: 'def build_app():',
    requirements: ['注册 POST /notes，请求体类型为 NoteCreate，响应模型为 NotePublic。', '成功创建返回 201，生成 id=1，并保留输入字段。', '空标题、空正文和错误字段类型由模型校验返回 422。'],
    entry: `    client = TestClient(build_app())
    created = client.post("/notes", json={"title":"FastAPI","content":"契约优先","tags":["api"]})
    invalid = client.post("/notes", json={"title":"","content":""})
    return {"created_status": created.status_code, "created": created.json(), "invalid_status": invalid.status_code}`,
    expected: { created_status: 201, created: { id: 1, title: 'FastAPI', content: '契约优先', tags: ['api'] }, invalid_status: 422 },
    tests: [
      test('请求体被验证并转换为响应', `r=TestClient(build_app()).post("/notes",json={"title":"A","content":"B","tags":["x"]})\nexpect_equal((r.status_code,r.json()),(201,{"id":1,"title":"A","content":"B","tags":["x"]}))`),
      test('默认标签不在请求间共享', `c=TestClient(build_app())\nexpect_equal(c.post("/notes",json={"title":"A","content":"B"}).json()["tags"],[])\nexpect_equal(c.post("/notes",json={"title":"C","content":"D"}).json()["tags"],[])`),
      test('非法请求体返回 422', `c=TestClient(build_app())\nfor body in [{},{"title":"","content":"x"},{"title":"x","content":""},{"title":"x","content":"y","tags":"api"}]:\n    expect_equal(c.post("/notes",json=body).status_code,422)`),
    ],
    provided: 'NoteCreate、NotePublic 与固定创建场景',
    connection: '输入模型保护业务入口；下一节让响应模型过滤内部字段并定义 404。',
    flow: ['客户端 JSON', '你实现：POST /notes', 'Pydantic 校验 → 201 公开响应'],
  },
  {
    id: 'w13-4', title: '约束响应模型、状态码与错误语义',
    story: '存储层记录包含内部 owner_secret，接口只能公开 id、title。缺失资源要返回清楚的 404，而不是空对象或 200。',
    setup: `${common}

class NotePublic(BaseModel):
    id: int
    title: str

NOTES={1:{"id":1,"title":"FastAPI","owner_secret":"hidden"}}`,
    signature: 'def build_app():',
    requirements: ['注册 GET /notes/{note_id}，response_model 为 NotePublic。', '存在时返回存储对象，但响应必须过滤 owner_secret。', '不存在时抛出 HTTPException(404, detail="Note not found")。'],
    entry: `    client=TestClient(build_app())
    found=client.get("/notes/1")
    missing=client.get("/notes/9")
    return {"found":found.json(),"missing_status":missing.status_code,"missing":missing.json()}`,
    expected: { found: { id: 1, title: 'FastAPI' }, missing_status: 404, missing: { detail: 'Note not found' } },
    tests: [
      test('响应模型过滤内部字段', `r=TestClient(build_app()).get("/notes/1")\nexpect_equal(r.json(),{"id":1,"title":"FastAPI"})\nexpect_equal("owner_secret" in r.json(),False)`),
      test('缺失资源使用标准 404', `r=TestClient(build_app()).get("/notes/99")\nexpect_equal((r.status_code,r.json()),(404,{"detail":"Note not found"}))`),
      test('OpenAPI 声明公开模型', `schema=build_app().openapi()\nexpect_equal(schema["paths"]["/notes/{note_id}"]["get"]["responses"]["200"]["content"]["application/json"]["schema"]["$ref"].endswith("NotePublic"),True)`),
    ],
    provided: '内部记录、公开响应模型与错误调用入口',
    connection: '请求和响应契约完成最小 API；下一周把共享逻辑移入依赖。',
    flow: ['存储层读取内部对象', '你实现：公开接口', '字段过滤 / 404 → API 客户端'],
  },
  {
    id: 'w14-1', title: '用 Depends 组合鉴权与分页依赖',
    story: '多个列表接口都需要 API Key 和统一分页。把共享逻辑声明为依赖，让校验、注入和 OpenAPI 保持一致。',
    setup: `${common}

class Repository:
    def __init__(self): self.calls=[]
    def list(self,offset,limit):
        self.calls.append([offset,limit])
        return [{"id":n} for n in range(offset,offset+limit)]`,
    signature: 'def build_app(repository):',
    requirements: ['Header 依赖读取 X-API-Key，仅接受 study-key，否则返回 401。', '分页依赖校验 offset>=0、limit 1–50，并返回两个值。', 'GET /notes 注入两个依赖，再调用 repository.list。'],
    entry: `    repository=Repository(); client=TestClient(build_app(repository))
    denied=client.get("/notes")
    allowed=client.get("/notes?offset=2&limit=2",headers={"X-API-Key":"study-key"})
    return {"denied":denied.status_code,"allowed":allowed.json(),"calls":repository.calls}`,
    expected: { denied: 422, allowed: [{ id: 2 }, { id: 3 }], calls: [[2, 2]] },
    tests: [
      test('依赖注入分页并调用仓库', `repo=Repository(); r=TestClient(build_app(repo)).get("/notes?offset=3&limit=2",headers={"X-API-Key":"study-key"})\nexpect_equal((r.status_code,r.json(),repo.calls),(200,[{"id":3},{"id":4}],[[3,2]]))`),
      test('错误密钥在业务调用前被拒绝', `repo=Repository(); r=TestClient(build_app(repo)).get("/notes",headers={"X-API-Key":"bad"})\nexpect_equal(r.status_code,401)\nexpect_equal(repo.calls,[])`),
      test('分页约束进入依赖树', `c=TestClient(build_app(Repository())); h={"X-API-Key":"study-key"}\nexpect_equal(c.get("/notes?offset=-1",headers=h).status_code,422)\nexpect_equal(c.get("/notes?limit=51",headers=h).status_code,422)`),
    ],
    provided: '可观察调用的 Repository 与请求场景',
    connection: '依赖可继续嵌套数据库会话和用户身份；下一节处理带清理步骤的资源。',
    flow: ['请求头与查询参数', '你实现：依赖树', '已鉴权分页 → Repository'],
  },
  {
    id: 'w14-2', title: '用 yield 依赖管理资源生命周期',
    story: '每个请求都要打开资源，并在成功或 HTTP 错误后可靠关闭。使用 yield 依赖把获取和清理包住路径操作。',
    setup: `${common}

class Resource:
    def __init__(self,events): self.events=events; self.closed=False; events.append("open")
    def read(self): return "value"
    def close(self): self.closed=True; self.events.append("close")`,
    signature: 'def build_app(resource_factory):',
    requirements: ['get_resource 为生成器依赖：先创建并 yield，finally 中 close。', 'GET /work/{mode} 注入 Resource；ok 返回读取值，fail 抛出 400。', '成功和失败请求都必须按 open、close 顺序清理。'],
    entry: `    events=[]; resources=[]
    def factory():
        resource=Resource(events); resources.append(resource); return resource
    client=TestClient(build_app(factory))
    ok=client.get("/work/ok"); failed=client.get("/work/fail")
    return {"ok":ok.json(),"failed":failed.status_code,"events":events,"all_closed":all(r.closed for r in resources)}`,
    expected: { ok: { value: 'value' }, failed: 400, events: ['open', 'close', 'open', 'close'], all_closed: true },
    tests: [
      test('成功响应后资源关闭', `events=[]; resources=[]\ndef factory():\n r=Resource(events); resources.append(r); return r\nr=TestClient(build_app(factory)).get("/work/ok")\nexpect_equal((r.json(),events,resources[0].closed),({"value":"value"},["open","close"],True))`),
      test('HTTP 错误也执行 finally', `events=[]; resources=[]\ndef factory():\n r=Resource(events); resources.append(r); return r\nr=TestClient(build_app(factory)).get("/work/fail")\nexpect_equal((r.status_code,events,resources[0].closed),(400,["open","close"],True))`),
    ],
    provided: '可记录打开与关闭事件的 Resource',
    connection: '数据库 Session 将沿用同样的 yield 生命周期；后台任务不要依赖请求结束后已关闭的资源。',
    flow: ['请求进入并获取资源', '你实现：yield 依赖', '路径操作结束 → finally 关闭资源'],
  },
  {
    id: 'w14-3', title: '用 APIRouter 拆分大型应用',
    story: '知识服务开始包含普通笔记和管理接口。用 Router 分组、统一版本前缀和标签，主应用只负责装配。',
    setup: `${common}
from fastapi import APIRouter`,
    signature: 'def build_app():',
    requirements: ['分别创建 notes 与 admin 两个 APIRouter。', '注册 GET /notes 和 GET /admin/status，再以 /api/v1 前缀 include_router。', 'OpenAPI 标签分别为 notes、admin，不暴露未加版本的路径。'],
    entry: `    app=build_app(); client=TestClient(app); schema=app.openapi()
    return {"notes":client.get("/api/v1/notes").json(),"admin":client.get("/api/v1/admin/status").json(),"paths":sorted(schema["paths"])}`,
    expected: { notes: [{ id: 1, title: 'FastAPI' }], admin: { status: 'ready' }, paths: ['/api/v1/admin/status', '/api/v1/notes'] },
    tests: [
      test('版本化路由均可访问', `c=TestClient(build_app())\nexpect_equal(c.get("/api/v1/notes").json(),[{"id":1,"title":"FastAPI"}])\nexpect_equal(c.get("/api/v1/admin/status").json(),{"status":"ready"})`),
      test('路由标签与前缀正确', `s=build_app().openapi(); expect_equal(s["paths"]["/api/v1/notes"]["get"]["tags"],["notes"]); expect_equal(s["paths"]["/api/v1/admin/status"]["get"]["tags"],["admin"]); expect_equal("/notes" in s["paths"],False)`),
    ],
    provided: 'APIRouter、主应用和 OpenAPI 检查入口',
    connection: 'Router 建立模块边界；数据库、鉴权依赖仍由装配层注入。',
    flow: ['模块分别声明路径', '你实现：build_app 装配', '版本化 OpenAPI → 客户端'],
  },
  {
    id: 'w14-4', title: '配置 HTTP Middleware 与 CORS',
    story: '浏览器前端来自明确的域名，每次请求还需要可追踪的 request ID。配置 CORS，并在响应中传播请求 ID。',
    setup: `${common}
from fastapi.middleware.cors import CORSMiddleware`,
    signature: 'def build_app(allowed_origins):',
    requirements: ['加入 CORSMiddleware，只允许传入 origins、GET、X-Request-ID，并允许凭据。', 'HTTP middleware 从请求读取 X-Request-ID；缺少时使用 generated-request；响应写回该头。', 'GET /health 返回正常 JSON，预检只允许配置内来源。'],
    entry: `    client=TestClient(build_app(["https://app.example.com"]))
    response=client.get("/health",headers={"Origin":"https://app.example.com","X-Request-ID":"req-1"})
    preflight=client.options("/health",headers={"Origin":"https://app.example.com","Access-Control-Request-Method":"GET","Access-Control-Request-Headers":"X-Request-ID"})
    return {"request_id":response.headers["x-request-id"],"allow_origin":response.headers["access-control-allow-origin"],"preflight":preflight.status_code}`,
    expected: { request_id: 'req-1', allow_origin: 'https://app.example.com', preflight: 200 },
    tests: [
      test('请求 ID 被传播或生成', `c=TestClient(build_app(["https://app.example.com"]))\nexpect_equal(c.get("/health",headers={"X-Request-ID":"abc"}).headers["x-request-id"],"abc")\nexpect_equal(c.get("/health").headers["x-request-id"],"generated-request")`),
      test('允许来源通过预检', `c=TestClient(build_app(["https://app.example.com"])); h={"Origin":"https://app.example.com","Access-Control-Request-Method":"GET","Access-Control-Request-Headers":"X-Request-ID"}; r=c.options("/health",headers=h)\nexpect_equal((r.status_code,r.headers["access-control-allow-origin"]),(200,"https://app.example.com"))`),
      test('未配置来源不获得允许头', `r=TestClient(build_app(["https://app.example.com"])).get("/health",headers={"Origin":"https://evil.example"})\nexpect_equal("access-control-allow-origin" in r.headers,False)`),
    ],
    provided: 'CORSMiddleware、Request 与预检请求',
    connection: '跨域和追踪是应用级横切行为；下一周把持久化会话放入依赖树。',
    flow: ['浏览器请求 / 预检', '你实现：CORS + middleware', '受控跨域响应与 request ID'],
  },
  {
    id: 'w15-1', title: '设计 SQLModel 表模型与公开模型',
    story: '笔记 API 要从内存字典迁移到关系数据库。拆分共享字段、表模型、创建模型和公开模型，并创建表结构。',
    setup: sql,
    signature: `class NoteBase(SQLModel):
    pass

class Note(NoteBase, table=True):
    pass

class NoteCreate(NoteBase):
    pass

class NotePublic(NoteBase):
    pass

def create_db_and_tables(engine):
    raise NotImplementedError("请创建表")`,
    requirements: ['NoteBase 声明 title（1–80、索引）与非空 content。', 'Note 是 table=True 的表模型，id 为可空自增主键。', 'NoteCreate 继承输入字段；NotePublic 增加必需 id；函数调用 metadata.create_all。'],
    entry: `    engine=create_engine("sqlite://",connect_args={"check_same_thread":False},poolclass=StaticPool)
    create_db_and_tables(engine)
    with Session(engine) as session:
        note=Note.model_validate(NoteCreate(title="FastAPI",content="SQLModel")); session.add(note); session.commit(); session.refresh(note)
        public=NotePublic.model_validate(note)
    return {"table":Note.__tablename__,"public":public.model_dump(),"columns":sorted(Note.__table__.columns.keys())}`,
    expected: { table: 'note', public: { title: 'FastAPI', content: 'SQLModel', id: 1 }, columns: ['content', 'id', 'title'] },
    tests: [
      test('表结构与主键正确', `engine=create_engine("sqlite://",connect_args={"check_same_thread":False},poolclass=StaticPool); create_db_and_tables(engine)\nexpect_equal(set(Note.__table__.columns.keys()),{"id","title","content"})\nexpect_equal(Note.__table__.primary_key.columns.keys(),["id"])`),
      test('输入、表与公开模型可转换', `created=NoteCreate(title="A",content="B"); row=Note.model_validate(created); row.id=7; expect_equal(NotePublic.model_validate(row).model_dump(),{"title":"A","content":"B","id":7})`),
      test('字段约束拒绝空标题和正文', `from pydantic import ValidationError\nexpect_raises(ValidationError,lambda:NoteCreate(title="",content="x"))\nexpect_raises(ValidationError,lambda:NoteCreate(title="x",content=""))`),
    ],
    provided: 'SQLModel、SQLite 内存引擎与模型转换场景',
    connection: '模型明确数据库与 API 边界；下一节通过 Session 依赖实现创建和查询。',
    flow: ['API 输入模型', '你实现：SQLModel 模型', '数据库表行 → 公开响应模型'],
  },
  {
    id: 'w15-2', title: '用 Session 依赖实现创建与列表',
    story: '每次请求使用独立数据库 Session。实现创建和列表接口，提交后刷新数据库生成的 ID，并按稳定顺序返回。',
    setup: `${sql}

class NoteBase(SQLModel):
    title:str=Field(min_length=1)
    content:str=Field(min_length=1)
class Note(NoteBase,table=True):
    id:int|None=Field(default=None,primary_key=True)
class NoteCreate(NoteBase): pass
class NotePublic(NoteBase): id:int`,
    signature: 'def build_app(engine):',
    requirements: ['get_session 使用 with Session(engine) 并 yield。', 'POST /notes 把 NoteCreate 转为 Note，add、commit、refresh，返回 201 NotePublic。', 'GET /notes 按 id 排序，返回 list[NotePublic]。'],
    entry: `    engine=create_engine("sqlite://",connect_args={"check_same_thread":False},poolclass=StaticPool); SQLModel.metadata.create_all(engine)
    client=TestClient(build_app(engine)); a=client.post("/notes",json={"title":"A","content":"one"}); b=client.post("/notes",json={"title":"B","content":"two"}); listed=client.get("/notes")
    return {"ids":[a.json()["id"],b.json()["id"]],"list":listed.json()}`,
    expected: { ids: [1, 2], list: [{ title: 'A', content: 'one', id: 1 }, { title: 'B', content: 'two', id: 2 }] },
    tests: [
      test('创建提交并刷新 ID', `e=create_engine("sqlite://",connect_args={"check_same_thread":False},poolclass=StaticPool); SQLModel.metadata.create_all(e); r=TestClient(build_app(e)).post("/notes",json={"title":"A","content":"B"}); expect_equal((r.status_code,r.json()),(201,{"title":"A","content":"B","id":1}))`),
      test('列表按 ID 稳定排序', `e=create_engine("sqlite://",connect_args={"check_same_thread":False},poolclass=StaticPool); SQLModel.metadata.create_all(e); c=TestClient(build_app(e)); c.post("/notes",json={"title":"A","content":"1"}); c.post("/notes",json={"title":"B","content":"2"}); expect_equal([n["title"] for n in c.get("/notes").json()],["A","B"])`),
      test('请求体校验在写入前失败', `e=create_engine("sqlite://",connect_args={"check_same_thread":False},poolclass=StaticPool); SQLModel.metadata.create_all(e); c=TestClient(build_app(e)); expect_equal(c.post("/notes",json={"title":"","content":"x"}).status_code,422); expect_equal(c.get("/notes").json(),[])`),
    ],
    provided: '四个 SQLModel 模型与 SQLite 测试引擎',
    connection: '创建与查询建立事务基线；下一节处理部分更新、删除和 404。',
    flow: ['POST/GET 请求', '你实现：Session 依赖与 CRUD', '提交数据库 → 公开模型'],
  },
  {
    id: 'w15-3', title: '实现 PATCH 部分更新与 DELETE',
    story: '客户端只修改正文时不能把标题清空；删除后应返回无响应体，并对不存在资源保持一致的 404。',
    setup: `${sql}

class Note(SQLModel,table=True):
    id:int|None=Field(default=None,primary_key=True)
    title:str=Field(min_length=1)
    content:str=Field(min_length=1)
class NotePublic(SQLModel): id:int; title:str; content:str
class NoteUpdate(SQLModel): title:str|None=Field(default=None,min_length=1); content:str|None=Field(default=None,min_length=1)`,
    signature: 'def build_app(engine):',
    requirements: ['PATCH /notes/{id} 使用 exclude_unset，仅更新请求中出现的字段。', '更新后 add、commit、refresh 并返回 NotePublic；缺失返回 404。', 'DELETE 删除并 commit，成功返回 204 空响应；缺失同样 404。'],
    entry: `    engine=create_engine("sqlite://",connect_args={"check_same_thread":False},poolclass=StaticPool); SQLModel.metadata.create_all(engine)
    with Session(engine) as s: s.add(Note(title="Original",content="old")); s.commit()
    client=TestClient(build_app(engine)); updated=client.patch("/notes/1",json={"content":"new"}); deleted=client.delete("/notes/1"); missing=client.patch("/notes/1",json={"title":"x"})
    return {"updated":updated.json(),"delete_status":deleted.status_code,"delete_body":deleted.text,"missing":missing.status_code}`,
    expected: { updated: { id: 1, title: 'Original', content: 'new' }, delete_status: 204, delete_body: '', missing: 404 },
    tests: [
      test('PATCH 只修改已提供字段', `e=create_engine("sqlite://",connect_args={"check_same_thread":False},poolclass=StaticPool); SQLModel.metadata.create_all(e); s=Session(e); s.add(Note(title="A",content="B")); s.commit(); s.close(); r=TestClient(build_app(e)).patch("/notes/1",json={"content":"C"}); expect_equal(r.json(),{"id":1,"title":"A","content":"C"})`),
      test('DELETE 返回 204 且真正删除', `e=create_engine("sqlite://",connect_args={"check_same_thread":False},poolclass=StaticPool); SQLModel.metadata.create_all(e); s=Session(e); s.add(Note(title="A",content="B")); s.commit(); s.close(); c=TestClient(build_app(e)); r=c.delete("/notes/1"); expect_equal((r.status_code,r.text),(204,"")); expect_equal(c.delete("/notes/1").status_code,404)`),
      test('缺失更新返回 404', `e=create_engine("sqlite://",connect_args={"check_same_thread":False},poolclass=StaticPool); SQLModel.metadata.create_all(e); expect_equal(TestClient(build_app(e)).patch("/notes/7",json={"title":"x"}).status_code,404)`),
    ],
    provided: 'Note、NotePublic、NoteUpdate 与数据库场景',
    connection: 'CRUD 语义完整后，下一节加入唯一约束冲突、回滚和有界分页。',
    flow: ['PATCH / DELETE', '你实现：更新与删除事务', '新资源状态 / 204 / 404'],
  },
  {
    id: 'w15-4', title: '处理唯一约束、回滚与分页',
    story: '笔记标题必须唯一。重复创建应返回可解释的 409，失败事务要回滚，后续列表仍能工作并按范围分页。',
    setup: `${sql}

class Note(SQLModel,table=True):
    id:int|None=Field(default=None,primary_key=True)
    title:str=Field(unique=True,min_length=1)
    content:str=Field(min_length=1)
class NoteCreate(SQLModel): title:str=Field(min_length=1); content:str=Field(min_length=1)
class NotePublic(NoteCreate): id:int`,
    signature: 'def build_app(engine):',
    requirements: ['POST 捕获 IntegrityError，先 rollback，再抛出 409 Title already exists。', '创建成功仍需 commit、refresh 并返回 201。', 'GET /notes 校验 offset>=0、limit 1–50，按 id 排序后分页。'],
    entry: `    engine=create_engine("sqlite://",connect_args={"check_same_thread":False},poolclass=StaticPool); SQLModel.metadata.create_all(engine); client=TestClient(build_app(engine))
    for title in ["A","B","C"]: client.post("/notes",json={"title":title,"content":title.lower()})
    duplicate=client.post("/notes",json={"title":"A","content":"again"}); page=client.get("/notes?offset=1&limit=2")
    return {"duplicate":duplicate.status_code,"detail":duplicate.json()["detail"],"page":[n["title"] for n in page.json()]}`,
    expected: { duplicate: 409, detail: 'Title already exists', page: ['B', 'C'] },
    tests: [
      test('重复标题返回 409', `e=create_engine("sqlite://",connect_args={"check_same_thread":False},poolclass=StaticPool); SQLModel.metadata.create_all(e); c=TestClient(build_app(e)); body={"title":"A","content":"x"}; expect_equal(c.post("/notes",json=body).status_code,201); r=c.post("/notes",json=body); expect_equal((r.status_code,r.json()),(409,{"detail":"Title already exists"}))`),
      test('冲突回滚后会话仍可查询', `e=create_engine("sqlite://",connect_args={"check_same_thread":False},poolclass=StaticPool); SQLModel.metadata.create_all(e); c=TestClient(build_app(e)); c.post("/notes",json={"title":"A","content":"x"}); c.post("/notes",json={"title":"A","content":"y"}); expect_equal(len(c.get("/notes").json()),1)`),
      test('分页有边界且顺序稳定', `e=create_engine("sqlite://",connect_args={"check_same_thread":False},poolclass=StaticPool); SQLModel.metadata.create_all(e); c=TestClient(build_app(e)); [c.post("/notes",json={"title":str(i),"content":"x"}) for i in range(4)]; expect_equal([n["title"] for n in c.get("/notes?offset=1&limit=2").json()],["1","2"]); expect_equal(c.get("/notes?limit=0").status_code,422)`),
    ],
    provided: '带唯一约束的 Note 模型与 SQLite 引擎',
    connection: '数据库错误被翻译为稳定 HTTP 契约；下一周把用户身份和授权加入依赖。',
    flow: ['创建 / 列表请求', '你实现：事务与分页', '201 / 409 / 分页结果'],
  },
  {
    id: 'w16-1', title: '提取 Bearer Token 并认证当前用户',
    story: '私有接口从 Authorization: Bearer 读取令牌。令牌不存在、未知和合法三条路径需要标准化处理并进入 OpenAPI。',
    setup: security,
    signature: 'def build_app(tokens):',
    requirements: ['创建 OAuth2PasswordBearer(tokenUrl="token")。', '依赖从 tokens 映射查用户名；未知令牌返回 401，并带 WWW-Authenticate: Bearer。', 'GET /users/me 注入当前用户名并返回。'],
    entry: `    client=TestClient(build_app({"good-token":"alice"})); missing=client.get("/users/me"); invalid=client.get("/users/me",headers={"Authorization":"Bearer bad"}); ok=client.get("/users/me",headers={"Authorization":"Bearer good-token"})
    return {"missing":missing.status_code,"invalid":invalid.status_code,"authenticate":invalid.headers["www-authenticate"],"user":ok.json()}`,
    expected: { missing: 401, invalid: 401, authenticate: 'Bearer', user: { username: 'alice' } },
    tests: [
      test('合法 Bearer Token 注入用户', `r=TestClient(build_app({"t":"alice"})).get("/users/me",headers={"Authorization":"Bearer t"}); expect_equal((r.status_code,r.json()),(200,{"username":"alice"}))`),
      test('缺失与未知令牌都返回 401', `c=TestClient(build_app({"t":"alice"})); expect_equal(c.get("/users/me").status_code,401); r=c.get("/users/me",headers={"Authorization":"Bearer bad"}); expect_equal((r.status_code,r.headers["www-authenticate"]),(401,"Bearer"))`),
      test('OpenAPI 包含 OAuth2 password flow', `schemes=build_app({}).openapi()["components"]["securitySchemes"]; expect_equal(schemes["OAuth2PasswordBearer"]["flows"]["password"]["tokenUrl"],"token")`),
    ],
    provided: 'OAuth2/JWT 依赖与令牌映射',
    connection: '先建立标准 Bearer 入口；下一节验证经过哈希的密码。',
    flow: ['Authorization 请求头', '你实现：current_user 依赖', '已认证用户 / 401'],
  },
  {
    id: 'w16-2', title: '验证密码哈希而非保存明文',
    story: '登录接口必须用 PasswordHash 验证数据库中的哈希。不存在用户和错误密码返回相同错误，避免泄露账号状态。',
    setup: `${security}

class Credentials(BaseModel):
    username:str
    password:str`,
    signature: 'def build_app(users, password_hash):',
    requirements: ['authenticate 查找用户并用 password_hash.verify；失败返回 None。', 'POST /login 接收 Credentials，成功只返回 username。', '不存在用户和错误密码都返回同一个 401，不得返回 hashed_password。'],
    entry: `    password_hash=PasswordHash.recommended(); users={"alice":{"username":"alice","hashed_password":password_hash.hash("secret")}}; client=TestClient(build_app(users,password_hash))
    ok=client.post("/login",json={"username":"alice","password":"secret"}); bad=client.post("/login",json={"username":"alice","password":"wrong"}); missing=client.post("/login",json={"username":"bob","password":"secret"})
    return {"ok":ok.json(),"bad":bad.status_code,"missing":missing.status_code,"hash_exposed":"hashed_password" in ok.json()}`,
    expected: { ok: { username: 'alice' }, bad: 401, missing: 401, hash_exposed: false },
    tests: [
      test('正确密码通过且不泄漏哈希', `p=PasswordHash.recommended(); users={"a":{"username":"a","hashed_password":p.hash("s")}}; r=TestClient(build_app(users,p)).post("/login",json={"username":"a","password":"s"}); expect_equal((r.status_code,r.json()),(200,{"username":"a"}))`),
      test('错误密码与未知用户具有相同外部结果', `p=PasswordHash.recommended(); users={"a":{"username":"a","hashed_password":p.hash("s")}}; c=TestClient(build_app(users,p)); a=c.post("/login",json={"username":"a","password":"x"}); b=c.post("/login",json={"username":"missing","password":"x"}); expect_equal((a.status_code,a.json()),(b.status_code,b.json()))`),
    ],
    provided: 'Credentials、PasswordHash 与用户记录',
    connection: '密码只用于登录验证；下一节签发有过期时间的 JWT，后续请求只携带 token。',
    flow: ['用户名与密码 JSON', '你实现：哈希验证', '最小用户响应 / 统一 401'],
  },
  {
    id: 'w16-3', title: '签发并校验带过期时间的 JWT',
    story: '登录成功后签发短期 access token，受保护接口从 sub 恢复用户。伪造、过期或未知用户令牌必须统一失败。',
    setup: `${security}

class Token(BaseModel):
    access_token:str
    token_type:str`,
    signature: 'def build_app(users, password_hash, secret_key):',
    requirements: ['POST /token 使用 OAuth2PasswordRequestForm 验证哈希，签发 HS256 JWT。', 'JWT 包含 sub 和 UTC exp（当前时间后 30 分钟）。', 'current_user 限定 algorithms=["HS256"]，捕获 InvalidTokenError，未知用户也返回带 Bearer 头的 401。'],
    entry: `    p=PasswordHash.recommended(); secret="study-secret-key-with-at-least-32-bytes"; users={"alice":{"username":"alice","hashed_password":p.hash("secret")}}; client=TestClient(build_app(users,p,secret)); issued=client.post("/token",data={"username":"alice","password":"secret"}); token=issued.json()["access_token"]; me=client.get("/users/me",headers={"Authorization":"Bearer "+token}); invalid=client.get("/users/me",headers={"Authorization":"Bearer broken"})
    return {"token_type":issued.json()["token_type"],"subject":jwt.decode(token,secret,algorithms=["HS256"])["sub"],"me":me.json(),"invalid":invalid.status_code}`,
    expected: { token_type: 'bearer', subject: 'alice', me: { username: 'alice' }, invalid: 401 },
    tests: [
      test('登录签发可验证 JWT', `p=PasswordHash.recommended(); users={"a":{"username":"a","hashed_password":p.hash("s")}}; c=TestClient(build_app(users,p,"key")); r=c.post("/token",data={"username":"a","password":"s"}); payload=jwt.decode(r.json()["access_token"],"key",algorithms=["HS256"]); expect_equal((r.status_code,r.json()["token_type"],payload["sub"]),(200,"bearer","a")); expect_equal("exp" in payload,True)`),
      test('令牌可访问当前用户', `p=PasswordHash.recommended(); users={"a":{"username":"a","hashed_password":p.hash("s")}}; c=TestClient(build_app(users,p,"key")); token=c.post("/token",data={"username":"a","password":"s"}).json()["access_token"]; expect_equal(c.get("/users/me",headers={"Authorization":"Bearer "+token}).json(),{"username":"a"})`),
      test('错误登录与无效令牌被拒绝', `p=PasswordHash.recommended(); users={"a":{"username":"a","hashed_password":p.hash("s")}}; c=TestClient(build_app(users,p,"key")); expect_equal(c.post("/token",data={"username":"a","password":"bad"}).status_code,401); expect_equal(c.get("/users/me",headers={"Authorization":"Bearer broken"}).status_code,401)`),
    ],
    provided: 'Token 模型、JWT 库、OAuth2 form 与 PasswordHash',
    connection: '认证确认“是谁”；下一节用 scopes 表达“允许做什么”。',
    flow: ['登录表单 / Bearer JWT', '你实现：签发与解码', '当前用户 / 401'],
  },
  {
    id: 'w16-4', title: '用 OAuth2 Scopes 实现细粒度授权',
    story: '同一用户令牌可能只能读笔记，也可能具有管理权限。依赖要根据每个路径声明的 scopes 做集合检查。',
    setup: security,
    signature: 'def build_app(secret_key):',
    requirements: ['OAuth2PasswordBearer 声明 notes:read 与 admin 两个 scope。', 'authorize 接收 SecurityScopes，解码 JWT，要求声明 scope 全部包含于 token scopes。', 'GET /notes 需要 notes:read；GET /admin 需要 admin；失败返回 401 并带 scope challenge。'],
    entry: `    secret="scope-secret-key-with-at-least-32-bytes"; read=jwt.encode({"sub":"alice","scopes":["notes:read"]},secret,algorithm="HS256"); admin=jwt.encode({"sub":"root","scopes":["admin"]},secret,algorithm="HS256"); client=TestClient(build_app(secret)); notes=client.get("/notes",headers={"Authorization":"Bearer "+read}); denied=client.get("/admin",headers={"Authorization":"Bearer "+read}); allowed=client.get("/admin",headers={"Authorization":"Bearer "+admin})
    return {"notes":notes.status_code,"denied":denied.status_code,"challenge":denied.headers["www-authenticate"],"admin":allowed.json()}`,
    expected: { notes: 200, denied: 401, challenge: 'Bearer scope="admin"', admin: { status: 'allowed' } },
    tests: [
      test('读 scope 只能访问笔记', `s="k"; t=jwt.encode({"sub":"a","scopes":["notes:read"]},s,algorithm="HS256"); c=TestClient(build_app(s)); h={"Authorization":"Bearer "+t}; expect_equal(c.get("/notes",headers=h).status_code,200); expect_equal(c.get("/admin",headers=h).status_code,401)`),
      test('admin scope 允许管理接口', `s="k"; t=jwt.encode({"sub":"a","scopes":["admin"]},s,algorithm="HS256"); r=TestClient(build_app(s)).get("/admin",headers={"Authorization":"Bearer "+t}); expect_equal(r.json(),{"status":"allowed"})`),
      test('缺少权限的 challenge 指明 scope', `s="k"; t=jwt.encode({"sub":"a","scopes":[]},s,algorithm="HS256"); r=TestClient(build_app(s)).get("/notes",headers={"Authorization":"Bearer "+t}); expect_equal((r.status_code,r.headers["www-authenticate"]),(401,'Bearer scope="notes:read"'))`),
    ],
    provided: 'SecurityScopes、JWT 与两种权限令牌',
    connection: '授权依赖可挂到 Router 或单个操作；下一周处理异步 I/O 和应用生命周期。',
    flow: ['带 scopes 的 JWT', '你实现：authorize', '路径级权限结果'],
  },
  {
    id: 'w17-1', title: '在 async 路径中并发等待独立 I/O',
    story: '聚合接口要并行读取多个独立笔记。异步 fetch 必须 await，并保持输入顺序返回；非法 ID 仍由请求校验处理。',
    setup: `${common}
import asyncio`,
    signature: 'def build_app(fetch_note):',
    requirements: ['GET /aggregate 接收重复查询参数 ids: list[int]。', '路径操作使用 async def，并用 asyncio.gather 并发 await 每个 fetch_note。', '返回 {notes: [...]}，结果顺序与 ids 一致；不得调用 asyncio.run。'],
    entry: `    active=0; peak=0
    async def fetch(note_id):
        nonlocal active,peak
        active+=1; peak=max(peak,active); await asyncio.sleep(0.001); active-=1
        return {"id":note_id}
    response=TestClient(build_app(fetch)).get("/aggregate?ids=2&ids=1")
    return {"body":response.json(),"peak":peak}`,
    expected: { body: { notes: [{ id: 2 }, { id: 1 }] }, peak: 2 },
    tests: [
      test('异步请求保持结果顺序', `async def fetch(i): await asyncio.sleep(0); return {"id":i}\nr=TestClient(build_app(fetch)).get("/aggregate?ids=3&ids=1"); expect_equal(r.json(),{"notes":[{"id":3},{"id":1}]})`),
      test('独立 I/O 真正并发', `active=0; peak=0\nasync def fetch(i):\n global active,peak\n active+=1; peak=max(peak,active); await asyncio.sleep(.001); active-=1; return i\nTestClient(build_app(fetch)).get("/aggregate?ids=1&ids=2&ids=3")\nexpect_equal(peak,3)`),
      test('缺少或错误 IDs 返回 422', `c=TestClient(build_app(lambda i:i)); expect_equal(c.get("/aggregate").status_code,422); expect_equal(c.get("/aggregate?ids=x").status_code,422)`),
    ],
    provided: '异步 fetch、并发计数与 TestClient',
    connection: '并发适合独立等待，不适合把阻塞库直接放进事件循环；下一节管理共享异步资源。',
    flow: ['多个 ids 请求', '你实现：async gather', '并发 I/O → 有序聚合响应'],
  },
  {
    id: 'w17-2', title: '用 Lifespan 管理启动与关闭资源',
    story: '目录数据要在服务接受请求前加载，并在应用退出时关闭。使用 lifespan 上下文，避免分散的启动事件。',
    setup: `${common}
from contextlib import asynccontextmanager`,
    signature: 'def build_app(load_catalog, close_catalog):',
    requirements: ['定义 asynccontextmanager lifespan，启动时 await load_catalog 并写入 app.state.catalog。', 'yield 后 finally await close_catalog。', 'GET /catalog 从 request.app.state 读取；使用 FastAPI(lifespan=lifespan)。'],
    entry: `    events=[]
    async def load(): events.append("load"); return ["FastAPI","LangGraph"]
    async def close(value): events.append("close:"+str(len(value)))
    app=build_app(load,close)
    with TestClient(app) as client:
        inside=client.get("/catalog").json(); during=list(events)
    return {"inside":inside,"during":during,"after":events}`,
    expected: { inside: { items: ['FastAPI', 'LangGraph'] }, during: ['load'], after: ['load', 'close:2'] },
    tests: [
      test('请求前加载且可读取状态', `events=[]\nasync def load(): events.append("load"); return ["x"]\nasync def close(v): events.append("close")\nwith TestClient(build_app(load,close)) as c: expect_equal((events,c.get("/catalog").json()),(["load"],{"items":["x"]}))`),
      test('退出 TestClient 时执行清理', `events=[]\nasync def load(): events.append("load"); return []\nasync def close(v): events.append("close")\nwith TestClient(build_app(load,close)): pass\nexpect_equal(events,["load","close"])`),
    ],
    provided: 'asynccontextmanager、加载器、关闭器与应用状态',
    connection: 'Lifespan 管理进程级资源；请求级资源仍使用 yield 依赖。',
    flow: ['进程启动', '你实现：lifespan', '资源可用 → 请求 → 关闭清理'],
  },
  {
    id: 'w17-3', title: '用 BackgroundTasks 延后轻量工作',
    story: '通知接口应先返回 202，再由同一进程执行轻量发送任务。任务参数必须是普通数据，不能依赖已经关闭的请求 Session。',
    setup: `${common}
from fastapi import BackgroundTasks

class Notification(BaseModel):
    email:str
    message:str`,
    signature: 'def build_app(send_notification):',
    requirements: ['POST /notifications 接收 Notification 和 BackgroundTasks，返回 202。', '用 add_task 注册 send_notification(email, message)。', '响应为 {status: "accepted"}；输入无效时不得调度。'],
    entry: `    sent=[]
    def send(email,message): sent.append({"email":email,"message":message})
    response=TestClient(build_app(send)).post("/notifications",json={"email":"a@example.com","message":"done"})
    return {"status":response.status_code,"body":response.json(),"sent":sent}`,
    expected: { status: 202, body: { status: 'accepted' }, sent: [{ email: 'a@example.com', message: 'done' }] },
    tests: [
      test('返回 202 并执行已登记任务', `sent=[]\ndef send(e,m): sent.append((e,m))\nr=TestClient(build_app(send)).post("/notifications",json={"email":"a","message":"m"}); expect_equal((r.status_code,r.json(),sent),(202,{"status":"accepted"},[("a","m")]))`),
      test('请求体无效时不登记任务', `sent=[]; c=TestClient(build_app(lambda *args:sent.append(args))); expect_equal(c.post("/notifications",json={"email":"a"}).status_code,422); expect_equal(sent,[])`),
    ],
    provided: 'Notification、BackgroundTasks 与可观察发送函数',
    connection: 'BackgroundTasks 适合进程内轻量任务；重计算、跨机重试应交给独立任务队列。',
    flow: ['通知请求', '你实现：登记后台任务', '202 响应 → 轻量发送'],
  },
  {
    id: 'w17-4', title: '建立 WebSocket 双向消息通道',
    story: '实时学习界面需要一条最小双向连接。服务接受连接、逐条接收文本、回传 JSON，并在客户端断开时正常结束。',
    setup: `${common}
from fastapi import WebSocket, WebSocketDisconnect`,
    signature: 'def build_app():',
    requirements: ['注册 websocket /ws 并先调用 accept。', '循环 receive_text，每条消息 send_json({echo: message})。', '捕获 WebSocketDisconnect 并正常退出，不把断开记录为服务器错误。'],
    entry: `    app=build_app()
    with TestClient(app).websocket_connect("/ws") as websocket:
        websocket.send_text("hello"); first=websocket.receive_json(); websocket.send_text("FastAPI"); second=websocket.receive_json()
    return {"messages":[first,second]}`,
    expected: { messages: [{ echo: 'hello' }, { echo: 'FastAPI' }] },
    tests: [
      test('接受连接并回显 JSON', `with TestClient(build_app()).websocket_connect("/ws") as ws: ws.send_text("x"); expect_equal(ws.receive_json(),{"echo":"x"})`),
      test('同一连接处理多条消息', `with TestClient(build_app()).websocket_connect("/ws") as ws:\n for text in ["a","b","c"]:\n  ws.send_text(text); expect_equal(ws.receive_json(),{"echo":text})`),
    ],
    provided: 'WebSocket、WebSocketDisconnect 与测试客户端',
    connection: 'WebSocket 是长连接，不经过普通 HTTP 响应模型；生产中还需认证、连接管理和背压。',
    flow: ['客户端升级连接', '你实现：WebSocket loop', '双向消息直到断开'],
  },
  {
    id: 'w18-1', title: '用 TestClient 与 dependency_overrides 隔离测试',
    story: '生产仓库不能在单元测试中被调用。导出稳定的依赖函数，在测试中覆盖成内存 Fake，再在结束后清理覆盖。',
    setup: `${common}

class ProductionRepository:
    def list(self): raise RuntimeError("production repository must not run")
class FakeRepository:
    def list(self): return [{"id":1,"title":"fake"}]`,
    signature: `def get_repository():
    raise NotImplementedError("返回生产仓库")

def build_app():
    raise NotImplementedError("请构建应用")`,
    requirements: ['get_repository 返回 ProductionRepository 实例。', 'GET /notes 通过 Depends(get_repository) 注入仓库并返回 list。', '函数对象必须稳定导出，使 app.dependency_overrides[get_repository] 可以覆盖。'],
    entry: `    app=build_app(); app.dependency_overrides[get_repository]=lambda:FakeRepository(); response=TestClient(app).get("/notes"); app.dependency_overrides.clear()
    return {"status":response.status_code,"body":response.json(),"overrides_after":len(app.dependency_overrides)}`,
    expected: { status: 200, body: [{ id: 1, title: 'fake' }], overrides_after: 0 },
    tests: [
      test('覆盖依赖后不会调用生产仓库', `app=build_app(); app.dependency_overrides[get_repository]=lambda:FakeRepository(); r=TestClient(app).get("/notes"); expect_equal(r.json(),[{"id":1,"title":"fake"}])`),
      test('清理覆盖后恢复原依赖', `expect_equal(isinstance(get_repository(),ProductionRepository),True); app=build_app(); app.dependency_overrides[get_repository]=lambda:FakeRepository(); app.dependency_overrides.clear(); expect_raises(RuntimeError,lambda:TestClient(app).get("/notes"))`),
    ],
    provided: '生产仓库、Fake 仓库与覆盖场景',
    connection: '依赖覆盖让数据库、鉴权和外部 API 测试保持确定；下一节直接测试异步应用。',
    flow: ['测试请求', '你实现：可覆盖依赖', 'Fake 结果 → 断言并清理'],
  },
  {
    id: 'w18-2', title: '用 HTTPX AsyncClient 测试异步应用',
    story: '测试本身还要 await 异步数据库逻辑，不能再用同步 TestClient。使用 ASGITransport 和 AsyncClient 发起并发请求。',
    setup: `${common}
import asyncio
from httpx import ASGITransport, AsyncClient

def sample_app():
    app=FastAPI()
    @app.get("/items/{item_id}")
    async def item(item_id:int):
        await asyncio.sleep(0)
        return {"id":item_id}
    return app`,
    signature: 'async def call_app(app):',
    requirements: ['创建 ASGITransport(app=app) 和 base_url=http://test 的 AsyncClient。', '在 async with 中用 asyncio.gather 并发 GET /items/1、/items/2。', '返回 statuses 与解析后的 items；不得在函数内调用 asyncio.run。'],
    entry: `    return asyncio.run(call_app(sample_app()))`,
    expected: { statuses: [200, 200], items: [{ id: 1 }, { id: 2 }] },
    tests: [
      test('AsyncClient 访问 ASGI 应用', `expect_equal(asyncio.run(call_app(sample_app())),{"statuses":[200,200],"items":[{"id":1},{"id":2}]})`),
      test('两个请求都由测试应用处理', `seen=[]; app=FastAPI()\n@app.get("/items/{item_id}")\nasync def item(item_id:int): seen.append(item_id); return {"id":item_id}\nr=asyncio.run(call_app(app))\nexpect_equal((r["statuses"],sorted(seen)),([200,200],[1,2]))`),
    ],
    provided: '示例异步应用、ASGITransport 与 AsyncClient',
    connection: '异步测试能在同一事件循环中检查数据库和 API；依赖 lifespan 时要额外显式管理生命周期。',
    flow: ['异步测试函数', '你实现：call_app', '并发 ASGI 响应 → 业务断言'],
  },
  {
    id: 'w18-3', title: '统一领域错误与 OpenAPI 响应契约',
    story: '发布命令遇到版本冲突时，所有客户端都应收到同一种错误 envelope，文档也要声明 409，而不是泄漏内部异常字符串。',
    setup: `${common}
from fastapi.responses import JSONResponse

class DomainError(Exception):
    def __init__(self,code,message): self.code=code; self.message=message
class ErrorBody(BaseModel): code:str; message:str
class ErrorEnvelope(BaseModel): error:ErrorBody
class PublishCommand(BaseModel): version:int`,
    signature: 'def build_app():',
    requirements: ['创建 DomainError exception_handler，返回 409 与 {error:{code,message}}。', 'POST /publish 接收 PublishCommand；version != 1 抛出 version_conflict。', 'decorator 的 responses 声明 409 使用 ErrorEnvelope，使契约进入 OpenAPI。'],
    entry: `    app=build_app(); client=TestClient(app); ok=client.post("/publish",json={"version":1}); conflict=client.post("/publish",json={"version":2}); documented="409" in app.openapi()["paths"]["/publish"]["post"]["responses"]
    return {"ok":ok.json(),"conflict_status":conflict.status_code,"conflict":conflict.json(),"documented":documented}`,
    expected: { ok: { status: 'published' }, conflict_status: 409, conflict: { error: { code: 'version_conflict', message: 'Version must be 1' } }, documented: true },
    tests: [
      test('领域错误转换为稳定 envelope', `r=TestClient(build_app()).post("/publish",json={"version":2}); expect_equal((r.status_code,r.json()),(409,{"error":{"code":"version_conflict","message":"Version must be 1"}}))`),
      test('正常发布不受错误处理器影响', `expect_equal(TestClient(build_app()).post("/publish",json={"version":1}).json(),{"status":"published"})`),
      test('OpenAPI 文档包含 409 模型', `responses=build_app().openapi()["paths"]["/publish"]["post"]["responses"]; expect_equal("409" in responses,True); expect_equal(responses["409"]["content"]["application/json"]["schema"]["$ref"].endswith("ErrorEnvelope"),True)`),
    ],
    provided: 'DomainError、错误模型和发布命令',
    connection: '错误契约可被前端和生成客户端稳定消费；最后一节把健康检查与部署语义分开。',
    flow: ['发布命令', '你实现：异常处理与响应声明', '成功 / 409 envelope + OpenAPI'],
  },
  {
    id: 'w18-4', title: '区分存活、就绪与生产部署边界',
    story: '编排平台需要知道进程是否存活，也需要知道数据库是否可用。存活检查不能依赖数据库，就绪失败要返回 503。',
    setup: common,
    signature: 'def build_app(check_database):',
    requirements: ['GET /health/live 永远返回 {status: alive}，不得调用 check_database。', 'GET /health/ready 调用 check_database；True 返回 ready，False 抛出 503 Database unavailable。', '两个运维端点 include_in_schema=False，不污染业务 OpenAPI。'],
    entry: `    checks=[]
    def database(): checks.append("db"); return False
    app=build_app(database); client=TestClient(app); live=client.get("/health/live"); calls_after_live=list(checks); ready=client.get("/health/ready")
    return {"live":live.json(),"calls_after_live":calls_after_live,"ready_status":ready.status_code,"detail":ready.json()["detail"],"documented_paths":sorted(app.openapi()["paths"])}`,
    expected: { live: { status: 'alive' }, calls_after_live: [], ready_status: 503, detail: 'Database unavailable', documented_paths: [] },
    tests: [
      test('存活检查不访问下游', `calls=[]; c=TestClient(build_app(lambda:calls.append(1) or False)); r=c.get("/health/live"); expect_equal((r.status_code,r.json(),calls),(200,{"status":"alive"},[]))`),
      test('就绪检查反映依赖状态', `expect_equal(TestClient(build_app(lambda:True)).get("/health/ready").json(),{"status":"ready"}); r=TestClient(build_app(lambda:False)).get("/health/ready"); expect_equal((r.status_code,r.json()),(503,{"detail":"Database unavailable"}))`),
      test('运维路径不进入业务 OpenAPI', `expect_equal(build_app(lambda:True).openapi()["paths"],{})`),
    ],
    provided: '可注入数据库探测与运维请求',
    connection: '部署还需 HTTPS、重启、复制、内存与迁移策略；周项目用容器和真实数据库完成最终验收。',
    flow: ['平台探针请求', '你实现：live / ready', '进程或依赖状态 → 调度决策'],
  },
];

export const fastapiChallenges: Record<string, CodeChallenge> = Object.fromEntries(exercises.map(item => {
  const context: ChallengeContext = {
    title: item.title,
    story: item.story,
    flow: item.flow,
    connection: item.connection,
    provided: item.provided,
    setup: item.setup,
    entry: item.entry,
    expected: item.expected,
  };
  return [item.id, {
    runtime: 'fastapi',
    title: item.title,
    scenario: item.story,
    requirements: item.requirements,
    context,
    starter: contextualizeCode(context, `${item.signature}\n    \"\"\"按要求使用真实 FastAPI API 完成组件。\"\"\"\n    raise NotImplementedError(\"请完成 FastAPI 组件\")\n`),
    solution: contextualizeCode(context, fastapiSolutions[item.id]),
    tests: [...item.tests, {
      name: '完整场景：真实 FastAPI 与上下游得到预期结果',
      code: `expect_equal(run_scenario(), json.loads(${JSON.stringify(JSON.stringify(item.expected))}))`,
    }],
  } satisfies CodeChallenge];
}));
