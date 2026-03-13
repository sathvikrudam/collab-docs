import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, Eye, EyeOff, Loader2, WifiOff, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const STATUS = { CHECKING: 'checking', WAKING: 'waking', READY: 'ready', FAILED: 'failed' };

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState(STATUS.CHECKING);
  const [wakeProgress, setWakeProgress] = useState(0);
  const [wakeSeconds, setWakeSeconds] = useState(0);
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let progressInterval = null;
    let attempts = 0;

    const pingServer = async () => {
      try {
        const res = await fetch(`${API_URL}/api/health`, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          setServerStatus(STATUS.READY);
          setWakeProgress(100);
          clearInterval(progressInterval);
          return true;
        }
      } catch (_) {}
      return false;
    };

    const startWakeup = async () => {
      const ready = await pingServer();
      if (ready) return;
      setServerStatus(STATUS.WAKING);
      setWakeProgress(5);
      let elapsed = 0;
      progressInterval = setInterval(async () => {
        elapsed += 3;
        attempts++;
        setWakeSeconds(elapsed);
        setWakeProgress((prev) => Math.min(prev + Math.random() * 8, 90));
        const isReady = await pingServer();
        if (isReady || attempts >= 20) {
          clearInterval(progressInterval);
          if (!isReady) setServerStatus(STATUS.FAILED);
        }
      }, 3000);
    };

    startWakeup();
    return () => { if (progressInterval) clearInterval(progressInterval); };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) return toast.error('Fill in all fields');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    if (form.password !== form.confirm) return toast.error('Passwords do not match');
    if (serverStatus === STATUS.WAKING || serverStatus === STATUS.CHECKING)
      return toast('Server is still waking up, please wait...', { icon: '⏳' });
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      toast.success('Account created!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const field = (key, label, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-xs font-medium text-ink-300 mb-1.5">{label}</label>
      <input type={type} className="input" placeholder={placeholder}
        value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-slide-up">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 bg-accent rounded-xl flex items-center justify-center shadow-lg shadow-accent/30">
            <FileText size={18} className="text-white" />
          </div>
          <span className="font-display font-semibold text-xl text-white">CollabDocs</span>
        </div>

        {/* Server banner */}
        {serverStatus === STATUS.CHECKING && (
          <div className="mb-4 px-4 py-3 bg-ink-800/80 border border-ink-700 rounded-xl flex items-center gap-3">
            <Loader2 size={15} className="animate-spin text-accent shrink-0" />
            <div>
              <p className="text-white text-xs font-medium">Connecting to server...</p>
              <p className="text-ink-500 text-xs">Just a moment</p>
            </div>
          </div>
        )}

        {serverStatus === STATUS.WAKING && (
          <div className="mb-4 px-4 py-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <Loader2 size={15} className="animate-spin text-yellow-400 shrink-0" />
              <div className="flex-1">
                <p className="text-white text-xs font-medium">Waking up server...</p>
                <p className="text-ink-400 text-xs">{wakeSeconds}s elapsed — usually 30–50 seconds ☕</p>
              </div>
            </div>
            <div className="w-full bg-ink-700 rounded-full h-1.5 mt-1">
              <div className="bg-yellow-400 h-1.5 rounded-full transition-all duration-700" style={{ width: `${wakeProgress}%` }} />
            </div>
            <p className="text-ink-500 text-xs mt-2 text-center">Create account button unlocks automatically</p>
          </div>
        )}

        {serverStatus === STATUS.READY && (
          <div className="mb-4 px-4 py-2.5 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-2">
            <CheckCircle size={14} className="text-green-400 shrink-0" />
            <p className="text-green-400 text-xs font-medium">Server is ready — you can create your account!</p>
          </div>
        )}

        {serverStatus === STATUS.FAILED && (
          <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <WifiOff size={14} className="text-red-400 shrink-0" />
              <p className="text-red-400 text-xs font-medium">Could not reach server</p>
            </div>
            <button onClick={() => window.location.reload()}
              className="w-full py-1.5 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all">
              Try again
            </button>
          </div>
        )}

        {/* Card */}
        <div className="card p-8">
          <h1 className="font-display text-2xl font-semibold text-white mb-1">Create account</h1>
          <p className="text-ink-400 text-sm mb-7">Start collaborating in seconds</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {field('name', 'Full name', 'text', 'Your name')}
            {field('email', 'Email', 'email', 'you@example.com')}
            <div>
              <label className="block text-xs font-medium text-ink-300 mb-1.5">Password</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} className="input pr-10" placeholder="Min. 6 characters"
                  value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-200 transition-colors">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            {field('confirm', 'Confirm password', 'password', 'Repeat password')}

            <button type="submit" className="btn-primary w-full py-2.5 mt-2"
              disabled={loading || serverStatus === STATUS.WAKING || serverStatus === STATUS.CHECKING}>
              {loading ? <><Loader2 size={16} className="animate-spin" /> Creating account…</>
               : serverStatus === STATUS.WAKING ? <><Loader2 size={16} className="animate-spin" /> Waiting for server…</>
               : serverStatus === STATUS.CHECKING ? <><Loader2 size={16} className="animate-spin" /> Connecting…</>
               : 'Create account'}
            </button>
          </form>

          <p className="text-center text-ink-400 text-sm mt-6">
            Have an account?{' '}
            <Link to="/login" className="text-accent hover:text-accent-light transition-colors font-medium">Sign in</Link>
          </p>
        </div>

        {/* Status dot */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <span className={`w-2 h-2 rounded-full ${serverStatus === STATUS.READY ? 'bg-green-400' : serverStatus === STATUS.FAILED ? 'bg-red-400' : 'bg-yellow-400 animate-pulse'}`} />
          <span className="text-ink-600 text-xs">
            {serverStatus === STATUS.READY ? 'Server online' : serverStatus === STATUS.FAILED ? 'Server offline' : serverStatus === STATUS.WAKING ? `Waking up... ${wakeSeconds}s` : 'Checking server...'}
          </span>
        </div>

      </div>
    </div>
  );
}
