// Somente servidor: lê a planilha, ignora colunas pessoais (e-mail, nome, data) e normaliza as respostas.
import { DIMS, Ans, Rec, RoleKey, matchItem, norm } from "./model";

export const SHEET_ID = process.env.SHEET_ID ?? "1RF_g7QbCclfCKOSEyr_pPcBIz1XHfB1aGwLzpAUN6_s";
export const SHEET_TAB = process.env.SHEET_TAB ?? "Respostas ao formulário 1";

// 5 = Concordo totalmente … 1 = Discordo totalmente. "Não se aplica" e vazio ficam fora da conta.
// A grade da Dim. 5 (R) usa "Não concordo nem discordo": tratada igual a "Nem concordo nem discordo".
const LIKERT: Record<string, number> = { "concordo totalmente": 5, concordo: 4, "nem concordo nem discordo": 3, "nao concordo nem discordo": 3, discordo: 2, "discordo totalmente": 1 };
const canon = (s: string) => DIMS.find((d) => norm(d).slice(0, 10) === norm(s).slice(0, 10)) ?? s.trim();

function csv(t: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], f = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && t[i + 1] === "\n") i++; row.push(f); rows.push(row); row = []; f = ""; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows;
}

function roleOf(v: string): RoleKey | null {
  const s = norm(v);
  if (/^r[12]\b/.test(s)) return "R";
  if (s.startsWith("preceptor")) return "P";
  if (s.startsWith("tutor")) return "T";
  if (s.includes("programa de residencia")) return "CR";
  if (s.includes("coordena") || s.includes("dat")) return "CCS";
  return null;
}

type Col = { idx: number; comment: boolean; role?: RoleKey | "G"; dim: string; text: string };

export function parseSheet(text: string): Rec[] {
  const rows = csv(text);
  if (rows.length < 2) return [];
  const head = rows[0].map((h) => h.trim());
  const at = (re: RegExp) => head.findIndex((h) => re.test(norm(h)));
  const iTs = at(/^carimbo/), iRole = head.findIndex((h) => norm(h) === "respondente"), iCat = at(/^categoria/), iCs = at(/^centro de saude/);
  const HI = /^(?:dimens[aã]o \d+\s*[–-]\s*)?([\s\S]+?)\s*\((R|P|T|CCS|CR)\)\s*\[([\s\S]*)\]$/i;
  const GI = /^avalia[cç][aã]o geral\s*\[([\s\S]*)\]$/i;
  let last = "";
  const cols: Col[] = [];
  head.forEach((h, idx) => {
    const m = h.match(HI), g = h.match(GI), nh = norm(h);
    if (m) { last = canon(m[1]); cols.push({ idx, comment: false, role: m[2].toUpperCase() as RoleKey, dim: last, text: m[3].replace(/\s+/g, " ").trim() }); }
    else if (g) { last = DIMS[6]; cols.push({ idx, comment: false, role: "G", dim: last, text: g[1].trim() }); }
    else if (/^coment|^quais sao|^qual e o principal/.test(nh)) cols.push({ idx, comment: true, dim: /^coment/.test(nh) ? last : /^quais/.test(nh) ? "7.2 Pontos fortes" : "7.3 Pontos a melhorar e sugestões", text: "" });
  });
  const recs: Rec[] = [];
  for (const r of rows.slice(1)) {
    const ts = (r[iTs] ?? "").trim();
    const role = roleOf(r[iRole] ?? "");
    if (!ts || !role) continue;
    const a: Ans[] = [], comments: Rec["comments"] = [];
    for (const c of cols) {
      const v = (r[c.idx] ?? "").trim();
      if (!v) continue;
      if (c.comment) { comments.push({ dim: c.dim, text: v }); continue; }
      if (c.role !== "G" && c.role !== role) continue; // ignora blocos de outros perfis
      const mi = matchItem(c.text), k = norm(v), s = k === "nao se aplica" ? 0 : LIKERT[k];
      if (mi && s !== undefined) a.push({ ind: mi[0], st: mi[1], v: s });
    }
    recs.push({ role, cat: (r[iCat] ?? "").trim(), cs: (r[iCs] ?? "").trim(), ts, a, comments });
  }
  return recs;
}

