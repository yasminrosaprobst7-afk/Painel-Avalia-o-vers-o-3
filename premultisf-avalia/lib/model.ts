// Matriz de dimensões e indicadores do PREMULTISF Avalia — regras de cálculo conforme a matriz (cap. 2 e 3).
// Parte compartilhada (servidor + navegador). Não coloque aqui nada sensível.
export const ROLES = { R: "Residentes", P: "Preceptores", T: "Tutores", CCS: "Coord. de CS/DAT", CR: "Coord. da Residência" } as const;
export type RoleKey = keyof typeof ROLES;
export const ROLE_KEYS = Object.keys(ROLES) as RoleKey[];
export const DIMS = ["Estrutura e apoio logístico", "Corpo docente-assistencial", "Organização didático-pedagógica", "Acompanhamento pedagógico e processo avaliativo", "Gestão, comunicação e governança", "Resultados formativos e integração ensino-serviço", "Avaliação geral"];
export const SHORT = ["Estrutura", "Corpo docente", "Didático-pedagógica", "Acompanhamento", "Gestão", "Resultados", "Avaliação geral"];
export const COMMENT_DIMS = [...DIMS.slice(0, 6), "7.2 Pontos fortes", "7.3 Pontos a melhorar e sugestões"];

export const FORM_URL = process.env.NEXT_PUBLIC_FORM_URL || "https://docs.google.com/forms/d/1nF6oKl3bxTFaCObHGO9FcmBgOOztVsPTAIdQFXzGqQE/viewform";
export const CYCLE_START_MONTH = 1; // 1 = ciclo é o ano civil; 3 = março a fevereiro
export const NDAE_A_PARTIR_DE = 2027; // 5.2: no 1º ciclo (2026) vale só o registro [D]; a pergunta entra a partir deste ciclo
export const EXPECTED: Partial<Record<RoleKey, number>> = {}; // pessoas esperadas por público, ex.: { R: 20, P: 30 } (taxa de resposta)
export const REGISTROS: Record<string, number> = {}; // % de conformidade dos dados de registro [D] por indicador, ex.: { "6.2": 82 }

export type Ans = { ind: string; st: string; v: number }; // v: 1–5; 0 = "Não se aplica"
export type Rec = { role: RoleKey; cat: string; cs: string; ts: string; a: Ans[]; comments: { dim: string; text: string }[] };

export const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
export const f2 = (n: number | null | undefined) => (n == null ? "—" : n.toFixed(2).replace(".", ","));
export const pc = (n: number | null | undefined) => (n == null ? "—" : `${Math.round(n * 100)}%`);
export const nota10 = (m: number | null) => (m == null ? null : (m - 1) * 2.5);
const mean = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
const pts = (p: number) => (p >= 90 ? 5 : p >= 75 ? 4 : p >= 50 ? 3 : p >= 25 ? 2 : 1);
export const countBy = (recs: Rec[]) => { const o = {} as Record<RoleKey, number>; ROLE_KEYS.forEach((k) => (o[k] = 0)); recs.forEach((r) => o[r.role]++); return o; };

export function cycleOf(ts: string) {
  const m = ts.match(/(\d+)\/(\d+)\/(\d+)/);
  if (!m) return "Sem data";
  const c = +m[2] >= CYCLE_START_MONTH ? +m[3] : +m[3] - 1;
  return CYCLE_START_MONTH === 1 ? String(c) : `${c}/${c + 1}`;
}

// Leitura da média integrada (matriz, cap. 3)
export const READ = [
  { t: "Consolidado", min: 4.5, rg: "4,50 a 5,00", c: "#1e8a5a", fg: "#fff", s: "Manter e registrar a prática." },
  { t: "Adequado", min: 3.5, rg: "3,50 a 4,49", c: "#8cc152", fg: "#1f2344", s: "Adequado, com ajustes pontuais. Acompanhar no ciclo seguinte." },
  { t: "Atenção", min: 2.5, rg: "2,50 a 3,49", c: "#f09409", fg: "#1f2344", s: "Ação de melhoria combinada no NDAE." },
  { t: "Crítico", min: 1, rg: "1,00 a 2,49", c: "#c8321e", fg: "#fff", s: "Ação prioritária e retorno a todos os públicos." },
];
export const read = (m: number | null) => (m == null ? { t: "Sem dados", min: 0, rg: "", c: "#94a3b8", fg: "#fff", s: "" } : READ.find((r) => Math.round(m * 100) / 100 >= r.min) ?? READ[3]);

