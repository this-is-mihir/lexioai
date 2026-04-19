import { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ListItem from '@tiptap/extension-list-item';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import {
  Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered,
  Code, Quote, Link as LinkIcon,
  AlignLeft, AlignCenter, AlignRight, Eraser,
  Underline as UnderlineIcon, Strikethrough, Minus
} from 'lucide-react';
import toast from 'react-hot-toast';
import './tiptap-editor.css';

const FONT_SIZE_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: '14px', label: '14px' },
  { value: '16px', label: '16px' },
  { value: '18px', label: '18px' },
  { value: '20px', label: '20px' },
  { value: '24px', label: '24px' },
  { value: '28px', label: '28px' },
];

const CustomListItem = ListItem.extend({
  content: '(paragraph|heading) block*',
});

export function RichTextEditor({ value, onChange, placeholder = "Enter text..." }) {
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        listItem: false,
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      CustomListItem,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Color,
      TextStyle,
      Highlight.configure({
        multicolor: true,
      }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const incoming = value || '';
    const current = editor.getHTML();
    if (incoming !== current) {
      editor.commands.setContent(incoming || '<p></p>', false);
    }
  }, [editor, value]);

  if (!editor) {
    return null;
  }

  const handleAddLink = () => {
    if (!linkUrl.trim()) {
      toast.error('Enter a URL');
      return;
    }
    if (!linkText.trim()) {
      toast.error('Enter link text');
      return;
    }
    
    // Insert text with link
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'text',
        text: linkText,
        marks: [
          {
            type: 'link',
            attrs: {
              href: linkUrl,
            },
          },
        ],
      })
      .run();
    
    setLinkUrl('');
    setLinkText('');
    setShowLinkDialog(false);
    toast.success('Link added! 🔗');
  };

  const handleFontSizeChange = (size) => {
    if (!editor) return;

    const currentTextStyle = editor.getAttributes('textStyle') || {};

    if (size === 'default') {
      const nextAttrs = { ...currentTextStyle };
      delete nextAttrs.fontSize;

      if (Object.keys(nextAttrs).length === 0) {
        editor.chain().focus().unsetMark('textStyle').run();
      } else {
        editor.chain().focus().setMark('textStyle', nextAttrs).run();
      }
      return;
    }

    editor
      .chain()
      .focus()
      .setMark('textStyle', { ...currentTextStyle, fontSize: size })
      .run();
  };

  const handleHeadingToggle = (level) => {
    if (!editor) return;

    editor.chain().focus().toggleHeading({ level }).run();
  };

  const ButtonGroup = ({ children, label }) => (
    <div className="flex gap-1 p-2 border-r border-[var(--border)] items-center" title={label}>
      {children}
    </div>
  );

  const ToolButton = ({ onClick, isActive, icon: Icon, title }) => (
    <button
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      title={title}
      className={`p-2 rounded transition-colors hover:bg-[var(--bg-hover)] ${
        isActive
          ? 'bg-purple-500/20 text-purple-400'
          : 'text-[var(--text-muted)] hover:text-[var(--text)]'
      }`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );

  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--bg)]">
      {/* Toolbar */}
      <div className="bg-[var(--bg-hover)] border-b border-[var(--border)] flex flex-wrap p-1 gap-0">
        {/* Text Formatting */}
        <ButtonGroup label="Text Formatting">
          <ToolButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            icon={Bold}
            title="Bold (Ctrl+B)"
          />
          <ToolButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            icon={Italic}
            title="Italic (Ctrl+I)"
          />
          <ToolButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
            icon={UnderlineIcon}
            title="Underline (Ctrl+U)"
          />
          <ToolButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive('strike')}
            icon={Strikethrough}
            title="Strikethrough"
          />
        </ButtonGroup>

        {/* Headings */}
        <ButtonGroup label="Headings">
          <ToolButton
            onClick={() => handleHeadingToggle(1)}
            isActive={editor.isActive('heading', { level: 1 })}
            icon={Heading1}
            title="Heading 1"
          />
          <ToolButton
            onClick={() => handleHeadingToggle(2)}
            isActive={editor.isActive('heading', { level: 2 })}
            icon={Heading2}
            title="Heading 2"
          />
          <ToolButton
            onClick={() => handleHeadingToggle(3)}
            isActive={editor.isActive('heading', { level: 3 })}
            icon={Heading3}
            title="Heading 3"
          />
        </ButtonGroup>

        {/* Font Size */}
        <ButtonGroup label="Font Size">
          <div className="flex items-center gap-1 px-2">
            <label className="text-xs text-[var(--text-muted)]">Size:</label>
            <select
              value={editor.getAttributes('textStyle').fontSize || 'default'}
              onChange={(event) => handleFontSizeChange(event.target.value)}
              className="h-8 rounded border border-[var(--border)] bg-[var(--bg)] px-2 text-xs text-[var(--text)]"
            >
              {FONT_SIZE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </ButtonGroup>

        {/* Lists & Quotes */}
        <ButtonGroup label="Lists & Quotes">
          <ToolButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            icon={List}
            title="Bullet List"
          />
          <ToolButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            icon={ListOrdered}
            title="Ordered List"
          />
          <ToolButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
            icon={Quote}
            title="Blockquote"
          />
          <ToolButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            isActive={editor.isActive('codeBlock')}
            icon={Code}
            title="Code Block"
          />
        </ButtonGroup>

        {/* Alignment */}
        <ButtonGroup label="Alignment">
          <ToolButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            isActive={editor.isActive({ textAlign: 'left' })}
            icon={AlignLeft}
            title="Align Left"
          />
          <ToolButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            isActive={editor.isActive({ textAlign: 'center' })}
            icon={AlignCenter}
            title="Align Center"
          />
          <ToolButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            isActive={editor.isActive({ textAlign: 'right' })}
            icon={AlignRight}
            title="Align Right"
          />
        </ButtonGroup>

        {/* Links & Media */}
        <ButtonGroup label="Links">
          <button
            onClick={() => setShowLinkDialog(true)}
            onMouseDown={(e) => e.preventDefault()}
            title="Add Link"
            className="p-2 rounded transition-colors hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            <LinkIcon className="w-4 h-4" />
          </button>
        </ButtonGroup>

        {/* Color & Special */}
        <ButtonGroup label="Color & Effects">
          <div className="flex items-center gap-1 px-2">
            <label className="text-xs text-[var(--text-muted)]">Color:</label>
            <input
              type="color"
              onInput={(event) =>
                editor.chain().focus().setColor(event.currentTarget.value).run()
              }
              value={editor.getAttributes('textStyle').color || '#000000'}
              className="w-6 h-6 rounded cursor-pointer border border-[var(--border)]"
            />
          </div>
          <button
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            onMouseDown={(e) => e.preventDefault()}
            title="Divider Line"
            className="p-2 rounded transition-colors hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            <Minus className="w-4 h-4" />
          </button>
        </ButtonGroup>

        {/* Clear */}
        <ButtonGroup label="Clear">
          <ToolButton
            onClick={() => editor.chain().focus().clearNodes().run()}
            icon={Eraser}
            title="Clear Formatting"
          />
        </ButtonGroup>
      </div>

      {/* Editor */}
      <div className="p-4">
        <EditorContent
          editor={editor}
          className={`min-h-[300px] focus:outline-none`}
          data-placeholder={placeholder}
        />
      </div>

      {/* Link Dialog Modal */}
      {showLinkDialog && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" 
          onClick={() => {
            setLinkUrl('');
            setLinkText('');
            setShowLinkDialog(false);
          }}
        >
          <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-6 w-96" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Add Link</h3>
            
            <div className="mb-4">
              <label className="text-xs font-semibold text-[var(--text-muted)] block mb-2">Link Text (what people see)</label>
              <input
                type="text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="Click here"
                className="input w-full text-sm h-fit py-2"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
              />
            </div>

            <div className="mb-4">
              <label className="text-xs font-semibold text-[var(--text-muted)] block mb-2">URL (link destination)</label>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="input w-full text-sm h-fit py-2"
                onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAddLink}
                className="btn-primary flex-1 text-sm py-2 font-semibold"
              >
                Add Link
              </button>
              <button
                onClick={() => {
                  setLinkUrl('');
                  setLinkText('');
                  setShowLinkDialog(false);
                }}
                className="btn-secondary flex-1 text-sm py-2 font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
