import { useState } from 'react';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from 'lucide-react';
import clsx from 'clsx';
import { FileTreeNode } from '../../types';

interface FileTreeProps {
  node: FileTreeNode;
  onFileSelect: (path: string) => void;
  selectedPath?: string;
  level?: number;
}

const languageColors: Record<string, string> = {
  typescript: 'dark:text-blue-400 text-blue-600',
  javascript: 'dark:text-yellow-400 text-yellow-600',
  python: 'dark:text-emerald-400 text-emerald-600',
  rust: 'dark:text-orange-400 text-orange-600',
  go: 'dark:text-cyan-400 text-cyan-600',
  java: 'dark:text-red-400 text-red-600',
  json: 'dark:text-amber-300 text-amber-600',
  markdown: 'dark:text-gray-400 text-gray-600',
  css: 'dark:text-pink-400 text-pink-600',
  html: 'dark:text-orange-300 text-orange-600',
};

export default function FileTree({ node, onFileSelect, selectedPath, level = 0 }: FileTreeProps) {
  const [isOpen, setIsOpen] = useState(level < 2);

  if (node.type === 'file') {
    const colorClass = languageColors[node.language || ''] || 'dark:text-dark-400 text-dark-500';
    const isSelected = selectedPath === node.path;
    
    return (
      <button
        onClick={() => node.path && onFileSelect(node.path)}
        className={clsx(
          'w-full flex items-center gap-2 py-1.5 rounded-md text-sm text-left relative group',
          'transition-all duration-150',
          isSelected
            ? 'dark:bg-neon-cyan/15 bg-orange-500/15 dark:text-white text-dark-800'
            : 'dark:text-dark-300 text-dark-600 dark:hover:bg-white/[0.04] hover:bg-dark-100 dark:hover:text-white hover:text-dark-800'
        )}
        style={{ paddingLeft: `${level * 16 + 12}px`, paddingRight: '8px' }}
      >
        {isSelected && (
          <div className="absolute left-0 top-1 bottom-1 w-[2px] rounded-full dark:bg-neon-cyan bg-orange-500" />
        )}
        <File className={clsx('w-4 h-4 flex-shrink-0', isSelected ? 'dark:text-neon-cyan text-orange-500' : colorClass)} />
        <span className="truncate">{node.name}</span>
      </button>
    );
  }

  return (
    <div className={clsx(level > 0 && 'relative')}>
      {level > 0 && (
        <div
          className="absolute top-0 bottom-0 w-px dark:bg-white/[0.04] bg-dark-200"
          style={{ left: `${level * 16 + 6}px` }}
        />
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'w-full flex items-center gap-2 py-1.5 rounded-md text-sm text-left',
          'dark:text-dark-200 text-dark-700 dark:hover:bg-white/[0.04] hover:bg-dark-100 dark:hover:text-white hover:text-dark-800 transition-all duration-150'
        )}
        style={{ paddingLeft: `${level * 16 + 12}px`, paddingRight: '8px' }}
      >
        <span className="flex-shrink-0 dark:text-dark-500 text-dark-400">
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </span>
        {isOpen ? (
          <FolderOpen className="w-4 h-4 flex-shrink-0 dark:text-neon-cyan text-orange-500" />
        ) : (
          <Folder className="w-4 h-4 flex-shrink-0 dark:text-neon-cyan/70 text-orange-500/70" />
        )}
        <span className="truncate font-medium">{node.name}</span>
      </button>
      
      {isOpen && node.children && (
        <div className="animate-fade-in">
          {node.children
            .sort((a, b) => {
              if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
              return a.name.localeCompare(b.name);
            })
            .map((child, i) => (
              <FileTree
                key={child.path || i}
                node={child}
                onFileSelect={onFileSelect}
                selectedPath={selectedPath}
                level={level + 1}
              />
            ))}
        </div>
      )}
    </div>
  );
}
