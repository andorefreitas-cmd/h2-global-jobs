
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Search, Mail, ShieldCheck, Clock, Download, Tractor, Hammer, Leaf, UserCheck, CreditCard, MessageCircle, Lock, LogOut, Users, CalendarClock, AlertTriangle } from "lucide-react";
import "./style.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
const WHATSAPP = "5531988425410";
const PHONE_DISPLAY = "(31) 98842-5410";

function Button({children, className="", ...props}) {
  return <button className={"btn " + className} {...props}>{children}</button>
}
function Card({children, className=""}) {
  return <div className={"card " + className}>{children}</div>
}
function getToken(){ return localStorage.getItem("token") || ""; }
function setToken(t){ localStorage.setItem("token", t); }
function clearToken(){ localStorage.removeItem("token"); }
function fmt(ts){ return ts ? new Date(ts*1000).toLocaleString("pt-BR") : "-"; }

async function api(path, opts={}) {
  const headers = {"Content-Type":"application/json", ...(opts.headers||{})};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {...opts, headers});
  const txt = await res.text();
  let data = {};
  try { data = txt ? JSON.parse(txt) : {}; } catch { data = {detail: txt}; }
  if (!res.ok) throw new Error(data.detail || "Erro na operação.");
  return data;
}

function App(){
  const [screen,setScreen]=useState("home");
  const [user,setUser]=useState(null);
  const [msg,setMsg]=useState("");
  const [results,setResults]=useState([]);
  const [lastType,setLastType]=useState("");
  const [loading,setLoading]=useState(false);

  async function loadMe(){
    if(!getToken()) return;
    try{
      const data=await api("/api/me");
      setUser(data.user);
      setScreen(data.user.role==="admin" ? "admin" : "dashboard");
    }catch{ clearToken(); }
  }
  useEffect(()=>{ loadMe(); },[]);

  function logout(){ clearToken(); setUser(null); setResults([]); setScreen("home"); }

  return <div className="app">
    <Header user={user} setScreen={setScreen} logout={logout}/>
    {screen==="home" && <Home setScreen={setScreen}/>}
    {screen==="login" && <Auth title="Entrar" mode="login" setUser={setUser} setScreen={setScreen} setMsg={setMsg} msg={msg}/>}
    {screen==="signup" && <Auth title="Criar conta grátis" mode="signup" setUser={setUser} setScreen={setScreen} setMsg={setMsg} msg={msg}/>}
    {screen==="dashboard" && user && <Dashboard user={user} refresh={loadMe} msg={msg} setMsg={setMsg} results={results} setResults={setResults} lastType={lastType} setLastType={setLastType} loading={loading} setLoading={setLoading} setScreen={setScreen}/>}
    {screen==="admin" && user?.role==="admin" && <Admin/>}
    {screen==="plans" && <Plans user={user} setScreen={setScreen}/>}
    <footer>H2 Global Jobs — ferramenta de apoio para busca em bases oficiais. Não garante contratação, visto ou aprovação.</footer>
  </div>
}

function Header({user,setScreen,logout}){
  return <header>
    <button className="brand" onClick={()=>setScreen("home")}><span className="logo"><Tractor size={24}/></span><span><b>H2 Global Jobs</b><small>H-2A & H-2B inteligente</small></span></button>
    <nav><button onClick={()=>setScreen("home")}>Início</button><button onClick={()=>setScreen("plans")}>Planos</button></nav>
    <div className="actions">{user ? <><Button onClick={()=>setScreen(user.role==="admin"?"admin":"dashboard")}>Painel</Button><Button className="danger" onClick={logout}><LogOut size={16}/>Sair</Button></> : <><Button onClick={()=>setScreen("login")}>Entrar</Button><Button className="primary" onClick={()=>setScreen("signup")}>Teste grátis</Button></>}</div>
  </header>
}

