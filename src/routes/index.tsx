import { createFileRoute } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { useState, useRef, useEffect } from 'react'
import { chatCompletion } from '../utils/chat.functions'
import type { ChatMessage, ChatRequestMessage } from '../utils/chat.types'

export const Route = createFileRoute('/')({ component: App })

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: 'System initialized. Ready for input.\nType a message to begin.',
      createdAt: Date.now(),
    },
  ])
  const [input, setInput] = useState('')

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

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

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || chatMutation.isPending) return

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
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

      <div 
        is-="view" 
        box-="square" 
        className="flex-1 min-h-0"
        ref={scrollRef}
      >
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
                <span className="text-xs opacity-50">
                  {new Date(msg.createdAt).toLocaleTimeString()}
                </span>
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
        </div>
      </div>

      <form 
        onSubmit={handleSubmit}
        className="shrink-0 flex flex-col gap-2" 
        box-="square"
      >
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
            disabled={chatMutation.isPending}
            autoFocus
          />
        </div>
        <div className="flex justify-end p-2 border-t border-[var(--tui-border)]">
          <button 
            type="submit" 
            disabled={!input.trim() || chatMutation.isPending}
            className="px-6 py-2 hover:bg-[var(--tui-fg)] hover:text-[var(--tui-bg)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            box-="square"
          >
            [ EXECUTE ]
          </button>
        </div>
      </form>
    </main>
  )
}
