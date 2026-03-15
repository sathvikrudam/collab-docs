import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { io } from 'socket.io-client';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import EditorToolbar from '../components/editor/EditorToolbar';
import ShareDialog from '../components/editor/ShareDialog';
import VersionHistory from '../components/editor/VersionHistory';
import ActiveUsers from '../components/editor/ActiveUsers';
import {
  ArrowLeft, Share2, History, Cloud, CloudOff, Loader2, Save
} from 'lucide-react';
import toast from 'react-hot-toast';

const SAVE_INTERVAL = 30000;
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export default function DocumentPage() {

  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [doc, setDoc] = useState(null);
  const [permission, setPermission] = useState('view');
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [activeUsers, setActiveUsers] = useState([]);
  const [showShare, setShowShare] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [connected, setConnected] = useState(false);

  const socketRef = useRef(null);
  const titleRef = useRef('');
  const saveTimerRef = useRef(null);
  const isRemoteChange = useRef(false);

  const canEdit = permission === 'owner' || permission === 'edit';

  // ⭐ DOWNLOAD FUNCTIONS ADDED
  const downloadDOC = () => {
    const content = document.querySelector(".tiptap-editor")?.innerText || "";

    const blob = new Blob([content], { type: "application/msword" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${doc?.title || "document"}.doc`;
    link.click();
  };

  const downloadPDF = () => {
    const content = document.querySelector(".tiptap-editor")?.innerText || "";

    const blob = new Blob([content], { type: "application/pdf" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${doc?.title || "document"}.pdf`;
    link.click();
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: 'Start writing your document…' }),
      CharacterCount,
    ],
    editable: false,
    onUpdate: ({ editor }) => {
      if (isRemoteChange.current) return;
      setSaveStatus('unsaved');
      const content = editor.getJSON();
      if (socketRef.current?.connected) {
        socketRef.current.emit('send-changes', { documentId: id, delta: content });
      }
      scheduleAutoSave(content);
    },
    editorProps: {
      attributes: { class: 'tiptap-editor' },
    },
  });

  useEffect(() => {
    const loadDoc = async () => {
      try {
        const { data } = await api.get(`/api/documents/${id}`);
        setDoc(data.document);
        setPermission(data.permission);
        titleRef.current = data.document.title;
      } catch (err) {
        toast.error(err.response?.data?.message || 'Could not load document');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    loadDoc();
  }, [id]);

  useEffect(() => {

    if (!id) return;

    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join-document', { documentId: id });
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('load-document', ({ content, title, permission: perm }) => {
      setPermission(perm);
      if (editor && content) {
        isRemoteChange.current = true;
        editor.commands.setContent(content);
        isRemoteChange.current = false;
      }
      if (perm === 'owner' || perm === 'edit') {
        editor?.setEditable(true);
      }
    });

    socket.on('receive-changes', ({ delta }) => {
      if (!editor || !delta) return;
      isRemoteChange.current = true;
      const { from, to } = editor.state.selection;
      editor.commands.setContent(delta, false);
      try { editor.commands.setTextSelection({ from, to }); } catch {}
      isRemoteChange.current = false;
    });

    socket.on('title-updated', ({ title }) => {
      setDoc((prev) => prev ? { ...prev, title } : prev);
      titleRef.current = title;
    });

    socket.on('active-users', (users) => setActiveUsers(users));

    socket.on('request-save', ({ documentId }) => {
      if (documentId === id && editor) {
        const content = editor.getJSON();
        socket.emit('save-document', { documentId, content });
        setSaveStatus('saved');
      }
    });

    socket.on('document-saved', () => setSaveStatus('saved'));

    socket.on('error', ({ message }) => toast.error(message));

    return () => {
      socket.disconnect();
      clearTimeout(saveTimerRef.current);
    };

  }, [id, token, editor]);

  useEffect(() => {
    if (editor && canEdit) editor.setEditable(true);
    else if (editor) editor.setEditable(false);
  }, [editor, canEdit]);

  const scheduleAutoSave = useCallback((content) => {
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveContent(content), 5000);
  }, [id]);

  const saveContent = useCallback(async (content) => {
    if (!canEdit) return;
    setSaveStatus('saving');
    try {
      const currentContent = content || editor?.getJSON();
      await api.put(`/api/documents/${id}`, { content: currentContent });
      setSaveStatus('saved');
    } catch {
      setSaveStatus('unsaved');
    }
  }, [id, canEdit, editor]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (saveStatus === 'unsaved') saveContent();
    }, SAVE_INTERVAL);
    return () => clearInterval(interval);
  }, [saveStatus, saveContent]);

  const handleTitleChange = (e) => {
    const title = e.target.value;
    setDoc((prev) => ({ ...prev, title }));
    socketRef.current?.emit('title-change', { documentId: id, title });
  };

  const handleManualSave = async () => {
    await saveContent();
    toast.success('Saved!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-ink-900">

      <header className="sticky top-0 z-30 bg-ink-900/90 backdrop-blur border-b border-ink-800/60">

        <div className="flex items-center gap-3 px-4 py-2">

          <button onClick={() => navigate('/dashboard')} className="p-1.5 text-ink-400 hover:text-white transition-colors rounded-lg hover:bg-ink-800">
            <ArrowLeft size={16} />
          </button>

          <input
            className="flex-1 bg-transparent border-none outline-none text-white font-medium text-sm placeholder:text-ink-500 min-w-0"
            value={doc?.title || ''}
            onChange={handleTitleChange}
            placeholder="Untitled Document"
            disabled={!canEdit}
            maxLength={200}
          />

          <div className="flex items-center gap-2 shrink-0">

            <span className={`flex items-center gap-1.5 text-xs ${
              saveStatus === 'saved' ? 'text-success' :
              saveStatus === 'saving' ? 'text-ink-400' : 'text-warning'
            }`}>

              {saveStatus === 'saving' && <Loader2 size={11} className="animate-spin" />}
              {saveStatus === 'saved' && <Cloud size={11} />}
              {saveStatus === 'unsaved' && <CloudOff size={11} />}

              <span className="hidden sm:inline">
                {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving…' : 'Unsaved'}
              </span>

            </span>

            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-success' : 'bg-danger'}`} />

            <ActiveUsers users={activeUsers} />

            {/* ⭐ DOWNLOAD BUTTONS ADDED */}
            <button onClick={downloadPDF} className="btn-ghost px-3 py-1.5 text-xs hidden sm:flex">
              Download PDF
            </button>

            <button onClick={downloadDOC} className="btn-ghost px-3 py-1.5 text-xs hidden sm:flex">
              Download DOC
            </button>

            {canEdit && (
              <button onClick={handleManualSave} className="btn-ghost px-3 py-1.5 text-xs hidden sm:flex">
                <Save size={13} /> Save
              </button>
            )}

            <button onClick={() => setShowHistory(true)} className="btn-ghost px-3 py-1.5 text-xs">
              <History size={13} />
              <span className="hidden sm:inline">History</span>
            </button>

            {permission === 'owner' && (
              <button onClick={() => setShowShare(true)} className="btn-primary px-3 py-1.5 text-xs">
                <Share2 size={13} /> Share
              </button>
            )}

          </div>

        </div>

        {canEdit && editor && <EditorToolbar editor={editor} />}

      </header>

      <main className="flex-1 flex flex-col items-center py-6 px-4" onClick={() => editor?.commands.focus()}>

        <div className="editor-page w-full max-w-4xl rounded-xl overflow-hidden shadow-2xl" style={{minHeight: "calc(100vh - 130px)"}}>
          <EditorContent editor={editor} />
        </div>

        {!canEdit && (
          <div className="mt-4 px-4 py-2 bg-ink-800/60 border border-ink-700 rounded-full text-ink-400 text-xs flex items-center gap-2">
            <span>👁</span> View only — you don't have edit access
          </div>
        )}

      </main>

      {showShare && (
        <ShareDialog docId={id} doc={doc} onClose={() => setShowShare(false)} />
      )}

      {showHistory && (
        <VersionHistory
          docId={id}
          onClose={() => setShowHistory(false)}
          onRestore={(content) => {
            isRemoteChange.current = true;
            editor?.commands.setContent(content);
            isRemoteChange.current = false;
            toast.success('Version restored');
            setShowHistory(false);
          }}
        />
      )}

    </div>
  );
}
