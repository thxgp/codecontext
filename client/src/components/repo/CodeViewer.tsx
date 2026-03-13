import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { FileNode } from '../../types';
import { X, FileCode, Box, ArrowUpRight } from 'lucide-react';
import { useThemeStore } from '../../stores/themeStore';

interface CodeViewerProps {
  file: FileNode;
  onClose: () => void;
}

const languageMap: Record<string, string> = {
  javascript: 'javascript',
  typescript: 'typescript',
  python: 'python',
  rust: 'rust',
  go: 'go',
  java: 'java',
  json: 'json',
  markdown: 'markdown',
  css: 'css',
  html: 'html',
  yaml: 'yaml',
};

export default function CodeViewer({ file, onClose }: CodeViewerProps) {
  const language = languageMap[file.language] || 'text';
  const { theme } = useThemeStore();

  return (
    <div className="h-full flex flex-col dark:bg-dark-800 bg-white rounded-lg overflow-hidden border dark:border-dark-700 border-light-300">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3 border-b dark:border-dark-700 border-light-300">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <FileCode className="w-4 h-4 sm:w-5 sm:h-5 dark:text-neon-cyan text-orange-500 flex-shrink-0" />
          <span className="font-medium dark:text-white text-dark-800 text-sm sm:text-base truncate">{file.path}</span>
          <span className="text-xs dark:text-dark-400 text-dark-500 dark:bg-dark-700 bg-light-200 px-2 py-0.5 rounded flex-shrink-0 hidden sm:inline">
            {file.language}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 sm:p-1 dark:text-dark-400 text-dark-500 dark:hover:text-white hover:text-dark-800 transition-colors min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Summary */}
      {file.summary && (
        <div className="px-3 py-2 sm:px-4 sm:py-3 dark:bg-dark-900/50 bg-light-100 border-b dark:border-dark-700 border-light-300">
          <p className="text-xs sm:text-sm dark:text-dark-300 text-dark-600">{file.summary}</p>
        </div>
      )}

      {/* Imports/Exports */}
      {(file.imports.length > 0 || file.exports.length > 0) && (
        <div className="px-3 py-2 sm:px-4 flex flex-col sm:flex-row gap-1.5 sm:gap-4 text-xs border-b dark:border-dark-700 border-light-300 dark:bg-dark-800 bg-light-50">
          {file.imports.length > 0 && (
            <div className="flex items-center gap-2">
              <Box className="w-3 h-3 dark:text-neon-magenta text-orange-500" />
              <span className="dark:text-dark-400 text-dark-500">Imports:</span>
              <span className="dark:text-dark-300 text-dark-600">{file.imports.slice(0, 5).join(', ')}</span>
              {file.imports.length > 5 && (
                <span className="dark:text-dark-500 text-dark-400">+{file.imports.length - 5} more</span>
              )}
            </div>
          )}
          {file.exports.length > 0 && (
            <div className="flex items-center gap-2">
              <ArrowUpRight className="w-3 h-3 dark:text-neon-cyan text-emerald-500" />
              <span className="dark:text-dark-400 text-dark-500">Exports:</span>
              <span className="dark:text-dark-300 text-dark-600">{file.exports.join(', ')}</span>
            </div>
          )}
        </div>
      )}

      {/* Code */}
      <div className="flex-1 overflow-auto">
        <SyntaxHighlighter
          language={language}
          style={theme === 'dark' ? oneDark : oneLight}
          showLineNumbers
          customStyle={{
            margin: 0,
            padding: '0.75rem',
            background: 'transparent',
            fontSize: '12px',
            lineHeight: '1.5',
          }}
        >
          {file.content || '// File content not available'}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
