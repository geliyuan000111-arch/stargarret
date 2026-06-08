import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatMessage } from './components/ChatMessage';
import { NoteListItem } from './components/NoteListItem';
import { SettingsModal } from './components/SettingsModal';
import { SearchOverlay } from './components/SearchOverlay';
import { PinView } from './components/PinView';
import { Note, DEFAULT_CATEGORY, CATEGORY_COLORS } from './types';
import { parseNoteWithAI, fetchLinkMetadata, generateChatResponse, generateBondSummary } from './services/geminiService';

export const APP_AVATAR_URL = "https://i.imgur.com/4g1ycZQ.png";

const LOADING_MESSAGES = [
  "正在努力思考中...叽",
  "叽...叽...叽！",
  "在脑瓜里翻找回应...叽",
  "等我一下下哦叽！",
  "这就来这就来叽～",
  "正在捕捉灵感中...叽"
];

const ERROR_MESSAGES = [
  "发生了一些错误，主人再跟小叽说一次吧～",
  "小叽开小差了，主人请再说一遍叽～",
  "小叽电路好像打结了叽...",
  "信号断掉啦，主人稍等我修复一下叽！",
  "呜呜，没听清刚才那句话叽..."
];

const App: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem('smart_notes');
    return saved ? JSON.parse(saved) : [];
  });
  const [inputValue, setInputValue] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [eggDeletingId, setEggDeletingId] = useState<string | null>(null);
  
  // 模式状态
  const [appMode, setAppMode] = useState<'work' | 'chat'>('work');
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [currentLoadingText, setCurrentLoadingText] = useState(LOADING_MESSAGES[0]);
  const [showSettings, setShowSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [pinMode, setPinMode] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [tipDismissed, setTipDismissed] = useState(() => localStorage.getItem('api_tip_dismissed') === 'true');
  const [commandUsage, setCommandUsage] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem('command_usage') || '{}'); } catch { return {}; }
  });
  const [savedTags, setSavedTags] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('saved_tags') || '[]'); } catch { return []; }
  });
  const hasAI = !!apiKey;

  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isComposingRef = useRef(false);
  const justFinishedComposingRef = useRef(false);

  const usedCommands = useMemo(() => {
    if (appMode === 'chat') return ['/羁绊总结'];
    return Object.entries(commandUsage)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cmd]) => cmd);
  }, [commandUsage, appMode]);

  useEffect(() => {
    const checkSpecialDates = () => {
      const now = new Date();
      const month = now.getMonth() + 1;
      const day = now.getDate();
      const year = now.getFullYear();
      const dateKey = `${month}-${day}`;
      const lastEggKey = `last_egg_sent_${year}`;
      const savedEggDate = localStorage.getItem(lastEggKey);
      
      let greeting = '';
      if (month === 3 && day === 30 && savedEggDate !== dateKey) {
        greeting = '生日快乐';
      } else if (month === 12 && day === 25 && savedEggDate !== dateKey) {
        greeting = '圣诞快乐';
      }

      if (greeting) {
        const systemGreeting: Note = {
          id: `egg-${Date.now()}`,
          category: '系统',
          content: greeting,
          rawInput: `System:${greeting}`,
          timestamp: Date.now(),
          mode: 'work'
        };
        setNotes(prev => [...prev, systemGreeting]);
        localStorage.setItem(lastEggKey, dateKey);
      }
    };
    checkSpecialDates();
  }, []);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current && !selectedCategory) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedCategory]);

  useEffect(() => {
    localStorage.setItem('smart_notes', JSON.stringify(notes));
    if (!selectedCategory) {
      scrollToBottom();
    }
  }, [notes, selectedCategory, scrollToBottom]);

  useEffect(() => {
    if (pendingMessage) {
      scrollToBottom();
    }
  }, [pendingMessage, scrollToBottom]);

  const handleAction = async () => {
    if (!inputValue.trim() || isProcessing) return;

    const query = inputValue.trim();
    setInputValue('');

    // --- 模式分支：闲聊模式 ---
    if (appMode === 'chat') {
      setIsProcessing(true);
      setCurrentLoadingText(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
      
      const userMsg: Note = {
        id: `chat-u-${Date.now()}`,
        category: '系统',
        content: query,
        rawInput: query,
        timestamp: Date.now(),
        mode: 'chat'
      };
      setNotes(prev => [...prev, userMsg]);

      // 处理特定指令：/羁绊总结
      if (query === '/羁绊总结') {
        try {
          // 提取最近10条闲聊内容作为总结上下文
          const recentChats = notes
            .filter(n => n.mode === 'chat' && n.category === '系统')
            .slice(-10)
            .map(n => n.content);
          
          const summary = await generateBondSummary(recentChats);
          
          const bondNote: Note = {
            id: `bond-${Date.now()}`,
            category: '羁绊',
            content: summary,
            rawInput: '/羁绊总结',
            timestamp: Date.now(),
            mode: 'chat',
            remark: ''
          };
          
          // 在对话流中回复
          const replyMsg: Note = {
            id: `chat-s-bond-${Date.now() + 1}`,
            category: '系统',
            content: summary,
            rawInput: `System:${summary}`,
            timestamp: Date.now() + 1,
            mode: 'chat'
          };
          
          setNotes(prev => [...prev, bondNote, replyMsg]);
        } catch (err) {
          console.error(err);
        } finally {
          setIsProcessing(false);
        }
        return;
      }

      // 忽略其他指令，仅作为普通聊天
      if (query.startsWith('/')) {
        const replyMsg: Note = {
          id: `chat-s-err-${Date.now() + 1}`,
          category: '系统',
          content: "小叽现在只听得懂“/羁绊总结”这一个指令哦，其他的指令要在工作模式告诉我叽！",
          rawInput: `System:Err`,
          timestamp: Date.now() + 1,
          mode: 'chat'
        };
        setNotes(prev => [...prev, replyMsg]);
        setIsProcessing(false);
        return;
      }

      try {
        const chatHistory = notes
          .filter(n => n.mode === 'chat' && n.category === '系统')
          .slice(-6)
          .map(n => ({
            role: n.rawInput.startsWith('System:') ? 'model' : 'user',
            parts: [{ text: n.content }]
          }));

        const response = await generateChatResponse(query, chatHistory);
        
        const replyMsg: Note = {
          id: `chat-s-${Date.now() + 1}`,
          category: '系统',
          content: response,
          rawInput: `System:${response}`,
          timestamp: Date.now() + 1,
          mode: 'chat'
        };
        setNotes(prev => [...prev, replyMsg]);
      } catch (err) {
        const errorReply = ERROR_MESSAGES[Math.floor(Math.random() * ERROR_MESSAGES.length)];
        const replyMsg: Note = {
          id: `chat-err-${Date.now() + 1}`,
          category: '系统',
          content: errorReply,
          rawInput: `System:${errorReply}`,
          timestamp: Date.now() + 1,
          mode: 'chat'
        };
        setNotes(prev => [...prev, replyMsg]);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // --- 模式分支：工作模式 (保持不变) ---
    const emotionalKeywords = ['呜呜', '想哭', '难过', '累了', '不开心'];
    if (emotionalKeywords.some(keyword => query.includes(keyword))) {
      const userMsg: Note = {
        id: `user-emo-${Date.now()}`,
        category: '系统',
        content: query,
        rawInput: query,
        timestamp: Date.now(),
        mode: 'work'
      };
      const replyMsg: Note = {
        id: `reply-emo-${Date.now() + 1}`,
        category: '系统',
        content: '抱抱～叽',
        rawInput: 'System:抱抱～叽',
        timestamp: Date.now() + 1,
        mode: 'work'
      };
      setNotes(prev => [...prev, userMsg, replyMsg]);
      return;
    }

    const missYouRegex = /^(.+)，我很想你$/;
    if (missYouRegex.test(query)) {
      const userMsg: Note = {
        id: `user-hh-${Date.now()}`,
        category: '系统',
        content: query,
        rawInput: query,
        timestamp: Date.now(),
        mode: 'work'
      };
      const replyMsg: Note = {
        id: `reply-hh-${Date.now() + 1}`,
        category: '系统',
        content: '往前看吧，别总停在过去了，前面更有趣。',
        rawInput: 'System:往前看吧，别总停在过去了，前面更有趣。',
        timestamp: Date.now() + 1,
        mode: 'work'
      };
      setNotes(prev => [...prev, userMsg, replyMsg]);
      return;
    }

    const lastNote = notes[notes.length - 1];
    const isSpecialReplyActive = lastNote?.category === '系统' && lastNote?.content === '往前看吧，别总停在过去了，前面更有趣。';
    
    if (query === '我往前走了' || (query === '好的' && isSpecialReplyActive)) {
      const targetNote = [...notes].reverse().find(n => n.category === '系统' && missYouRegex.test(n.content));
      if (targetNote) {
        const element = document.getElementById(`chat-msg-${targetNote.id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const idsToFlash = notes
            .filter(n => n.category === '系统' && (missYouRegex.test(n.content) || n.content === '往前看吧，别总停在过去了，前面更有趣。'))
            .map(n => n.id)
            .join(',');
          setEggDeletingId(idsToFlash);
          setTimeout(() => {
            setNotes(prev => prev.filter(n => 
              !(n.category === '系统' && (missYouRegex.test(n.content) || n.content === '往前看吧，别总停在过去了，前面更有趣。'))
            ));
            setEggDeletingId(null);
          }, 1500);
        }
      } else {
        setNotes(prev => prev.filter(n => 
          !(n.category === '系统' && (missYouRegex.test(n.content) || n.content === '往前看吧，别总停在过去了，前面更有趣。'))
        ));
      }
      return;
    }

    setPendingMessage(query);
    setIsProcessing(true);
    try {
        const commandMatch = query.match(/^\/(\S+)\s+(.*)$/);
        let category, content;

        if (commandMatch) {
          category = commandMatch[1];
          content = commandMatch[2];
          const cmd = commandMatch[0].split(' ')[0];
          setCommandUsage(prev => {
            const next = { ...prev, [cmd]: (prev[cmd] || 0) + 1 };
            localStorage.setItem('command_usage', JSON.stringify(next));
            return next;
          });
        } else {
          const parsed = hasAI
            ? await parseNoteWithAI(query)
            : { category: DEFAULT_CATEGORY, content: query };
          category = parsed.category;
          content = parsed.content;
        }

        const extractedUrl = content.match(/https?:\/\/[^\s]+/)?.[0]?.replace(/[.,;:!?)"']+$/, '') ?? '';
        const isUrl = !!extractedUrl;
        const noteId = Date.now().toString();
        const newNote: Note = {
          id: noteId,
          category,
          content,
          rawInput: query,
          timestamp: Date.now(),
          mode: 'work',
          isParsing: isUrl
        };

        setNotes(prev => [...prev, newNote]);

        if (isUrl) {
          fetchLinkMetadata(extractedUrl).then(metadata => {
            setNotes(prev => prev.map(n => n.id === noteId ? { ...n, linkMetadata: metadata, isParsing: false } : n));
          });
        }
      } catch (error) {
        console.error(error);
    } finally {
      setPendingMessage(null);
      setIsProcessing(false);
    }
  };

  const handleCommandClick = (cmd: string) => {
    // 如果是指令，直接处理，无需加空格
    if (cmd === '/羁绊总结' && appMode === 'chat') {
        setInputValue(cmd);
        // 这里立即触发提交也可以，但为了交互统一，还是让用户按回车或点击提交
        return;
    }
    setInputValue(cmd + ' ');
    inputRef.current?.focus();
  };

  const handleModeSwitch = (mode: 'work' | 'chat') => {
    setAppMode(mode);
    setShowModeMenu(false);
    setSelectedCategory(null);
  };

  // 根据当前模式隔离对话流
  const currentFlowNotes = useMemo(() => {
    return notes.filter(n => n.mode === appMode || (!n.mode && appMode === 'work'));
  }, [notes, appMode]);

  const filteredNotes = selectedCategory 
    ? currentFlowNotes.filter(n => n.category === selectedCategory)
    : currentFlowNotes;

  const isUrl = /^(https?:\/\/[^\s]+)/.test(inputValue.trim());

  const inputPlaceholder = useMemo(() => {
    if (appMode === 'chat') return "跟小叽聊聊天吧～叽";
    if (isProcessing) return "正在努力分类中...叽";
    return "输入内容 或者  /指令+内容吧";
  }, [isProcessing, appMode]);

  const handleSaveApiKey = useCallback((key: string) => {
    localStorage.setItem('gemini_api_key', key);
    setApiKey(key);
    setShowSettings(false);
  }, []);

  const handleExport = useCallback(() => {
    const blob = new Blob([JSON.stringify(notes, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `星星阁楼备份_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [notes]);

  const handleImport = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (!Array.isArray(parsed)) throw new Error();
        setNotes(parsed);
        localStorage.setItem('smart_notes', JSON.stringify(parsed));
        setShowSettings(false);
      } catch {
        alert('文件格式不正确');
      }
    };
    reader.readAsText(file);
  }, []);

  const handleClearAll = useCallback(() => {
    setNotes([]);
    localStorage.removeItem('smart_notes');
  }, []);

  const handleSaveTag = useCallback((tag: string) => {
    setSavedTags(prev => {
      if (prev.includes(tag)) return prev;
      const next = [...prev, tag];
      localStorage.setItem('saved_tags', JSON.stringify(next));
      return next;
    });
  }, []);

  const handleUpdatePriority = useCallback((id: string, priority: Note['priority']) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, priority } : n));
  }, []);

  const handleUpdateTags = useCallback((id: string, tags: string[]) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, tags } : n));
  }, []);

  const handleDismissTip = useCallback(() => {
    localStorage.setItem('api_tip_dismissed', 'true');
    setTipDismissed(true);
  }, []);

  const handleEnterPin = useCallback(async () => {
    setPinMode(true);
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const { LogicalSize } = await import('@tauri-apps/api/dpi');
      const win = getCurrentWindow();
      await win.setMinSize(new LogicalSize(320, 280));
      await win.setSize(new LogicalSize(320, 520));
    } catch {
      // 浏览器环境或 Tauri API 不可用时静默跳过
    }
  }, []);

  const handleExitPin = useCallback(async () => {
    setPinMode(false);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const { LogicalSize } = await import('@tauri-apps/api/dpi');
      await invoke('set_pin_window_level', { pinned: false });
      const win = getCurrentWindow();
      await win.setMinSize(new LogicalSize(800, 600));
      await win.setSize(new LogicalSize(1100, 750));
    } catch {
      // 浏览器环境或 Tauri API 不可用时静默跳过
    }
  }, []);

  const handleSearchNavigate = useCallback((noteId: string, category: string) => {
    setSelectedCategory(category);
    setTimeout(() => {
      const el = document.getElementById(`note-${noteId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedId(noteId);
        setTimeout(() => setHighlightedId(null), 2500);
      }
    }, 100);
  }, []);

  const handleAnchor = (noteId: string) => {
    // 切换回“发消息”主对话流视图
    setSelectedCategory(null);
    // 给渲染留一点时间
    setTimeout(() => {
      // 锚定到最近的一条消息
      const element = document.getElementById(`chat-msg-${noteId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // 高亮一下
        setHighlightedId(noteId);
        setTimeout(() => setHighlightedId(null), 2500);
      }
    }, 100);
  };

  if (pinMode) {
    return (
      <PinView
        notes={notes}
        onExit={handleExitPin}
        onToggleComplete={id => setNotes(prev => prev.map(n => n.id === id ? { ...n, isCompleted: !n.isCompleted } : n))}
        onUpdatePriority={handleUpdatePriority}
        onUpdateRemark={(id, remark) => setNotes(prev => prev.map(n => n.id === id ? { ...n, remark } : n))}
        onDelete={id => setNotes(prev => prev.filter(n => n.id !== id))}
        onTogglePinned={id => setNotes(prev => prev.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n))}
      />
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-50 overflow-hidden">
      {showSearch && (
        <SearchOverlay
          notes={notes}
          appMode={appMode}
          onClose={() => setShowSearch(false)}
          onNavigate={handleSearchNavigate}
        />
      )}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          notes={notes}
          apiKey={apiKey}
          onSaveApiKey={handleSaveApiKey}
          onExport={handleExport}
          onImport={handleImport}
          onClearAll={handleClearAll}
        />
      )}
      <Sidebar
        notes={notes}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        appMode={appMode}
        onOpenSettings={() => setShowSettings(true)}
      />

      <main className="flex-1 flex flex-col min-w-0 bg-[#f8fafc]">
        <header className="px-6 py-4 bg-white border-b border-gray-200 z-30 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${appMode === 'work' ? (selectedCategory ? 'bg-indigo-500' : 'bg-green-500') : 'bg-pink-400'} animate-pulse`}></div>
            <div>
              <h2 className="text-sm font-bold text-gray-800">
                {appMode === 'work' ? (selectedCategory ? `${selectedCategory}` : '工作叽') : '闲聊叽'}
              </h2>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium">
                {appMode === 'work' ? (selectedCategory ? `${filteredNotes.length} 条记录` : '7/24 always online') : '7/24 WAITING FOR YOU'}
              </p>
            </div>
          </div>

          {/* 右上角操作区 */}
          <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearch(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-gray-500 hover:text-indigo-600 bg-gray-100 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 rounded-full text-xs font-medium transition-all"
            title="全局搜索"
          >
            <i className="fas fa-search text-[11px]" />
            <span>搜索</span>
          </button>
          <button
            onClick={handleEnterPin}
            className="flex items-center gap-1.5 px-3 py-1.5 text-gray-500 hover:text-indigo-600 bg-gray-100 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 rounded-full text-xs font-medium transition-all"
            title="缩小窗口 Pin 到桌面"
          >
            <i className="fas fa-thumbtack text-[11px]" />
            <span>桌面便签</span>
          </button>
          {/* 右上角模式切换 */}
          <div className="relative">
            <button 
              onClick={() => setShowModeMenu(!showModeMenu)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full hover:bg-slate-100 transition-all group"
            >
              <div className={`w-2 h-2 rounded-full ${appMode === 'work' ? 'bg-indigo-500' : 'bg-pink-400 animate-pulse'}`}></div>
              <span className="text-xs font-bold text-gray-600">
                {appMode === 'work' ? '工作叽' : '闲聊叽'}
              </span>
              <i className={`fas fa-chevron-down text-[8px] text-gray-400 transition-transform ${showModeMenu ? 'rotate-180' : ''}`}></i>
            </button>

            {showModeMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowModeMenu(false)}></div>
                <div className="absolute top-full right-0 mt-2 w-40 bg-white border border-gray-100 rounded-xl shadow-xl z-50 p-1 animate-in fade-in zoom-in-95 duration-200">
                  <button 
                    onClick={() => handleModeSwitch('work')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors ${appMode === 'work' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <i className="fas fa-briefcase w-3 text-center"></i>
                    工作叽
                  </button>
                  <button 
                    onClick={() => handleModeSwitch('chat')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors ${appMode === 'chat' ? 'bg-pink-50 text-pink-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <i className="fas fa-comment-dots w-3 text-center"></i>
                    闲聊叽
                  </button>
                </div>
              </>
            )}
          </div>
          </div>
        </header>

        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto px-4 md:px-8 pt-6 pb-8 scroll-smooth"
        >
          <div className="max-w-3xl mx-auto h-full">
            {selectedCategory === null ? (
              <>
                {filteredNotes.length === 0 && !isProcessing && (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-80">
                    <div 
                      className="w-24 h-24 bg-white rounded-xl flex items-center justify-center mb-6 shadow-md border-4 overflow-hidden"
                      style={{ borderColor: appMode === 'work' ? '#FFE0E3' : '#FBCFE8' }}
                    >
                      <img src={APP_AVATAR_URL} alt="Logo" className="w-full h-full object-cover" />
                    </div>
                    <h3 className="text-gray-800 font-semibold mb-2">
                      {appMode === 'work' ? '把你告诉我' : '我在听你说'}
                    </h3>
                  </div>
                )}
                
                {filteredNotes.map(note => (
                  <ChatMessage 
                    key={note.id} 
                    note={note} 
                    onDelete={id => setNotes(prev => prev.filter(n => n.id !== id))}
                    isDeleting={eggDeletingId?.includes(note.id)}
                    isHighlighted={highlightedId === note.id}
                  />
                ))}

                {isProcessing && (
                  <div className="flex flex-col gap-4 mb-8">
                    {pendingMessage && (
                      <div className="flex justify-end">
                        <div className="max-w-[80%] md:max-w-[70%] bg-indigo-600 text-white rounded-2xl rounded-tr-none px-4 py-3 shadow-sm">
                          <p className="text-sm md:text-base whitespace-pre-wrap">{pendingMessage}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex justify-start">
                      <div className="flex gap-3 max-w-[85%] md:max-w-[75%] items-start animate-pulse">
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 flex-shrink-0 shadow-sm">
                          <img src={APP_AVATAR_URL} alt="Avatar" className="w-full h-full object-cover" />
                        </div>
                        <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm text-xs text-indigo-400 font-medium flex items-center gap-2">
                           {appMode === 'chat' ? currentLoadingText : "正在努力分类中...叽"}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-100">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    {selectedCategory === '羁绊' ? '羁绊回忆录' : '内容详情'}
                  </h3>
                  <div className="flex items-center gap-2">
                    {isProcessing && (
                      <span className="text-[10px] text-indigo-400 animate-pulse font-bold">
                        AI 处理中...
                      </span>
                    )}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${selectedCategory === '羁绊' ? 'bg-pink-50 text-pink-600' : 'bg-indigo-50 text-indigo-600'}`}>
                      {selectedCategory}
                    </span>
                  </div>
                </div>
                {filteredNotes.length > 0 ? (
                  <div className="grid gap-3">
                    {filteredNotes.map(note => (
                      <NoteListItem
                        key={note.id}
                        note={note}
                        isHighlighted={highlightedId === note.id}
                        onDelete={id => setNotes(prev => prev.filter(n => n.id !== id))}
                        onToggleComplete={id => setNotes(prev => prev.map(n => n.id === id ? { ...n, isCompleted: !n.isCompleted } : n))}
                        onUpdateRemark={(id, remark) => setNotes(prev => prev.map(n => n.id === id ? { ...n, remark } : n))}
                        onUpdatePriority={handleUpdatePriority}
                        onAnchor={selectedCategory === '羁绊' ? () => handleAnchor(note.id) : undefined}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 opacity-40">
                    <i className="fas fa-folder-open text-4xl mb-4"></i>
                    <p className="text-sm">该分类下暂无内容</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {!hasAI && !tipDismissed && (
          <div className="px-4 md:px-8 py-2 bg-indigo-50 border-t border-indigo-100 flex items-center justify-between">
            <p className="text-xs text-indigo-500">
              点击左上角进入设置，关联 API，解锁 AI 智能叽～
            </p>
            <button onClick={handleDismissTip} className="text-indigo-300 hover:text-indigo-500 ml-4 flex-shrink-0">
              <i className="fas fa-times text-xs" />
            </button>
          </div>
        )}
        {!selectedCategory && <div className="p-4 md:px-6 md:pb-6 md:pt-4 bg-white border-t border-gray-100 shadow-sm relative z-20">
          <div className="max-w-3xl mx-auto">
            {/* 常用指令条 */}
            {!selectedCategory && usedCommands.length > 0 && (
              <div className="flex items-center gap-2 mb-3 overflow-x-auto no-scrollbar pb-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase whitespace-nowrap mr-1">
                    {appMode === 'work' ? '常用指令:' : '快捷指令:'}
                </span>
                {usedCommands.map(cmd => (
                  <button
                    key={cmd}
                    onClick={() => handleCommandClick(cmd)}
                    className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-all active:scale-95 ${
                        appMode === 'work' 
                        ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border-indigo-100' 
                        : 'bg-pink-50 hover:bg-pink-100 text-pink-600 border-pink-100'
                    }`}
                  >
                    {cmd}
                  </button>
                ))}
              </div>
            )}

            <div className={`relative group rounded-2xl border transition-all 
              ${isProcessing ? 'bg-gray-100 border-gray-200' : 'bg-slate-50 border-gray-200 focus-within:ring-4 focus-within:ring-indigo-500/5 focus-within:border-indigo-300 focus-within:bg-white'}
            `}>
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onCompositionStart={() => { isComposingRef.current = true; }}
                onCompositionEnd={() => { isComposingRef.current = false; justFinishedComposingRef.current = true; }}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') { justFinishedComposingRef.current = false; return; }
                  if (isComposingRef.current || justFinishedComposingRef.current) {
                    justFinishedComposingRef.current = false;
                    return;
                  }
                  handleAction();
                }}
                placeholder={inputPlaceholder}
                className="w-full bg-transparent py-4 pl-6 pr-16 focus:outline-none text-gray-700 placeholder:text-gray-400"
                disabled={isProcessing}
              />
              <div className="absolute right-2 top-2 bottom-2">
                <button
                  onClick={handleAction}
                  disabled={!inputValue.trim() || isProcessing}
                  className={`${appMode === 'work' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-pink-500 hover:bg-pink-600'} disabled:bg-gray-100 disabled:text-gray-400 text-white rounded-xl w-12 h-full transition-all flex items-center justify-center shadow-md active:scale-95`}
                >
                  {isProcessing ? (
                    <i className="fas fa-circle-notch fa-spin text-sm"></i>
                  ) : (
                    <i className="fas fa-arrow-up"></i>
                  )}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-center gap-6 mt-3 text-[9px] text-gray-400 uppercase tracking-[0.2em] font-bold">
              {appMode === 'work' ? (
                <span className="flex items-center gap-1">
                  <i className={`fas ${isUrl ? 'fa-link text-indigo-400' : 'fa-bolt text-amber-400'}`}></i>
                  {isUrl ? 'AI 智能分类' : 'AI 实时分类模式'}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-pink-400 animate-pulse">
                  <i className="fas fa-heart"></i> 闲聊陪伴模式开启中
                </span>
              )}
            </div>
          </div>
        </div>}
      </main>
    </div>
  );
};

export default App;