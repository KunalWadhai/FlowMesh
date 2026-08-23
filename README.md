# ⚡ FlowMesh

**AI-Powered Distributed Workflow Orchestration Engine**

FlowMesh is a production-grade platform for building, executing, and monitoring distributed workflows as Directed Acyclic Graphs (DAGs). It combines a visual workflow builder, real-time execution observability, and an integrated Claude AI co-pilot — all in a single glassmorphism-styled SaaS platform.

---

## 🧠 Why FlowMesh?

| Problem | FlowMesh Solution |
|---|---|
| Workflow tools (Airflow, Temporal) are complex to self-host | Runs locally with `docker compose up` |
| No visual builder + real-time monitoring combo | ReactFlow canvas + Socket.io live feed |
| AI integration is bolt-on | Claude AI is a first-class node type |
| Expensive SaaS (n8n cloud, Zapier) | Fully open, self-hosted |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  CLIENT                                                     │
│  React + ReactFlow + Framer Motion + Zustand + Socket.io   │
└───────────────────────┬─────────────────────────────────────┘
                        │ REST + WebSocket
┌───────────────────────▼─────────────────────────────────────┐
│  API GATEWAY  (Node.js + Express + Socket.io)               │
│  ┌──────────┐ ┌───────────┐ ┌────────────┐ ┌────────────┐  │
│  │   Auth   │ │ Workflow  │ │ Execution  │ │     AI     │  │
│  │ Service  │ │  Service  │ │  Service   │ │  Service   │  │
│  └──────────┘ └───────────┘ └─────┬──────┘ └────┬───────┘  │
└────────────────────────────────────┼─────────────┼──────────┘
                        Enqueue      │             │ Claude API
