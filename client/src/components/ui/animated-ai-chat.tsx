import { useEffect, useRef, useCallback } from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
    Paperclip,
    SendIcon,
    XIcon,
    LoaderIcon,
    Sparkles,
    Command,
    Search,
    FolderTree,
    GitBranch,
    FileCode,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import * as React from "react";

interface UseAutoResizeTextareaProps {
    minHeight: number;
    maxHeight?: number;
}

function useAutoResizeTextarea({
    minHeight,
    maxHeight,
}: UseAutoResizeTextareaProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = useCallback(
        (reset?: boolean) => {
            const textarea = textareaRef.current;
            if (!textarea) return;

            if (reset) {
                textarea.style.height = `${minHeight}px`;
                return;
            }

            textarea.style.height = `${minHeight}px`;
            const newHeight = Math.max(
                minHeight,
                Math.min(
                    textarea.scrollHeight,
                    maxHeight ?? Number.POSITIVE_INFINITY
                )
            );

            textarea.style.height = `${newHeight}px`;
        },
        [minHeight, maxHeight]
    );

    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = `${minHeight}px`;
        }
    }, [minHeight]);

    useEffect(() => {
        const handleResize = () => adjustHeight();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [adjustHeight]);

    return { textareaRef, adjustHeight };
}

interface CommandSuggestion {
    icon: React.ReactNode;
    label: string;
    description: string;
    prefix: string;
}

interface TextareaProps
    extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    containerClassName?: string;
    showRing?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, containerClassName, showRing = true, onFocus, onBlur, ...props }, ref) => {
        const [isFocused, setIsFocused] = React.useState(false);

        return (
            <div className={cn("relative", containerClassName)}>
                <textarea
                    className={cn(
                        "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                        "transition-all duration-200 ease-in-out",
                        "placeholder:text-muted-foreground",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                        showRing
                            ? "focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                            : "",
                        className
                    )}
                    ref={ref}
                    onFocus={(e) => { setIsFocused(true); onFocus?.(e); }}
                    onBlur={(e) => { setIsFocused(false); onBlur?.(e); }}
                    {...props}
                />

                {showRing && isFocused && (
                    <motion.span
                        className="absolute inset-0 rounded-md pointer-events-none ring-2 ring-offset-0 dark:ring-neon-cyan/30 ring-orange-500/30"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    />
                )}
            </div>
        );
    }
);
Textarea.displayName = "Textarea";

export { useAutoResizeTextarea, Textarea, TypingDots };
export type { CommandSuggestion, UseAutoResizeTextareaProps };