const I = (id: string, name: string) => ({ id, dim: +id[0] - 1, name });
export const INDS = [
  I("1.1", "Estrutura física dos cenários de prática"), I("1.2", "Equipamentos e materiais dos cenários de prática"), I("1.3", "Salas dos encontros teóricos"), I("1.4", "Equipamentos dos encontros teóricos"), I("1.5", "Apoio da Escola de Saúde Pública"),
  I("2.1", "Acompanhamento da preceptoria"), I("2.2", "Acompanhamento nos estágios"), I("2.3", "Atuação da tutoria"), I("2.4", "Condução dos encontros das Unidades Educacionais"), I("2.5", "Nº de residentes por preceptor e por tutor"), I("2.6", "Educação permanente de quem ensina"),
  I("3.1", "Conteúdos das Unidades Educacionais"), I("3.2", "Carga horária das Unidades Educacionais"), I("3.3", "Jeitos de ensinar e aprender"), I("3.4", "Ligação entre teoria e prática"), I("3.5", "Trabalho entre profissões"),
  I("4.1", "Encontros de preceptoria no Centro de Saúde"), I("4.2", "Acompanhamento pedagógico da tutoria"), I("4.3", "Feedback e plano de melhoria"), I("4.4", "Clareza da avaliação"), I("4.5", "Desenvolvimento do TCR"),
  I("5.1", "Coordenação do Programa"), I("5.2", "Atuação do NDAE"), I("5.3", "Participação nas decisões"), I("5.4", "Comunicação e documentos do Programa"), I("5.5", "Rotinas administrativas"), I("5.6", "Uso das avaliações na gestão"),
  I("6.1", "Desenvolvimento do perfil de competência"), I("6.2", "Cumprimento da carga horária e permanência"), I("6.3", "Contribuição aos serviços e ao território"),
  I("7.1", "Avaliação geral do Programa"), I("7.4", "Clareza e utilidade do formulário"),
];

// Texto da afirmativa (sem acento, minúsculo) → indicador e afirmativa (a, b, c)
const MAP: [RegExp, string, string][] = [
  [/espaco fisico do centro/, "1.1", "a"], [/centro de saude tem os equipamentos/, "1.2", "a"], [/salas usadas/, "1.3", "a"], [/equipamentos dos encontros/, "1.4", "a"], [/escola de saude publica responde/, "1.5", "a"],
  [/tempo reservado na agenda/, "2.1", "a"], [/apoio .* preceptoria/, "2.1", "b"], [/acompanhamento que .*preceptoria/, "2.1", "a"], [/acompanhamento que .*supervisao/, "2.2", "a"],
  [/tempo reservado para a tutoria/, "2.3", "a"], [/apoio .* tutoria/, "2.3", "b"], [/^a tutoria (me ajuda|ajuda residentes)/, "2.3", "a"],
  [/facilitadores conduzem/, "2.4", "a"], [/numero de residentes por preceptor/, "2.5", "a"], [/numero de residentes por tutor/, "2.5", "b"], [/educacao permanente/, "2.6", "a"],
  [/conteudos das unidades/, "3.1", "a"], [/carga horaria das unidades/, "3.2", "a"], [/jeitos de ensinar/, "3.3", "a"], [/aprendo nos encontros|residentes usam na pratica|temas dos encontros/, "3.4", "a"], [/chances reais/, "3.5", "a"],
  [/encontros entre residente e preceptor/, "4.1", "a"], [/conversas de acompanhamento|acompanhamentos pedagogicos/, "4.2", "a"],
  [/depois de cada avaliacao/, "4.3", "a"], [/quando uma dessas/, "4.3", "b"], [/criterios das avaliacoes/, "4.4", "a"], [/calendario das avaliacoes/, "4.4", "b"],
  [/orientacao que .*tcr/, "4.5", "a"], [/tempo previsto .*tcr/, "4.5", "b"],
  [/coordenacao do programa responde|tempo e apoio para coordenar/, "5.1", "a"], [/ndae propoe/, "5.2", "a"], [/espaco para dar minha opiniao/, "5.3", "a"],
  [/informacoes do programa chegam/, "5.4", "a"], [/informacoes chegam a tempo/, "5.4", "b"], [/documentos do programa/, "5.4", "c"], [/sei o que fazer/, "5.5", "a"],
  [/recebi o retorno/, "5.6", "a"], [/programa mudou algo/, "5.6", "b"], [/tem desenvolvido/, "6.1", "a"], [/traz melhorias/, "6.3", "a"],
  [/prepara profissionais/, "7.1", "a"], [/palavras e as perguntas/, "7.4", "a"], [/resultados desta avaliacao/, "7.4", "b"],
];
export function matchItem(text: string): [string, string] | null {
  const t = norm(text);
  for (const [re, id, st] of MAP) if (re.test(t)) return [id, st];
  return null;
}

