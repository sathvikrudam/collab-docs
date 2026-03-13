import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Trash2, Users, Clock, LogOut, Search, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDocuments } from '../hooks/useDocuments';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const { documents, loading, fetchDocuments, createDocument, deleteDocument } = useDocuments();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [tab, setTab] = useState('owned');

  useEffect(() => { fetchDocuments(); }, []);

  const handleCreate = async () => {
    setCreating(true);
    const doc = await createDocument();
    if (doc) navigate(`/document/${doc._id}`);
    setCreating(false);
  };

  const handleDelete = async (id) => {
    await deleteDocument(id);
    setDeleteTarget(null);
  };

  const filter = (list) =>
    list.filter((d) =>
      d.title.toLowerCase().includes(search.toLowerCase())
    );

  const currentDocs = tab === 'owned' ? filter(documents.owned) : filter(documents.shared);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-ink-900/80 backdrop-blur border-b border-ink-800/60 px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center">
              <FileText size={14} className="text-white" />
            </div>
            <span className="font-display font-semibold text-white">CollabDocs</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <img src={user?.avatar} alt={user?.name} className="w-7 h-7 rounded-full ring-2 ring-ink-700" />
              <span className="text-sm text-ink-300 hidden sm:block">{user?.name}</span>
            </div>
            <button onClick={logout} className="p-1.5 text-ink-400 hover:text-white transition-colors rounded-lg hover:bg-ink-800" title="Sign out">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-semibold text-white">My Documents</h1>
            <p className="text-ink-400 text-sm mt-0.5">
              {documents.owned.length} owned · {documents.shared.length} shared
            </p>
          </div>
          <button onClick={handleCreate} disabled={creating} className="btn-primary">
            <Plus size={16} />
            {creating ? 'Creating…' : 'New document'}
          </button>
        </div>

        {/* Search + Tabs */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              className="input pl-9"
              placeholder="Search documents…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex bg-ink-800/60 border border-ink-700/50 rounded-lg p-0.5">
            {['owned', 'shared'].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 text-sm rounded-md transition-all font-medium ${
                  tab === t ? 'bg-ink-700 text-white' : 'text-ink-400 hover:text-white'
                }`}
              >
                {t === 'owned' ? 'My docs' : 'Shared with me'}
              </button>
            ))}
          </div>
        </div>

        {/* Document list */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card p-5 animate-pulse h-32" />
            ))}
          </div>
        ) : currentDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-ink-800 rounded-2xl flex items-center justify-center mb-4">
              <FileText size={24} className="text-ink-500" />
            </div>
            <h3 className="text-white font-medium mb-1">
              {search ? 'No matching documents' : tab === 'owned' ? 'No documents yet' : 'Nothing shared with you'}
            </h3>
            <p className="text-ink-500 text-sm mb-5">
              {!search && tab === 'owned' && 'Create your first document to get started'}
            </p>
            {!search && tab === 'owned' && (
              <button onClick={handleCreate} className="btn-primary">
                <Plus size={15} /> Create document
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
            {currentDocs.map((doc) => (
              <DocCard
                key={doc._id}
                doc={doc}
                isOwner={tab === 'owned'}
                onOpen={() => navigate(`/document/${doc._id}`)}
                onDelete={() => setDeleteTarget(doc)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card p-6 max-w-sm w-full animate-slide-up">
            <h3 className="font-semibold text-white mb-2">Delete document?</h3>
            <p className="text-ink-400 text-sm mb-5">
              "<span className="text-white">{deleteTarget.title}</span>" will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button className="btn-ghost flex-1" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn-danger flex-1" onClick={() => handleDelete(deleteTarget._id)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DocCard({ doc, isOwner, onOpen, onDelete }) {
  return (
    <div
      className="card p-5 cursor-pointer group hover:border-ink-600 hover:bg-ink-800/80 transition-all duration-200 flex flex-col gap-3"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between">
        <div className="w-9 h-9 bg-accent/10 rounded-lg flex items-center justify-center shrink-0">
          <FileText size={16} className="text-accent" />
        </div>
        {isOwner && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="opacity-0 group-hover:opacity-100 p-1.5 text-ink-500 hover:text-danger rounded-md hover:bg-danger/10 transition-all"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-white text-sm truncate mb-1">{doc.title || 'Untitled'}</h3>
        {!isOwner && doc.owner && (
          <p className="text-ink-500 text-xs truncate flex items-center gap-1">
            <Users size={10} /> {doc.owner.name}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1.5 text-ink-500 text-xs">
        <Clock size={11} />
        {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
      </div>
    </div>
  );
}
