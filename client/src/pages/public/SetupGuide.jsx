import { useState, useMemo } from "react"
import { Link } from "react-router-dom"
import {
  Search, Copy, Check, ChevronDown, ChevronUp,
  Clock3, CheckCircle2, ArrowRight, Zap, BookOpen
} from "lucide-react"
import toast from "react-hot-toast"
import FRAMEWORKS from "../../data/frameworksData"
import PublicNavbar from "../../components/layout/PublicNavbar"
import PublicFooter from "../../components/layout/PublicFooter"

const WIDGET_URL = import.meta.env.VITE_WIDGET_CDN_URL || "https://lexioai.pages.dev"
const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://lexioai-server.onrender.com/api/v1"
const EMBED_KEY = "YOUR_EMBED_KEY"

const EMBED_CODE = `<script\n  src="${WIDGET_URL}/widget.js"\n  data-key="${EMBED_KEY}"\n  data-api-base="${API_BASE}"\n  defer>\n</script>`

/* ─── Code Block ─── */
function CodeBlock({ code }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    toast.success("Copied!")
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="relative group mt-2">
      <pre className="overflow-x-auto rounded-xl bg-gray-950 text-gray-100 p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap break-all border border-white/5">
        {code}
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition opacity-0 group-hover:opacity-100"
        title="Copy code"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  )
}

/* ─── Category Filter Pills ─── */
const CATEGORY_MAP = [
  { key: "all", label: "All" },
  { key: "Web Basics", label: "Web / CMS" },
  { key: "JavaScript Frameworks", label: "JS Frameworks" },
  { key: "Backend / Full-Stack", label: "Backend" },
  { key: "Mobile & Other", label: "Mobile & Other" },
]