export type Pub = { role: RoleKey; n: number; mean: number | null; h: number[]; tot: number; na: number };
export type Ind = { id: string; dim: number; name: string; pubs: Pub[]; perc: number | null; reg: number | null; mean: number | null; fav: number | null; st: Record<string, number | null>; alerts: string[]; h: number[] };

export function compute(recs: Rec[]) {
  const inds: Ind[] = INDS.map((d) => {
    const pubs: Pub[] = [], stAcc: Record<string, number[]> = {};
    for (const role of ROLE_KEYS) {
      const h = [0, 0, 0, 0, 0], sv: Record<string, number[]> = {}, who = new Set<number>();
      let na = 0, tot = 0;
      recs.forEach((r, i) => {
        if (r.role !== role) return;
        if (d.id === "5.2" && +cycleOf(r.ts).slice(0, 4) < NDAE_A_PARTIR_DE) return;
        r.a.forEach((x) => {
          if (x.ind !== d.id) return;
          tot++;
          if (x.v === 0) { na++; return; }
          h[x.v - 1]++; (sv[x.st] = sv[x.st] || []).push(x.v); who.add(i);
        });
      });
      if (!tot) continue;
      const sm = Object.keys(sv).map((k) => [k, mean(sv[k])!] as [string, number]);
      sm.forEach(([k, m]) => (stAcc[k] = stAcc[k] || []).push(m));
      pubs.push({ role, n: who.size, mean: mean(sm.map(([, m]) => m)), h, tot, na });
    }
    const pm = pubs.filter((p) => p.mean != null);
    const perc = mean(pm.map((p) => p.mean!));
    const reg = REGISTROS[d.id] != null ? pts(REGISTROS[d.id]) : null;
    const m = perc != null && reg != null ? (perc + reg) / 2 : perc ?? reg;
    const hs = [0, 0, 0, 0, 0]; pm.forEach((p) => p.h.forEach((v, k) => (hs[k] += v)));
    const nv = hs.reduce((s, v) => s + v, 0);
    const al: string[] = [];
    if (perc != null) {
      pm.forEach((p) => { const nn = p.h.reduce((s, v) => s + v, 0), t = (p.h[0] + p.h[1]) / nn; if (t >= 0.25) al.push(`Alerta de cauda: ${Math.round(t * 100)}% de ${ROLES[p.role]} discordam (1 ou 2)`); });
      pubs.forEach((p) => { if (p.na / p.tot > 0.3) al.push(`Confiabilidade: ${Math.round((p.na / p.tot) * 100)}% de “Não se aplica” entre ${ROLES[p.role]}`); });
      if (pm.length > 1) { const ms = pm.map((p) => p.mean!), dv = Math.max(...ms) - Math.min(...ms); if (dv >= 1) al.push(`Divergência entre públicos: ${f2(dv)} ponto de diferença`); }
    }
    return { id: d.id, dim: d.dim, name: d.name, pubs, perc, reg, mean: m, fav: nv ? (hs[3] + hs[4]) / nv : null, st: Object.fromEntries(Object.keys(stAcc).map((k) => [k, mean(stAcc[k])])), alerts: al, h: hs };
  });
  const dims = DIMS.map((name, i) => {
    const ii = inds.filter((x) => x.dim === i && x.id !== "7.4"); // 7.4 fica fora do índice
    const ms = ii.map((x) => x.mean).filter((v): v is number => v != null);
    const h = [0, 0, 0, 0, 0]; ii.forEach((x) => x.h.forEach((v, k) => (h[k] += v)));
    const nv = h.reduce((s, v) => s + v, 0);
    const byRole = {} as Record<RoleKey, number | null>;
    ROLE_KEYS.forEach((k) => (byRole[k] = mean(ii.map((x) => x.pubs.find((p) => p.role === k)?.mean).filter((v): v is number => v != null))));
    return { name, short: SHORT[i], mean: mean(ms), n: ms.length, total: ii.length, h, fav: nv ? (h[3] + h[4]) / nv : null, byRole };
  });
  const gh = [0, 0, 0, 0, 0]; dims.forEach((x) => x.h.forEach((v, k) => (gh[k] += v)));
  const gn = gh.reduce((s, v) => s + v, 0);
  return { inds, dims, geral: mean(dims.map((x) => x.mean).filter((v): v is number => v != null)), fav: gn ? (gh[3] + gh[4]) / gn : null };
}