function Home({setScreen}){
  const features=[
    [Search,"Busca oficial","Pesquisa vagas H-2A e H-2B nas bases oficiais do DOL/SeasonalJobs."],
    [Mail,"E-mails separados","Separa contatos úteis do empregador/recrutador."],
    [ShieldCheck,"Anti-repetição","Remove e-mails já usados e evita candidaturas duplicadas."],
    [Clock,"Vagas recentes","Prioriza oportunidades novas e válidas."],
    [Download,"CSV e TXT","Gera arquivos prontos para copiar ou abrir no Excel."],
    [UserCheck,"Acesso controlado","Login com validade automática e renovação pelo admin."]
  ];
  return <>
    <section className="hero">
      <div><span className="pill">Teste grátis por 24 horas</span><h1>Encontre vagas H-2A e H-2B oficiais em minutos.</h1><p>O sistema pesquisa vagas oficiais dos EUA, separa e-mails úteis, remove contatos repetidos e gera arquivos CSV/TXT prontos para candidatura.</p><div className="row"><Button className="primary big" onClick={()=>setScreen("signup")}>Criar conta grátis</Button><Button className="outline big" onClick={()=>setScreen("login")}>Entrar no sistema</Button></div></div>
      <div className="hero-img"><img src="https://images.unsplash.com/photo-1523741543316-beb7fc7023d8?auto=format&fit=crop&w=1200&q=80"/><div className="stats"><b>1 clique</b><b>CSV/TXT</b><b>0 repetição</b></div></div>
    </section>
    <Jobs/>
    <section className="section alt"><h2>Tudo automático e fácil de usar</h2><p className="center">O cliente entra, escolhe o visto e baixa os contatos.</p><div className="grid3">{features.map(([Icon,t,d])=><Card key={t}><Icon className="green"/><h3>{t}</h3><p>{d}</p></Card>)}</div></section>
    <section className="section two"><div><h2>Painel simples para vender acesso</h2><p>Você libera 24 horas grátis, renova planos e bloqueia acessos expirados. O pagamento é somente via Pix, com comprovante enviado pelo WhatsApp.</p><p><CreditCard className="inline"/> Pagamento somente via Pix</p><p><MessageCircle className="inline"/> Comprovante: {PHONE_DISPLAY}</p></div><Card><h3>Painel do usuário</h3><Button className="primary full">Buscar H-2A</Button><Button className="blue full">Buscar H-2B</Button><p className="box">Exemplo: 184 repetidos removidos · 4 e-mails novos exportados</p></Card></section>
  </>
}

function Jobs(){
  const h2a=[
    ["Farmworker","https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=900&q=80",Tractor],
    ["Colheita","https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=80",Leaf],
    ["Operador agrícola","https://images.unsplash.com/photo-1560493676-04071c5f467b?auto=format&fit=crop&w=900&q=80",Tractor],
  ];
  const h2b=[
    ["Construção","https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=80",Hammer],
    ["Landscaping","https://images.unsplash.com/photo-1558904541-efa843a96f01?auto=format&fit=crop&w=900&q=80",Leaf],
    ["Hotelaria","https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80",UserCheck],
  ];
  return <section className="section"><h2>Funções pesquisadas pelo sistema</h2><h3 className="green-text">H-2A — Agrícola</h3><div className="grid3">{h2a.map(x=><Job key={x[0]} data={x}/>)}</div><h3 className="blue-text">H-2B — Temporário / Serviços</h3><div className="grid3">{h2b.map(x=><Job key={x[0]} data={x}/>)}</div></section>
}
function Job({data}){ const [t,img,Icon]=data; return <div className="job"><img src={img}/><div><Icon/><b>{t}</b></div></div> }

