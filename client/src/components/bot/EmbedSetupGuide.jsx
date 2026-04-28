import { useState } from 'react'
import {
  Copy, Check, ChevronDown, ChevronUp, ExternalLink, CheckCircle2
} from 'lucide-react'
import toast from 'react-hot-toast'
import Card from '../ui/Card'
import Button from '../ui/Button'
import FRAMEWORKS from '../../data/frameworksData'

function CodeBlock({ code, onCopy }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    toast.success('Copied!')
    setTimeout(() => setCopied(false), 2000)
    onCopy?.()
  }

  return (
    <div className="relative group mt-2 mb-3">
      <pre className="overflow-x-auto rounded-lg bg-gray-900 text-gray-100 p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap break-all">
        {code}
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-gray-700 hover:bg-gray-600 text-white transition opacity-0 group-hover:opacity-100"
        title="Copy code"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  )
}

export default function EmbedSetupGuide({ bot }) {
  const [activeFramework, setActiveFramework] = useState('html')
  const [expandedCategory, setExpandedCategory] = useState('Web Basics')

  const embedKey = bot?.embedKey || 'YOUR_EMBED_KEY'
  const widgetUrl = import.meta.env.VITE_WIDGET_CDN_URL || 'https://lexioai.pages.dev'
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://lexioai-server.onrender.com/api/v1'

  const embedCode = `<script\n  src="${widgetUrl}/widget.js"\n  data-key="${embedKey}"\n  data-api-base="${apiBase}"\n  defer>\n</script>`

  // Find active framework data
  let activeData = null
  for (const cat of FRAMEWORKS) {
    const found = cat.items.find((f) => f.id === activeFramework)
    if (found) { activeData = found; break }
  }

  const instructions = activeData?.getInstructions?.(embedCode, embedKey, widgetUrl, apiBase) || []

  const handleCopyEmbed = async () => {
    await navigator.clipboard.writeText(embedCode)
    toast.success('Embed code copied!')
  }

  return (
    <div className="space-y-5">
      {/* Quick Copy Section */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold">Your Embed Code</p>
          <Button onClick={handleCopyEmbed} className="px-3 py-1.5">
            <Copy size={14} /> Copy Code
          </Button>
        </div>
        <CodeBlock code={embedCode} />
        <p className="text-xs text-[var(--text-muted)] mt-2">
          Embed Key: <code className="bg-[var(--bg-soft)] px-2 py-0.5 rounded font-mono">{embedKey}</code>
        </p>
      </Card>

      {/* Framework Selector */}
      <Card className="p-5">
        <p className="text-sm font-semibold mb-4">Setup Guide — Choose Your Platform</p>

        {FRAMEWORKS.map((cat) => (
          <div key={cat.category} className="mb-3">
            <button
              onClick={() => setExpandedCategory(expandedCategory === cat.category ? null : cat.category)}
              className="w-full flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-soft)] hover:bg-[var(--bg-soft)]/80 transition text-left"
            >
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                {cat.category}
              </span>
              {expandedCategory === cat.category ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {expandedCategory === cat.category && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2 px-1">
                {cat.items.map((fw) => (
                  <button
                    key={fw.id}
                    onClick={() => setActiveFramework(fw.id)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      activeFramework === fw.id
                        ? 'border-[var(--primary-500)] bg-[var(--primary-500)]/5 shadow-sm'
                        : 'border-[var(--border)] hover:border-[var(--primary-500)]/30'
                    }`}
                  >
                    <fw.icon size={20} className={activeFramework === fw.id ? 'text-[var(--primary-500)]' : 'text-[var(--text-muted)]'} />
                    <p className="text-sm font-medium mt-1">{fw.name}</p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5 line-clamp-1">{fw.description}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </Card>

      {/* Active Framework Instructions */}
      {activeData && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--primary-500)]/10">
              <activeData.icon size={18} className="text-[var(--primary-500)]" />
            </span>
            <div>
              <p className="text-sm font-semibold">{activeData.name} Setup Guide</p>
              <p className="text-xs text-[var(--text-muted)]">{activeData.description}</p>
            </div>
          </div>

          <div className="space-y-5">
            {instructions.map((step, idx) => (
              <div key={idx} className="relative pl-8">
                <div className="absolute left-0 top-0.5 w-6 h-6 rounded-full bg-[var(--primary-500)] text-white text-xs flex items-center justify-center font-bold">
                  {idx + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold">{step.title}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">{step.desc}</p>
                  {step.code && <CodeBlock code={step.code} />}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Verify Installation */}
      <Card className="p-5 border-[var(--primary-500)]/20 bg-[var(--primary-500)]/5">
        <p className="text-sm font-semibold">✅ After Installation</p>
        <ul className="mt-2 space-y-1 text-xs text-[var(--text-muted)]">
          <li>• Visit your website and look for the chat bubble (bottom-right corner)</li>
          <li>• Click the bubble to open the chat window</li>
          <li>• Send a test message to verify the bot responds</li>
          <li>• Use the "Verify Live" button above to auto-detect installation</li>
        </ul>
      </Card>
    </div>
  )
}
