interface SuggestedQuestionsProps {
  onSelect: (question: string) => void
  disabled?: boolean
}

export function SuggestedQuestions({ onSelect, disabled }: SuggestedQuestionsProps) {
  const questions = [
    'What are your skills?',
    'Tell me about your projects',
    'What tech stack do you use?',
    'How can I contact you?'
  ]

  return (
    <div className="flex flex-wrap gap-2 mt-4">
      {questions.map((q) => (
        <button
          key={q}
          onClick={() => onSelect(q)}
          disabled={disabled}
          className="px-4 py-2 text-sm opacity-80 hover:opacity-100 border border-[var(--tui-border)] hover:bg-[var(--tui-fg)] hover:text-[var(--tui-bg)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          box-="round"
        >
          {q}
        </button>
      ))}
    </div>
  )
}
