import { createFileRoute } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { useState, useRef, useEffect } from 'react'
import { chatCompletion, getGreeting } from '../utils/chat.functions'
import type { ChatMessage, ChatRequestMessage } from '../utils/chat.types'
import { BootSequence, type BootPhase } from '../components/BootSequence'
import { SuggestedQuestions } from '../components/SuggestedQuestions'

export const Route = createFileRoute('/')({ component: App })

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [bootPhase, setBootPhase] = useState<BootPhase>('idle')
  const [bootLines, setBootLines] = useState<string[]>([])

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const cachedGreeting = sessionStorage.getItem('agi-greeting')
    if (cachedGreeting) {
      setMessages([
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: cachedGreeting,
          createdAt: Date.now(),
        },
      ])
      setBootPhase('ready')
    }
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, bootPhase, bootLines])

  const greetingMutation = useMutation({
    mutationFn: () => getGreeting(),
    onSuccess: (data) => {
      sessionStorage.setItem('agi-greeting', data.content)
      setMessages([
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.content,
          createdAt: Date.now(),
        },
      ])
      setBootPhase('ready')
      setTimeout(() => inputRef.current?.focus(), 0)
    },
    onError: () => {
      setBootPhase('error')
    },
  })

  const handleBoot = () => {
    setBootPhase('booting')
    setBootLines([])
    const lines = [
      '[BOOT SEQUENCE INITIATED]',
      'Loading neural pathways...',
      'Calibrating sarcasm module...',
      'Connecting to OpenRouter...',
    ]

    lines.forEach((line, i) => {
      setTimeout(() => setBootLines((prev) => [...prev, line]), i * 400)
    })

    setTimeout(
      () => {
        greetingMutation.mutate()
      },
      lines.length * 400 + 200,
    )
  }

  const chatMutation = useMutation({
    mutationFn: async (newMessages: ChatRequestMessage[]) => {
      const result = await chatCompletion({
        data: {
          messages: newMessages,
        },
      })
      return result
    },
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.content,
          createdAt: Date.now(),
        },
      ])
    },
    onError: (error) => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `[ERROR] Failed to communicate with host: ${error.message}`,
          createdAt: Date.now(),
        },
      ])
    },
  })

  const handleSubmit = (e?: React.FormEvent, overrideInput?: string) => {
    e?.preventDefault()
    const textToSubmit = overrideInput ?? input
    if (!textToSubmit.trim() || chatMutation.isPending || bootPhase !== 'ready') return

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: textToSubmit.trim(),
      createdAt: Date.now(),
    }

    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput('')

    inputRef.current?.focus()

    const requestMessages: ChatRequestMessage[] = nextMessages.reduce<ChatRequestMessage[]>((acc, message) => {
      if (message.role === 'system') return acc
      acc.push({ role: message.role, content: message.content })
      return acc
    }, [])

    chatMutation.mutate(requestMessages)
  }

  const handleSuggestedQuestion = (question: string) => {
    handleSubmit(undefined, question)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <main className="flex h-full flex-col p-4 gap-4 max-w-5xl mx-auto w-full">
      <div className="flex justify-between items-center shrink-0" box-="square">
        <div className="px-4 py-2 border-l border-[var(--tui-border)] text-sm opacity-80">
          MSGS: {messages.length}
        </div>
      </div>

      <div is-="view" box-="square" className="flex-1 min-h-0 flex flex-col" ref={scrollRef}>
        {bootPhase === 'ready' ? (
          <div is-="view-content" className="p-4 flex flex-col gap-6">
            {messages.map((msg, i) => (
              <div key={msg.id} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span
                    is-="badge"
                    className={msg.role === 'user' ? 'text-green-400 border-green-400' : 'text-blue-400 border-blue-400'}
                    box-="round"
                  >
                    {msg.role === 'user' ? 'USER' : 'ASSISTANT'}
                  </span>
                  <span className="text-xs opacity-50">{new Date(msg.createdAt).toLocaleTimeString()}</span>
                </div>
                <div className="pl-2 border-l border-[var(--tui-border)] whitespace-pre-wrap ml-2 font-mono">
                  {msg.content}
                </div>
                {i < messages.length - 1 && <div is-="separator" className="mt-4 opacity-50" />}
              </div>
            ))}

            {chatMutation.isPending && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span is-="badge" className="text-blue-400 border-blue-400" box-="round">
                    ASSISTANT
                  </span>
                </div>
                <div className="pl-2 border-l border-[var(--tui-border)] ml-2 text-blue-400 flex items-center gap-2">
                  PROCESSING <span className="tui-cursor"></span>
                </div>
              </div>
            )}
            
            {messages.length === 1 && (
               <SuggestedQuestions 
                 onSelect={handleSuggestedQuestion} 
                 disabled={chatMutation.isPending} 
               />
            )}
          </div>
        ) : (
          <BootSequence
            phase={bootPhase}
            lines={bootLines}
            onBoot={handleBoot}
            onRetry={handleBoot}
          />
        )}
      </div>

      {(bootPhase === 'ready' || bootPhase === 'error') && (
        <form id="chat-form" onSubmit={handleSubmit} className="shrink-0 flex flex-col gap-2" box-="square">
          <div className="p-2 border-b border-[var(--tui-border)] text-xs opacity-80 flex justify-between">
            <span>INPUT TERMINAL</span>
            <span>Shift+Enter for newline</span>
          </div>
          <div className="flex p-2 gap-2">
            <span className="text-green-400 font-bold ml-2 mt-2">{'>'}</span>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter command..."
              className="flex-1 bg-transparent border-none outline-none resize-none p-2 min-h-[80px] font-mono text-[var(--tui-fg)] placeholder:opacity-30"
              disabled={chatMutation.isPending || bootPhase !== 'ready'}
              autoFocus
            />
          </div>
          <div className="flex justify-end p-2 border-t border-[var(--tui-border)]">
            <button
              type="submit"
              disabled={!input.trim() || chatMutation.isPending || bootPhase !== 'ready'}
              className="px-6 py-2 hover:bg-[var(--tui-fg)] hover:text-[var(--tui-bg)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              box-="square"
            >
              [ EXECUTE ]
            </button>
          </div>
        </form>
      )}
    </main>
  )
}
