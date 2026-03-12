import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Search, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useRepoStore } from '../stores/repoStore';
import { Button, StatusBadge } from '../components/ui';
import { FileTree, CodeViewer } from '../components/repo';
import { ChatPanel } from '../components/chat';
import { FileTreeNode } from '../types';

export default function RepoView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    currentRepo,
    fileTree,
    selectedFile,
    isLoading,
    fetchRepo,
    fetchFileTree,
    fetchFile,
    fetchSessions,
    askQuestion,
    clearCurrentRepo
  } = useRepoStore();
  
  const [activeTab, setActiveTab] = useState<'files' | 'chat'>('chat');
  const [fileSearch, setFileSearch] = useState('');
  
  const MIN_SIDEBAR_WIDTH = 200;
  const MAX_SIDEBAR_WIDTH = 480;
  const DEFAULT_SIDEBAR_WIDTH = 288; // w-72
  const COLLAPSE_THRESHOLD = 120;
  
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    if (id) {
      fetchRepo(id);
      fetchFileTree(id);
      fetchSessions(id);
    }
    
    return () => clearCurrentRepo();
  }, [id, fetchRepo, fetchFileTree, fetchSessions, clearCurrentRepo]);

  useEffect(() => {
    if (currentRepo?.status === 'processing' || currentRepo?.status === 'pending') {
      const interval = setInterval(() => {
        if (id) fetchRepo(id);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [currentRepo?.status, id, fetchRepo]);

  const handleFileSelect = (path: string) => {
    if (id) {
      fetchFile(id, path);
    }
  };

  // When a referenced file is clicked in the chat, open it AND ask the AI to explain it
  const handleChatFileClick = (path: string) => {
    if (!id) return;
    fetchFile(id, path);
    setActiveTab('files');
    // Auto-ask AI to explain the clicked file as a follow-up
    const fileName = path.split('/').pop() || path;
    askQuestion(id, `Explain the file \`${fileName}\` (${path}). What does it do and how does it fit into the project?`);
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const effectiveWidth = isCollapsed ? 0 : sidebarWidth;
    dragRef.current = { startX: e.clientX, startWidth: effectiveWidth };
    setIsDragging(true);
    if (isCollapsed) {
      setIsCollapsed(false);
    }
  }, [sidebarWidth, isCollapsed]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const delta = e.clientX - dragRef.current.startX;
      const newWidth = dragRef.current.startWidth + delta;
      
      if (newWidth < COLLAPSE_THRESHOLD) {
        setSidebarWidth(0);
      } else {
        setSidebarWidth(Math.min(Math.max(newWidth, MIN_SIDEBAR_WIDTH), MAX_SIDEBAR_WIDTH));
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragRef.current = null;
      setSidebarWidth((w) => {
        if (w < COLLAPSE_THRESHOLD) {
          setIsCollapsed(true);
          return 0;
        }
        setIsCollapsed(false);
        return w;
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  const toggleSidebar = useCallback(() => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
    } else {
      setIsCollapsed(true);
      setSidebarWidth(0);
    }
  }, [isCollapsed]);

  // Filter file tree based on search
  const filterTree = (nodes: FileTreeNode[], search: string): FileTreeNode[] => {
    if (!search) return nodes;
    const lowerSearch = search.toLowerCase();
    return nodes.reduce((acc: FileTreeNode[], node) => {
      if (node.type === 'file') {
        if (node.name.toLowerCase().includes(lowerSearch)) {
          acc.push(node);
        }
      } else if (node.children) {
        const filtered = filterTree(node.children, search);
        if (filtered.length > 0) {
          acc.push({ ...node, children: filtered });
        }
      }
      return acc;
    }, []);
  };

  if (isLoading && !currentRepo) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 dark:border-neon-cyan border-light-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!currentRepo) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl dark:text-dark-300 text-light-500 mb-4">Repository not found</p>
          <Button onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const displayedFileTree = fileTree 
    ? Array.isArray(fileTree) 
      ? filterTree(fileTree as FileTreeNode[], fileSearch)
      : filterTree([fileTree], fileSearch)
    : null;

  return (
    <div className="warm-filter h-full flex flex-col dark:bg-dark-950 bg-light-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b dark:border-neon-cyan/10 border-light-300 dark:bg-dark-900/50 bg-white/50 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 dark:text-dark-400 text-light-500 dark:hover:text-neon-cyan hover:text-light-700 dark:hover:bg-neon-cyan/10 hover:bg-light-200 rounded-lg transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold dark:text-white text-light-900 tracking-tight">{currentRepo.full_name}</h1>
              <StatusBadge status={currentRepo.status} />
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              {(currentRepo.frameworks || []).map((f, i) => (
                <span
                  key={i}
                  className="text-xs font-medium dark:bg-neon-cyan/10 bg-light-600/10 dark:text-neon-cyan text-light-700 px-2.5 py-0.5 rounded-full dark:border-neon-cyan/20 border-light-400 border"
                >
                  {f}
                </span>
              ))}
              <span className="text-sm dark:text-dark-500 text-light-500">{currentRepo.total_files || 0} files analyzed</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex dark:bg-dark-800/80 bg-light-200 rounded-xl p-1 dark:border-neon-cyan/10 border-light-300 border">
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'chat'
                  ? 'dark:bg-neon-cyan/20 bg-light-600 dark:text-neon-cyan text-white shadow-sm dark:shadow-neon-cyan/20'
                  : 'dark:text-dark-400 text-light-500 dark:hover:text-white hover:text-light-800'
              }`}
            >
              AI Chat
            </button>
            <button
              onClick={() => setActiveTab('files')}
              className={`px-5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'files'
                  ? 'dark:bg-neon-cyan/20 bg-light-600 dark:text-neon-cyan text-white shadow-sm dark:shadow-neon-cyan/20'
                  : 'dark:text-dark-400 text-light-500 dark:hover:text-white hover:text-light-800'
              }`}
            >
              Files
            </button>
          </div>
        </div>
      </div>

      {/* Processing state */}
      {(currentRepo.status === 'pending' || currentRepo.status === 'processing') && (
        <div className="relative overflow-hidden dark:border-neon-cyan/20 border-light-400 border-b px-6 py-3 flex items-center gap-3 shrink-0">
          <div className="absolute inset-0 dark:bg-gradient-to-r dark:from-neon-cyan/10 dark:via-neon-magenta/10 dark:to-neon-cyan/10 bg-gradient-to-r from-light-400/20 via-light-600/20 to-light-400/20 animate-pulse-glow" />
          <RefreshCw className="w-5 h-5 dark:text-neon-cyan text-light-600 animate-spin relative" />
          <span className="dark:text-neon-cyan text-light-700 text-sm font-medium relative">
            Analyzing repository... This may take a few minutes.
          </span>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Sidebar - File Tree */}
        <div
          className="border-r dark:border-neon-cyan/10 border-light-300 overflow-y-auto dark:bg-dark-900/30 bg-white/30 shrink-0"
          style={{
            width: isCollapsed ? 0 : sidebarWidth,
            minWidth: isDragging ? 0 : (isCollapsed ? 0 : MIN_SIDEBAR_WIDTH),
            maxWidth: MAX_SIDEBAR_WIDTH,
            transition: isDragging ? 'none' : 'width 0.2s ease, min-width 0.2s ease',
            overflow: isCollapsed ? 'hidden' : undefined,
          }}
        >
          <div className="p-4 pb-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider dark:text-dark-500 text-light-500 mb-3">Files</h3>
            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-dark-500 text-light-500" />
              <input
                type="text"
                placeholder="Search files..."
                value={fileSearch}
                onChange={(e) => setFileSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg dark:bg-dark-800/50 bg-light-100 dark:border-neon-cyan/10 border-light-300 border dark:text-white text-light-900 dark:placeholder-dark-500 placeholder-light-500 focus:outline-none dark:focus:border-neon-cyan/30 focus:border-light-500 transition-colors"
              />
            </div>
          </div>
          <div className="px-2 pb-4">
            {displayedFileTree && displayedFileTree.length > 0 ? (
              displayedFileTree
                .sort((a, b) => {
                  if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
                  return a.name.localeCompare(b.name);
                })
                .map((child, i) => (
                  <FileTree
                    key={child.path || i}
                    node={child}
                    onFileSelect={handleFileSelect}
                    selectedPath={selectedFile?.path}
                  />
                ))
            ) : fileSearch ? (
              <div className="px-3 py-4 text-center">
                <p className="text-sm dark:text-dark-500 text-light-500">No files match "{fileSearch}"</p>
              </div>
            ) : (
              <div className="px-3 py-2">
                <div className="h-4 w-24 dark:bg-dark-700/50 bg-light-200 rounded animate-pulse" />
                <div className="h-4 w-32 dark:bg-dark-700/50 bg-light-200 rounded animate-pulse mt-2" />
                <div className="h-4 w-20 dark:bg-dark-700/50 bg-light-200 rounded animate-pulse mt-2" />
              </div>
            )}
          </div>
        </div>

        {/* Drag handle */}
        <div
          className={`relative shrink-0 group cursor-col-resize ${isDragging ? 'z-50' : 'z-10'}`}
          onMouseDown={handleMouseDown}
          onDoubleClick={toggleSidebar}
        >
          <div className="w-1 h-full dark:bg-dark-800 bg-light-200 dark:group-hover:bg-neon-cyan/40 group-hover:bg-orange-400/40 transition-colors" />
          {isDragging && (
            <div className="absolute inset-0 w-1 dark:bg-neon-cyan bg-orange-500 shadow-lg dark:shadow-neon-cyan/30 shadow-orange-500/30" />
          )}
          {/* Toggle button on handle */}
          <button
            onClick={(e) => { e.stopPropagation(); toggleSidebar(); }}
            className="absolute top-1/2 -translate-y-1/2 -left-3 w-6 h-6 rounded-full dark:bg-dark-800 bg-light-100 border dark:border-neon-cyan/20 border-light-300 flex items-center justify-center dark:text-dark-400 text-light-500 dark:hover:text-neon-cyan hover:text-orange-500 dark:hover:border-neon-cyan/40 hover:border-orange-400 transition-all opacity-0 group-hover:opacity-100 shadow-sm"
          >
            {isCollapsed ? <PanelLeftOpen className="w-3 h-3" /> : <PanelLeftClose className="w-3 h-3" />}
          </button>
        </div>

        {/* Main panel */}
        <div className="flex-1 flex min-w-0 min-h-0 overflow-hidden">
          {activeTab === 'chat' ? (
            <div className="flex-1 p-4 min-w-0 min-h-0 overflow-hidden">
              <ChatPanel repoId={id!} onFileClick={handleChatFileClick} />
            </div>
          ) : selectedFile ? (
            <div className="flex-1 p-4 min-w-0 min-h-0">
              <CodeViewer
                file={selectedFile}
                onClose={() => useRepoStore.setState({ selectedFile: null })}
              />
            </div>
          ) : (
            <div className="flex-1 flex min-w-0 min-h-0 items-center justify-center dark:text-dark-500 text-light-500">
              <div className="text-center">
                <div className="w-12 h-12 rounded-xl dark:bg-neon-cyan/10 bg-light-200 flex items-center justify-center mx-auto mb-3">
                  <ArrowLeft className="w-5 h-5" />
                </div>
                <p className="font-medium">Select a file to view</p>
                <p className="text-sm dark:text-dark-600 text-light-400 mt-1">Choose from the sidebar</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
