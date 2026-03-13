import { useState, useEffect } from 'react';
import { X, Search, UserPlus, Link2, Copy, Check, Loader2, Globe, Lock, Trash2 } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function ShareDialog({ docId, doc, onClose }) {
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState('edit');
  const [sharing, setSharing] = useState(false);
  const [collaborators, setCollaborators] = useState(doc?.collaborators || []);
  const [isPublic, setIsPublic] = useState(doc?.isPublic || false);
  const [publicPerm, setPublicPerm] = useState(doc?.publicPermission || 'view');
  const [copied, setCopied] = useState(false);
  const [removing, setRemoving] = useState(null);

  const shareUrl = `${window.location.origin}/share/${doc?.shareId}`;

  const handleShare = async () => {
    if (!email.trim()) return toast.error('Enter an email address');
    setSharing(true);
    try {
      const { data } = await api.post(`/api/documents/${docId}/share`, { email: email.trim(), permission });
      setCollaborators(data.collaborators);
      setEmail('');
      toast.success('Document shared!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not share document');
    } finally {
      setSharing(false);
    }
  };

  const handleRemove = async (userId) => {
    setRemoving(userId);
    try {
      await api.delete(`/api/documents/${docId}/share/${userId}`);
      setCollaborators((prev) => prev.filter((c) => c.user._id !== userId));
      toast.success('Collaborator removed');
    } catch {
      toast.error('Failed to remove collaborator');
    } finally {
      setRemoving(null);
    }
  };

  const handlePublicToggle = async () => {
    const next = !isPublic;
    try {
      await api.put(`/api/documents/${docId}/public`, { isPublic: next, publicPermission: publicPerm });
      setIsPublic(next);
      toast.success(next ? 'Document is now public' : 'Document is now private');
    } catch {
      toast.error('Failed to update sharing settings');
    }
  };

  const handlePublicPermChange = async (perm) => {
    setPublicPerm(perm);
    try {
      await api.put(`/api/documents/${docId}/public`, { isPublic, publicPermission: perm });
    } catch {
      toast.error('Failed to update permission');
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Link copied!');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-md animate-slide-up shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-ink-700/50">
          <h2 className="font-display font-semibold text-white">Share document</h2>
          <button onClick={onClose} className="p-1.5 text-ink-400 hover:text-white rounded-lg hover:bg-ink-700 transition-all">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Add collaborator */}
          <div>
            <label className="block text-xs font-medium text-ink-300 mb-2">Invite by email</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  className="input pr-3"
                  placeholder="colleague@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleShare()}
                  type="email"
                />
              </div>
              <select
                value={permission}
                onChange={(e) => setPermission(e.target.value)}
                className="input w-24 px-2"
              >
                <option value="edit">Edit</option>
                <option value="view">View</option>
              </select>
              <button onClick={handleShare} disabled={sharing} className="btn-primary px-3">
                {sharing ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
              </button>
            </div>
          </div>

          {/* Current collaborators */}
          {collaborators.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-ink-300 mb-2">
                Collaborators ({collaborators.length})
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {collaborators.map((c) => (
                  <div key={c.user._id} className="flex items-center gap-3 px-3 py-2 bg-ink-800/50 rounded-lg">
                    <img
                      src={c.user.avatar || `https://ui-avatars.com/api/?name=${c.user.name}&background=random`}
                      alt={c.user.name}
                      className="w-7 h-7 rounded-full shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{c.user.name}</p>
                      <p className="text-xs text-ink-500 truncate">{c.user.email}</p>
                    </div>
                    <span className={`badge ${c.permission === 'edit' ? 'bg-accent/10 text-accent' : 'bg-ink-700 text-ink-400'}`}>
                      {c.permission}
                    </span>
                    <button
                      onClick={() => handleRemove(c.user._id)}
                      disabled={removing === c.user._id}
                      className="p-1 text-ink-500 hover:text-danger rounded transition-colors"
                    >
                      {removing === c.user._id
                        ? <Loader2 size={12} className="animate-spin" />
                        : <Trash2 size={12} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Public access */}
          <div className="border border-ink-700/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {isPublic ? <Globe size={14} className="text-accent" /> : <Lock size={14} className="text-ink-400" />}
                <span className="text-sm font-medium text-white">Public access</span>
              </div>
              <button
                onClick={handlePublicToggle}
                className={`w-11 h-6 rounded-full transition-all duration-200 relative ${isPublic ? 'bg-accent' : 'bg-ink-700'}`}
              >
                <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${isPublic ? 'translate-x-5' : ''}`} />
              </button>
            </div>
            {isPublic && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  {['view', 'edit'].map((p) => (
                    <button
                      key={p}
                      onClick={() => handlePublicPermChange(p)}
                      className={`flex-1 py-1.5 text-xs rounded-lg border transition-all ${
                        publicPerm === p ? 'border-accent bg-accent/10 text-accent' : 'border-ink-700 text-ink-400 hover:border-ink-600'
                      }`}
                    >
                      {p === 'view' ? '👁 View only' : '✏️ Can edit'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Copy link */}
          <div>
            <label className="block text-xs font-medium text-ink-300 mb-2">Share link</label>
            <div className="flex gap-2">
              <div className="flex-1 input text-xs text-ink-400 truncate flex items-center">
                {shareUrl}
              </div>
              <button onClick={copyLink} className="btn-ghost px-3">
                {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