function Auth({title,mode,setUser,setScreen,setMsg,msg}){
  const [form,setForm]=useState({username:"",password:""});
  async function submit(){
    try{
      setMsg("");
      const data=await api(mode==="login"?"/api/login":"/api/signup",{method:"POST",body:JSON.stringify(form)});
      setToken(data.token); setUser(data.user); setScreen(data.user.role==="admin"?"admin":"dashboard");
    }catch(e){ setMsg(e.message); }
  }
  return <section className="auth"><Card><h1>{title}</h1><p>{mode==="signup"?"24 horas grátis, sem cartão.":"Acesse seu painel."}</p><input placeholder="Usuário" value={form.username} onChange={e=>setForm({...form,username:e.target.value})}/><input placeholder="Senha" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/><Button className="primary full big" onClick={submit}><Lock size={16}/>{mode==="signup"?"Liberar 24 horas grátis":"Entrar"}</Button>{msg&&<p className="error">{msg}</p>}<p className="hint">Admin: usuário <b>admin</b> · senha <b>Aa251589Ff</b></p></Card></section>
}

function Dashboard({user,refresh,msg,setMsg,results,setResults,lastType,setLastType,loading,setLoading,setScreen}){
  const expired = user.expired || !user.active;
  async function run(type){
    try{
      setLoading(true); setMsg("");
      const data=await api("/api/search",{method:"POST",body:JSON.stringify({visa_type:type,days_back:2,max_results:300})});
      setResults(data.results); setLastType(type.toUpperCase());
    }catch(e){ setMsg(e.message); }
    finally{ setLoading(false); }
  }
  async function mark(){
    try{ await api("/api/mark-used",{method:"POST",body:JSON.stringify({emails:results.map(r=>r.email)})}); setMsg("E-mails marcados como já utilizados."); refresh(); }catch(e){ setMsg(e.message); }
  }
  function txt(){ download(`${lastType.toLowerCase()}_somente_emails.txt`, results.map(r=>r.email).join("\n"), "text/plain"); }
  function csv(){ const h="email,empregador,funcao,estado,salario,status,link"; const rows=results.map(r=>[r.email,r.employer,r.job_title,r.state,r.wage,r.status,r.link].map(v=>`"${String(v||"").replaceAll('"','""')}"`).join(",")); download(`${lastType.toLowerCase()}_emails_novos.csv`, [h,...rows].join("\n"), "text/csv"); }
  return <section className="section">
    <div className="grid3"><Info Icon={UserCheck} title={`Olá, ${user.username}`} text={`Plano: ${user.plan}`}/><Info Icon={CalendarClock} title={expired?"Acesso expirado":"Acesso ativo"} text={`Expira em: ${fmt(user.expires_at)}`} danger={expired}/><Info Icon={ShieldCheck} title="Anti-repetição" text="E-mails usados ficam bloqueados."/></div>
    {expired ? <Card className="warn"><AlertTriangle/><h2>Seu acesso expirou.</h2><p>Escolha um plano. A chave Pix aparece somente após login/cadastro.</p><Button className="primary" onClick={()=>setScreen("plans")}>Ver planos e Pix</Button></Card> :
      <Card><h2>Pesquisar vagas oficiais</h2><p>Estes botões executam os robôs web no backend usando os feeds do DOL/SeasonalJobs.</p><div className="grid2"><Button className="primary big" disabled={loading} onClick={()=>run("h2a")}><Tractor/>Buscar H-2A</Button><Button className="blue big" disabled={loading} onClick={()=>run("h2b")}><Hammer/>Buscar H-2B</Button></div>{loading&&<p>Pesquisando...</p>}</Card>}
    {msg&&<p className="notice">{msg}</p>}
    {lastType&&<Card><div className="between"><div><h2>Resultado {lastType}</h2><p>{results.length} e-mails novos após filtro anti-repetição.</p></div><div className="row"><Button disabled={!results.length} onClick={txt}>Baixar TXT</Button><Button disabled={!results.length} onClick={csv}>Baixar CSV</Button><Button className="primary" disabled={!results.length} onClick={mark}>Marcar como usados</Button></div></div><Table rows={results}/></Card>}
  </section>
}
function Table({rows}){ return <div className="table-wrap"><table><thead><tr><th>E-mail</th><th>Empregador</th><th>Função</th><th>Estado</th><th>Salário</th><th>Status</th></tr></thead><tbody>{rows.map((r,i)=><tr key={i}><td className="green-text">{r.email}</td><td>{r.employer}</td><td>{r.job_title}</td><td>{r.state}</td><td>{r.wage}</td><td>{r.status}</td></tr>)}{!rows.length&&<tr><td colSpan="6">Nenhum e-mail novo encontrado.</td></tr>}</tbody></table></div>}

