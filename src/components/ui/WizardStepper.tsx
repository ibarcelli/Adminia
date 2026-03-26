const steps = [
  { number: 1, label: 'Agua' },
  { number: 2, label: 'Gastos' },
  { number: 3, label: 'Revisión' },
  { number: 4, label: 'Publicar' },
]

interface WizardStepperProps {
  currentStep: number
  completedSteps: number[]
}

export function WizardStepper({ currentStep, completedSteps }: WizardStepperProps) {
  return (
    <nav className="flex items-center justify-between max-w-lg mx-auto">
      {steps.map((step, i) => {
        const isCompleted = completedSteps.includes(step.number)
        const isCurrent = step.number === currentStep
        const isFuture = !isCompleted && !isCurrent

        return (
          <div key={step.number} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isCurrent
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-400'
                }`}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step.number
                )}
              </div>
              <span
                className={`text-xs mt-1 ${
                  isCurrent ? 'text-blue-600 font-medium' : isFuture ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                {step.label}
              </span>
            </div>

            {i < steps.length - 1 && (
              <div
                className={`w-12 sm:w-20 h-0.5 mx-1 sm:mx-2 ${
                  completedSteps.includes(step.number) ? 'bg-green-500' : 'bg-slate-200'
                }`}
              />
            )}
          </div>
        )
      })}
    </nav>
  )
}
