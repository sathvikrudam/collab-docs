const express = require('express');
const {
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
} = require('../controllers/documentController');
const { protect, optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, getDocuments);
router.get('/share/:shareId', optionalAuth, getDocumentByShareId);
router.get('/:id', optionalAuth, getDocument);
router.post('/', protect, createDocument);
router.put('/:id', protect, updateDocument);
router.delete('/:id', protect, deleteDocument);
router.post('/:id/share', protect, shareDocument);
router.delete('/:id/share/:userId', protect, removeCollaborator);
router.put('/:id/public', protect, togglePublicShare);
router.post('/:id/versions', protect, saveVersionSnapshot);
router.post('/:id/restore/:versionId', protect, restoreVersion);

module.exports = router;
