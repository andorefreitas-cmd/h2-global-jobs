
from fastapi import FastAPI, HTTPException, Depends, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from passlib.context import CryptContext
import sqlite3, time, os, re, csv, io, zipfile, json, datetime as dt
from typing import Optional, List, Dict, Any
import jwt
import requests

APP_NAME = "H2 Global Jobs"
DB_PATH = os.getenv("DB_PATH", "h2_global_jobs.db")
JWT_SECRET = os.getenv("JWT_SECRET", "troque-esta-chave-em-producao")
ADMIN_USER = os.getenv("ADMIN_USER", "admin")
ADMIN_PASS = os.getenv("ADMIN_PASS", "Aa251589Ff")
PIX_KEY = os.getenv("PIX_KEY", "CADASTRE_SUA_CHAVE_PIX_AQUI")
PIX_NAME = os.getenv("PIX_NAME", "Andre Nogueira de Freitas")
WHATSAPP = os.getenv("WHATSAPP", "5531988425410")
DAY = 24 * 60 * 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
EMAIL_RE = re.compile(r"[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}", re.I)

app = FastAPI(title=APP_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, coloque apenas o domínio do seu site.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SignupIn(BaseModel):
    username: str
    password: str

class LoginIn(BaseModel):
    username: str
    password: str

class RenewIn(BaseModel):
    username: str
    days: int
    plan: str

class ToggleIn(BaseModel):
    username: str

class SearchIn(BaseModel):
    visa_type: str  # h2a or h2b
    days_back: int = 2
    max_results: int = 300

class MarkUsedIn(BaseModel):
    emails: List[str]

def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def now():
    return int(time.time())

def init_db():
    conn = db()
    cur = conn.cursor()
    cur.execute("""
    CREATE TABLE IF NOT EXISTS users(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        plan TEXT NOT NULL DEFAULT 'Grátis 24h',
        expires_at INTEGER NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        last_login INTEGER
    )
    """)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS used_emails(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        email TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        UNIQUE(user_id,email)
    )
    """)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS searches(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        visa_type TEXT NOT NULL,
        total_found INTEGER NOT NULL,
        total_new INTEGER NOT NULL,
        created_at INTEGER NOT NULL
    )
    """)
    cur.execute("SELECT id FROM users WHERE username=?", (ADMIN_USER,))
    if not cur.fetchone():
        cur.execute(
            "INSERT INTO users(username,password_hash,role,plan,expires_at,active,created_at) VALUES(?,?,?,?,?,?,?)",
            (ADMIN_USER, pwd_context.hash(ADMIN_PASS), "admin", "Administrador", now()+3650*DAY, 1, now())
        )
    conn.commit()
    conn.close()

init_db()

def make_token(user):
    payload = {"sub": user["username"], "role": user["role"], "uid": user["id"], "exp": now()+7*DAY}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def get_current_user(authorization: Optional[str] = None):
    raise RuntimeError("Use current_user dependency.")

def current_user_dep():
    pass

from fastapi import Header
def get_user(authorization: Optional[str] = Header(default=None)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Token ausente.")
    token = authorization.split(" ", 1)[1]
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except Exception:
        raise HTTPException(401, "Token inválido.")
    conn = db()
    user = conn.execute("SELECT * FROM users WHERE id=?", (data["uid"],)).fetchone()
    conn.close()
    if not user:
        raise HTTPException(401, "Usuário não encontrado.")
    return dict(user)

def require_admin(user=Depends(get_user)):
    if user["role"] != "admin":
        raise HTTPException(403, "Acesso restrito ao administrador.")
    return user

def require_active(user=Depends(get_user)):
    if user["role"] == "admin":
        return user
    if not user["active"] or user["expires_at"] < now():
        raise HTTPException(403, "Acesso expirado. Renove seu plano.")
    return user

@app.post("/api/signup")
def signup(data: SignupIn):
    username = data.username.strip().lower()
    if not username or len(username) < 3:
        raise HTTPException(400, "Usuário deve ter pelo menos 3 caracteres.")
    if len(data.password) < 6:
        raise HTTPException(400, "Senha deve ter pelo menos 6 caracteres.")
    conn = db()
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO users(username,password_hash,role,plan,expires_at,active,created_at,last_login) VALUES(?,?,?,?,?,?,?,?)",
            (username, pwd_context.hash(data.password), "user", "Grátis 24h", now()+DAY, 1, now(), now())
        )
        conn.commit()
        user = conn.execute("SELECT * FROM users WHERE username=?", (username,)).fetchone()
        return {"token": make_token(user), "user": public_user(dict(user))}
    except sqlite3.IntegrityError:
        raise HTTPException(400, "Usuário já existe.")
    finally:
        conn.close()

