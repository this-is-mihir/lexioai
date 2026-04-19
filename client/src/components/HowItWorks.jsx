import { User, Plus, Brain, CheckCircle } from 'lucide-react'

const HowItWorks = () => {
  const steps = [
    {
      number: 1,
      title: 'Register',
      description: 'Create your account and set up your profile to get started.',
      Icon: User,
    },
    {
      number: 2,
      title: 'Add New Card',
      description: 'Connect your data source or upload your training content.',
      Icon: Plus,
    },
    {
      number: 3,
      title: 'Train Bot',
      description: 'Let our AI learn from your content and train the model.',
      Icon: Brain,
    },
    {
      number: 4,
      title: 'Success',
      description: 'Deploy your bot and start supporting your customers instantly.',
      Icon: CheckCircle,
    },
  ]

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-16">
      <div className="text-center mb-12">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-500 mb-2">
          Process
        </p>
        <h2 className="text-4xl font-bold">How it works?</h2>
      </div>

      {/* Desktop View */}
      <div className="hidden md:flex items-center justify-between relative gap-10">
        {/* Dotted line - connecting circles (between 1st and 4th) */}
        <div className="absolute top-7 left-[calc(12.5%+28px)] right-[calc(12.5%+28px)] h-0.5 border-t-2 border-dashed border-primary-500/50 z-0" />

        {steps.map((step, idx) => {
          const { Icon } = step
          return (
            <div
              key={step.number}
              className="flex flex-col items-center flex-1 relative z-10"
            >
              {/* Circle */}
              <div className="relative mb-6">
                <div className="h-14 w-14 rounded-full bg-primary-500 shadow-md hover:shadow-lg transition-shadow hover:bg-primary-600 flex items-center justify-center flex-shrink-0">
                  <Icon size={24} className="text-white" strokeWidth={1.5} />
                </div>
                <div className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-white border-2 border-primary-500 flex items-center justify-center text-xs font-bold text-primary-500 dark:bg-[var(--bg)]">
                  {step.number}
                </div>
              </div>

              {/* Text */}
              <div className="text-center w-full">
                <h3 className="text-sm font-bold text-[var(--text)]">
                  {step.title}
                </h3>
                <p className="mt-1 text-xs text-[var(--text-muted)] leading-snug px-1">
                  {step.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Mobile View */}
      <div className="md:hidden space-y-6">
        {steps.map((step, idx) => {
          const { Icon } = step
          return (
            <div key={step.number} className="flex gap-4 items-start">
              {/* Left - Circle */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="relative">
                  <div className="h-14 w-14 rounded-full bg-primary-500 shadow-lg flex items-center justify-center">
                    <Icon size={24} className="text-white" strokeWidth={1.5} />
                  </div>
                  <div className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-white border-2 border-primary-500 flex items-center justify-center text-xs font-bold text-primary-500 dark:bg-[var(--bg)]">
                    {step.number}
                  </div>
                </div>
                {idx < steps.length - 1 && (
                  <div className="w-0.5 h-12 bg-gradient-to-b from-primary-500/40 to-primary-500/10 mt-3" />
                )}
              </div>

              {/* Right - Content */}
              <div className="flex-1 pt-1.5">
                <h3 className="text-base font-bold text-[var(--text)]">
                  {step.title}
                </h3>
                <p className="mt-1 text-sm text-[var(--text-muted)] leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default HowItWorks
