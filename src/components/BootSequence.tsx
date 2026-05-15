export type BootPhase = 'idle' | 'booting' | 'ready' | 'error'

interface BootSequenceProps {
  phase: BootPhase
  lines: string[]
  onBoot: () => void
  onRetry: () => void
  errorMessage?: string
}

export function BootSequence({ phase, lines, onBoot, onRetry, errorMessage }: BootSequenceProps) {
  if (phase === 'ready') return null

  return (
    <div className="flex-1 flex items-center justify-center min-h-[400px]">
      {phase === 'idle' && (
        <button
          onClick={onBoot}
          className="px-8 py-4 text-2xl font-bold hover:bg-[var(--tui-fg)] hover:text-[var(--tui-bg)] transition-colors"
          box-="square"
        >
          [ BOOT A.G.I ]
        </button>
      )}

      {phase === 'booting' && (
        <div className="flex flex-col gap-2 font-mono text-green-400 w-full max-w-lg p-6" box-="square">
          {lines.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
          <div className="animate-pulse">_</div>
        </div>
      )}

      {phase === 'error' && (
        <div className="flex flex-col gap-6 items-center w-full max-w-lg p-6 border-red-500 text-red-500" box-="square">
          <div className="text-center whitespace-pre-wrap font-mono">
            {errorMessage ?? '[BOOT INTERRUPTED]\nNeural pathways unstable. Listen human, idk what\'s wrong with my systems. You can go to respective pages manually to get to know my creator - or refresh the page - or get lost idc haha.'}
          </div>
          <button
            onClick={onRetry}
            className="px-6 py-2 hover:bg-red-500 hover:text-[var(--tui-bg)] border-red-500 transition-colors"
            box-="square"
          >
            [ RETRY BOOT ]
          </button>
        </div>
      )}
    </div>
  )
}
