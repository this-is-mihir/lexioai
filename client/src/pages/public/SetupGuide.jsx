import { useState, useMemo } from "react"
import { Link } from "react-router-dom"
import {
  Search,
  Filter,
  Copy,
  Check,
  ChevronDown,
  Bot,
  Clock3,
  ClipboardList,
  CircleHelp,
  Lightbulb,
} from "lucide-react"
import setupGuidesData from "../../data/setupGuidesData"
import PublicNavbar from "../../components/layout/PublicNavbar"

export default function SetupGuide() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [expandedPlatform, setExpandedPlatform] = useState(null)
  const [copiedCode, setCopiedCode] = useState(null)
  const [expandedStep, setExpandedStep] = useState(null)

  // Categories grouped
  const categories = [
    { value: "all", label: "All Platforms", count: setupGuidesData.length },
    { value: "popular", label: "Popular", count: setupGuidesData.filter(p => p.category.includes("popular")).length },
    { value: "cms", label: "CMS", count: setupGuidesData.filter(p => p.category.includes("cms")).length },
    { value: "ecommerce", label: "eCommerce", count: setupGuidesData.filter(p => p.category.includes("ecommerce")).length },
    { value: "builders", label: "Website Builders", count: setupGuidesData.filter(p => p.category.includes("builders")).length },
    { value: "developer", label: "Developer", count: setupGuidesData.filter(p => p.category.includes("developer")).length },
    { value: "backend", label: "Backend", count: setupGuidesData.filter(p => p.category.includes("backend")).length },
    { value: "static", label: "Static", count: setupGuidesData.filter(p => p.category.includes("static")).length },
  ]

  // Filter and search logic
  const filteredPlatforms = useMemo(() => {
    return setupGuidesData.filter(platform => {
      const matchesSearch = platform.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        platform.description.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesCategory = selectedCategory === "all" || 
        platform.category.includes(selectedCategory)

      return matchesSearch && matchesCategory
    })
  }, [searchTerm, selectedCategory])

  const copyToClipboard = (code, stepNumber) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(`${expandedPlatform}-${stepNumber}`)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const getPlatformSteps = (platform) => {
    return platform.steps || []
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <PublicNavbar />

      <div className="relative py-12 px-4 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute -left-28 top-14 h-72 w-72 rounded-full bg-primary-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-10 h-64 w-64 rounded-full bg-primary-500/8 blur-3xl" />

        <div className="mx-auto mb-12 max-w-7xl">
          <h1 className="mb-4 text-4xl font-bold sm:text-5xl">
            Setup & Installation Guide
          </h1>
          <p className="max-w-3xl text-lg text-[var(--text-muted)]">
            Step-by-step instructions to integrate Lexio AI chatbot with 34+ platforms.
            Choose your platform below and follow the setup process.
          </p>
        </div>

        <div className="mx-auto mb-8 max-w-7xl">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search platforms... (WordPress, React, Shopify)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] py-3 pl-12 pr-4 text-[var(--text)] placeholder:text-[var(--text-muted)] shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            />
          </div>
        </div>

        <div className="mx-auto mb-8 max-w-7xl space-y-4">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <Filter className="h-5 w-5 text-[var(--text-muted)]" />
              <h3 className="font-semibold">Category</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    selectedCategory === cat.value
                      ? "bg-primary-500 text-white shadow-md"
                      : "bg-[var(--bg-soft)] text-[var(--text-muted)] hover:bg-primary-500/12 hover:text-primary-500"
                  }`}
                >
                  {cat.label} ({cat.count})
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mx-auto mb-6 max-w-7xl">
          <p className="font-medium text-[var(--text-muted)]">
            {filteredPlatforms.length} platform
            {filteredPlatforms.length !== 1 ? "s" : ""} found
          </p>
        </div>

        <div className="mx-auto max-w-7xl">
          {filteredPlatforms.length === 0 ? (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-12 text-center shadow-sm">
              <p className="text-lg">No platforms found matching your criteria.</p>
              <p className="mt-2 text-[var(--text-muted)]">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredPlatforms.map((platform) => (
                <div
                  key={platform.id}
                  className={`cursor-pointer overflow-hidden rounded-lg border bg-[var(--bg-card)] shadow-sm transition-all ${
                    expandedPlatform === platform.id
                      ? "border-primary-500 ring-2 ring-primary-500/35"
                      : "border-[var(--border)] hover:border-primary-500/45 hover:shadow-lg"
                  }`}
                  onClick={() =>
                    setExpandedPlatform(
                      expandedPlatform === platform.id ? null : platform.id,
                    )
                  }
                >
                  <div className="border-b border-[var(--border)] p-6">
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500/12 text-primary-500">
                          <Bot size={20} />
                        </span>
                        <div>
                          <h3 className="text-lg font-bold">{platform.name}</h3>
                          <p className="mt-1 text-sm text-[var(--text-muted)]">
                            {platform.description}
                          </p>
                        </div>
                      </div>
                      <ChevronDown
                        className={`h-5 w-5 text-[var(--text-muted)] transition-transform ${
                          expandedPlatform === platform.id ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end border-b border-[var(--border)] bg-[var(--bg-soft)] px-6 py-3">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--text-muted)]">
                      <Clock3 size={14} />
                      {platform.setupTime}
                    </span>
                  </div>

                  {expandedPlatform === platform.id && (
                    <div className="border-t border-[var(--border)] p-6">
                      <div className="mb-6">
                        <h4 className="mb-4 inline-flex items-center gap-2 font-bold">
                          <ClipboardList size={16} className="text-primary-500" />
                          Setup Steps
                        </h4>
                        <div className="space-y-2">
                          {getPlatformSteps(platform).map((step) => (
                            <div key={step.number}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setExpandedStep(
                                    expandedStep === `${platform.id}-${step.number}`
                                      ? null
                                      : `${platform.id}-${step.number}`,
                                  )
                                }}
                                className="flex w-full items-start justify-between rounded-lg bg-[var(--bg-soft)] p-3 text-left transition-colors hover:bg-primary-500/8"
                              >
                                <div className="flex items-start gap-3">
                                  <span className="mt-1 flex-shrink-0 font-bold text-primary-500">
                                    {step.number}.
                                  </span>
                                  <span className="font-medium">{step.title}</span>
                                </div>
                                <ChevronDown
                                  className={`h-4 w-4 flex-shrink-0 text-[var(--text-muted)] transition-transform ${
                                    expandedStep === `${platform.id}-${step.number}`
                                      ? "rotate-180"
                                      : ""
                                  }`}
                                />
                              </button>

                              {expandedStep === `${platform.id}-${step.number}` && (
                                <div className="ml-8 mt-2 space-y-3 pb-3 text-sm text-[var(--text-muted)]">
                                  <p className="whitespace-pre-wrap leading-relaxed text-[var(--text)]">
                                    {step.content}
                                  </p>

                                  {step.code && (
                                    <div className="group relative rounded-lg bg-slate-900 p-3 text-slate-100">
                                      <pre className="overflow-x-auto text-xs">{step.code}</pre>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          copyToClipboard(step.code, step.number)
                                        }}
                                        className="absolute right-2 top-2 rounded bg-slate-700 p-2 opacity-0 transition-all hover:bg-slate-600 group-hover:opacity-100"
                                        title="Copy code"
                                      >
                                        {copiedCode === `${platform.id}-${step.number}` ? (
                                          <Check className="h-4 w-4 text-green-400" />
                                        ) : (
                                          <Copy className="h-4 w-4 text-slate-300" />
                                        )}
                                      </button>
                                    </div>
                                  )}

                                  {step.tip && (
                                    <div className="rounded border-l-4 border-primary-500 bg-primary-500/10 px-3 py-2 text-xs text-[var(--text)]">
                                      <span className="inline-flex items-center gap-1 font-semibold">
                                        <Lightbulb size={14} className="text-primary-500" />
                                        Tip:
                                      </span>{" "}
                                      {step.tip}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {platform.faq && platform.faq.length > 0 && (
                        <div className="mb-4">
                          <h4 className="mb-3 inline-flex items-center gap-2 font-bold">
                            <CircleHelp size={16} className="text-primary-500" />
                            FAQ
                          </h4>
                          <div className="space-y-2">
                            {platform.faq.map((item, idx) => (
                              <div
                                key={idx}
                                className="rounded-lg bg-[var(--bg-soft)] p-3"
                              >
                                <p className="mb-1 text-sm font-semibold">{item.q}</p>
                                <p className="text-sm text-[var(--text-muted)]">
                                  {item.a}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {platform.support && (
                        <Link
                          to="/help-center"
                          className="inline-flex w-full items-center justify-center rounded-lg bg-primary-500 px-4 py-2 font-semibold text-white transition-colors hover:bg-primary-600"
                        >
                          Get Help & Support
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mx-auto mt-16 max-w-7xl rounded-lg bg-primary-500 p-8 text-center text-white shadow-lg">
          <h2 className="mb-3 text-2xl font-bold">Stuck on a step?</h2>
          <p className="mb-6 text-blue-100">
            Our support team is ready to help you get set up in minutes.
          </p>
          <Link
            to="/help-center"
            className="inline-flex items-center justify-center rounded-lg bg-white px-8 py-3 font-bold text-primary-600 transition-colors hover:bg-blue-50"
          >
            Contact Support Team
          </Link>
        </div>
      </div>
    </div>
  )
}
