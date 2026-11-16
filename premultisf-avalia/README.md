# PREMULTISF Avalia (v4 — segue a Matriz de Dimensões e Indicadores)

Next.js 14 + Tailwind + Recharts. Lê a planilha de respostas a cada 60 s (e no botão "Atualizar"). Acesso livre, sem senha.

## Variáveis de ambiente (opcionais)
- `SHEET_ID` / `SHEET_TAB`: planilha e aba lidas (padrão: as do projeto).
- `NEXT_PUBLIC_FORM_URL`: link "Responder formulário" (ou edite `FORM_URL` em `lib/model.ts`).

## Onde ajustar a matriz (`lib/model.ts`)
- `INDS` e `MAP`: indicadores e o texto de cada afirmativa do formulário que alimenta cada um.
- `READ`: faixas de leitura (4,50 / 3,50 / 2,50). `compute()`: média integrada, índices, sinais de alerta.
- `REGISTROS`: % de conformidade dos dados de registro [D] por indicador (ex.: `{ "6.2": 82 }`); entram com peso igual à percepção.
- `EXPECTED`: pessoas esperadas por público (taxa de resposta / confiabilidade).
- `NDAE_A_PARTIR_DE`: ciclo em que a pergunta do NDAE (5.2) passa a valer (padrão 2027; 2026 = 1º ciclo).
- `CYCLE_START_MONTH`: mês de início do ciclo (1 = ano civil).

## Privacidade
Nome, e-mail e data nunca são lidos. Não há link para a planilha nem tabela de respostas individuais.
