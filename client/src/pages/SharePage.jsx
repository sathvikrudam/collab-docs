import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Loader2, FileText, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SharePage() {
  const { shareId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const resolve = async () => {
      try {
        const { data } = await api.get(`/api/documents/share/${shareId}`);
        // Redirect to actual document page
        navigate(`/document/${data.document._id}`, { replace: true });
      } catch (err) {
        setError(err.response?.data?.message || 'Document not found or not accessible');
        setLoading(false);
      }
    };
    resolve();
  }, [shareId]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 size={28} className="animate-spin text-accent" />
        <p className="text-ink-400 text-sm">Opening shared document…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card p-8 max-w-sm w-full text-center">
        <div className="w-12 h-12 bg-danger/10 rounded-xl flex items-center justify-center mx-auto mb-4">
          <FileText size={22} className="text-danger" />
        </div>
        <h2 className="font-display text-xl font-semibold text-white mb-2">Access denied</h2>
        <p className="text-ink-400 text-sm mb-6">{error}</p>
        {!user ? (
          <Link to="/login" className="btn-primary w-full justify-center">
            <LogIn size={15} /> Sign in to access
          </Link>
        ) : (
          <Link to="/dashboard" className="btn-ghost w-full justify-center">
            Back to dashboard
          </Link>
        )}
      </div>
    </div>
  );
}