@app.post("/api/login")
def login(data: LoginIn):
    conn = db()
    user = conn.execute("SELECT * FROM users WHERE username=?", (data.username.strip().lower(),)).fetchone()
    if not user or not pwd_context.verify(data.password, user["password_hash"]):
        conn.close()
        raise HTTPException(401, "Login ou senha inválidos.")
    conn.execute("UPDATE users SET last_login=? WHERE id=?", (now(), user["id"]))
    conn.commit()
    user = conn.execute("SELECT * FROM users WHERE id=?", (user["id"],)).fetchone()
    conn.close()
    return {"token": make_token(user), "user": public_user(dict(user))}

@app.get("/api/me")
def me(user=Depends(get_user)):
    return {"user": public_user(user), "pix": pix_info() if user["role"] == "admin" or user["expires_at"] < now() else None}

def public_user(u):
    return {
        "id": u["id"], "username": u["username"], "role": u["role"], "plan": u["plan"],
        "expires_at": u["expires_at"], "active": bool(u["active"]), "created_at": u["created_at"],
        "last_login": u["last_login"], "expired": (u["expires_at"] < now()) if u["role"]!="admin" else False
    }

def pix_info():
    return {"pix_key": PIX_KEY, "pix_name": PIX_NAME, "whatsapp": WHATSAPP}

@app.get("/api/plans")
def plans(user=Depends(get_user)):
    # Chave Pix só é exibida depois do cadastro/login.
    return {
        "plans": [
            {"name": "Grátis 24h", "price": 0, "days": 1},
            {"name": "7 dias", "price": 39, "days": 7},
            {"name": "30 dias", "price": 100, "days": 30},
            {"name": "VIP 90 dias", "price": 250, "days": 90},
        ],
        "payment": pix_info()
    }

@app.get("/api/admin/users")
def list_users(admin=Depends(require_admin)):
    conn = db()
    rows = conn.execute("SELECT * FROM users ORDER BY created_at DESC").fetchall()
    conn.close()
    return {"users": [public_user(dict(r)) for r in rows]}

@app.post("/api/admin/renew")
def renew(data: RenewIn, admin=Depends(require_admin)):
    conn = db()
    user = conn.execute("SELECT * FROM users WHERE username=?", (data.username.strip().lower(),)).fetchone()
    if not user:
        conn.close()
        raise HTTPException(404, "Usuário não encontrado.")
    base = max(now(), int(user["expires_at"]))
    conn.execute(
        "UPDATE users SET expires_at=?, plan=?, active=1 WHERE id=?",
        (base + data.days * DAY, data.plan, user["id"])
    )
    conn.commit()
    conn.close()
    return {"ok": True}

@app.post("/api/admin/toggle")
def toggle(data: ToggleIn, admin=Depends(require_admin)):
    conn = db()
    user = conn.execute("SELECT * FROM users WHERE username=?", (data.username.strip().lower(),)).fetchone()
    if not user:
        conn.close()
        raise HTTPException(404, "Usuário não encontrado.")
    conn.execute("UPDATE users SET active=? WHERE id=?", (0 if user["active"] else 1, user["id"]))
    conn.commit()
    conn.close()
    return {"ok": True}

@app.post("/api/search")
def search(data: SearchIn, user=Depends(require_active)):
    visa = data.visa_type.lower().strip()
    if visa not in ("h2a", "h2b"):
        raise HTTPException(400, "Tipo deve ser h2a ou h2b.")
    days_back = max(1, min(data.days_back, 14))
    max_results = max(10, min(data.max_results, 1000))

    used = get_used_emails(user["id"])
    rows = fetch_dol_emails(visa, days_back, max_results)
    new_rows = []
    seen = set()
    for r in rows:
        email = r.get("email","").lower()
        if not email or email in used or email in seen:
            continue
        seen.add(email)
        new_rows.append(r)

    conn = db()
    conn.execute(
        "INSERT INTO searches(user_id, visa_type, total_found, total_new, created_at) VALUES(?,?,?,?,?)",
        (user["id"], visa, len(rows), len(new_rows), now())
    )
    conn.commit()
    conn.close()
    return {"visa_type": visa, "total_found": len(rows), "total_new": len(new_rows), "results": new_rows}

@app.post("/api/mark-used")
def mark_used(data: MarkUsedIn, user=Depends(require_active)):
    conn = db()
    for e in data.emails:
        email = e.strip().lower()
        if EMAIL_RE.fullmatch(email):
            try:
                conn.execute("INSERT OR IGNORE INTO used_emails(user_id,email,created_at) VALUES(?,?,?)", (user["id"], email, now()))
            except Exception:
                pass
    conn.commit()
    conn.close()
    return {"ok": True}

@app.get("/api/export/txt")
def export_txt(emails: str, user=Depends(require_active)):
    content = "\n".join([e.strip().lower() for e in emails.split(",") if EMAIL_RE.fullmatch(e.strip())])
    return Response(content, media_type="text/plain", headers={"Content-Disposition":"attachment; filename=somente_emails.txt"})