┌───────────────────────▼───────┐   │   ┌─────────▼──────────┐
│  WORKER ENGINE (BullMQ)       │   │   │  Anthropic Claude  │
│  ┌───────────────────────┐    │   │   │  claude-sonnet-4-6 │
│  │ Topological Sort      │    │   │   └────────────────────┘
│  │ (Kahn's Algorithm)    │    │   │
│  ├───────────────────────┤    │   │
│  │ Node Runners:         │    │   │
│  │  HTTP · Transform     │    │   │
│  │  Delay · Condition    │◄───┘   │
│  │  AI Agent · Log       │        │
│  └───────────┬───────────┘        │
└──────────────┼────────────────────┘
               │ Redis Pub/Sub
┌──────────────▼────────────────────┐
│  INFRASTRUCTURE                   │
│  ┌──────────┐  ┌───────────────┐  │
│  │PostgreSQL│  │     Redis     │  │
│  │ (Prisma) │  │ Queue+Cache   │  │
│  │          │  │ Pub/Sub Bridge│  │
│  └──────────┘  └───────────────┘  │
└───────────────────────────────────┘
```

---

## ✨ Features

### Workflow Engine
- **Visual DAG Builder** — drag-and-drop canvas with ReactFlow
- **6 Node Types** — HTTP Request, Transform, Delay, Condition, AI Agent, Log
- **Cycle Detection** — Kahn's topological sort validates DAGs on save
- **Retry Policies** — Per-node exponential backoff with configurable max attempts
- **Dead Letter Queue** — Failed executions are preserved for inspection

### Real-Time Observability
- **Live Execution Graph** — nodes light up as they run via Socket.io
- **Step-Level Logs** — every node emits structured logs
- **Activity Feed** — expandable timeline with per-step drill-down
- **Metrics Dashboard** — success rates, duration trends, throughput

### AI Integration (Claude)
- **Workflow Generator** — describe a workflow in plain English, get a full DAG
- **Workflow Analyzer** — detect anti-patterns, suggest optimizations
- **AI Agent Node** — embed Claude processing as a first-class workflow step
- **Chat Assistant** — contextual Q&A about workflows

### Production-Grade Patterns
- **Multi-Tenancy** — workspace isolation via JWT claims (`workspaceId` scoped)
- **Refresh Token Rotation** — sliding session with DB-persisted refresh tokens
- **Redis Read-Through Cache** — workflow definitions cached with 5-min TTL
- **Per-IP Rate Limiting** — 200 req/15min global, 20 req/15min auth
- **Event-Driven** — Redis pub/sub bridges worker events to Socket.io rooms
- **Worker Pool** — BullMQ with configurable concurrency, graceful shutdown

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript |
| UI | Tailwind CSS (glassmorphism), Framer Motion |
| DAG Canvas | @xyflow/react (ReactFlow) |
| State | Zustand with persistence |
| Charts | Recharts |
| Real-time (client) | Socket.io-client |
| Backend | Node.js, Express, TypeScript |
| ORM | Prisma (PostgreSQL) |
| Queue | BullMQ |
| Cache / Pub-Sub | Redis (ioredis) |
| Real-time (server) | Socket.io |
| Auth | JWT + bcrypt + refresh token rotation |
| AI | Anthropic Claude SDK |
| Validation | Zod |
| Logging | Pino (structured JSON) |
| Containers | Docker + Docker Compose |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Docker + Docker Compose
- An Anthropic API key

### 1. Clone and configure

```bash
git clone https://github.com/yourname/flowmesh.git
cd flowmesh

# Copy and fill env file
cp apps/api/.env.example apps/api/.env
# Set: JWT_SECRET (min 32 chars), ANTHROPIC_API_KEY
```

### 2. Start infrastructure

```bash
docker compose up postgres redis -d
```

### 3. Run database migrations

```bash
cd apps/api
npm install
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Start the API

```bash
# In apps/api/
npm run dev
```

### 5. Start the frontend

```bash
# In apps/web/
npm install
npm run dev
```

Open **http://localhost:5173** — register an account and start building.

### Docker (full stack)

```bash
# Requires ANTHROPIC_API_KEY and JWT_SECRET in environment
ANTHROPIC_API_KEY=sk-ant-... JWT_SECRET=your-secret docker compose up --build
```

Open **http://localhost:3000**

---

## 📁 Project Structure

```
flowmesh/
├── apps/
│   ├── api/                        # Backend (Node.js + Express)
│   │   ├── src/
│   │   │   ├── config/             # Env, Redis, Prisma, Logger singletons
│   │   │   ├── middleware/         # Auth guard, error handler
│   │   │   ├── routes/             # REST endpoints (auth, workflow, execution, AI)
│   │   │   ├── services/           # Business logic (auth, workflow, execution, AI)
│   │   │   ├── workers/
│   │   │   │   ├── execution.worker.ts   # BullMQ worker — DAG orchestrator
│   │   │   │   └── nodeRunners/          # Per-node executors
│   │   │   ├── socket/             # Socket.io server + Redis pub/sub bridge
│   │   │   ├── types/              # Shared TypeScript types + error classes
│   │   │   └── server.ts           # Express app bootstrap + graceful shutdown
│   │   ├── prisma/schema.prisma    # Full data model
│   │   └── Dockerfile
│   │
│   └── web/                        # Frontend (React + Vite)
│       ├── src/
│       │   ├── components/
│       │   │   ├── ui/             # Design system (Button, Card, Badge, Input…)
│       │   │   ├── workflow/       # ReactFlow custom node (FlowNode)
│       │   │   └── layout/         # AppLayout with animated sidebar
│       │   ├── pages/
│       │   │   ├── Auth.tsx        # Login / Register
│       │   │   ├── Dashboard.tsx   # Metrics + activity overview
│       │   │   ├── Workflows.tsx   # Workflow list with search/filter
│       │   │   ├── WorkflowEditor.tsx  # Full DAG builder + live execution
│       │   │   ├── Activity.tsx    # Execution feed with step logs
│       │   │   └── AIAssistant.tsx # Claude AI chat + workflow generator
│       │   ├── stores/             # Zustand (auth with persistence)
│       │   ├── hooks/              # useSocket, useExecutionEvents
│       │   ├── lib/                # Axios client with interceptors
│       │   └── types/              # Workflow, Execution types
│       └── Dockerfile
│
├── architecture.excalidraw         # Full system architecture diagram
├── docker-compose.yml
└── README.md
```

---

## 🔌 API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register + create workspace |
| POST | `/api/auth/login` | Login → access + refresh tokens |
| POST | `/api/auth/refresh` | Rotate refresh token |
| POST | `/api/auth/logout` | Revoke refresh token |
| GET | `/api/auth/me` | Current user |

### Workflows
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/workflows` | List (paginated, filterable) |
| POST | `/api/workflows` | Create with DAG validation |
| GET | `/api/workflows/:id` | Get by ID (Redis cache) |
| PUT | `/api/workflows/:id` | Update + version increment |
| DELETE | `/api/workflows/:id` | Delete + cache invalidate |
| POST | `/api/workflows/:id/activate` | Activate workflow |
| GET | `/api/workflows/stats` | Workspace-level metrics |

### Executions
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/workflows/:id/execute` | Trigger execution |
| GET | `/api/executions/:id` | Get execution + step logs |
| GET | `/api/workflows/:id/executions` | List executions |
| POST | `/api/executions/:id/cancel` | Cancel queued/running |
| GET | `/api/executions/metrics` | Aggregated metrics |
| GET | `/api/activity` | Recent activity feed |

### AI
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/ai/suggest` | Generate workflow from prompt |
| POST | `/api/ai/analyze` | Analyze workflow for issues |
| POST | `/api/ai/chat` | Conversational AI assistant |

### WebSocket Events
```
Client → Server:
  execution:subscribe   { executionId }
  execution:unsubscribe { executionId }

Server → Client:
  execution:started
  execution:step:started
  execution:step:completed
  execution:step:failed
  execution:completed
  execution:failed
  execution:cancelled
```

---

## 🔑 Key Engineering Decisions

### DAG Execution — Kahn's Topological Sort
Nodes are sorted topologically before execution. Each node's output is passed as input to successor nodes. Parallel branches are supported via the merge node type.

```
HTTP → Transform → Condition ─(true)──→ AI Agent → Log
                             ─(false)─→ Delay    → Log
```

### Event-Driven Real-Time Updates
Workers run in a separate process context. They communicate back to the API (which holds Socket.io connections) via **Redis Pub/Sub** — a clean decoupling that allows horizontal scaling of both workers and API instances.

```
Worker → Redis PUBLISH "execution:events" → API subscriber → Socket.io room emit
```

### Multi-Tenant Workspace Isolation
Every API request is scoped to a `workspaceId` embedded in the JWT. Database queries always include `WHERE workspaceId = ?`. Redis cache keys are workflow-ID based (workspace checked on miss).

### Refresh Token Rotation
Access tokens expire in 15 minutes. On expiry, the client uses a DB-stored refresh token (7-day TTL) to get a new pair. The old refresh token is immediately deleted — sliding window with revocation on logout.

---

## 📊 System Design Concepts Demonstrated

- ✅ Event-Driven Architecture (pub/sub decoupling)
- ✅ Worker Pool Pattern (BullMQ concurrency)
- ✅ Dead Letter Queue (failed job preservation)
- ✅ Redis Read-Through Cache (TTL + invalidation)
- ✅ DAG Execution Engine (topological sort + cycle detection)
- ✅ Multi-Tenant SaaS (workspace isolation)
- ✅ Real-Time Streaming (Socket.io rooms)
- ✅ JWT Auth + Refresh Token Rotation
- ✅ Rate Limiting (global + endpoint-specific)
- ✅ Structured Logging (Pino JSON)
- ✅ Graceful Shutdown (drain queues + close connections)
- ✅ Zod Schema Validation (all endpoints)
- ✅ Error Boundary Pattern (operational vs programmer errors)
- ✅ AI Integration (Claude SDK — embedded, not bolted-on)

---

## 📸 Architecture Diagram

Open `architecture.excalidraw` in [Excalidraw](https://excalidraw.com) for the full interactive system diagram.

---

## License

MIT — built for portfolio and learning purposes.
# FlowMesh
