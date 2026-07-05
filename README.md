# 📄 RAG Chatbot — Chat with your PDFs

> Chat with PDF documents using LLM + semantic search  
> Stack: **React (Next.js) · Tailwind · FastAPI · OpenAI · LangChain · FAISS**  
> Deploy: **Vercel (frontend) + Docker on Render (backend)** — zero cost

---

## Architecture

```
┌────────────────────┐   upload PDF   ┌────────────────────────────┐
│  Next.js Frontend  │ ─────────────> │  FastAPI Backend           │
│  React + Tailwind  │                │  • PyPDFLoader → chunks    │
│  Vercel            │ <────────────  │  • OpenAI embeddings       │
└────────────────────┘  streamed ans  │  • FAISS vector store      │
                                      │  • LangChain LCEL RAG chain│
                                      │  • OpenAI GPT-3.5/4        │
                                      │  Docker on Render.com      │
                                      └────────────────────────────┘
```

---

## Quick Start (Local)

### 1. Clone & configure

```bash
git clone https://github.com/harshabasava970-bot/rag-chatbot.git
cd rag-chatbot
cp .env.example .env
# Edit .env — set OPENAI_API_KEY
```

### 2. Run backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
cp .env.example .env          # set OPENAI_API_KEY
uvicorn app.main:app --reload --port 8000
```

Backend runs at **http://localhost:8000**  
API docs at **http://localhost:8000/docs**

### 3. Run frontend

```bash
cd frontend
npm install
cp .env.example .env.local    # BACKEND_URL=http://localhost:8000
npm run dev
```

Frontend runs at **http://localhost:3000**

### 4. Or run both with Docker Compose

```bash
cp .env.example .env          # set OPENAI_API_KEY
docker-compose up --build
```

---

## Deployment (Zero Cost)

### Backend → Render.com (free Docker)

1. Go to [render.com](https://render.com) → New → **Web Service**
2. Connect your GitHub repo
3. Settings:
   - **Root Directory**: `backend`
   - **Environment**: Docker
   - **Dockerfile path**: `./Dockerfile`
4. Add environment variable: `OPENAI_API_KEY = sk-...`
5. Click **Deploy**
6. Copy the URL e.g. `https://rag-chatbot-backend.onrender.com`

### Frontend → Vercel (free)

1. Go to [vercel.com](https://vercel.com) → New Project → Import your GitHub repo
2. Set **Root Directory** to `frontend`
3. Add environment variable: `BACKEND_URL = https://rag-chatbot-backend.onrender.com`
4. Click **Deploy**

Done. Your chatbot is live. ✅

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/health` | Health check |
| `POST` | `/api/ingest` | Upload + index a PDF (`multipart/form-data`) |
| `POST` | `/api/chat` | Ask a question, get answer + sources (JSON) |
| `GET`  | `/api/chat/stream?question=...` | Streaming SSE answer |

---

## Project Structure

```
rag-chatbot/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app
│   │   ├── config.py            # Settings from env vars
│   │   ├── routers/
│   │   │   ├── ingest.py        # POST /api/ingest
│   │   │   └── chat.py          # POST /api/chat + GET /api/chat/stream
│   │   ├── services/
│   │   │   ├── pdf_loader.py    # PyPDF → LangChain Documents
│   │   │   ├── vector_store.py  # FAISS index management
│   │   │   └── rag_chain.py     # LangChain LCEL RAG chain
│   │   └── models/
│   │       └── schemas.py       # Pydantic request/response models
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── app/
│   │   ├── page.tsx             # Main chat page
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   ├── components/
│   │   │   ├── ChatMessage.tsx  # Chat bubble with markdown
│   │   │   ├── UploadButton.tsx # PDF upload with progress
│   │   │   ├── SourcesDrawer.tsx# Slide-in sources panel
│   │   │   └── EmptyState.tsx   # Welcome screen
│   │   └── api/
│   │       ├── ingest/route.ts  # Proxies to FastAPI /api/ingest
│   │       └── chat/route.ts    # Proxies SSE stream to FastAPI
│   ├── vercel.json
│   └── .env.example
├── docker-compose.yml
├── .env.example
└── README.md
```
