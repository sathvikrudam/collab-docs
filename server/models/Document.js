const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const versionSchema = new mongoose.Schema({
  content: { type: mongoose.Schema.Types.Mixed, default: {} },
  savedAt: { type: Date, default: Date.now },
  savedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  label: { type: String, default: '' },
});

const collaboratorSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  permission: {
    type: String,
    enum: ['view', 'edit'],
    default: 'view',
  },
  addedAt: { type: Date, default: Date.now },
});

const documentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: 'Untitled Document',
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    content: {
      type: mongoose.Schema.Types.Mixed,
      default: { ops: [] },
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    collaborators: [collaboratorSchema],
    shareId: {
      type: String,
      default: () => uuidv4(),
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    publicPermission: {
      type: String,
      enum: ['view', 'edit', 'none'],
      default: 'none',
    },
    versionHistory: {
      type: [versionSchema],
      default: [],
    },
    lastEditedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast queries
documentSchema.index({ owner: 1, updatedAt: -1 });
documentSchema.index({ 'collaborators.user': 1 });
documentSchema.index({ shareId: 1 });

// Virtual: number of collaborators
documentSchema.virtual('collaboratorCount').get(function () {
  return this.collaborators.length;
});

// Method: check if a user has access
documentSchema.methods.hasAccess = function (userId, requiredPermission = 'view') {
  if (this.owner.toString() === userId.toString()) return true;
  if (this.isPublic && this.publicPermission !== 'none') {
    if (requiredPermission === 'view') return true;
    if (requiredPermission === 'edit' && this.publicPermission === 'edit') return true;
  }
  const collab = this.collaborators.find(
    (c) => c.user.toString() === userId.toString()
  );
  if (!collab) return false;
  if (requiredPermission === 'view') return true;
  return collab.permission === 'edit';
};

// Method: save a version snapshot
documentSchema.methods.saveVersion = function (userId, label = '') {
  this.versionHistory.push({
    content: JSON.parse(JSON.stringify(this.content)),
    savedBy: userId,
    label: label || `Version ${this.versionHistory.length + 1}`,
  });
  // Keep only last 50 versions
  if (this.versionHistory.length > 50) {
    this.versionHistory = this.versionHistory.slice(-50);
  }
};

module.exports = mongoose.model('Document', documentSchema);
