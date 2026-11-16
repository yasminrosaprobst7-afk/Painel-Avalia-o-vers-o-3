"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, BookOpen, ClipboardList, ExternalLink, Layers, LayoutDashboard, ListChecks, MessageSquare, Printer, RefreshCw, Scale } from "lucide-react";
import { COMMENT_DIMS, DIMS, EXPECTED, FORM_URL, READ, ROLES, ROLE_KEYS, SHORT, Ind, Rec, RoleKey, compute, countBy, cycleOf, f2, nota10, pc, read } from "@/lib/model";

type Payload = { recs?: Rec[]; fetchedAt?: string; error?: string };
const csOf = (s: string) => (s || "Não informado").replace(/^(cs|centro de saúde)\s+/i, "").trim();
const TABS = [["Resumo", LayoutDashboard], ["Dimensões", Layers], ["Comparar", Scale], ["Indicadores", ListChecks], ["Comentários", MessageSquare], ["Como ler", BookOpen]] as const;
const NOTE: Record<string, string> = {
  "5.2": "Primeiro ciclo: vale só o registro [D] (implantação e reuniões do NDAE). A pergunta do formulário entra a partir do 2º ciclo.",
  "5.6": "Primeiro ciclo: respostas “Não se aplica”; passa a valer a partir do 2º ciclo.",
  "6.2": "Indicador só de registro [D] (frequência, aprovação, desligamento). Informe em REGISTROS (lib/model.ts).",
};
const FORM_NOTE: Record<string, string> = {
  "3.1": "Formulário atual tem uma afirmativa única (a matriz prevê uma por matriz curricular).",
  "3.2": "Formulário atual tem uma afirmativa única (a matriz prevê uma por matriz curricular).",
  "6.1": "Formulário atual tem uma afirmativa única (a matriz prevê uma por área de competência).",
  "7.4": "Fora do índice da dimensão e do índice geral.",
};
const UNF = "#c8321e", FAV = "#1e8a5a";

const Badge = ({ m }: { m: number | null | undefined }) => { const r = read(m ?? null); return <span className="whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ background: r.c, color: r.fg }}>{r.t}</span>; };
const Card = ({ title, sub, children, cls = "" }: { title: string; sub?: string; children: React.ReactNode; cls?: string }) => (
  <section className={`break-inside-avoid rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 ${cls}`}>
    <h2 className="font-head text-base font-extrabold text-marinho">{title}</h2>
    {sub && <p className="mb-3 text-xs text-slate-500">{sub}</p>}
    {children}
  </section>
);
const Likert = ({ h }: { h: number[] }) => {
  const n = h.reduce((s, x) => s + x, 0) || 1;
  const seg = [(h[0] + h[1]) / n, h[2] / n, (h[3] + h[4]) / n], c = [UNF, "#cbd5e1", FAV];
  return <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100" aria-hidden>{seg.map((s, i) => <div key={i} style={{ width: `${s * 100}%`, background: c[i] }} />)}</div>;
};
const Legend3 = () => (
  <p className="mt-2 flex flex-wrap gap-x-4 text-xs text-slate-500">
    <span><i className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: UNF }} />Discordam (1–2)</span>
    <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-slate-300" />Neutro (3)</span>
    <span><i className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: FAV }} />Concordam (4–5)</span>
  </p>
);
const Heat = ({ m }: { m: number | null | undefined }) => { const r = read(m ?? null); return <td className="p-1.5 text-center"><span className="block rounded-md px-2 py-1.5 font-bold" style={{ background: m == null ? "#f1f5f9" : r.c, color: m == null ? "#94a3b8" : r.fg }}>{f2(m)}</span></td>; };
const Mini = ({ x, extra = "" }: { x: Ind; extra?: string }) => (
  <li className="flex items-start gap-2 text-sm">
    <Badge m={x.mean} />
    <span className="flex-1"><b className="text-roxo">{x.id}</b> {x.name}<span className="block text-xs text-slate-500">{SHORT[x.dim]} · média {f2(x.mean)}{extra}</span></span>
  </li>
);
const IndRow = ({ x, al }: { x: Ind; al: string[] }) => (
  <li className="py-3 text-sm">
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-head font-extrabold text-roxo">{x.id}</span><span className="flex-1 font-semibold">{x.name}</span>
      <span>{f2(x.mean)}</span><Badge m={x.mean} />
    </div>
    {FORM_NOTE[x.id] && <p className="text-xs italic text-slate-400">{FORM_NOTE[x.id]}</p>}
    {x.mean == null ? <p className="text-xs text-slate-500">{NOTE[x.id] ?? "Sem respostas válidas neste recorte."}</p> : (
      <>
        <p className="mt-1 text-xs text-slate-500">{pc(x.fav)} concordam (4–5) · {x.pubs.filter((p) => p.mean != null).map((p) => `${ROLES[p.role]} ${f2(p.mean)} (n=${p.n})`).join(" · ")}</p>
        {Object.keys(x.st).length > 1 && <p className="text-xs text-slate-500">Afirmativas: {Object.entries(x.st).map(([k, v]) => `${k}) ${f2(v)}`).join(" · ")}</p>}
        {x.reg != null && <p className="text-xs text-slate-500">Percepção {f2(x.perc)} · Registro [D] {f2(x.reg)} (peso igual)</p>}
        <p className="text-xs text-slate-500">{read(x.mean).s}</p>
      </>
    )}
    {al.map((t) => <p key={t} className="mt-1 flex items-start gap-1 text-xs font-semibold text-ferrugem"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{t}</p>)}
  </li>
);