def get_used_emails(user_id: int):
    conn = db()
    rows = conn.execute("SELECT email FROM used_emails WHERE user_id=?", (user_id,)).fetchall()
    conn.close()
    return set(r["email"].lower() for r in rows)

# ---- Robô web: DOL/SeasonalJobs feeds ----

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0 Safari/537.36",
    "Accept": "application/zip,application/json,text/plain,*/*",
    "Referer": "https://seasonaljobs.dol.gov/feeds",
}

def feed_urls(visa: str, date_s: str):
    if visa == "h2a":
        return [f"https://api.seasonaljobs.dol.gov/datahub-search/sjCaseData/zip/jo/{date_s}"]
    # H-2B: mantém opções conhecidas; se uma mudar, o log/erro indicará.
    return [
        f"https://api.seasonaljobs.dol.gov/datahub-search/sjCaseData/zip/9142B/{date_s}",
        f"https://api.seasonaljobs.dol.gov/datahub-search/sjCaseData/zip/h2b/{date_s}",
    ]

def download_url(url: str):
    r = requests.get(url, headers=HEADERS, timeout=45)
    if r.status_code == 200 and r.content:
        return r.content
    return None

def read_jsons_from_zip(content: bytes):
    out = []
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as z:
            for name in z.namelist():
                if name.lower().endswith((".json", ".txt")):
                    text = z.read(name).decode("utf-8-sig", errors="replace")
                    try:
                        out.append(json.loads(text))
                    except Exception:
                        pass
    except zipfile.BadZipFile:
        try:
            out.append(json.loads(content.decode("utf-8-sig", errors="replace")))
        except Exception:
            pass
    return out

def flatten_values(obj):
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield str(k)
            yield from flatten_values(v)
    elif isinstance(obj, list):
        for item in obj:
            yield from flatten_values(item)
    elif obj is not None:
        yield str(obj)

def iter_dict_records(obj):
    if isinstance(obj, dict):
        keys = " ".join(str(k).lower() for k in obj.keys())
        if any(t in keys for t in ["case", "job", "employer", "wage", "email", "soc", "worksite"]):
            yield obj
        for v in obj.values():
            yield from iter_dict_records(v)
    elif isinstance(obj, list):
        for item in obj:
            yield from iter_dict_records(item)

def get_key(obj: Dict[str, Any], keys: List[str]) -> str:
    lower = {str(k).lower(): v for k, v in obj.items()}
    for k in keys:
        v = lower.get(k.lower())
        if v not in (None, ""):
            return str(v)
    return ""

def emails_from_obj(obj):
    text = "\n".join(flatten_values(obj))
    return sorted(set(e.lower().strip().strip(".;,") for e in EMAIL_RE.findall(text)))

def build_row(record, email):
    case_no = get_key(record, ["case_number", "caseNumber", "case_no", "caseNo", "case_id", "caseId", "visa_case_number"])
    title = get_key(record, ["job_title", "jobTitle", "job_order_title", "jobOrderTitle", "position_title", "soc_title"])
    employer = get_key(record, ["employer_name", "employerName", "business_name", "businessName", "company_name", "companyName"])
    state = get_key(record, ["state", "worksite_state", "worksiteState", "job_state", "jobState", "address_state"])
    wage = get_key(record, ["wage", "hourly_wage", "hourlyWage", "rate_of_pay", "rateOfPay", "basic_rate_of_pay"])
    status = get_key(record, ["status", "case_status", "caseStatus", "job_order_status"])
    start = get_key(record, ["start_date", "startDate", "begin_date", "beginDate", "period_start", "employment_start_date"])
    end = get_key(record, ["end_date", "endDate", "period_end", "employment_end_date"])
    return {
        "case_number": case_no,
        "job_title": title,
        "employer": employer,
        "state": state,
        "wage": wage,
        "status": status,
        "start": start,
        "end": end,
        "email": email,
        "link": f"https://seasonaljobs.dol.gov/jobs/{case_no}" if case_no else ""
    }

def status_valid(status: str):
    if not status:
        return True
    s = status.lower()
    bad = ["denied", "withdrawn", "expired", "closed", "inactive"]
    return not any(b in s for b in bad)

def fetch_dol_emails(visa: str, days_back: int, max_results: int):
    rows = []
    seen = set()
    today = dt.date.today()
    for i in range(days_back):
        date_s = (today - dt.timedelta(days=i)).isoformat()
        for url in feed_urls(visa, date_s):
            try:
                content = download_url(url)
                if not content:
                    continue
                objs = read_jsons_from_zip(content)
                for obj in objs:
                    for rec in iter_dict_records(obj):
                        if not status_valid(get_key(rec, ["status", "case_status", "caseStatus", "job_order_status"])):
                            continue
                        for email in emails_from_obj(rec):
                            row = build_row(rec, email)
                            key = (row["case_number"], email)
                            if key in seen:
                                continue
                            seen.add(key)
                            rows.append(row)
                            if len(rows) >= max_results:
                                return rows
            except Exception:
                continue
    return rows
