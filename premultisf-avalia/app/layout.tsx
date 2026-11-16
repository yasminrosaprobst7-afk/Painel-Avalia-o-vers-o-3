import "./globals.css";
import { Nunito } from "next/font/google";
// Nunito é a alternativa aberta à Gotham Rounded (tipografia principal da marca); o texto usa Calibri.
const head = Nunito({ subsets: ["latin"], variable: "--font-head", display: "swap" });
export const metadata = { title: "PREMULTISF Avalia — Painel de Resultados", description: "Avaliação do Programa de Residência Multiprofissional em Saúde da Família." };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="pt-BR" className={head.variable}><body>{children}</body></html>);
}