export default function Dashboard() {
  const [d, setD] = useState<Payload | null>(null);
  const [tab, setTab] = useState(0);
  const [role, setRole] = useState("all");
  const [cat, setCat] = useState("all");
  const [cs, setCs] = useState("all");
  const [cyc, setCyc] = useState("all");
  const [by, setBy] = useState<"role" | "cat" | "cs">("role");
  const [dimF, setDimF] = useState("all");
  const [cdim, setCdim] = useState("all");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try { setD(await (await fetch("/api/data", { cache: "no-store" })).json()); }
    catch { setD({ error: "Falha de conexão." }); }
    setBusy(false);
  }, []);
  useEffect(() => { load(); const i = setInterval(load, 60000); return () => clearInterval(i); }, [load]);

  const all = useMemo(() => d?.recs ?? [], [d]);
  const cycles = useMemo(() => Array.from(new Set(all.map((r) => cycleOf(r.ts)))).sort().reverse(), [all]);
  const inCycle = useMemo(() => all.filter((r) => cyc === "all" || cycleOf(r.ts) === cyc), [all, cyc]);
  const base = useMemo(() => all.filter((r) => (role === "all" || r.role === role) && (cat === "all" || r.cat === cat) && (cs === "all" || csOf(r.cs) === cs)), [all, role, cat, cs]);
  const recs = useMemo(() => base.filter((r) => cyc === "all" || cycleOf(r.ts) === cyc), [base, cyc]);
  const prevCyc = cyc === "all" ? null : cycles.filter((c) => c < cyc)[0] ?? null;
  const M = useMemo(() => compute(recs), [recs]);
  const P = useMemo(() => (prevCyc ? compute(base.filter((r) => cycleOf(r.ts) === prevCyc)) : null), [base, prevCyc]);
  const groups = useMemo(() => {
    const m = new Map<string, Rec[]>();
    recs.forEach((r) => { const k = by === "role" ? ROLES[r.role] : by === "cat" ? r.cat || "Não informado" : csOf(r.cs); m.set(k, [...(m.get(k) ?? []), r]); });
    return Array.from(m, ([g, rs]) => ({ g, n: rs.length, ...compute(rs) })).sort((a, b) => (a.geral ?? 9) - (b.geral ?? 9));
  }, [recs, by]);

  const counts = countBy(recs), allCounts = countBy(inCycle);
  const alertsOf = (x: Ind) => {
    const p = P?.inds.find((y) => y.id === x.id);
    const dl = p && p.mean != null && x.mean != null ? x.mean - p.mean : 0;
    return [...x.alerts, ...(Math.abs(dl) >= 0.7 ? [`Mudança no ciclo: ${dl > 0 ? "+" : ""}${f2(dl)} em relação a ${prevCyc}`] : [])];
  };
  const withData = M.inds.filter((x) => x.mean != null && x.id !== "7.4");
  const low = [...withData].sort((a, b) => a.mean! - b.mean!).filter((x) => x.mean! < 3.5).slice(0, 6);
  const top = [...withData].sort((a, b) => b.mean! - a.mean!).filter((x) => x.mean! >= 4.5).slice(0, 5);
  const alerted = M.inds.filter((x) => x.mean != null && alertsOf(x).length);
  const noData = M.inds.filter((x) => x.mean == null);
  const dimsOk = M.dims.filter((x) => x.mean != null).sort((a, b) => a.mean! - b.mean!);
  const worstDim = dimsOk[0], bestDim = dimsOk[dimsOk.length - 1];
  const rk = ROLE_KEYS.filter((k) => recs.some((r) => r.role === k));
  const c74 = M.inds.find((x) => x.id === "7.4");
  const cm = recs.flatMap((r) => r.comments.map((c) => ({ ...c, role: r.role, cs: csOf(r.cs) }))).filter((c) => cdim === "all" || c.dim === cdim);
  const cats = Array.from(new Set(inCycle.map((r) => r.cat).filter(Boolean))).sort();
  const css = Array.from(new Set(inCycle.map((r) => csOf(r.cs)))).sort();

  if (!d) return <p className="p-8">Carregando…</p>;
  if (d.error) return <p className="p-8 text-red-700">{d.error}</p>;
  const sel = "mt-1 block rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm";

  return (
    <div className="min-h-screen">
      <header className="bg-marinho text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-laranja">Escola de Saúde Pública · Secretaria Municipal de Saúde · Prefeitura de Florianópolis</p>
            <h1 className="font-head text-3xl font-extrabold">PREMULTISF Avalia</h1>
            <p className="text-sm text-white/80">Residência Multiprofissional em Saúde da Família — matriz de dimensões e indicadores</p>
            <div className="mt-3 flex flex-wrap gap-2 text-sm print:hidden">
              <a href={FORM_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-lg bg-laranja px-3 py-1.5 font-bold text-marinho hover:brightness-110"><ClipboardList className="h-4 w-4" />Responder formulário<ExternalLink className="h-3.5 w-3.5" /></a>
            </div>
          </div>
          <div className="ml-auto flex flex-col items-end gap-2 text-xs print:hidden">
            <span className="text-white/70">Planilha lida em {d.fetchedAt ? new Date(d.fetchedAt).toLocaleString("pt-BR") : "—"} · atualiza a cada 60 s</span>
            <div className="flex gap-2">
              <button onClick={load} className="flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 font-semibold hover:bg-white/20"><RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />Atualizar</button>
              <button onClick={() => window.print()} className="flex items-center gap-1 rounded-lg bg-laranja px-3 py-1.5 font-semibold text-marinho"><Printer className="h-4 w-4" />Imprimir / PDF</button>
            </div>
          </div>
        </div>
        <div className="h-1.5 bg-gradient-to-r from-laranja via-telha to-magenta" />
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6">
        <div className="flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200 print:hidden">
          <label className="text-xs font-bold">Ciclo avaliado<select className={sel} value={cyc} onChange={(e) => setCyc(e.target.value)}><option value="all">Todos os ciclos</option>{cycles.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
          <label className="text-xs font-bold">Papel<select className={sel} value={role} onChange={(e) => setRole(e.target.value)}><option value="all">Todos</option>{ROLE_KEYS.map((k) => <option key={k} value={k}>{ROLES[k]}</option>)}</select></label>
          <label className="text-xs font-bold">Categoria profissional<select className={sel} value={cat} onChange={(e) => setCat(e.target.value)}><option value="all">Todas</option>{cats.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className="text-xs font-bold">Centro de Saúde<select className={sel} value={cs} onChange={(e) => setCs(e.target.value)}><option value="all">Todos</option>{css.map((c) => <option key={c}>{c}</option>)}</select></label>
          <p className="ml-auto text-sm"><b>{recs.length}</b> de {inCycle.length} respostas</p>
        </div>

        <nav role="tablist" aria-label="Seções" className="flex flex-wrap gap-1 print:hidden">
          {TABS.map(([t, Icon], i) => (
            <button key={t} role="tab" aria-selected={tab === i} onClick={() => setTab(i)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-laranja ${tab === i ? "bg-marinho text-white" : "bg-white text-marinho ring-1 ring-slate-200"}`}>
              <Icon className="h-4 w-4" />{t}
            </button>
          ))}
        </nav>

        {tab === 0 && (recs.length === 0 ? <p className="rounded-2xl bg-white p-6 text-sm text-slate-600">Nenhuma resposta para os filtros selecionados.</p> : (
          <>
            <section className="grid gap-5 rounded-2xl bg-marinho p-6 text-white md:grid-cols-[auto,1fr]">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-laranja">Índice geral (média integrada)</p>
                <p className="font-head text-6xl font-extrabold">{f2(M.geral)}<span className="text-xl font-semibold text-white/60"> / 5</span></p>
                <p className="mb-1 text-sm text-white/70">Nota {f2(nota10(M.geral))} de 0 a 10</p>
                <Badge m={M.geral} />
                <p className="mt-2 max-w-xs text-xs text-white/80">{read(M.geral).s}</p>
              </div>
              <div className="text-sm">
                <p className="mb-1 font-head font-extrabold">Leitura rápida</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>Ciclo avaliado: <b>{cyc === "all" ? "todos os ciclos" : cyc}</b> · {recs.length} respostas ({ROLE_KEYS.filter((k) => counts[k]).map((k) => `${counts[k]} ${ROLES[k].toLowerCase()}`).join(", ")}).</li>
                  <li>{pc(M.fav)} das respostas concordam (4 ou 5).</li>
                  {bestDim && <li>Maior índice: <b>{bestDim.name}</b> ({f2(bestDim.mean)}).</li>}
                  {worstDim && worstDim !== bestDim && <li>Primeira do plano de ação (menor índice): <b>{worstDim.name}</b> ({f2(worstDim.mean)}).</li>}
                  <li>{alerted.length} indicadores com sinal de alerta · {noData.length} sem dados (aguardam registro [D] ou ciclo seguinte).</li>
                </ul>
              </div>
            </section>
            <div className="grid gap-5 lg:grid-cols-2">
              <Card title="Índice por dimensão" sub="Média integrada (1–5). Linhas tracejadas: 2,5 · 3,5 · 4,5 (limites da leitura)">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={M.dims.map((x) => ({ name: x.short, media: x.mean == null ? 0 : +x.mean.toFixed(2) }))} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" /><XAxis type="number" domain={[1, 5]} /><YAxis type="category" dataKey="name" width={130} />
                    <Tooltip formatter={(v) => f2(Number(v))} />
                    {[2.5, 3.5, 4.5].map((v) => <ReferenceLine key={v} x={v} stroke="#64748b" strokeDasharray="4 4" />)}
                    <Bar dataKey="media" name="Índice" radius={[0, 6, 6, 0]}>{M.dims.map((x) => <Cell key={x.name} fill={read(x.mean).c} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card title="Concordância por dimensão" sub="% das respostas em 1–2, 3 e 4–5">
                <div className="space-y-3">{M.dims.map((x) => (
                  <div key={x.name}>
                    <div className="mb-1 flex items-center justify-between text-sm"><span className="font-semibold">{x.short}</span><span>{pc(x.fav)} concordam <Badge m={x.mean} /></span></div>
                    <Likert h={x.h} />
                  </div>
                ))}</div>
                <Legend3 />
              </Card>
              <Card title="Mapa de calor: dimensão × público" sub="Média de cada público (média das médias dos seus indicadores)" cls="lg:col-span-2">
                <div className="overflow-x-auto"><table className="w-full text-sm">
                  <thead className="text-xs text-slate-500"><tr><th className="p-1.5 text-left">Dimensão</th>{rk.map((k) => <th key={k} className="p-1.5">{ROLES[k]}</th>)}<th className="p-1.5">Integrada</th></tr></thead>
                  <tbody>{M.dims.map((x) => <tr key={x.name}><th className="p-1.5 text-left font-semibold">{x.short}</th>{rk.map((k) => <Heat key={k} m={x.byRole[k]} />)}<Heat m={x.mean} /></tr>)}</tbody>
                </table></div>
              </Card>
              <Card title="Sinais de alerta" sub="Cauda · divergência entre públicos · confiabilidade · mudança no ciclo">
                {alerted.length === 0 ? <p className="text-sm text-slate-500">Nenhum sinal de alerta neste recorte.</p> : (
                  <ul className="space-y-3 text-sm">{alerted.slice(0, 8).map((x) => (
                    <li key={x.id}><b className="text-roxo">{x.id}</b> {x.name}{alertsOf(x).map((t) => <p key={t} className="flex items-start gap-1 text-xs font-semibold text-ferrugem"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{t}</p>)}</li>
                  ))}</ul>
                )}
              </Card>
              <Card title="Prioridades de melhoria" sub="Indicadores abaixo de 3,50 (Atenção ou Crítico)">
                {low.length ? <ul className="space-y-2.5">{low.map((x) => <Mini key={x.id} x={x} />)}</ul> : <p className="text-sm text-slate-500">Nenhum indicador abaixo de 3,50.</p>}
              </Card>
              <Card title="Pontos consolidados" sub="Indicadores com média a partir de 4,50">
                {top.length ? <ul className="space-y-2.5">{top.map((x) => <Mini key={x.id} x={x} />)}</ul> : <p className="text-sm text-slate-500">Nenhum indicador consolidado ainda.</p>}
              </Card>
              <Card title="Clareza e utilidade do formulário (7.4)" sub="Fora do índice geral">
                <p className="font-head text-2xl font-extrabold">{f2(c74?.mean)} <span className="text-sm font-normal text-slate-500">/ 5</span></p>
                {c74 && c74.mean != null && <><Likert h={c74.h} /><p className="mt-1 text-xs text-slate-500">Perguntas fáceis de entender: {f2(c74.st.a)} · Resultados podem ajudar a melhorar: {f2(c74.st.b)}</p></>}
              </Card>
              {Object.keys(EXPECTED).length > 0 && (
                <Card title="Taxa de resposta" sub="Respostas recebidas ÷ pessoas esperadas. Abaixo de 50%: ler com cuidado (confiabilidade)" cls="lg:col-span-2">
                  <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">{ROLE_KEYS.filter((k) => EXPECTED[k]).map((k) => { const r = allCounts[k] / EXPECTED[k]!; return (
                    <div key={k}><p className="text-xs text-slate-500">{ROLES[k]}</p><p className="font-head text-2xl font-extrabold" style={{ color: r < 0.5 ? UNF : FAV }}>{Math.round(r * 100)}%</p><p className="text-xs">{allCounts[k]} de {EXPECTED[k]}{r < 0.5 ? " · leia com cuidado" : ""}</p></div>
                  ); })}</div>
                </Card>
              )}
            </div>
          </>
        ))}

        {tab === 1 && (
          <div className="space-y-3">{M.dims.map((x, i) => (
            <details key={x.name} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <summary className="cursor-pointer">
                <span className="flex flex-wrap items-center gap-3"><span className="font-head font-extrabold">Dimensão {i + 1} – {x.name}</span><span className="ml-auto text-sm">Índice {f2(x.mean)} · {pc(x.fav)} concordam · {x.n}/{x.total} indicadores com dados</span><Badge m={x.mean} /></span>
                <span className="mt-2 block"><Likert h={x.h} /></span>
              </summary>
              <ul className="mt-2 divide-y">{M.inds.filter((y) => y.dim === i).map((y) => <IndRow key={y.id} x={y} al={alertsOf(y)} />)}</ul>
              {i === 6 && <p className="mt-2 text-xs text-slate-500">7.2 (pontos fortes) e 7.3 (ponto a melhorar e sugestões) são perguntas abertas: veja a aba Comentários.</p>}
            </details>
          ))}<Legend3 /></div>
        )}

        {tab === 2 && (
          <Card title="Comparar grupos" sub="Índice por dimensão de cada grupo (mesma regra da matriz), do menor para o maior índice geral. Atenção a grupos com poucas respostas.">
            <div className="mb-3 flex flex-wrap gap-2 print:hidden">{([["role", "Papel"], ["cat", "Categoria profissional"], ["cs", "Centro de Saúde"]] as const).map(([k, t]) => (
              <button key={k} onClick={() => setBy(k)} className={`rounded-full px-3 py-1 text-sm font-bold ${by === k ? "bg-marinho text-white" : "bg-slate-100"}`}>{t}</button>
            ))}</div>
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead className="text-xs text-slate-500"><tr><th className="p-1.5 text-left">Grupo</th><th className="p-1.5">n</th><th className="p-1.5">Índice geral</th>{SHORT.map((s) => <th key={s} className="p-1.5">{s}</th>)}</tr></thead>
              <tbody>{groups.map((g) => (
                <tr key={g.g}><th className="p-1.5 text-left font-semibold">{g.g}{g.n < 3 && <span className="block text-xs font-normal text-amber-700">amostra pequena</span>}</th><td className="p-1.5 text-center">{g.n}</td><Heat m={g.geral} />{g.dims.map((x) => <Heat key={x.name} m={x.mean} />)}</tr>
              ))}</tbody>
            </table></div>
          </Card>
        )}

        {tab === 3 && (
          <Card title="Todos os indicadores" sub="Do menor para o maior índice. Indicadores sem dados ficam no fim.">
            <div className="mb-3 flex flex-wrap gap-2 print:hidden">
              <select aria-label="Filtrar dimensão" className={sel} value={dimF} onChange={(e) => setDimF(e.target.value)}><option value="all">Todas as dimensões</option>{DIMS.map((x) => <option key={x}>{x}</option>)}</select>
              <input aria-label="Buscar indicador" placeholder="Buscar indicador" value={q} onChange={(e) => setQ(e.target.value)} className={sel + " w-64"} />
            </div>
            <div className="overflow-x-auto"><table className="w-full text-left text-sm">
              <thead className="border-b text-xs uppercase text-slate-500"><tr><th className="p-2">Indicador</th><th className="p-2">Dimensão</th><th className="p-2">Índice</th><th className="p-2">% concordam</th><th className="p-2">Leitura</th><th className="p-2">Alertas</th></tr></thead>
              <tbody>{M.inds.filter((x) => (dimF === "all" || DIMS[x.dim] === dimF) && (x.id + " " + x.name).toLowerCase().includes(q.toLowerCase())).sort((a, b) => (a.mean ?? 9) - (b.mean ?? 9)).map((x) => (
                <tr key={x.id} className="border-b align-top"><td className="p-2"><b className="text-roxo">{x.id}</b> {x.name}</td><td className="p-2 text-xs">{SHORT[x.dim]}</td><td className="p-2">{f2(x.mean)}</td><td className="p-2">{pc(x.fav)}</td><td className="p-2"><Badge m={x.mean} /></td><td className="p-2 text-xs">{x.mean == null ? "—" : alertsOf(x).length}</td></tr>
              ))}</tbody>
            </table></div>
          </Card>
        )}

        {tab === 4 && (
          <div className="space-y-3">
            <select aria-label="Filtrar tema" className={sel + " print:hidden"} value={cdim} onChange={(e) => setCdim(e.target.value)}><option value="all">Todos os temas</option>{COMMENT_DIMS.map((x) => <option key={x}>{x}</option>)}</select>
            {cm.length === 0 && <p className="text-sm text-slate-500">Nenhum comentário para o filtro.</p>}
            {cm.map((c, i) => (
              <article key={i} className="break-inside-avoid rounded-2xl border-l-4 border-laranja bg-white p-4 text-sm shadow-sm ring-1 ring-slate-200">
                <p className="mb-1 text-xs font-bold text-roxo">{ROLES[c.role]} · {c.cs} · {c.dim}</p>
                <p className="whitespace-pre-line">{c.text}</p>
              </article>
            ))}
          </div>
        )}

        {tab === 5 && (
          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="A escala" sub="Cada pergunta é uma afirmativa; “Não se aplica” fica fora da conta.">
              <table className="w-full text-sm"><tbody>{[["5", "Concordo totalmente", "Acontece sempre, do jeito certo."], ["4", "Concordo", "Acontece quase sempre; falta só um ajuste pequeno."], ["3", "Nem concordo nem discordo", "Acontece em parte."], ["2", "Discordo", "Acontece pouco; os problemas já atrapalham."], ["1", "Discordo totalmente", "Não acontece."]].map(([n, t, s]) => (
                <tr key={n} className="border-b"><td className="p-2 font-bold">{n}</td><td className="p-2 font-semibold">{t}</td><td className="p-2 text-slate-600">{s}</td></tr>
              ))}</tbody></table>
            </Card>
            <Card title="Como o resultado é calculado">
              <ol className="list-decimal space-y-1.5 pl-5 text-sm">
                <li>Cada resposta vale de 1 a 5.</li>
                <li>Calcula-se a média de cada público (R, P, T, CCS, CR).</li>
                <li>A <b>média integrada</b> é a média das médias dos públicos: os residentes, maioria, não decidem sozinhos.</li>
                <li>Indicador com mais de uma afirmativa: média das afirmativas (cada uma aparece separada).</li>
                <li>Índice da dimensão = média dos seus indicadores (pesos iguais). Índice geral = média das dimensões 1 a 7, sem o indicador 7.4.</li>
                <li>Registro [D], quando informado: o % de conformidade vira pontos (5 a partir de 90%; 4 de 75 a 89%; 3 de 50 a 74%; 2 de 25 a 49%; 1 abaixo de 25%) e entra com peso igual ao da percepção.</li>
                <li>Nota de 0 a 10 = (média − 1) × 2,5. % de concordância = respostas em 4 ou 5.</li>
              </ol>
            </Card>
            <Card title="Leitura da média" sub="Limites propostos na matriz (a validar com as gestoras)">
              <table className="w-full text-sm"><tbody>{READ.map((r) => (
                <tr key={r.t} className="border-b"><td className="p-2"><Badge m={r.min === 1 ? 1 : r.min} /></td><td className="p-2 font-semibold">{r.rg}</td><td className="p-2 text-slate-600">{r.s}</td></tr>
              ))}</tbody></table>
            </Card>
            <Card title="Sinais de alerta">
              <ul className="space-y-1.5 text-sm">
                <li><b>Cauda:</b> 25% ou mais das respostas de um público em 1 ou 2.</li>
                <li><b>Divergência:</b> 1,0 ponto ou mais entre a maior e a menor média dos públicos.</li>
                <li><b>Mudança no ciclo:</b> variação de 0,7 ponto ou mais em relação ao ciclo anterior.</li>
                <li><b>Confiabilidade:</b> menos de 50% do público respondeu (informe EXPECTED) ou mais de 30% marcou “Não se aplica”.</li>
              </ul>
            </Card>
            <Card title="Onde o formulário atual difere da matriz" cls="lg:col-span-2">
              <ul className="list-disc space-y-1.5 pl-5 text-sm">
                <li><b>3.1, 3.2 e 6.1:</b> o formulário tem uma afirmativa única (a matriz prevê uma por matriz curricular ou por área de competência); o painel usa a afirmativa disponível.</li>
                <li><b>5.2 e 5.6:</b> no 1º ciclo valem só o registro [D] (5.2) e “Não se aplica” (5.6); as respostas à pergunta do NDAE ficam fora do cálculo até o ciclo definido em NDAE_A_PARTIR_DE (lib/model.ts).</li>
                <li><b>Registros [D]</b> (6.2 e componentes de 2.5, 4.3 a 4.5, 5.2, 5.6 e 6.1) não vêm do formulário: informe o % de conformidade em REGISTROS (lib/model.ts).</li>
                <li><b>7.2 e 7.3</b> são perguntas abertas, lidas por análise temática (aba Comentários); a classificação em temas é manual.</li>
                <li>Comparações com 2024 são aproximadas: a escala e o texto das perguntas mudaram. A série nova começa no 1º ciclo com a escala de concordância.</li>
              </ul>
            </Card>
          </div>
        )}
        <p className="pb-6 text-center text-xs text-slate-500">PREMULTISF Avalia · Escola de Saúde Pública · Secretaria Municipal de Saúde de Florianópolis</p>
      </main>
    </div>
  );
}
