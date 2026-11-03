# TaskFlow — Resilient MERN Kanban Platform

A full-stack Kanban task management application built with the MERN stack, featuring optimistic UI updates, concurrency protection, drag-and-drop task management, multi-filter search, and persistent light/dark themes.

## Features

### Task Management
- Create, edit, and delete tasks.
- Organize tasks across To Do, In Progress, and Done columns.
- Assign Low, Medium, or High priority.
- Add descriptions and tags.
- Persist task changes in MongoDB.

### Drag-and-Drop
- Move tasks between columns.
- Reorder tasks within columns.
- Maintain explicit task ordering using `orderIndex`.
- Support keyboard and pointer-based interactions.

### Optimistic UI
- Update the interface immediately before the server responds.
- Roll back failed operations.
- Display error notifications when API requests fail.
- Serialize mutations to coordinate rapid interactions.

### Search and Filtering
- Search task titles and descriptions.
- Debounce search input by 300 milliseconds.
- Filter by multiple priorities.
- Filter by multiple columns.
- Combine search and filters.

### Theme Support
- Light and dark themes.
- Persist theme preference in localStorage.
- Initialize the saved theme before React renders to prevent theme flicker.

### Reliability
- MongoDB transactions for task mutations.
- Board revision checks to detect stale writes.
- HTTP 409 responses for revision conflicts.
- Indexed task queries.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, JavaScript |
| State Management | Zustand |
| Styling | CSS Variables, Responsive CSS |
| Drag and Drop | dnd-kit |
| Icons | Lucide React |
| Notifications | React Hot Toast |
| HTTP Client | Axios |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| API Communication | REST API |

---

## Project Structure

```text
taskflow/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── board/
│   │   │   ├── task/
│   │   │   ├── layout/
│   │   │   └── common/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── store/
│   │   ├── styles/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── seed/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── app.js
│   │   └── server.js
│   ├── .env.example
│   └── package.json
│
├── DECISIONS.md
├── README.md
└── .gitignore
```

---

## Getting Started

### Prerequisites

Install the following:

- Node.js (LTS recommended)
- npm
- MongoDB Atlas account or a MongoDB deployment configured to support transactions
- Git

### 1. Clone the repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd taskflow
```

### 2. Configure the backend

```bash
cd server
npm install
```

Create a `.env` file inside the `server` directory:

```env
PORT=5001
MONGODB_URI=your_mongodb_connection_string
CLIENT_URL=http://localhost:5174
NODE_ENV=development
```

Replace the MongoDB connection string with your own credentials. Never commit your actual `.env` file.

### 3. Configure the frontend

Open another terminal:

```bash
cd client
npm install
```

Create `client/.env`:

```env
VITE_API_URL=http://localhost:5001/api
```

### 4. Seed the database

From the `server` directory:

```bash
npm run seed
```

This resets the TaskFlow collections and inserts a sample board with tasks distributed across all three columns.

**Warning:** The seed command is destructive to existing TaskFlow board and task data.

### 5. Start the backend

From the `server` directory:

```bash
npm run dev
```

The backend runs at:

```text
http://localhost:5001
```

### 6. Start the frontend

From the `client` directory:

```bash
npm run dev
```

Open the local URL printed by Vite (typically `http://localhost:5173` or the next available port).

---

## API Endpoints

Base URL: `/api`

### Boards

| Method | Endpoint | Description |
|---|---|---|
| GET | `/boards` | Retrieve boards |
| GET | `/boards/:id` | Retrieve a board |
| POST | `/boards` | Create a board |

### Tasks

| Method | Endpoint | Description |
|---|---|---|
| GET | `/tasks?boardId=:id` | Retrieve board tasks |
| GET | `/tasks/:id` | Retrieve a task |
| POST | `/tasks` | Create a task |
| PATCH | `/tasks/:id?boardId=:id` | Update a task |
| DELETE | `/tasks/:id?boardId=:id&expectedRevision=:revision` | Delete a task |
| PATCH | `/tasks/:id/move` | Move or reorder a task |

Mutating requests use board revision information to protect against stale updates.

A revision conflict returns HTTP `409 Conflict`.

### Health Check

```text
GET /api/health
```

---

## Architecture and Engineering Decisions

TaskFlow uses Zustand to centralize frontend board state and coordinate optimistic mutations.

The mutation queue serializes client-side operations. The backend uses MongoDB transactions and board-level revision checks to prevent stale writes.

Task ordering is maintained using explicit `orderIndex` values.

For further technical details, trade-offs, concurrency decisions, and scalability analysis, see:

**[DECISIONS.md](./DECISIONS.md)**

---

## Verification

The following manual checks have been performed during development:

- Task creation, editing, and deletion.
- Drag-and-drop between columns.
- Search and combined multi-filter operations.
- Light/dark theme switching and persistence after refresh.
- Backend failure detection and optimistic rollback.
- Five rapid drag-and-drop moves under Chrome DevTools Slow 3G throttling.

These are manual development checks, not a claim of comprehensive automated test coverage.

Build the frontend with:

```bash
cd client
npm run build
```

---

## Future Improvements

- Automated frontend and backend test suites.
- Server-side pagination and filtering.
- Finer-grained concurrency control.
- Fractional indexing for efficient task reordering.
- Real-time synchronization using WebSockets.
- Virtualized task lists for large boards.
- Deployment with production monitoring.

---

## Author

Developed as a full-stack engineering assessment project.

**TaskFlow — Resilient MERN Kanban Platform**git status --short