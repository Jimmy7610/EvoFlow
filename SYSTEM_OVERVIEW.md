# 🎯 EvoFlow AI Ops: Systemöverblick

EvoFlow AI Ops är din helt privata, lokala kommandocentral för AI och automatisering. Den är designad för professionella användare som kräver integritet, kontroll och en strukturerad arbetsyta för komplex problemlösning.

---

## 🌟 Vad är EvoFlow? (Det stora perspektivet)

EvoFlow är som att ha en egen instans av ChatGPT som bor helt på din egen dator. Ingen data skickas till molnet, vilket gör den perfekt för analys av känsliga dokument, privat kod eller konfidentiella strategier. Den är byggd för **builders and thinkers** som behöver mer än bara ett chatt-fönster – den är en komplett arbetsmiljö.

---

## 🛠 Huvudfunktioner (Feature Matrix)

### 1. Lokal RAG (Document Intelligence)
*   **Fil-interaktion**: Dra och släpp PDF:er, `.txt` och `.ts`-filer direkt i sidofältet.
*   **Session-skydd**: Dokument är isolerade per chatt-session. Inget läckage mellan olika projekt.
*   **Säkerhet**: All text-extraction och indexering sker lokalt på din maskin.

### 2. Battle Mode (Benchmarking)
*   **Side-by-Side**: Kör två olika modeller samtidigt (t.be. Llama3 vs Mistral) och jämför deras svar i realtid.
*   **Kvalitetskontroll**: Perfekt för att utvärdera vilken modell som är bäst på kodning, kreativt skrivande eller logisk analys.

### 3. Managed Ops Dashboard
*   **Processkontroll**: Starta och stoppa bakgrundstjänster (API och Executor) direkt från UI:t.
*   **Statusindikatorer**: Se i realtid om din AI-server eller web-tjänst är online.

### 4. Smart Memory & Context
*   **Långtidsminne**: Plattformen kommer ihåg tidigare körningar inom samma ämne för att ge mer relevanta svar.
*   **Språkkonsistens**: AIn känner automatiskt av och svarar på det språk du använder.

---

## 🎨 Gränssnitt & UX (Obsidian 2.0)

EvoFlow använder en **Fixed-Viewport (100vh) layout**, vilket innebär att den känns som en native desktop-app snarare än en hemsida.

*   **Design-språk**: Mörkt läge först, glas-effekter (glassmorphism) och hög densitet.
*   **Compact Mode**: Optimerad för power-users med minimalt "dead space" och maximalt utrymme för text.
*   **Animationer**: Integration av `Framer Motion` för mjuka sidofälts-övergångar och smidiga meddelande-flöden.

---

## ⚙️ Teknisk Arkitektur (Under huven)

### Monorepo Struktur
EvoFlow är byggt som ett monorepo med `pnpm workspaces` för maximal modularitet:
*   **`/apps/web`**: Frontend i **Next.js**. Hanterar UI, tillstånd och realtids-streaming.
*   **`/apps/api`**: Backend i **Express.js**. Fungerar som bryggan mellan UI:t och AI-engine.
*   **`/workers/executor`**: En specialiserad bakgrundsarbetare som sköter den tunga AI-logiken.

### Tech Stack
*   **Språk**: TypeScript (genomgående).
*   **Databas**: **SQLite** med **Prisma ORM** för säker och permanent lagring av chatt-historik.
*   **AI Engine**: **Ollama** för lokal exekvering av modeller.
*   **Stil**: Vanilla CSS (CSS Variables) för total kontroll och premium-estetik.
*   **Orkestrering**: `concurrently` för att köra hela systemet med ett enda kommando.

---

> *"EvoFlow AI Ops: Privacy, Performance, and Precision in the Age of Local AI."*
