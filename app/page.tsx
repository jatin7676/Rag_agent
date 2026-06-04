'use client';

import { useChat } from '@ai-sdk/react';
import { useEffect, useRef, useState } from 'react';
import { Bot, User, Database, Search, Send, Sparkles, AlertTriangle, RotateCw } from 'lucide-react';

export default function Chat() {
  const [input, setInput] = useState('');
  const { messages, sendMessage, status, error, regenerate } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  const isLoading = status === 'submitted' || status === 'streaming';

  // Auto-scroll to the latest message
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status, error]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput('');
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <h1 className="text-sm font-semibold">Knowledge Assistant</h1>
            <p className="text-xs text-muted-foreground">RAG-powered · remembers what you tell it</p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-4 py-6">
          {messages.length === 0 ? (
            <EmptyState onPick={text => sendMessage({ text })} />
          ) : (
            <div className="space-y-6">
              {messages.map(m => (
                <Message key={m.id} role={m.role}>
                  {m.parts.map((part, i) => {
                    switch (part.type) {
                      case 'text':
                        return (
                          <p key={i} className="whitespace-pre-wrap leading-relaxed">
                            {part.text}
                          </p>
                        );
                      case 'tool-addResource':
                      case 'tool-getInformation':
                        return (
                          <ToolCall
                            key={i}
                            type={part.type}
                            done={part.state === 'output-available'}
                            input={part.input}
                          />
                        );
                      default:
                        return null;
                    }
                  })}
                </Message>
              ))}
              {status === 'submitted' && (
                <Message role="assistant">
                  <TypingDots />
                </Message>
              )}
            </div>
          )}
          {error && <ErrorBanner error={error} onRetry={() => regenerate()} />}
          <div ref={scrollRef} />
        </div>
      </main>

      {/* Composer */}
      <footer className="sticky bottom-0 border-t border-border/60 bg-background/80 backdrop-blur-md">
        <form onSubmit={handleSubmit} className="mx-auto w-full max-w-2xl px-4 py-4">
          <div className="flex items-end gap-2 rounded-2xl border border-input bg-background p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring/50">
            <input
              className="flex-1 bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
              value={input}
              placeholder="Ask something, or teach me a fact..."
              onChange={e => setInput(e.currentTarget.value)}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Facts you share are stored in the knowledge base and recalled later.
          </p>
        </form>
      </footer>
    </div>
  );
}

function Message({ role, children }: { role: string; children: React.ReactNode }) {
  const isUser = role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
          isUser
            ? 'rounded-tr-sm bg-primary text-primary-foreground'
            : 'rounded-tl-sm bg-card text-card-foreground border border-border/60'
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function ToolCall({
  type,
  done,
  input,
}: {
  type: 'tool-addResource' | 'tool-getInformation';
  done: boolean;
  input: unknown;
}) {
  const isAdd = type === 'tool-addResource';
  const Icon = isAdd ? Database : Search;
  const label = isAdd ? 'Saving to knowledge base' : 'Searching knowledge base';
  return (
    <div className="my-1 rounded-lg border border-border/60 bg-muted/50 px-3 py-2">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className={`h-3.5 w-3.5 ${done ? '' : 'animate-pulse'}`} />
        <span>
          {label}
          {done ? '' : '…'}
        </span>
      </div>
      {input != null && (
        <pre className="mt-1.5 overflow-x-auto whitespace-pre-wrap break-words text-[11px] text-muted-foreground/80">
          {JSON.stringify(input, null, 2)}
        </pre>
      )}
    </div>
  );
}

function ErrorBanner({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="mt-4 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">
        <p className="font-medium">Couldn&apos;t get a response</p>
        <p className="mt-0.5 text-destructive/90">
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
      </div>
      <button
        onClick={onRetry}
        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-destructive/40 px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-destructive/15"
      >
        <RotateCw className="h-3.5 w-3.5" />
        Retry
      </button>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 150, 300].map(delay => (
        <span
          key={delay}
          className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  const samples = [
    'My favorite programming language is TypeScript.',
    'What is my favorite programming language?',
    "What's today's date?",
  ];
  return (
    <div className="flex flex-col items-center justify-center gap-6 pt-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
        <Sparkles className="h-7 w-7" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">How can I help?</h2>
        <p className="text-sm text-muted-foreground">
          Teach me facts and I&apos;ll remember them — then ask me anything.
        </p>
      </div>
      <div className="flex w-full max-w-md flex-col gap-2">
        {samples.map(s => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="rounded-xl border border-border/60 bg-card px-4 py-2.5 text-left text-sm text-card-foreground shadow-sm transition-colors hover:bg-accent"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
