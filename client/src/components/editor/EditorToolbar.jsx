import {
  Bold, Italic, Underline, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, CheckSquare,
  Quote, Code, Code2,
  AlignLeft, AlignCenter, AlignRight,
  Link2, Highlighter,
  Undo2, Redo2, Minus,
} from 'lucide-react';

const ToolbarButton = ({ onClick, active, disabled, title, children }) => (
  <button
    onMouseDown={(e) => { e.preventDefault(); onClick(); }}
    disabled={disabled}
    title={title}
    className={`p-1.5 rounded text-sm transition-all shrink-0 ${
      active
        ? 'bg-accent/20 text-accent'
        : 'text-ink-300 hover:bg-ink-700 hover:text-white'
    } disabled:opacity-30 disabled:cursor-not-allowed`}
  >
    {children}
  </button>
);

const Divider = () => <span className="w-px h-5 bg-ink-700 mx-0.5 shrink-0" />;

export default function EditorToolbar({ editor }) {
  if (!editor) return null;

  const setLink = () => {
    const url = window.prompt('Enter URL:', editor.getAttributes('link').href || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({ href: url, target: '_blank' }).run();
    }
  };

  const groups = [
    // History
    [
      { icon: <Undo2 size={14} />, action: () => editor.chain().focus().undo().run(), disabled: !editor.can().undo(), title: 'Undo' },
      { icon: <Redo2 size={14} />, action: () => editor.chain().focus().redo().run(), disabled: !editor.can().redo(), title: 'Redo' },
    ],
    // Headings
    [
      { icon: <Heading1 size={14} />, action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: editor.isActive('heading', { level: 1 }), title: 'H1' },
      { icon: <Heading2 size={14} />, action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading', { level: 2 }), title: 'H2' },
      { icon: <Heading3 size={14} />, action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive('heading', { level: 3 }), title: 'H3' },
    ],
    // Inline marks
    [
      { icon: <Bold size={14} />, action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold'), title: 'Bold' },
      { icon: <Italic size={14} />, action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic'), title: 'Italic' },
      { icon: <Underline size={14} />, action: () => editor.chain().focus().toggleUnderline().run(), active: editor.isActive('underline'), title: 'Underline' },
      { icon: <Strikethrough size={14} />, action: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive('strike'), title: 'Strikethrough' },
      { icon: <Highlighter size={14} />, action: () => editor.chain().focus().toggleHighlight().run(), active: editor.isActive('highlight'), title: 'Highlight' },
    ],
    // Alignment
    [
      { icon: <AlignLeft size={14} />, action: () => editor.chain().focus().setTextAlign('left').run(), active: editor.isActive({ textAlign: 'left' }), title: 'Left' },
      { icon: <AlignCenter size={14} />, action: () => editor.chain().focus().setTextAlign('center').run(), active: editor.isActive({ textAlign: 'center' }), title: 'Center' },
      { icon: <AlignRight size={14} />, action: () => editor.chain().focus().setTextAlign('right').run(), active: editor.isActive({ textAlign: 'right' }), title: 'Right' },
    ],
    // Lists
    [
      { icon: <List size={14} />, action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList'), title: 'Bullet list' },
      { icon: <ListOrdered size={14} />, action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive('orderedList'), title: 'Ordered list' },
      { icon: <CheckSquare size={14} />, action: () => editor.chain().focus().toggleTaskList().run(), active: editor.isActive('taskList'), title: 'Task list' },
    ],
    // Blocks
    [
      { icon: <Quote size={14} />, action: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive('blockquote'), title: 'Quote' },
      { icon: <Code size={14} />, action: () => editor.chain().focus().toggleCode().run(), active: editor.isActive('code'), title: 'Inline code' },
      { icon: <Code2 size={14} />, action: () => editor.chain().focus().toggleCodeBlock().run(), active: editor.isActive('codeBlock'), title: 'Code block' },
      { icon: <Link2 size={14} />, action: setLink, active: editor.isActive('link'), title: 'Link' },
      { icon: <Minus size={14} />, action: () => editor.chain().focus().setHorizontalRule().run(), title: 'Divider' },
    ],
  ];

  return (
    <div className="flex items-center gap-0.5 px-4 py-1.5 border-t border-ink-800/60 overflow-x-auto">
      {groups.map((group, gi) => (
        <div key={gi} className="flex items-center gap-0.5">
          {gi > 0 && <Divider />}
          {group.map((btn, bi) => (
            <ToolbarButton
              key={bi}
              onClick={btn.action}
              active={btn.active}
              disabled={btn.disabled}
              title={btn.title}
            >
              {btn.icon}
            </ToolbarButton>
          ))}
        </div>
      ))}

      {/* Character count */}
      <span className="ml-auto text-xs text-ink-600 shrink-0 pl-2">
        {editor.storage.characterCount?.characters()} chars
      </span>
    </div>
  );
}
