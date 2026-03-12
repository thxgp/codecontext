import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Trash2, FileCode, Plus, Sparkles, Bot, Command, Search, FolderTree, GitBranch, MessageSquare, ChevronDown, AlertCircle, Square } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useRepoStore } from '../../stores/repoStore';
import { cn } from '@/lib/utils';
import { useAutoResizeTextarea, TypingDots } from '@/components/ui/animated-ai-chat';
import type { CommandSuggestion } from '@/components/ui/animated-ai-chat';
import { motion, AnimatePresence } from 'framer-motion';

const AGENT_NAME = 'Archie';

const COMMAND_SUGGESTIONS: CommandSuggestion[] = [
  {
    icon: <Search className="w-4 h-4" />,
    label: 'Search',
    description: 'Search across the codebase',
    prefix: '/search',
  },
  {
    icon: <FolderTree className="w-4 h-4" />,
    label: 'Structure',
    description: 'Explain the project structure',
    prefix: '/structure',
  },
  {
    icon: <GitBranch className="w-4 h-4" />,
    label: 'Trace',
    description: 'Trace a code execution flow',
    prefix: '/trace',
  },
  {
    icon: <Sparkles className="w-4 h-4" />,
    label: 'Summarize',
    description: 'Summarize a file or module',
    prefix: '/summarize',
  },
];

interface ChatPanelProps {
  repoId: string;
  onFileClick: (path: string) => void;
}

