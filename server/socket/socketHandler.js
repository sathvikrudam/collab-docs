const Document = require('../models/Document');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Track active users per document: { docId: { socketId: { userId, name, color } } }
const activeDocuments = new Map();

// Color palette for user cursors
const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
];

let colorIndex = 0;
const getNextColor = () => {
  const color = COLORS[colorIndex % COLORS.length];
  colorIndex++;
  return color;
};

// Debounce map for auto-save: { docId: timeout }
const saveTimers = new Map();

const AUTO_SAVE_DELAY = 3000; // 3 seconds

const initSocket = (io) => {
  // Authentication middleware for socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = await User.findById(decoded.id);
      }
      next();
    } catch (err) {
      // Allow unauthenticated connections (for public docs)
      next();
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id} (user: ${socket.user?.name || 'anonymous'})`);

    // ─── JOIN DOCUMENT ───────────────────────────────────────────
    socket.on('join-document', async ({ documentId }) => {
      try {
        const doc = await Document.findById(documentId)
          .populate('owner', 'name email')
          .populate('collaborators.user', 'name email');

        if (!doc) {
          socket.emit('error', { message: 'Document not found' });
          return;
        }

        // Check access
        const userId = socket.user?._id;
        const isOwner = userId && doc.owner._id.toString() === userId.toString();
        const collab = userId && doc.collaborators.find(
          (c) => c.user._id.toString() === userId.toString()
        );
        const hasPublicAccess = doc.isPublic && doc.publicPermission !== 'none';

        if (!isOwner && !collab && !hasPublicAccess) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        let permission = 'view';
        if (isOwner) permission = 'owner';
        else if (collab) permission = collab.permission;
        else if (hasPublicAccess) permission = doc.publicPermission;

        // Join room
        socket.join(documentId);
        socket.currentDocId = documentId;

        // Track active user
        if (!activeDocuments.has(documentId)) {
          activeDocuments.set(documentId, new Map());
        }

        const userInfo = {
          socketId: socket.id,
          userId: socket.user?._id?.toString() || socket.id,
          name: socket.user?.name || 'Anonymous',
          color: getNextColor(),
          permission,
          cursor: null,
        };

        activeDocuments.get(documentId).set(socket.id, userInfo);

        // Send document to joiner
        socket.emit('load-document', {
          content: doc.content,
          title: doc.title,
          permission,
        });

        // Notify others
        const activeUsers = Array.from(activeDocuments.get(documentId).values());
        io.to(documentId).emit('active-users', activeUsers);

        console.log(`📄 ${userInfo.name} joined document ${documentId}`);
      } catch (err) {
        console.error('join-document error:', err);
        socket.emit('error', { message: 'Failed to load document' });
      }
    });

    // ─── SEND CHANGES ─────────────────────────────────────────────
    socket.on('send-changes', ({ documentId, delta }) => {
      if (!documentId || !delta) return;
      // Broadcast delta to all other users in the room
      socket.to(documentId).emit('receive-changes', { delta, socketId: socket.id });

      // Auto-save with debounce
      scheduleAutoSave(documentId, socket);
    });

    // ─── TITLE CHANGE ─────────────────────────────────────────────
    socket.on('title-change', async ({ documentId, title }) => {
      if (!documentId) return;
      socket.to(documentId).emit('title-updated', { title, socketId: socket.id });

      // Save title immediately
      try {
        await Document.findByIdAndUpdate(documentId, {
          title,
          lastEditedBy: socket.user?._id,
        });
      } catch (err) {
        console.error('title-change save error:', err);
      }
    });

    // ─── CURSOR POSITION ──────────────────────────────────────────
    socket.on('cursor-move', ({ documentId, range }) => {
      if (!documentId) return;
      const users = activeDocuments.get(documentId);
      if (users?.has(socket.id)) {
        users.get(socket.id).cursor = range;
        socket.to(documentId).emit('cursor-update', {
          socketId: socket.id,
          range,
          user: users.get(socket.id),
        });
      }
    });

    // ─── SAVE DOCUMENT ────────────────────────────────────────────
    socket.on('save-document', async ({ documentId, content }) => {
      if (!documentId || !content) return;
      try {
        await Document.findByIdAndUpdate(documentId, {
          content,
          lastEditedBy: socket.user?._id,
          updatedAt: new Date(),
        });
        socket.emit('document-saved', { savedAt: new Date() });
      } catch (err) {
        console.error('save-document error:', err);
      }
    });

    // ─── DISCONNECT ───────────────────────────────────────────────
    socket.on('disconnect', () => {
      const docId = socket.currentDocId;
      if (docId) {
        const users = activeDocuments.get(docId);
        if (users) {
          users.delete(socket.id);
          if (users.size === 0) {
            activeDocuments.delete(docId);
          } else {
            io.to(docId).emit('active-users', Array.from(users.values()));
          }
        }
        io.to(docId).emit('user-left', { socketId: socket.id });
      }
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  async function scheduleAutoSave(documentId, socket) {
    if (saveTimers.has(documentId)) {
      clearTimeout(saveTimers.get(documentId));
    }
    const timer = setTimeout(async () => {
      saveTimers.delete(documentId);
      // Signal clients to send their current content for saving
      io.to(documentId).emit('request-save', { documentId });
    }, AUTO_SAVE_DELAY);
    saveTimers.set(documentId, timer);
  }
};

module.exports = initSocket;
