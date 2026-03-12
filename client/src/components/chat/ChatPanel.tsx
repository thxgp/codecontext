import { useState, useRef, useEffect } from 'react';
import { Send, Trash2, FileCode, MessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useRepoStore } from '../../stores/repoStore';
import clsx from 'clsx';

interface ChatPanelProps {
  repoId: string;
  onFileClick: (path: string) => void;
}

export default function ChatPanel({ repoId, onFileClick }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { chatMessages, isChatLoading, askQuestion, clearChat } = useRepoStore();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isChatLoading) return;

    const question = input;
    setInput('');
    
    try {
      await askQuestion(repoId, question);
    } catch (error) {
      console.error('Failed to ask question:', error);
    }
  };

  const handleClear = async () => {
    if (confirm('Clear chat history?')) {
      await clearChat(repoId);
    }
  };

  return (
    <div className="h-full flex flex-col dark:bg-dark-900/50 bg-white rounded-xl border dark:border-white/[0.06] border-light-300 overflow-hidden shadow-sm dark:shadow-none">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b dark:border-white/[0.06] border-light-300">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full dark:bg-neon-cyan bg-orange-500 animate-pulse" />
          <h3 className="font-medium dark:text-white text-dark-800 text-sm">Ask about this codebase</h3>
        </div>
        {chatMessages.length > 0 && (
          <button
            onClick={handleClear}
            className="p-1.5 dark:text-dark-500 text-dark-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all"
            title="Clear chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {chatMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center animate-fade-in">
            <div className="w-14 h-14 rounded-2xl dark:bg-neon-cyan/10 bg-orange-500/10 flex items-center justify-center mb-4 border dark:border-neon-cyan/20 border-orange-500/20">
              <MessageSquare className="w-7 h-7 dark:text-neon-cyan text-orange-500" />
            </div>
            <p className="text-lg font-medium dark:text-dark-200 text-dark-700 mb-2">Ask anything about this codebase</p>
            <div className="space-y-1.5 mt-1">
              <p className="text-sm dark:text-dark-500 text-dark-400">"Where is authentication handled?"</p>
              <p className="text-sm dark:text-dark-500 text-dark-400">"How does the payment flow work?"</p>
              <p className="text-sm dark:text-dark-500 text-dark-400">"What does UserService do?"</p>
            </div>
          </div>
        ) : (
          chatMessages.map((msg, i) => (
            <div
              key={i}
              className={clsx(
                'animate-slide-up',
                msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'
              )}
            >
              <div
                className={clsx(
                  'max-w-[85%] rounded-2xl px-4 py-3',
                  msg.role === 'user'
                    ? 'dark:bg-gradient-to-br dark:from-neon-cyan dark:to-neon-magenta bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg dark:shadow-neon-cyan/10 shadow-orange-500/20'
                    : 'dark:bg-white/[0.04] bg-white border dark:border-white/[0.06] border-light-300 relative shadow-sm'
                )}
              >
                {msg.role === 'assistant' && (
                  <div className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full dark:bg-neon-cyan/40 bg-orange-500/40" />
                )}
                {msg.role === 'user' ? (
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                ) : (
                  <div className="text-sm prose dark:prose-invert prose-sm max-w-none prose-headings:mt-4 prose-headings:mb-2 dark:prose-headings:text-dark-100 prose-headings:text-dark-800 prose-headings:font-semibold prose-p:my-2 dark:prose-p:text-dark-200 prose-p:text-dark-600 prose-p:leading-relaxed prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 dark:prose-li:text-dark-200 prose-li:text-dark-600 dark:prose-code:bg-dark-700/50 prose-code:bg-light-200 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md dark:prose-code:text-neon-cyan prose-code:text-orange-600 prose-code:font-medium prose-code:text-[13px] dark:prose-pre:bg-dark-950 prose-pre:bg-light-100 prose-pre:border dark:prose-pre:border-white/[0.06] prose-pre:border-light-300 prose-pre:rounded-lg dark:prose-a:text-neon-cyan prose-a:text-orange-500 prose-a:no-underline hover:prose-a:underline dark:prose-strong:text-dark-100 prose-strong:text-dark-800 pl-3">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                )}
                
                {/* Referenced files */}
                {msg.role === 'assistant' && (msg.referencedFiles || []).length > 0 && (
                  <div className="mt-3 pt-3 border-t dark:border-white/[0.06] border-light-300 pl-3">
                    <p className="text-[11px] uppercase tracking-wider font-semibold dark:text-dark-500 text-dark-400 mb-2">Referenced files</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(msg.referencedFiles || []).filter(Boolean).map((file: string, j: number) => (
                        <button
                          key={j}
                          onClick={() => onFileClick(file)}
                          className="flex items-center gap-1.5 text-xs dark:bg-neon-cyan/10 bg-orange-500/10 dark:hover:bg-neon-cyan/20 hover:bg-orange-500/20 dark:text-neon-cyan text-orange-600 px-2.5 py-1 rounded-lg border dark:border-neon-cyan/20 border-orange-500/20 transition-all"
                        >
                          <FileCode className="w-3 h-3" />
                          {file.split('/').pop()}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        
        {isChatLoading && (
          <div className="flex justify-start animate-fade-in">
            <div className="dark:bg-white/[0.04] bg-white border dark:border-white/[0.06] border-light-300 rounded-2xl px-5 py-4 shadow-sm">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full dark:bg-neon-cyan bg-orange-500 animate-bounce-dot" />
                <div className="w-2 h-2 rounded-full dark:bg-neon-cyan bg-orange-500 animate-bounce-dot [animation-delay:0.2s]" />
                <div className="w-2 h-2 rounded-full dark:bg-neon-cyan bg-orange-500 animate-bounce-dot [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t dark:border-white/[0.06] border-light-300">
        <div className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              className="w-full px-4 py-3 rounded-xl dark:bg-dark-800/80 bg-light-100 border dark:border-white/[0.08] border-light-300 dark:text-white text-dark-800 dark:placeholder-dark-500 placeholder-dark-400 focus:outline-none dark:focus:border-neon-cyan/40 focus:border-orange-500/40 focus:ring-2 dark:focus:ring-neon-cyan/20 focus:ring-orange-500/20 text-sm transition-all"
              disabled={isChatLoading}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isChatLoading}
            className="p-3 dark:bg-gradient-to-br dark:from-neon-cyan dark:to-neon-magenta bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl dark:hover:from-neon-cyan/90 dark:hover:to-neon-magenta/90 hover:from-orange-600 hover:to-orange-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg dark:shadow-neon-cyan/20 shadow-orange-500/20 disabled:shadow-none"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