export function AnimatedAIChat() {
    const [value, setValue] = useState("");
    const [attachments, setAttachments] = useState<string[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [activeSuggestion, setActiveSuggestion] = useState<number>(-1);
    const [showCommandPalette, setShowCommandPalette] = useState(false);
    const [recentCommand, setRecentCommand] = useState<string | null>(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const { textareaRef, adjustHeight } = useAutoResizeTextarea({
        minHeight: 60,
        maxHeight: 200,
    });
    const [inputFocused, setInputFocused] = useState(false);
    const commandPaletteRef = useRef<HTMLDivElement>(null);

    const commandSuggestions: CommandSuggestion[] = [
        {
            icon: <Search className="w-4 h-4" />,
            label: "Search Code",
            description: "Search across the codebase",
            prefix: "/search",
        },
        {
            icon: <FolderTree className="w-4 h-4" />,
            label: "Explain Structure",
            description: "Explain the project structure",
            prefix: "/structure",
        },
        {
            icon: <GitBranch className="w-4 h-4" />,
            label: "Trace Flow",
            description: "Trace a code execution flow",
            prefix: "/trace",
        },
        {
            icon: <Sparkles className="w-4 h-4" />,
            label: "Summarize",
            description: "Summarize a file or module",
            prefix: "/summarize",
        },
    ];

    useEffect(() => {
        if (value.startsWith("/") && !value.includes(" ")) {
            setShowCommandPalette(true);

            const matchingSuggestionIndex = commandSuggestions.findIndex(
                (cmd) => cmd.prefix.startsWith(value)
            );

            if (matchingSuggestionIndex >= 0) {
                setActiveSuggestion(matchingSuggestionIndex);
            } else {
                setActiveSuggestion(-1);
            }
        } else {
            setShowCommandPalette(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePosition({ x: e.clientX, y: e.clientY });
        };

        window.addEventListener("mousemove", handleMouseMove);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
        };
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const commandButton = document.querySelector(
                "[data-command-button]"
            );

            if (
                commandPaletteRef.current &&
                !commandPaletteRef.current.contains(target) &&
                !commandButton?.contains(target)
            ) {
                setShowCommandPalette(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (showCommandPalette) {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveSuggestion((prev) =>
                    prev < commandSuggestions.length - 1 ? prev + 1 : 0
                );
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveSuggestion((prev) =>
                    prev > 0 ? prev - 1 : commandSuggestions.length - 1
                );
            } else if (e.key === "Tab" || e.key === "Enter") {
                e.preventDefault();
                if (activeSuggestion >= 0) {
                    const selectedCommand =
                        commandSuggestions[activeSuggestion];
                    setValue(selectedCommand.prefix + " ");
                    setShowCommandPalette(false);

                    setRecentCommand(selectedCommand.label);
                    setTimeout(() => setRecentCommand(null), 3500);
                }
            } else if (e.key === "Escape") {
                e.preventDefault();
                setShowCommandPalette(false);
            }
        } else if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (value.trim()) {
                handleSendMessage();
            }
        }
    };

    const handleSendMessage = () => {
        if (value.trim()) {
            setIsTyping(true);
            setTimeout(() => {
                setIsTyping(false);
                setValue("");
                adjustHeight(true);
            }, 3000);
        }
    };

    const handleAttachFile = () => {
        const mockFileName = `file-${Math.floor(Math.random() * 1000)}.pdf`;
        setAttachments((prev) => [...prev, mockFileName]);
    };

    const removeAttachment = (index: number) => {
        setAttachments((prev) => prev.filter((_, i) => i !== index));
    };

    const selectCommandSuggestion = (index: number) => {
        const selectedCommand = commandSuggestions[index];
        setValue(selectedCommand.prefix + " ");
        setShowCommandPalette(false);

        setRecentCommand(selectedCommand.label);
        setTimeout(() => setRecentCommand(null), 2000);
    };

    // Suppress unused var warning — kept for future "recent command" toast
    void recentCommand;

    return (
        <div className="min-h-screen flex flex-col w-full items-center justify-center bg-transparent dark:text-white text-dark-800 p-6 relative overflow-hidden">
            <div className="absolute inset-0 w-full h-full overflow-hidden">
                <div className="absolute top-0 left-1/4 w-96 h-96 dark:bg-orange-500/10 bg-orange-500/5 rounded-full mix-blend-normal filter blur-[128px] animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 dark:bg-amber-500/10 bg-amber-500/5 rounded-full mix-blend-normal filter blur-[128px] animate-pulse delay-700" />
                <div className="absolute top-1/4 right-1/3 w-64 h-64 dark:bg-orange-600/10 bg-orange-400/5 rounded-full mix-blend-normal filter blur-[96px] animate-pulse delay-1000" />
            </div>
            <div className="w-full max-w-2xl mx-auto relative">
                <motion.div
                    className="relative z-10 space-y-12"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                >
                    <div className="text-center space-y-3">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                            className="inline-block"
                        >
                            <h1 className="text-3xl font-medium tracking-tight bg-clip-text text-transparent bg-gradient-to-r dark:from-white/90 dark:to-white/40 from-dark-800 to-dark-500 pb-1">
                                How can I help today?
                            </h1>
                            <motion.div
                                className="h-px bg-gradient-to-r from-transparent dark:via-white/20 via-dark-300/40 to-transparent"
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: "100%", opacity: 1 }}
                                transition={{ delay: 0.5, duration: 0.8 }}
                            />
                        </motion.div>
                        <motion.p
                            className="text-sm dark:text-white/40 text-dark-400"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                        >
                            Type a command or ask a question
                        </motion.p>
                    </div>

                    <motion.div
                        className="relative backdrop-blur-2xl dark:bg-white/[0.02] bg-white/60 rounded-2xl border dark:border-white/[0.05] border-light-300 shadow-2xl dark:shadow-none shadow-light-400/20"
                        initial={{ scale: 0.98 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.1 }}
                    >
                        <AnimatePresence>
                            {showCommandPalette && (
                                <motion.div
                                    ref={commandPaletteRef}
                                    className="absolute left-4 right-4 bottom-full mb-2 backdrop-blur-xl dark:bg-black/90 bg-white/95 rounded-lg z-50 shadow-lg dark:border-white/10 border-light-300 border overflow-hidden"
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 5 }}
                                    transition={{ duration: 0.15 }}
                                >
                                    <div className="py-1 dark:bg-black/95 bg-white/95">
                                        {commandSuggestions.map(
                                            (suggestion, index) => (
                                                <motion.div
                                                    key={suggestion.prefix}
                                                    className={cn(
                                                        "flex items-center gap-2 px-3 py-2 text-xs transition-colors cursor-pointer",
                                                        activeSuggestion ===
                                                            index
                                                            ? "dark:bg-white/10 bg-orange-500/10 dark:text-white text-dark-800"
                                                            : "dark:text-white/70 text-dark-500 dark:hover:bg-white/5 hover:bg-light-200"
                                                    )}
                                                    onClick={() =>
                                                        selectCommandSuggestion(
                                                            index
                                                        )
                                                    }
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{
                                                        delay: index * 0.03,
                                                    }}
                                                >
                                                    <div className="w-5 h-5 flex items-center justify-center dark:text-white/60 text-dark-400">
                                                        {suggestion.icon}
                                                    </div>
                                                    <div className="font-medium">
                                                        {suggestion.label}
                                                    </div>
                                                    <div className="dark:text-white/40 text-dark-400 text-xs ml-1">
                                                        {suggestion.prefix}
                                                    </div>
                                                </motion.div>
                                            )
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="p-4">
                            <Textarea
                                ref={textareaRef}
                                value={value}
                                onChange={(e) => {
                                    setValue(e.target.value);
                                    adjustHeight();
                                }}
                                onKeyDown={handleKeyDown}
                                onFocus={() => setInputFocused(true)}
                                onBlur={() => setInputFocused(false)}
                                placeholder="Ask Archie a question..."
                                containerClassName="w-full"
                                className={cn(
                                    "w-full px-4 py-3",
                                    "resize-none",
                                    "bg-transparent",
                                    "border-none",
                                    "dark:text-white/90 text-dark-800 text-sm",
                                    "focus:outline-none",
                                    "dark:placeholder:text-white/20 placeholder:text-dark-400",
                                    "min-h-[60px]"
                                )}
                                style={{
                                    overflow: "hidden",
                                }}
                                showRing={false}
                            />
                        </div>

                        <AnimatePresence>
                            {attachments.length > 0 && (
                                <motion.div
                                    className="px-4 pb-3 flex gap-2 flex-wrap"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                >
                                    {attachments.map((file, index) => (
                                        <motion.div
                                            key={index}
                                            className="flex items-center gap-2 text-xs dark:bg-white/[0.03] bg-light-200 py-1.5 px-3 rounded-lg dark:text-white/70 text-dark-500"
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                        >
                                            <span>{file}</span>
                                            <button
                                                onClick={() =>
                                                    removeAttachment(index)
                                                }
                                                className="dark:text-white/40 text-dark-400 hover:text-red-400 transition-colors"
                                            >
                                                <XIcon className="w-3 h-3" />
                                            </button>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="p-4 border-t dark:border-white/[0.05] border-light-300 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <motion.button
                                    type="button"
                                    onClick={handleAttachFile}
                                    whileTap={{ scale: 0.94 }}
                                    className="p-2 dark:text-white/40 text-dark-400 dark:hover:text-white/90 hover:text-dark-800 rounded-lg transition-colors relative group"
                                >
                                    <Paperclip className="w-4 h-4" />
                                    <motion.span
                                        className="absolute inset-0 dark:bg-white/[0.05] bg-light-200 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                        layoutId="button-highlight"
                                    />
                                </motion.button>
                                <motion.button
                                    type="button"
                                    data-command-button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowCommandPalette(
                                            (prev) => !prev
                                        );
                                    }}
                                    whileTap={{ scale: 0.94 }}
                                    className={cn(
                                        "p-2 dark:text-white/40 text-dark-400 dark:hover:text-white/90 hover:text-dark-800 rounded-lg transition-colors relative group",
                                        showCommandPalette &&
                                            "dark:bg-white/10 bg-orange-500/10 dark:text-white/90 text-orange-600"
                                    )}
                                >
                                    <Command className="w-4 h-4" />
                                    <motion.span
                                        className="absolute inset-0 dark:bg-white/[0.05] bg-light-200 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                        layoutId="button-highlight-cmd"
                                    />
                                </motion.button>
                            </div>

                            <motion.button
                                type="button"
                                onClick={handleSendMessage}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                disabled={isTyping || !value.trim()}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                                    "flex items-center gap-2",
                                    value.trim()
                                        ? "dark:bg-white dark:text-[#0A0A0B] bg-orange-500 text-white shadow-lg dark:shadow-white/10 shadow-orange-500/20"
                                        : "dark:bg-white/[0.05] bg-light-200 dark:text-white/40 text-dark-400"
                                )}
                            >
                                {isTyping ? (
                                    <LoaderIcon className="w-4 h-4 animate-[spin_2s_linear_infinite]" />
                                ) : (
                                    <SendIcon className="w-4 h-4" />
                                )}
                                <span>Send</span>
                            </motion.button>
                        </div>
                    </motion.div>

                    <div className="flex flex-wrap items-center justify-center gap-2">
                        {commandSuggestions.map((suggestion, index) => (
                            <motion.button
                                key={suggestion.prefix}
                                onClick={() =>
                                    selectCommandSuggestion(index)
                                }
                                className="flex items-center gap-2 px-3 py-2 dark:bg-white/[0.02] bg-white/60 dark:hover:bg-white/[0.05] hover:bg-white/80 rounded-lg text-sm dark:text-white/60 text-dark-500 dark:hover:text-white/90 hover:text-dark-800 transition-all relative group border dark:border-white/[0.05] border-light-300"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                {suggestion.icon}
                                <span>{suggestion.label}</span>
                            </motion.button>
                        ))}
                    </div>
                </motion.div>
            </div>

            <AnimatePresence>
                {isTyping && (
                    <motion.div
                        className="fixed bottom-8 mx-auto transform -translate-x-1/2 backdrop-blur-2xl dark:bg-white/[0.02] bg-white/80 rounded-full px-4 py-2 shadow-lg dark:border-white/[0.05] border-light-300 border"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-7 rounded-full dark:bg-white/[0.05] bg-orange-500/10 flex items-center justify-center text-center">
                                <FileCode className="w-3.5 h-3.5 dark:text-neon-cyan text-orange-500" />
                            </div>
                            <div className="flex items-center gap-2 text-sm dark:text-white/70 text-dark-500">
                                <span>Archie is thinking</span>
                                <TypingDots />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {inputFocused && (
                <motion.div
                    className="fixed w-[50rem] h-[50rem] rounded-full pointer-events-none z-0 opacity-[0.02] bg-gradient-to-r dark:from-orange-500 dark:via-amber-500 dark:to-orange-600 from-orange-400 via-amber-400 to-orange-500 blur-[96px]"
                    animate={{
                        x: mousePosition.x - 400,
                        y: mousePosition.y - 400,
                    }}
                    transition={{
                        type: "spring",
                        damping: 25,
                        stiffness: 150,
                        mass: 0.5,
                    }}
                />
            )}
        </div>
    );
}

function TypingDots() {
    return (
        <div className="flex items-center ml-1">
            {[1, 2, 3].map((dot) => (
                <motion.div
                    key={dot}
                    className="w-1.5 h-1.5 dark:bg-neon-cyan bg-orange-500 rounded-full mx-0.5"
                    initial={{ opacity: 0.3 }}
                    animate={{
                        opacity: [0.3, 0.9, 0.3],
                        scale: [0.85, 1.1, 0.85],
                    }}
                    transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        delay: dot * 0.15,
                        ease: "easeInOut",
                    }}
                    style={{
                        boxShadow:
                            "0 0 4px rgba(249, 115, 22, 0.3)",
                    }}
                />
            ))}
        </div>
    );
}