export default function ChatPanel({ repoId, onFileClick }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [inputFocused, setInputFocused] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [showSessionList, setShowSessionList] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const commandPaletteRef = useRef<HTMLDivElement>(null);
  const sessionListRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const { chatMessages, chatSessions, activeSessionId, isChatLoading, askQuestion, newChat, selectSession, deleteSession, abortGeneration } = useRepoStore();
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 36,
    maxHeight: 120,
  });

  // Scroll to bottom on new messages — use container scrollTop to avoid page scroll
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [chatMessages]);

  // Command palette: show when typing / at start
  useEffect(() => {
    if (input.startsWith('/') && !input.includes(' ')) {
      setShowCommandPalette(true);
      const matchIdx = COMMAND_SUGGESTIONS.findIndex((cmd) =>
        cmd.prefix.startsWith(input)
      );
      setActiveSuggestion(matchIdx >= 0 ? matchIdx : -1);
    } else {
      setShowCommandPalette(false);
    }
  }, [input]);

  // Mouse tracking for gradient glow
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Close command palette on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const commandButton = document.querySelector('[data-command-button]');
      if (
        commandPaletteRef.current &&
        !commandPaletteRef.current.contains(target) &&
        !commandButton?.contains(target)
      ) {
        setShowCommandPalette(false);
      }
      if (
        sessionListRef.current &&
        !sessionListRef.current.contains(target)
      ) {
        setShowSessionList(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isChatLoading) return;

    setInput('');
    adjustHeight(true);
    setChatError(null);

    try {
      await askQuestion(repoId, trimmed);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong. Please try again.';
      setChatError(message);
      console.error('Failed to ask question:', error);
    }
  };

  const handleNewChat = () => {
    newChat();
    setShowSessionList(false);
  };

  const handleSelectSession = (sessionId: string) => {
    selectSession(repoId, sessionId);
    setShowSessionList(false);
  };

  const handleDeleteSession = (sessionId: string) => {
    deleteSession(repoId, sessionId);
  };

  const selectCommand = useCallback(
    (index: number) => {
      const cmd = COMMAND_SUGGESTIONS[index];
      if (!cmd) return;
      setInput(cmd.prefix + ' ');
      setShowCommandPalette(false);
      adjustHeight();
    },
    [adjustHeight]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showCommandPalette) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSuggestion((prev) =>
          prev < COMMAND_SUGGESTIONS.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSuggestion((prev) =>
          prev > 0 ? prev - 1 : COMMAND_SUGGESTIONS.length - 1
        );
      } else if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        if (activeSuggestion >= 0) {
          selectCommand(activeSuggestion);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowCommandPalette(false);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="h-full w-full min-h-0 min-w-0 flex flex-col dark:bg-dark-900/50 bg-light-50 rounded-xl border dark:border-white/[0.06] border-light-300 overflow-hidden shadow-sm dark:shadow-none relative">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between px-6 py-4 border-b dark:border-white/[0.06] border-light-300 shrink-0"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-2.5 group relative">
          <div className="w-8 h-8 rounded-lg dark:bg-neon-cyan/15 bg-orange-500/15 flex items-center justify-center cursor-default">
            <Bot className="w-4.5 h-4.5 dark:text-neon-cyan text-orange-500" />
            {/* Tooltip */}
            <div className="absolute left-0 top-full mt-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
              <div className="dark:bg-dark-700 bg-white border dark:border-dark-600 border-stone-200 rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
                <p className="text-xs font-bold dark:text-white text-gray-900">Archie <span className="font-normal italic dark:text-dark-400 text-gray-400">/ahr-chee/</span></p>
                <p className="text-[10px] dark:text-dark-400 text-gray-400 mt-0.5">From <span className="italic">Archibald</span> &middot; <span className="dark:text-orange-400 text-orange-500 font-medium">"genuinely bold"</span></p>
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-semibold dark:text-white text-dark-800 text-sm leading-none">{AGENT_NAME}</h3>
            <span className="text-[11px] dark:text-dark-500 text-dark-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              Online
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* Session history dropdown */}
          {chatSessions.length > 0 && (
            <div className="relative" ref={sessionListRef}>
              <button
                onClick={() => setShowSessionList((prev) => !prev)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium dark:text-dark-400 text-dark-500 dark:hover:text-white hover:text-dark-800 dark:hover:bg-white/[0.06] hover:bg-light-200 rounded-lg transition-all',
                  showSessionList && 'dark:bg-white/[0.06] bg-light-200 dark:text-white text-dark-800'
                )}
                title="Chat history"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <ChevronDown className={cn('w-3 h-3 transition-transform', showSessionList && 'rotate-180')} />
              </button>

              <AnimatePresence>
                {showSessionList && (
                  <motion.div
                    className="absolute right-0 top-full mt-1.5 w-64 max-h-80 overflow-y-auto backdrop-blur-xl dark:bg-dark-900/95 bg-white/95 rounded-lg z-50 shadow-lg border dark:border-white/10 border-light-300"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="py-1">
                      {chatSessions.map((session) => (
                        <div
                          key={session.sessionId}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 text-xs cursor-pointer group',
                            activeSessionId === session.sessionId
                              ? 'dark:bg-neon-cyan/10 bg-orange-500/10 dark:text-white text-dark-800'
                              : 'dark:text-dark-300 text-dark-500 dark:hover:bg-white/[0.06] hover:bg-light-200'
                          )}
                          onClick={() => handleSelectSession(session.sessionId)}
                        >
                          <MessageSquare className="w-3.5 h-3.5 shrink-0 dark:text-dark-500 text-dark-400" />
                          <span className="flex-1 truncate">{session.title}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteSession(session.sessionId); }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 dark:text-dark-500 text-dark-400 hover:text-red-400 transition-all"
                            title="Delete session"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium dark:text-dark-400 text-dark-500 dark:hover:text-white hover:text-dark-800 dark:hover:bg-white/[0.06] hover:bg-light-200 rounded-lg transition-all"
            title="New chat"
          >
            <Plus className="w-3.5 h-3.5" />
            New Chat
          </button>
        </div>
      </motion.div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto px-6 py-6 space-y-8" style={{ overscrollBehavior: 'contain' }}>
        <AnimatePresence mode="wait">
        {chatMessages.length === 0 ? (
          <motion.div
            key="empty-state"
            className="h-full flex flex-col items-center justify-center text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Agent avatar */}
            <motion.div
              className="w-20 h-20 rounded-2xl dark:bg-gradient-to-br dark:from-neon-cyan/20 dark:to-neon-magenta/20 bg-gradient-to-br from-orange-500/15 to-amber-500/15 flex items-center justify-center mb-5 border dark:border-neon-cyan/20 border-orange-500/20 shadow-lg dark:shadow-neon-cyan/10 shadow-orange-500/10"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              <Sparkles className="w-10 h-10 dark:text-neon-cyan text-orange-500" />
            </motion.div>
            
            {/* Greeting */}
            <motion.h3
              className="text-2xl font-semibold dark:text-white text-dark-800 mb-1.5"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
            >
              Hey, I'm {AGENT_NAME}
            </motion.h3>
            <motion.p
              className="text-sm dark:text-dark-400 text-dark-500 max-w-xs"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
            >
              Your AI code companion. I've analyzed this repo and I'm ready to help you explore it.
            </motion.p>
          </motion.div>
        ) : (
          <motion.div
            key="messages"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-8"
          >
          {chatMessages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.3) }}
              className={cn(
                msg.role === 'user' ? 'flex justify-end' : 'flex justify-start gap-3'
              )}
            >
              {/* Agent avatar for assistant messages */}
              {msg.role === 'assistant' && (
                <div className="relative group w-8 h-8 rounded-lg dark:bg-neon-cyan/15 bg-orange-500/15 flex items-center justify-center flex-shrink-0 mt-1 cursor-default">
                  <Bot className="w-4.5 h-4.5 dark:text-neon-cyan text-orange-500" />
                  <div className="absolute left-0 top-full mt-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
                    <div className="dark:bg-dark-700 bg-white border dark:border-dark-600 border-stone-200 rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
                      <p className="text-xs font-bold dark:text-white text-gray-900">Archie <span className="font-normal italic dark:text-dark-400 text-gray-400">/ahr-chee/</span></p>
                      <p className="text-[10px] dark:text-dark-400 text-gray-400 mt-0.5">From <span className="italic">Archibald</span> &middot; <span className="dark:text-orange-400 text-orange-500 font-medium">"genuinely bold"</span></p>
                    </div>
                  </div>
                </div>
              )}
              <div
                className={cn(
                  'max-w-[85%]',
                  msg.role === 'user'
                    ? 'rounded-2xl px-5 py-4 dark:bg-white/[0.06] bg-light-200/80 dark:text-white/90 text-dark-800'
                    : ''
                )}
              >
                {msg.role === 'user' ? (
                  <p className="text-[15px] whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                ) : (
                  <div className="text-[15px] prose dark:prose-invert prose-sm max-w-none prose-headings:mt-4 prose-headings:mb-2 dark:prose-headings:text-dark-100 prose-headings:text-dark-800 prose-headings:font-semibold prose-p:my-2 dark:prose-p:text-dark-200 prose-p:text-dark-600 prose-p:leading-relaxed prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 dark:prose-li:text-dark-200 prose-li:text-dark-600 dark:prose-code:bg-dark-700/50 prose-code:bg-light-200 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md dark:prose-code:text-neon-cyan prose-code:text-orange-600 prose-code:font-medium prose-code:text-[13px] dark:prose-pre:bg-dark-950 prose-pre:bg-light-100 prose-pre:border dark:prose-pre:border-white/[0.06] prose-pre:border-light-300 prose-pre:rounded-lg dark:prose-a:text-neon-cyan prose-a:text-orange-500 prose-a:no-underline hover:prose-a:underline dark:prose-strong:text-dark-100 prose-strong:text-dark-800">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                )}
                
                {/* Referenced files */}
                {msg.role === 'assistant' && (msg.referencedFiles || []).length > 0 && (
                  <div className="mt-3 pt-3 border-t dark:border-white/[0.06] border-light-300">
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
            </motion.div>
           ))}
          </motion.div>
        )}
        </AnimatePresence>
        
        {/* Loading indicator with animated typing dots */}
        <AnimatePresence>
          {isChatLoading && (
            <motion.div
              className="flex justify-start gap-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div className="relative group w-8 h-8 rounded-lg dark:bg-neon-cyan/15 bg-orange-500/15 flex items-center justify-center flex-shrink-0 mt-1 cursor-default">
                <Bot className="w-4.5 h-4.5 dark:text-neon-cyan text-orange-500 animate-pulse" />
                <div className="absolute left-0 top-full mt-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
                  <div className="dark:bg-dark-700 bg-white border dark:border-dark-600 border-stone-200 rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
                    <p className="text-xs font-bold dark:text-white text-gray-900">Archie <span className="font-normal italic dark:text-dark-400 text-gray-400">/ahr-chee/</span></p>
                    <p className="text-[10px] dark:text-dark-400 text-gray-400 mt-0.5">From <span className="italic">Archibald</span> &middot; <span className="dark:text-orange-400 text-orange-500 font-medium">"genuinely bold"</span></p>
                  </div>
                </div>
              </div>
              <div className="dark:bg-white/[0.04] bg-white border dark:border-white/[0.06] border-light-300 rounded-2xl px-5 py-4 shadow-sm">
                <div className="flex items-center gap-2 text-[15px] dark:text-dark-300 text-dark-500">
                  <span>Thinking</span>
                  <TypingDots />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Error message */}
        <AnimatePresence>
          {chatError && (
            <motion.div
              className="flex justify-start gap-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center flex-shrink-0 mt-1">
                <AlertCircle className="w-4 h-4 text-red-500" />
              </div>
              <div className="bg-red-500/[0.08] border border-red-500/20 rounded-2xl px-5 py-4 shadow-sm max-w-[85%]">
                <p className="text-sm text-red-400">{chatError}</p>
                <button
                  onClick={() => setChatError(null)}
                  className="text-xs text-red-400/60 hover:text-red-400 mt-2 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form ref={formRef} onSubmit={handleSubmit} className="relative px-4 pb-4 pt-2 shrink-0">
        {/* Command palette */}
        <AnimatePresence>
          {showCommandPalette && (
            <motion.div
              ref={commandPaletteRef}
              className="absolute left-4 right-4 bottom-full mb-2 backdrop-blur-xl dark:bg-dark-900/95 bg-white/95 rounded-lg z-50 shadow-lg border dark:border-white/10 border-light-300 overflow-hidden"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              transition={{ duration: 0.15 }}
            >
              <div className="py-1">
                {COMMAND_SUGGESTIONS.map((suggestion, index) => (
                  <motion.div
                    key={suggestion.prefix}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2.5 text-xs transition-colors cursor-pointer',
                      activeSuggestion === index
                        ? 'dark:bg-white/10 bg-orange-500/10 dark:text-white text-dark-800'
                        : 'dark:text-white/70 text-dark-500 dark:hover:bg-white/5 hover:bg-light-200'
                    )}
                    onClick={() => selectCommand(index)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <div className="w-5 h-5 flex items-center justify-center dark:text-neon-cyan/70 text-orange-500/70">
                      {suggestion.icon}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{suggestion.label}</div>
                      <div className="dark:text-white/30 text-dark-400 text-[11px]">{suggestion.description}</div>
                    </div>
                    <div className="dark:text-white/20 text-dark-300 text-[11px] font-mono">
                      {suggestion.prefix}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Compact single-row input bar */}
        <div className="flex items-center gap-1.5 dark:bg-dark-800/80 bg-white border dark:border-white/[0.08] border-light-300 rounded-2xl px-2.5 py-2 transition-all focus-within:dark:border-white/[0.15] focus-within:border-light-400">
          {/* Left side: command button */}
          <div className="flex-shrink-0">
            <motion.button
              type="button"
              data-command-button
              onClick={(e) => {
                e.stopPropagation();
                setShowCommandPalette((prev) => !prev);
              }}
              whileTap={{ scale: 0.9 }}
              className={cn(
                'w-7 h-7 flex items-center justify-center rounded-full transition-colors',
                showCommandPalette
                  ? 'dark:bg-white/10 bg-light-200 dark:text-white text-dark-800'
                  : 'dark:text-dark-400 text-dark-500 dark:hover:text-white hover:text-dark-800 dark:hover:bg-white/[0.08] hover:bg-light-200'
              )}
              title="Commands"
            >
              <Command className="w-3.5 h-3.5" />
            </motion.button>
          </div>

          {/* Input */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              adjustHeight();
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder={`Ask ${AGENT_NAME} anything\u2026`}
            className="flex-1 min-w-0 py-2 px-1.5 resize-none bg-transparent border-0 dark:text-white text-dark-800 text-sm leading-5 dark:placeholder-dark-500 placeholder-dark-400 focus:outline-none focus:ring-0 min-h-[36px] max-h-[120px]"
            style={{ overflowY: 'auto' }}
            rows={1}
          />

          {/* Send or Stop button — circular, inside the bar */}
          <div className="flex-shrink-0">
            {isChatLoading ? (
              <motion.button
                type="button"
                onClick={abortGeneration}
                whileTap={{ scale: 0.9 }}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all bg-red-500/10 text-red-500 hover:bg-red-500/20"
                title="Stop generating"
              >
                <Square className="w-3 h-3 fill-current" />
              </motion.button>
            ) : (
              <motion.button
                type="submit"
                whileTap={{ scale: 0.9 }}
                disabled={!input.trim()}
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center transition-all',
                  input.trim()
                    ? 'dark:bg-white bg-dark-800 dark:text-dark-900 text-white shadow-sm'
                    : 'dark:bg-white/[0.08] bg-light-200 dark:text-dark-500 text-dark-400'
                )}
              >
                <Send className="w-4 h-4" />
              </motion.button>
            )}
          </div>
        </div>
      </form>

      {/* Mouse-following gradient glow */}
      {inputFocused && (
        <motion.div
          className="absolute w-[50rem] h-[50rem] rounded-full pointer-events-none z-0 opacity-[0.03] bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 blur-[96px]"
          animate={{
            x: mousePosition.x - 400,
            y: mousePosition.y - 400,
          }}
          transition={{
            type: 'spring',
            damping: 25,
            stiffness: 150,
            mass: 0.5,
          }}
        />
      )}
    </div>
  );
}
