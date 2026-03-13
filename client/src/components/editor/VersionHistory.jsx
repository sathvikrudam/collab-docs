import { useState, useEffect } from 'react';
import { X, RotateCcw, Save, Loader2, Clock } from 'lucide-react';
import api from '../../utils/api';
import { formatDistanceToNow, format } from 'date-fns';
import toast from 'react-hot-toast';

export default function VersionHistory({ docId, onClose, onRestore }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(null);
  const [label, setLabel] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get(`/api/documents/${docId}`);
        setVersions(data.document.versionHistory || []);
      } catch {
        toast.error('Could not load version history');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [docId]);

  const handleSaveVersion = async () => {
    setSaving(true);
    try {
      const { data } = await api.post(`/api/documents/${docId}/versions`, { label });
      setVersions(data.versions || []);
      setLabel('');
      toast.success('Version snapshot saved');
    } catch {
      toast.error('Failed to save version');
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async (version) => {
    setRestoring(version._id);
    try {
      const { data } = await api.post(`/api/documents/${docId}/restore/${version._id}`);
      onRestore(data.content);
    } catch {
      toast.error('Failed to restore version');
      setRestoring(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-md animate-slide-up shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-ink-700/50 shrink-0">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-accent" />
            <h2 className="font-display font-semibold text-white">Version history</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-ink-400 hover:text-white rounded-lg hover:bg-ink-700 transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Save version */}
        <div className="p-4 border-b border-ink-700/30 shrink-0">
          <div className="flex gap-2">
            <input
              className="input text-sm flex-1"
              placeholder="Version label (optional)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveVersion()}
            />
            <button onClick={handleSaveVersion} disabled={saving} className="btn-primary px-3">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            </button>
          </div>
        </div>

        {/* Version list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={20} className="animate-spin text-accent" />
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-10 h-10 bg-ink-800 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Clock size={18} className="text-ink-500" />
              </div>
              <p className="text-ink-400 text-sm">No saved versions yet</p>
              <p className="text-ink-600 text-xs mt-1">Save a snapshot above to begin tracking history</p>
            </div>
          ) : (
            [...versions].reverse().map((v, i) => (
              <div key={v._id} className="flex items-center gap-3 p-3 bg-ink-800/50 hover:bg-ink-800 rounded-xl transition-colors group">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">
                    {v.label || `Version ${versions.length - i}`}
                  </p>
                  <p className="text-xs text-ink-500 mt-0.5 flex items-center gap-1.5">
                    <span>{formatDistanceToNow(new Date(v.savedAt), { addSuffix: true })}</span>
                    {v.savedBy?.name && (
                      <>
                        <span className="w-0.5 h-0.5 bg-ink-600 rounded-full" />
                        <span>{v.savedBy.name}</span>
                      </>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => handleRestore(v)}
                  disabled={!!restoring}
                  className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-3 py-1.5 text-xs bg-accent/10 hover:bg-accent/20 text-accent rounded-lg transition-all"
                >
                  {restoring === v._id
                    ? <Loader2 size={12} className="animate-spin" />
                    : <RotateCcw size={12} />}
                  Restore
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