export default function SetupGuide() {
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState("all")
  const [activeFramework, setActiveFramework] = useState("html")
  const [expandedCategory, setExpandedCategory] = useState("Web Basics")

  // Flatten all items for search
  const allItems = useMemo(() =>
    FRAMEWORKS.flatMap(cat => cat.items.map(item => ({ ...item, categoryName: cat.category }))),
    []
  )

  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      const matchesSearch = !search ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase())
      const matchesCat = activeCategory === "all" || item.categoryName === activeCategory
      return matchesSearch && matchesCat
    })
  }, [search, activeCategory, allItems])

  const activeData = allItems.find(f => f.id === activeFramework)
  const instructions = activeData?.getInstructions?.(EMBED_CODE, EMBED_KEY, WIDGET_URL, API_BASE) || []

  const totalFrameworks = allItems.length

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <PublicNavbar />

      <main className="relative overflow-hidden px-4 py-10 sm:px-6 lg:px-8">
        {/* Glow effects */}
        <div className="pointer-events-none absolute -left-32 top-0 h-80 w-80 rounded-full bg-primary-500/8 blur-[100px]" />
        <div className="pointer-events-none absolute -right-24 top-40 h-64 w-64 rounded-full bg-indigo-500/6 blur-[80px]" />

        {/* Hero */}
        <div className="mx-auto max-w-6xl mb-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-500/30 bg-primary-500/10 px-3 py-1 text-xs font-semibold text-primary-400">
              <BookOpen size={12} />
              Documentation
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Setup & Installation Guide
          </h1>
          <p className="mt-3 max-w-2xl text-base text-[var(--text-muted)]">
            Add Lexio AI chatbot to any website or app in under 2 minutes.
            Choose your platform and follow the step-by-step instructions.
          </p>
          <div className="mt-4 flex items-center gap-4 text-sm text-[var(--text-muted)]">
            <span className="inline-flex items-center gap-1.5">
              <Zap size={14} className="text-amber-400" />
              {totalFrameworks}+ platforms supported
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 size={14} className="text-emerald-400" />
              ~2 min setup
            </span>
          </div>
        </div>

        {/* Embed Code Card */}
        <div className="mx-auto max-w-6xl mb-8">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-bold">Universal Embed Code</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">Works on any platform — just paste before &lt;/body&gt;</p>
              </div>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(EMBED_CODE)
                  toast.success("Embed code copied!")
                }}
                className="btn-primary px-3 py-1.5 text-xs"
              >
                <Copy size={13} /> Copy Code
              </button>
            </div>
            <CodeBlock code={EMBED_CODE} />
            <p className="text-xs text-[var(--text-muted)] mt-3">
              Replace <code className="bg-[var(--bg-soft)] px-1.5 py-0.5 rounded font-mono text-primary-400">YOUR_EMBED_KEY</code> with
              your bot's embed key from <Link to="/dashboard" className="text-primary-400 hover:underline">Dashboard → My Bot → Embed</Link>.
            </p>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="mx-auto max-w-6xl mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-3 h-4 w-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search platforms... (React, WordPress, Shopify, Django)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] py-2.5 pl-11 pr-4 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_MAP.map(cat => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                  activeCategory === cat.key
                    ? "bg-primary-500 text-white shadow-md shadow-primary-500/25"
                    : "bg-[var(--bg-soft)] text-[var(--text-muted)] hover:bg-primary-500/10 hover:text-primary-400"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content: Platform Selector + Instructions */}
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Platform list */}
            <div className="lg:col-span-4">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-sm overflow-hidden">
                <div className="p-4 border-b border-[var(--border)]">
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    {filteredItems.length} platform{filteredItems.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="max-h-[600px] overflow-y-auto divide-y divide-[var(--border)]">
                  {FRAMEWORKS.map(cat => {
                    const catItems = filteredItems.filter(i => i.categoryName === cat.category)
                    if (catItems.length === 0) return null
                    const isExpanded = expandedCategory === cat.category

                    return (
                      <div key={cat.category}>
                        <button
                          onClick={() => setExpandedCategory(isExpanded ? null : cat.category)}
                          className="w-full flex items-center justify-between px-4 py-3 bg-[var(--bg-soft)]/50 hover:bg-[var(--bg-soft)] transition text-left"
                        >
                          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                            {cat.category}
                          </span>
                          {isExpanded ? <ChevronUp size={14} className="text-[var(--text-muted)]" /> : <ChevronDown size={14} className="text-[var(--text-muted)]" />}
                        </button>
                        {isExpanded && catItems.map(fw => (
                          <button
                            key={fw.id}
                            onClick={() => setActiveFramework(fw.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                              activeFramework === fw.id
                                ? "bg-primary-500/8 border-l-2 border-l-primary-500"
                                : "hover:bg-[var(--bg-soft)] border-l-2 border-l-transparent"
                            }`}
                          >
                            <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${
                              activeFramework === fw.id ? "bg-primary-500/15 text-primary-400" : "bg-[var(--bg-soft)] text-[var(--text-muted)]"
                            }`}>
                              <fw.icon size={16} />
                            </span>
                            <div className="min-w-0">
                              <p className={`text-sm font-medium truncate ${activeFramework === fw.id ? "text-primary-400" : ""}`}>
                                {fw.name}
                              </p>
                              <p className="text-[10px] text-[var(--text-muted)] truncate">{fw.description}</p>
                            </div>
                            {activeFramework === fw.id && (
                              <ArrowRight size={14} className="ml-auto text-primary-400 flex-shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    )
                  })}
                  {filteredItems.length === 0 && (
                    <div className="p-8 text-center text-sm text-[var(--text-muted)]">
                      No platforms found. Try a different search.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Setup Instructions */}
            <div className="lg:col-span-8">
              {activeData ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-sm overflow-hidden">
                  {/* Header */}
                  <div className="p-6 border-b border-[var(--border)] bg-gradient-to-r from-primary-500/5 to-transparent">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-500/12 text-primary-400">
                        <activeData.icon size={22} />
                      </span>
                      <div>
                        <h2 className="text-lg font-bold">{activeData.name} Setup Guide</h2>
                        <p className="text-xs text-[var(--text-muted)]">{activeData.description}</p>
                      </div>
                    </div>
                  </div>

                  {/* Steps */}
                  <div className="p-6 space-y-6">
                    {instructions.map((step, idx) => (
                      <div key={idx} className="relative pl-10">
                        {/* Step number */}
                        <div className="absolute left-0 top-0.5 w-7 h-7 rounded-full bg-primary-500 text-white text-xs flex items-center justify-center font-bold shadow-md shadow-primary-500/30">
                          {idx + 1}
                        </div>
                        {/* Connector line */}
                        {idx < instructions.length - 1 && (
                          <div className="absolute left-[13px] top-8 bottom-[-16px] w-px bg-[var(--border)]" />
                        )}
                        <div>
                          <p className="text-sm font-bold">{step.title}</p>
                          <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">{step.desc}</p>
                          {step.code && <CodeBlock code={step.code} />}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* After installation */}
                  <div className="m-6 mt-0 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                    <p className="text-sm font-bold flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-400" />
                      After Installation
                    </p>
                    <ul className="mt-2 space-y-1.5 text-xs text-[var(--text-muted)]">
                      <li className="flex items-start gap-2">
                        <Check size={12} className="mt-0.5 text-emerald-400 flex-shrink-0" />
                        Visit your website and look for the chat bubble (bottom-right corner)
                      </li>
                      <li className="flex items-start gap-2">
                        <Check size={12} className="mt-0.5 text-emerald-400 flex-shrink-0" />
                        Click the bubble and send a test message
                      </li>
                      <li className="flex items-start gap-2">
                        <Check size={12} className="mt-0.5 text-emerald-400 flex-shrink-0" />
                        Check your Lexio dashboard for the conversation
                      </li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-12 text-center shadow-sm">
                  <p className="text-sm text-[var(--text-muted)]">Select a platform from the left to see setup instructions.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mx-auto mt-14 max-w-6xl rounded-2xl bg-gradient-to-r from-primary-600 to-indigo-600 p-8 text-center text-white shadow-xl shadow-primary-500/15">
          <h2 className="mb-2 text-2xl font-bold">Need Help?</h2>
          <p className="mb-5 text-sm text-white/70">
            Our support team is ready to help you get set up in minutes.
          </p>
          <Link
            to="/help-center"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-2.5 text-sm font-bold text-primary-600 transition-all hover:bg-white/90 hover:shadow-lg"
          >
            Contact Support <ArrowRight size={14} />
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
