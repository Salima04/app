# VidyaGPT AI QA Platform — PRD

## Original Problem Statement
Build a production-ready "VidyaGPT AI QA Platform" — a RAG-based student chatbot + automated LLM QA, security, observability and model-testing platform for colleges. Admin uploads college documents; students get answers strictly from uploaded/trained data. Auto AI QA Agent generates, executes and evaluates tests automatically.

## Tech Stack (as built)
- **Frontend**: React 19 (CRA/craco) on port 3000 — SaaS dashboard with dark sidebar + light content
- **Backend**: FastAPI (Python) on port 8001 — layered architecture (server → services → SQLAlchemy models)
- **Database**: PostgreSQL 15 running natively on port 5432 (db `vidyagpt`, user `vidya`)
- **LLMs**: GPT-5.4, Claude Sonnet 5, Gemini 3 Flash via Emergent Universal Key (`emergentintegrations`)
- **Embeddings**: Deterministic hash-projected TF vector (512-dim, unsigned) + lexical fallback — fully offline, no external embedding API

## User Personas
- **Admin** — creates/manages Colleges (Properties), uploads documents, triggers QA runs, views reports
- **QA Engineer** — runs Auto QA, inspects failures, manages Golden Dataset
- **Student** — chats with the strict-RAG chatbot for a specific college

## Core Requirements (implemented)
- Auth: JWT login/register/forgot with bcrypt + strict property/owner isolation
- Colleges: CRUD with Name, Alias, Property ID, active/inactive
- Documents: PDF/DOCX/TXT/XLSX/CSV upload, chunking, re-process, delete, version bump; cache invalidation on doc change
- RAG Chat: retrieval → cache → LLM → answer with citations + markdown (tables, code, lists), Hindi/Hinglish support
- Cache: exact + normalized SHA-256 hash cache per property; auto-invalidates on doc change
- Observability: per-message telemetry (model/provider/tokens/cost/latency/cache_status/citations/retrieved_chunks) via right-side drawer
- Auto AI QA Agent: Quick/Standard/Full/Security/Regression modes; auto-generates functional (LLM), security & negative tests; runs, evaluates deterministically, computes scores (accuracy/grounded/security/hallucination-resistance/overall) and P0-P3 severity
- Model Test Lab: side-by-side comparison of GPT-5.4 / Claude Sonnet 5 / Gemini 3 Flash on the same question over the same corpus with grounding/latency/cost/overall_score and recommended model
- Golden Dataset: question/expected_answer/expected_behavior/category/severity/tags CRUD with ownership check
- Dashboard: KPI cards + quality trend line chart across recent runs
- Security: JWT, RBAC-lite (role field), property isolation on all endpoints, size-limited uploads (20MB), file type whitelist

## What's Implemented (Jan 2026 — v1)
- **Backend endpoints**: `/auth/{register,login,forgot,me}`, `/properties[/:id[/toggle]]`, `/documents[/upload|:id[/reprocess]]`, `/chat`, `/conversations[/:id/messages]`, `/cache/stats`, `/qa/auto`, `/qa/runs[/:id[/stop]]`, `/lab/compare`, `/lab/history`, `/lab/models`, `/golden[/:id]`, `/dashboard`
- **Frontend pages**: Login (dual-column marketing + form), Dashboard (8 KPI cards + trend chart), Colleges (grid + create form), Documents (upload table with live status), RAG Chat (markdown rendering + observability drawer), Auto QA Agent (5 modes + live run + case drilldown), Model Test Lab (side-by-side comparison + Recommended badge), Golden Dataset (CRUD table)
- **Seed**: admin@vidyagpt.com / Admin@12345 auto-created at startup

## Prioritised Backlog (v2)
- **P1** Streaming SSE chat response (currently non-streaming)
- **P1** Reports: PDF / Excel / CSV / JSON export from Auto QA runs and dashboard
- **P1** Regression mode: automatically re-run against Golden Dataset when doc/prompt changes with previous vs new score delta
- **P2** OCR for scanned PDFs (Tesseract) & DOCX images
- **P2** More Auto QA categories: prompt injection variants, RAG poisoning simulation, long-context tests
- **P2** Real per-model cost pricing pulled from provider metadata
- **P3** Realtime WebSocket-based live progress for Auto QA runs (currently 2.5s polling)

## Known Limitations
- Embedding is deterministic hash-TF (offline); production-grade would use OpenAI `text-embedding-3-small` or similar
- Multi-turn context in chat currently relies on LLM session_id only (conversation history not re-injected into prompt beyond first turn)
- `Property.property_id` is globally unique (should be per-owner in a multi-tenant SaaS)
- No streaming yet — long answers block briefly
