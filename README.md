# CollabDocs — Real-Time Collaborative Document Editor

A full-stack Google Docs-like application with real-time multi-user editing, authentication, document sharing, version history, and cloud storage on MongoDB Atlas.

---

## ✨ Features

| Feature | Details |
|---------|---------|
| **Real-time collaboration** | Socket.io WebSockets broadcast every change instantly |
| **Rich text editing** | TipTap editor — bold, italic, headings, lists, code, links, highlights |
| **Authentication** | JWT + bcrypt, protected routes |
| **Document sharing** | Invite by email with view/edit permissions; public share links |
| **Version history** | Manual snapshots + restore any version |
| **Auto-save** | Debounced 5s save + periodic 30s background save |
| **Active users** | See who else is in the document in real-time |
| **Cloud storage** | MongoDB Atlas with efficient schemas |

---

## 🗂 Project Structure

```
collab-docs/
├── server/
│   ├── config/
│   │   └── db.js                  # MongoDB Atlas connection
│   ├── controllers/
│   │   ├── authController.js      # Register, login, profile, user search
│   │   └── documentController.js  # CRUD, share, versions, restore
│   ├── middleware/
│   │   ├── auth.js                # JWT protect + optional auth + token generator
│   │   └── errorHandler.js        # Global error handler
│   ├── models/
│   │   ├── User.js                # User schema (name, email, hashed password)
│   │   └── Document.js            # Document schema (content, collaborators, versions)
│   ├── routes/
│   │   ├── auth.js                # /api/auth/*
│   │   └── documents.js           # /api/documents/*
│   ├── socket/
│   │   └── socketHandler.js       # Socket.io rooms, delta broadcast, auto-save
│   ├── server.js                  # Express + Socket.io entry point
│   ├── package.json
│   └── .env.example
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   └── editor/
│   │   │       ├── EditorToolbar.jsx   # Formatting toolbar
│   │   │       ├── ActiveUsers.jsx     # Live collaborator avatars
│   │   │       ├── ShareDialog.jsx     # Share modal
│   │   │       └── VersionHistory.jsx  # Version snapshot panel
│   │   ├── context/
│   │   │   ├── AuthContext.jsx         # User auth state
│   │   │   └── SocketContext.jsx       # Shared socket instance
│   │   ├── hooks/
│   │   │   └── useDocuments.js         # Document CRUD hook
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── DocumentPage.jsx        # Main editor
│   │   │   └── SharePage.jsx           # Share link resolver
│   │   ├── utils/
│   │   │   └── api.js                  # Axios instance with auth interceptors
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── .env.example
│
├── package.json                    # Root: concurrently runs both
└── README.md
```

---

## 🚀 Quick Start (Local)

### 1. Clone & install

```bash
git clone <repo-url>
cd collab-docs
npm install          # installs concurrently at root
cd server && npm install
cd ../client && npm install
```

### 2. Configure environment variables

**Server** — copy and edit `server/.env.example` → `server/.env`:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/collab-docs?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_key_at_least_32_chars_long
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

**Client** — copy and edit `client/.env.example` → `client/.env`:

```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

### 3. Set up MongoDB Atlas

1. Go to [https://cloud.mongodb.com](https://cloud.mongodb.com) → Create free cluster
2. Create a database user with read/write access
3. Whitelist your IP (or `0.0.0.0/0` for dev)
4. Copy the connection string into `server/.env` as `MONGODB_URI`

### 4. Run the app

```bash
# From the root directory — runs both frontend and backend
npm run dev

# Or run separately:
npm run dev:server   # Backend on http://localhost:5000
npm run dev:client   # Frontend on http://localhost:5173
```

### 5. Test real-time collaboration locally

1. Open `http://localhost:5173` in **two different browsers** (or an incognito window)
2. Register two accounts
3. Create a document with account A
4. Share it with account B's email → set "Edit" permission
5. Open the document in both browsers simultaneously
6. Type in one window — changes appear instantly in the other

---

## 📡 API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | Public | Register new user |
| POST | `/api/auth/login` | Public | Login, returns JWT |
| GET | `/api/auth/me` | Bearer | Get current user |
| PUT | `/api/auth/profile` | Bearer | Update name |
| GET | `/api/auth/search?email=x` | Bearer | Search users by email |

