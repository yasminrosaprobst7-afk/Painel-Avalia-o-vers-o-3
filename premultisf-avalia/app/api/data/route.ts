import { NextResponse } from "next/server";
import { SHEET_ID, SHEET_TAB, parseSheet } from "@/lib/sheet";

export const dynamic = "force-dynamic";

// Lê a planilha a cada chamada (sem cache) e devolve só dados não pessoais (nome, e-mail e data nunca são lidos).
export async function GET() {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(SHEET_TAB)}`;
  const res = await fetch(url, { cache: "no-store" });
  const text = res.ok ? await res.text() : "";
  if (!text || text.trimStart().startsWith("<"))
    return NextResponse.json({ error: "Não foi possível ler a planilha. Confira o compartilhamento (“qualquer pessoa com o link”) e o nome da aba." }, { status: 502 });
  return NextResponse.json({ recs: parseSheet(text), fetchedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
