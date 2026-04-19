import { useState } from 'react'
import { X, ChevronDown } from 'lucide-react'
import Card from './ui/Card'

const BotTrainingSteps = () => {
  const [expandedIdx, setExpandedIdx] = useState(null)
  const [selectedMobileIdx, setSelectedMobileIdx] = useState(null)

  const steps = [
    {
      number: 1,
      title: 'Connect your data source',
      subtitle: 'Add website URL, documents, or files',
      icon: '🔗',
      details: 'Our intelligent system supports multiple data sources including websites, PDF documents, text files, and knowledge bases. Simply provide your source and we handle the rest with advanced indexing and crawling.',
      fullDescription:
        'Connect any data source to train your bot. Add your website URL, upload documents, provide text content, or connect your knowledge base. We automatically extract and index all relevant information to power your AI agent.',
    },
    {
      number: 2,
      title: 'Configure bot settings',
      subtitle: 'Set name, tone, and behavior',
      icon: '⚙️',
      details:
        'Customize your bot\'s personality, tone, language preferences, and response behavior. Define how your bot should interact with customers for maximum engagement and brand alignment.',
      fullDescription:
        'Fine-tune every aspect of your bot including communication style, response temperature (creativity level), language preferences, custom instructions, and handling guidelines for specific scenarios and questions.',
    },
    {
      number: 3,
      title: 'Train & verify responses',
      subtitle: 'Test and optimize accuracy',
      icon: '🧠',
      details:
        'Test your bot with sample questions and verify response quality in real-time. See exactly how your bot responds and make instant adjustments to ensure perfect answers.',
      fullDescription:
        'Our training interface lets you chat with your bot and see live responses. Test with unlimited conversations, verify accuracy, identify improvement areas, and refine before going live to customers.',
    },
    {
      number: 4,
      title: 'Deploy to production',
      subtitle: 'Embed code and go live instantly',
      icon: '🚀',
      details:
        'Get your embed code and deploy on your website in minutes. No technical setup needed - just copy the code snippet and paste it into your website HTML. Your bot goes live immediately.',
      fullDescription:
        'Simply copy a single line of embed code and paste it into your website. Your bot is now live, handling customer conversations in real-time, and integrated seamlessly with your website design.',
    },
    {
      number: 5,
      title: 'Monitor & optimize',
      subtitle: 'Track analytics and improve continuously',
      icon: '📊',
      details:
        'Access comprehensive analytics dashboard to track conversation metrics, identify knowledge gaps, understand user intent patterns, and continuously improve your bot performance.',
      fullDescription:
        'Monitor real-time conversations, user satisfaction scores, peak hours, conversation trends, and unanswered questions. Use actionable insights to refine your bot, boost customer satisfaction, and scale your support operations.',
    },
  ]

  return (
    <>
      {/* Desktop View - 5 Column Grid */}
      <div className="hidden md:grid gap-6 md:grid-cols-5 lg:grid-cols-5 relative">
        {steps.map((step, idx) => (
          <div
            key={step.number}
            className="relative h-full"
            onMouseEnter={() => setExpandedIdx(idx)}
            onMouseLeave={() => setExpandedIdx(null)}
          >
            <Card
              className={`p-6 border transition-all duration-300 cursor-pointer h-full flex flex-col transform ${
                expandedIdx === idx
                  ? 'shadow-2xl border-primary-500/60 bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-card)]/80 scale-110 z-30'
                  : expandedIdx !== null
                    ? 'border-[var(--border)] opacity-50 hover:opacity-70'
                    : 'border-[var(--border)] hover:border-primary-500/30 hover:shadow-md hover:bg-[var(--bg-card)]/50'
              }`}
            >
              {/* Step Number Badge */}
              <div className="flex items-start justify-between mb-4">
                <span className={`transition-all duration-300 ${expandedIdx === idx ? 'text-4xl' : 'text-3xl'}`}>{step.icon}</span>
                <span
                  className={`inline-flex items-center justify-center rounded-full text-sm font-bold transition-all duration-300 ${
                    expandedIdx === idx
                      ? 'bg-primary-500/20 text-primary-500 h-11 w-11 scale-125 text-lg'
                      : 'bg-primary-500/10 text-primary-500 h-9 w-9'
                  }`}
                >
                  {step.number}
                </span>
              </div>

              {/* Title */}
              <h4
                className={`font-bold transition-all duration-300 ${
                  expandedIdx === idx ? 'text-lg text-primary-500 mb-3' : 'text-base mb-2'
                }`}
              >
                {step.title}
              </h4>

              {/* Subtitle or Full Description */}
              <p
                className={`text-sm transition-all duration-300 ${
                  expandedIdx === idx
                    ? 'text-[var(--text)] line-clamp-none leading-relaxed'
                    : 'text-[var(--text-muted)] line-clamp-2'
                }`}
              >
                {expandedIdx === idx ? step.fullDescription : step.subtitle}
              </p>

              {/* Expanded Details */}
              {expandedIdx === idx && (
                <div className="mt-4 pt-4 border-t border-[var(--border)]/50 animate-in fade-in slide-in-from-bottom-2">
                  <p className="text-sm text-[var(--text-muted)] leading-relaxed">{step.details}</p>
                  <div className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary-500">
                    Click another card to see details <ChevronDown size={14} className="animate-bounce" />
                  </div>
                </div>
              )}

              {/* Hover indicator */}
              {expandedIdx !== idx && (
                <div className="mt-auto pt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-xs text-primary-500/60">Hover to expand</p>
                </div>
              )}
            </Card>
          </div>
        ))}
      </div>

      {/* Mobile View - Collapsible Cards */}
      <div className="md:hidden space-y-3">
        {steps.map((step, idx) => (
          <Card
            key={step.number}
            className={`border transition-all duration-300 cursor-pointer ${
              selectedMobileIdx === idx
                ? 'border-primary-500/40 bg-gradient-to-br from-[var(--bg-card)]/80 to-[var(--bg-card)]/50 shadow-lg'
                : 'border-[var(--border)] hover:border-primary-500/20 hover:bg-[var(--bg-card)]/30'
            }`}
            onClick={() => setSelectedMobileIdx(selectedMobileIdx === idx ? null : idx)}
          >
            <div className="p-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <span className="text-2xl flex-shrink-0">{step.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-primary-500 leading-tight">{step.title}</h4>
                    <p className="text-xs text-[var(--text-muted)] mt-1">{step.subtitle}</p>
                  </div>
                </div>
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary-500/10 text-xs font-bold text-primary-500 flex-shrink-0">
                  {step.number}
                </span>
              </div>

              {/* Expanded Content */}
              {selectedMobileIdx === idx && (
                <div className="mt-4 pt-4 border-t border-[var(--border)] animate-in fade-in slide-in-from-top-2 space-y-3">
                  <div>
                    <p className="text-sm text-[var(--text)] leading-relaxed font-medium mb-2">Details:</p>
                    <p className="text-sm text-[var(--text-muted)] leading-relaxed">{step.fullDescription}</p>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] italic">{step.details}</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedMobileIdx(null)
                    }}
                    className="text-xs font-semibold text-primary-500 hover:text-primary-600 transition flex items-center gap-1.5"
                  >
                    <X size={16} /> Close
                  </button>
                </div>
              )}

              {/* Know More Button */}
              {selectedMobileIdx !== idx && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedMobileIdx(idx)
                  }}
                  className="mt-3 text-xs font-semibold text-primary-500 hover:text-primary-600 transition flex items-center gap-1"
                >
                  Know More →
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </>
  )
}

export default BotTrainingSteps