### Documents

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/documents` | Bearer | Get owned + shared docs |
| POST | `/api/documents` | Bearer | Create new document |
| GET | `/api/documents/:id` | Bearer | Get document + permission |
| PUT | `/api/documents/:id` | Bearer | Update title/content |
| DELETE | `/api/documents/:id` | Bearer | Delete (owner only) |
| POST | `/api/documents/:id/share` | Bearer | Share with user by email |
| DELETE | `/api/documents/:id/share/:userId` | Bearer | Remove collaborator |
| PUT | `/api/documents/:id/public` | Bearer | Toggle public access |
| GET | `/api/documents/share/:shareId` | Optional | Resolve public share link |
| POST | `/api/documents/:id/versions` | Bearer | Save version snapshot |
| POST | `/api/documents/:id/restore/:versionId` | Bearer | Restore version |

### Socket.io Events

**Client → Server:**

| Event | Payload | Description |
|-------|---------|-------------|
| `join-document` | `{ documentId }` | Join document room |
| `send-changes` | `{ documentId, delta }` | Broadcast editor delta |
| `title-change` | `{ documentId, title }` | Broadcast title change |
| `cursor-move` | `{ documentId, range }` | Broadcast cursor position |
| `save-document` | `{ documentId, content }` | Persist content to DB |

**Server → Client:**

| Event | Payload | Description |
|-------|---------|-------------|
| `load-document` | `{ content, title, permission }` | Initial document load |
| `receive-changes` | `{ delta, socketId }` | Remote editor changes |
| `title-updated` | `{ title, socketId }` | Remote title change |
| `active-users` | `[userInfo, ...]` | Current room users |
| `cursor-update` | `{ socketId, range, user }` | Remote cursor |
| `request-save` | `{ documentId }` | Trigger client-side save |
| `document-saved` | `{ savedAt }` | Confirm save |
| `user-left` | `{ socketId }` | User disconnected |
| `error` | `{ message }` | Socket error |

---

## ☁️ Cloud Deployment

### Backend → Render

1. Push `server/` to GitHub
2. New Web Service on [render.com](https://render.com)
3. Build command: `npm install`
4. Start command: `node server.js`
5. Add environment variables from `server/.env`
6. Set `CLIENT_URL` to your Vercel frontend URL

### Frontend → Vercel

1. Push `client/` to GitHub
2. New Project on [vercel.com](https://vercel.com)
3. Framework preset: **Vite**
4. Add environment variables:
   - `VITE_API_URL` = your Render backend URL
   - `VITE_SOCKET_URL` = your Render backend URL
5. Deploy

### Database → MongoDB Atlas

- Already cloud-hosted; just ensure your Render server's IP is whitelisted (or use `0.0.0.0/0`)

---

## 🗄 Database Schema

### User
```js
{
  name: String,
  email: String (unique),
  password: String (bcrypt hashed, never returned),
  avatar: String (auto-generated URL),
  createdAt, updatedAt
}
```

### Document
```js
{
  title: String,
  content: Mixed (TipTap JSON),
  owner: ObjectId → User,
  collaborators: [{ user: ObjectId, permission: 'view'|'edit' }],
  shareId: String (UUID, unique),
  isPublic: Boolean,
  publicPermission: 'view'|'edit'|'none',
  versionHistory: [{ content, savedAt, savedBy, label }],  // max 50
  lastEditedBy: ObjectId → User,
  createdAt, updatedAt
}
```

---

## 🖥 Expected UI

- **Landing page** — Dark theme with accent indigo, feature grid, CTA buttons
- **Login/Register** — Centered cards with glass morphism effect
- **Dashboard** — Grid of document cards, owned/shared tabs, search bar, delete confirmation
- **Editor** — Full-height page layout, sticky toolbar (bold/italic/headings/lists/links/etc.), title editable inline, real-time save indicator (cloud icon), active user avatars, Share + History buttons
- **Share dialog** — Modal to invite by email, toggle public access, copy share link
- **Version history** — Slide-in panel with timestamped snapshots and one-click restore

---

## 🛡 Security Notes

- Passwords hashed with bcrypt (12 rounds)
- JWT tokens expire in 7 days
- Rate limiting: 200 req/15min general, 20 req/hour on auth routes
- Socket.io connections authenticated via JWT in handshake
- Document access checked server-side on every request and socket event
- MongoDB injection protected by Mongoose schema validation