function Plans({user,setScreen}){
  const [data,setData]=useState(null); const [err,setErr]=useState("");
  useEffect(()=>{ if(user){ api("/api/plans").then(setData).catch(e=>setErr(e.message)); }},[user]);
  return <section className="section"><h2>Planos de acesso</h2><p className="center">Pagamento somente via Pix. A chave aparece apenas depois do cadastro/login.</p>{!user&&<Card><h3>Crie sua conta para ver a chave Pix</h3><p>O teste grátis de 24h é liberado automaticamente.</p><Button className="primary" onClick={()=>setScreen("signup")}>Criar conta grátis</Button></Card>}{user&&data&&<><div className="grid4">{data.plans.map(p=><Card key={p.name} className={p.price===100?"highlight":""}><h3>{p.name}</h3><h1>{p.price?`R$ ${p.price},00`:"R$ 0"}</h1><p>{p.days===1?"24 horas":`${p.days} dias`}</p></Card>)}</div><Card className="pix"><h2>Pagamento somente via Pix</h2><p><b>Chave Pix:</b> {data.payment.pix_key}</p><p><b>Favorecido:</b> {data.payment.pix_name}</p><p>Após pagar, envie o comprovante pelo WhatsApp: <b>{PHONE_DISPLAY}</b></p><a className="btn primary" target="_blank" href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Olá! Acabei de realizar o pagamento do plano H2 Global Jobs e estou enviando o comprovante para liberação do acesso.")}`}>Enviar comprovante no WhatsApp</a></Card></>}{err&&<p className="error">{err}</p>}</section>
}

function Admin(){
  const [users,setUsers]=useState([]); const [msg,setMsg]=useState("");
  async function load(){ const d=await api("/api/admin/users"); setUsers(d.users); }
  useEffect(()=>{ load(); },[]);
  async function renew(username,days,plan){ await api("/api/admin/renew",{method:"POST",body:JSON.stringify({username,days,plan})}); setMsg("Acesso renovado."); load(); }
  async function toggle(username){ await api("/api/admin/toggle",{method:"POST",body:JSON.stringify({username})}); load(); }
  return <section className="section"><div className="grid3"><Info Icon={Users} title="Painel admin" text={`${users.length} usuários`}/><Info Icon={Clock} title="Grátis" text="24 horas"/><Info Icon={CreditCard} title="Pagamento" text="Somente Pix"/></div>{msg&&<p className="notice">{msg}</p>}<Card><h2>Usuários</h2><div className="table-wrap"><table><thead><tr><th>Usuário</th><th>Plano</th><th>Expira</th><th>Status</th><th>Ações</th></tr></thead><tbody>{users.map(u=><tr key={u.id}><td>{u.username}</td><td>{u.plan}</td><td>{fmt(u.expires_at)}</td><td>{u.active&&!u.expired?"Ativo":"Bloqueado/Expirado"}</td><td className="row"><Button onClick={()=>renew(u.username,7,"7 dias")}>+7d</Button><Button onClick={()=>renew(u.username,30,"30 dias")}>+30d</Button><Button className="primary" onClick={()=>renew(u.username,90,"VIP 90 dias")}>+90d</Button><Button className="danger" onClick={()=>toggle(u.username)}>{u.active?"Bloquear":"Ativar"}</Button></td></tr>)}</tbody></table></div></Card></section>
}

function Info({Icon,title,text,danger}){ return <Card className={danger?"warn":""}><Icon className={danger?"red":"green"}/><h3>{title}</h3><p>{text}</p></Card> }
function download(filename, content, type){ const blob=new Blob([content],{type}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url); }

createRoot(document.getElementById("root")).render(<App/>);
