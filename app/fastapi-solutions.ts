// Verified FastAPI reference implementations shown by the learning UI.
export const fastapiSolutions: Record<string, string> = {
  'w13-1': `def build_app():
    app = FastAPI(title="Notes API", version="1.0.0")

    @app.get("/health", tags=["system"])
    def health():
        return {"status": "ok"}

    return app`,
  'w13-2': `def build_app():
    app = FastAPI()

    @app.get("/notes/{note_id}")
    def read_note(
        note_id: Annotated[int, Path(ge=1)],
        q: Annotated[str | None, Query(min_length=2)] = None,
        limit: Annotated[int, Query(ge=1, le=20)] = 10,
    ):
        return {"note_id": note_id, "q": q, "limit": limit}

    return app`,
  'w13-3': `def build_app():
    app = FastAPI()

    @app.post("/notes", response_model=NotePublic, status_code=status.HTTP_201_CREATED)
    def create_note(note: NoteCreate):
        return {"id": 1, **note.model_dump()}

    return app`,
  'w13-4': `def build_app():
    app = FastAPI()

    @app.get("/notes/{note_id}", response_model=NotePublic)
    def read_note(note_id: int):
        note = NOTES.get(note_id)
        if note is None:
            raise HTTPException(status_code=404, detail="Note not found")
        return note

    return app`,
  'w14-1': `def build_app(repository):
    app = FastAPI()

    def require_api_key(x_api_key: Annotated[str, Header()]):
        if x_api_key != "study-key":
            raise HTTPException(status_code=401, detail="Invalid API key")
        return x_api_key

    def pagination(
        offset: Annotated[int, Query(ge=0)] = 0,
        limit: Annotated[int, Query(ge=1, le=50)] = 10,
    ):
        return {"offset": offset, "limit": limit}

    @app.get("/notes")
    def list_notes(
        page: Annotated[dict, Depends(pagination)],
        _key: Annotated[str, Depends(require_api_key)],
    ):
        return repository.list(**page)

    return app`,
  'w14-2': `def build_app(resource_factory):
    app = FastAPI()

    def get_resource():
        resource = resource_factory()
        try:
            yield resource
        finally:
            resource.close()

    @app.get("/work/{mode}")
    def work(mode: str, resource: Annotated[Resource, Depends(get_resource)]):
        if mode == "fail":
            raise HTTPException(status_code=400, detail="failed")
        return {"value": resource.read()}

    return app`,
  'w14-3': `def build_app():
    app = FastAPI(title="Knowledge Service")
    notes = APIRouter(prefix="/notes", tags=["notes"])
    admin = APIRouter(prefix="/admin", tags=["admin"])

    @notes.get("")
    def list_notes():
        return [{"id": 1, "title": "FastAPI"}]

    @admin.get("/status")
    def admin_status():
        return {"status": "ready"}

    app.include_router(notes, prefix="/api/v1")
    app.include_router(admin, prefix="/api/v1")
    return app`,
  'w14-4': `def build_app(allowed_origins):
    app = FastAPI()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET"],
        allow_headers=["X-Request-ID"],
    )

    @app.middleware("http")
    async def request_id_middleware(request: Request, call_next):
        request_id = request.headers.get("X-Request-ID", "generated-request")
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

    @app.get("/health")
    def health():
        return {"status": "ok"}

    return app`,
  'w15-1': `class NoteBase(SQLModel):
    title: str = Field(min_length=1, max_length=80, index=True)
    content: str = Field(min_length=1)

class Note(NoteBase, table=True):
    id: int | None = Field(default=None, primary_key=True)

class NoteCreate(NoteBase):
    pass

class NotePublic(NoteBase):
    id: int

def create_db_and_tables(engine):
    SQLModel.metadata.create_all(engine)`,
  'w15-2': `def build_app(engine):
    app = FastAPI()

    def get_session():
        with Session(engine) as session:
            yield session

    @app.post("/notes", response_model=NotePublic, status_code=201)
    def create_note(note: NoteCreate, session: Annotated[Session, Depends(get_session)]):
        db_note = Note.model_validate(note)
        session.add(db_note)
        session.commit()
        session.refresh(db_note)
        return db_note

    @app.get("/notes", response_model=list[NotePublic])
    def list_notes(session: Annotated[Session, Depends(get_session)]):
        return session.exec(select(Note).order_by(Note.id)).all()

    return app`,
  'w15-3': `def build_app(engine):
    app = FastAPI()

    def get_session():
        with Session(engine) as session:
            yield session

    @app.patch("/notes/{note_id}", response_model=NotePublic)
    def update_note(note_id: int, patch: NoteUpdate, session: Annotated[Session, Depends(get_session)]):
        note = session.get(Note, note_id)
        if note is None:
            raise HTTPException(status_code=404, detail="Note not found")
        note.sqlmodel_update(patch.model_dump(exclude_unset=True))
        session.add(note)
        session.commit()
        session.refresh(note)
        return note

    @app.delete("/notes/{note_id}", status_code=204)
    def delete_note(note_id: int, session: Annotated[Session, Depends(get_session)]):
        note = session.get(Note, note_id)
        if note is None:
            raise HTTPException(status_code=404, detail="Note not found")
        session.delete(note)
        session.commit()
        return Response(status_code=204)

    return app`,
  'w15-4': `def build_app(engine):
    app = FastAPI()

    def get_session():
        with Session(engine) as session:
            yield session

    @app.post("/notes", response_model=NotePublic, status_code=201)
    def create_note(note: NoteCreate, session: Annotated[Session, Depends(get_session)]):
        db_note = Note.model_validate(note)
        try:
            session.add(db_note)
            session.commit()
            session.refresh(db_note)
        except IntegrityError:
            session.rollback()
            raise HTTPException(status_code=409, detail="Title already exists")
        return db_note

    @app.get("/notes", response_model=list[NotePublic])
    def list_notes(
        session: Annotated[Session, Depends(get_session)],
        offset: Annotated[int, Query(ge=0)] = 0,
        limit: Annotated[int, Query(ge=1, le=50)] = 10,
    ):
        return session.exec(select(Note).order_by(Note.id).offset(offset).limit(limit)).all()

    return app`,
  'w16-1': `def build_app(tokens):
    app = FastAPI()
    oauth2 = OAuth2PasswordBearer(tokenUrl="token")

    def current_user(token: Annotated[str, Depends(oauth2)]):
        username = tokens.get(token)
        if username is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return username

    @app.get("/users/me")
    def read_me(username: Annotated[str, Depends(current_user)]):
        return {"username": username}

    return app`,
  'w16-2': `def build_app(users, password_hash):
    app = FastAPI()

    def authenticate(username: str, password: str):
        user = users.get(username)
        if user is None or not password_hash.verify(password, user["hashed_password"]):
            return None
        return user

    @app.post("/login")
    def login(credentials: Credentials):
        user = authenticate(credentials.username, credentials.password)
        if user is None:
            raise HTTPException(status_code=401, detail="Incorrect username or password")
        return {"username": user["username"]}

    return app`,
  'w16-3': `def build_app(users, password_hash, secret_key):
    app = FastAPI()
    oauth2 = OAuth2PasswordBearer(tokenUrl="token")

    def create_access_token(subject: str):
        expires = datetime.now(timezone.utc) + timedelta(minutes=30)
        return jwt.encode({"sub": subject, "exp": expires}, secret_key, algorithm="HS256")

    def current_user(token: Annotated[str, Depends(oauth2)]):
        credentials_error = HTTPException(
            status_code=401,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        try:
            payload = jwt.decode(token, secret_key, algorithms=["HS256"])
            username = payload.get("sub")
        except InvalidTokenError:
            raise credentials_error
        user = users.get(username) if isinstance(username, str) else None
        if user is None:
            raise credentials_error
        return user

    @app.post("/token", response_model=Token)
    def issue_token(form: Annotated[OAuth2PasswordRequestForm, Depends()]):
        user = users.get(form.username)
        if user is None or not password_hash.verify(form.password, user["hashed_password"]):
            raise HTTPException(status_code=401, detail="Incorrect username or password")
        return {"access_token": create_access_token(user["username"]), "token_type": "bearer"}

    @app.get("/users/me")
    def read_me(user: Annotated[dict, Depends(current_user)]):
        return {"username": user["username"]}

    return app`,
  'w16-4': `def build_app(secret_key):
    app = FastAPI()
    oauth2 = OAuth2PasswordBearer(
        tokenUrl="token",
        scopes={"notes:read": "Read notes", "admin": "Admin access"},
    )

    def authorize(
        security_scopes: SecurityScopes,
        token: Annotated[str, Depends(oauth2)],
    ):
        authenticate = "Bearer"
        if security_scopes.scopes:
            authenticate += f' scope="{security_scopes.scope_str}"'
        error = HTTPException(status_code=401, detail="Not enough permissions", headers={"WWW-Authenticate": authenticate})
        try:
            payload = jwt.decode(token, secret_key, algorithms=["HS256"])
        except InvalidTokenError:
            raise error
        granted = set(payload.get("scopes", []))
        if not set(security_scopes.scopes).issubset(granted):
            raise error
        return payload["sub"]

    @app.get("/notes")
    def notes(_user: Annotated[str, Security(authorize, scopes=["notes:read"])]):
        return [{"id": 1}]

    @app.get("/admin")
    def admin(_user: Annotated[str, Security(authorize, scopes=["admin"])]):
        return {"status": "allowed"}

    return app`,
  'w17-1': `def build_app(fetch_note):
    app = FastAPI()

    @app.get("/aggregate")
    async def aggregate(ids: Annotated[list[int], Query()]):
        notes = await asyncio.gather(*(fetch_note(note_id) for note_id in ids))
        return {"notes": notes}

    return app`,
  'w17-2': `def build_app(load_catalog, close_catalog):
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.catalog = await load_catalog()
        try:
            yield
        finally:
            await close_catalog(app.state.catalog)

    app = FastAPI(lifespan=lifespan)

    @app.get("/catalog")
    def catalog(request: Request):
        return {"items": request.app.state.catalog}

    return app`,
  'w17-3': `def build_app(send_notification):
    app = FastAPI()

    @app.post("/notifications", status_code=202)
    def notify(payload: Notification, background_tasks: BackgroundTasks):
        background_tasks.add_task(send_notification, payload.email, payload.message)
        return {"status": "accepted"}

    return app`,
  'w17-4': `def build_app():
    app = FastAPI()

    @app.websocket("/ws")
    async def websocket_endpoint(websocket: WebSocket):
        await websocket.accept()
        try:
            while True:
                message = await websocket.receive_text()
                await websocket.send_json({"echo": message})
        except WebSocketDisconnect:
            pass

    return app`,
  'w18-1': `def get_repository():
    return ProductionRepository()

def build_app():
    app = FastAPI()

    @app.get("/notes")
    def notes(repository: Annotated[object, Depends(get_repository)]):
        return repository.list()

    return app`,
  'w18-2': `async def call_app(app):
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        first, second = await asyncio.gather(client.get("/items/1"), client.get("/items/2"))
    return {
        "statuses": [first.status_code, second.status_code],
        "items": [first.json(), second.json()],
    }`,
  'w18-3': `def build_app():
    app = FastAPI(title="Notes API", version="1.0.0")

    @app.exception_handler(DomainError)
    async def domain_error_handler(_request: Request, exc: DomainError):
        return JSONResponse(
            status_code=409,
            content={"error": {"code": exc.code, "message": exc.message}},
        )

    @app.post("/publish", responses={409: {"model": ErrorEnvelope}})
    def publish(command: PublishCommand):
        if command.version != 1:
            raise DomainError("version_conflict", "Version must be 1")
        return {"status": "published"}

    return app`,
  'w18-4': `def build_app(check_database):
    app = FastAPI()

    @app.get("/health/live", include_in_schema=False)
    def live():
        return {"status": "alive"}

    @app.get("/health/ready", include_in_schema=False)
    def ready():
        if not check_database():
            raise HTTPException(status_code=503, detail="Database unavailable")
        return {"status": "ready"}

    return app`,
};
