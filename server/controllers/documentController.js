const Document = require('../models/Document');
const User = require('../models/User');

// @desc  Get all documents for current user
// @route GET /api/documents
// @access Private
const getDocuments = async (req, res) => {
  try {
    const ownedDocs = await Document.find({ owner: req.user._id })
      .select('title owner collaborators createdAt updatedAt lastEditedBy')
      .populate('owner', 'name email avatar')
      .populate('lastEditedBy', 'name')
      .sort({ updatedAt: -1 });

    const sharedDocs = await Document.find({
      'collaborators.user': req.user._id,
      owner: { $ne: req.user._id },
    })
      .select('title owner collaborators createdAt updatedAt lastEditedBy')
      .populate('owner', 'name email avatar')
      .populate('lastEditedBy', 'name')
      .sort({ updatedAt: -1 });

    res.json({ owned: ownedDocs, shared: sharedDocs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Get a single document
// @route GET /api/documents/:id
// @access Private (with optional public access)
const getDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id)
      .populate('owner', 'name email avatar')
      .populate('collaborators.user', 'name email avatar')
      .populate('lastEditedBy', 'name')
      .populate('versionHistory.savedBy', 'name');

    if (!doc) return res.status(404).json({ message: 'Document not found' });

    const userId = req.user?._id;
    const isOwner = userId && doc.owner._id.toString() === userId.toString();
    const collab = userId && doc.collaborators.find(
      (c) => c.user._id.toString() === userId.toString()
    );
    const hasPublicAccess = doc.isPublic && doc.publicPermission !== 'none';

    if (!isOwner && !collab && !hasPublicAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    let permission = 'view';
    if (isOwner) permission = 'owner';
    else if (collab) permission = collab.permission;
    else if (hasPublicAccess) permission = doc.publicPermission;

    res.json({ document: doc, permission });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Get document by shareId (public link)
// @route GET /api/documents/share/:shareId
// @access Public
const getDocumentByShareId = async (req, res) => {
  try {
    const doc = await Document.findOne({ shareId: req.params.shareId })
      .populate('owner', 'name email avatar')
      .populate('collaborators.user', 'name email avatar');

    if (!doc) return res.status(404).json({ message: 'Document not found' });

    // Check if user has access via share link
    const userId = req.user?._id;
    const isOwner = userId && doc.owner._id.toString() === userId.toString();
    const collab = userId && doc.collaborators.find(
      (c) => c.user._id.toString() === userId.toString()
    );

    if (!doc.isPublic && !isOwner && !collab) {
      return res.status(403).json({ message: 'This document is not shared publicly' });
    }

    let permission = doc.publicPermission || 'view';
    if (isOwner) permission = 'owner';
    else if (collab) permission = collab.permission;

    res.json({ document: doc, permission });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Create a document
// @route POST /api/documents
// @access Private
const createDocument = async (req, res) => {
  try {
    const { title } = req.body;
    const doc = await Document.create({
      title: title || 'Untitled Document',
      owner: req.user._id,
      content: { ops: [] },
    });

    await doc.populate('owner', 'name email avatar');
    res.status(201).json(doc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Update document title
// @route PUT /api/documents/:id
// @access Private
const updateDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    if (!doc.hasAccess(req.user._id, 'edit')) {
      return res.status(403).json({ message: 'No edit permission' });
    }

    const { title, content, saveVersion } = req.body;
    if (title !== undefined) doc.title = title;
    if (content !== undefined) {
      if (saveVersion) {
        doc.saveVersion(req.user._id);
      }
      doc.content = content;
    }
    doc.lastEditedBy = req.user._id;

    await doc.save();
    res.json(doc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Delete a document
// @route DELETE /api/documents/:id
// @access Private (owner only)
const deleteDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    if (doc.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the owner can delete this document' });
    }

    await doc.deleteOne();
    res.json({ message: 'Document deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Share document with user
// @route POST /api/documents/:id/share
// @access Private (owner only)
const shareDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    if (doc.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the owner can share this document' });
    }

    const { email, permission = 'view' } = req.body;
    const targetUser = await User.findOne({ email });

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found with that email' });
    }

    if (targetUser._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot share with yourself' });
    }

    // Update or add collaborator
    const existingIdx = doc.collaborators.findIndex(
      (c) => c.user.toString() === targetUser._id.toString()
    );

    if (existingIdx >= 0) {
      doc.collaborators[existingIdx].permission = permission;
    } else {
      doc.collaborators.push({ user: targetUser._id, permission });
    }

    await doc.save();
    await doc.populate('collaborators.user', 'name email avatar');

    res.json({ message: 'Document shared successfully', collaborators: doc.collaborators });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Remove collaborator
// @route DELETE /api/documents/:id/share/:userId
// @access Private (owner only)
const removeCollaborator = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    if (doc.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the owner can manage collaborators' });
    }

    doc.collaborators = doc.collaborators.filter(
      (c) => c.user.toString() !== req.params.userId
    );

    await doc.save();
    res.json({ message: 'Collaborator removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Toggle public sharing
// @route PUT /api/documents/:id/public
// @access Private (owner only)
const togglePublicShare = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    if (doc.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the owner can change sharing settings' });
    }

    const { isPublic, publicPermission } = req.body;
    doc.isPublic = isPublic !== undefined ? isPublic : doc.isPublic;
    doc.publicPermission = publicPermission || doc.publicPermission;

    await doc.save();
    res.json({ shareId: doc.shareId, isPublic: doc.isPublic, publicPermission: doc.publicPermission });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Restore a version
// @route POST /api/documents/:id/restore/:versionId
// @access Private
const restoreVersion = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    if (!doc.hasAccess(req.user._id, 'edit')) {
      return res.status(403).json({ message: 'No edit permission' });
    }

    const version = doc.versionHistory.id(req.params.versionId);
    if (!version) return res.status(404).json({ message: 'Version not found' });

    // Save current state as version first
    doc.saveVersion(req.user._id, 'Before restore');
    doc.content = version.content;
    doc.lastEditedBy = req.user._id;
    await doc.save();

    res.json({ message: 'Version restored', content: doc.content });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Save version snapshot manually
// @route POST /api/documents/:id/versions
// @access Private
const saveVersionSnapshot = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    if (!doc.hasAccess(req.user._id, 'edit')) {
      return res.status(403).json({ message: 'No edit permission' });
    }

    const { label } = req.body;
    doc.saveVersion(req.user._id, label);
    await doc.save();

    res.json({ message: 'Version saved', versions: doc.versionHistory });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getDocuments,
  getDocument,
  getDocumentByShareId,
  createDocument,
  updateDocument,
  deleteDocument,
  shareDocument,
  removeCollaborator,
  togglePublicShare,
  restoreVersion,
  saveVersionSnapshot,
};
