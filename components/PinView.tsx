import React, { useState, useEffect, useRef } from 'react';
import { Note } from '../types';
import { APP_AVATAR_URL } from '../App';
import { openUrl } from '../utils/openUrl';

const PRIORITY_STYLES: Record<string, string> = {
  '紧急': 'bg-red-100 text-red-600',
  '暂停': 'bg-gray-100 text-gray-500',
  '本周': 'bg-amber-100 text-amber-600',
  '下周': 'bg-blue-100 text-blue-600',
};
const PRESET_PRIORITIES = ['紧急', '本周', '下周', '暂停'];
const getPriorityStyle = (p: string) => PRIORITY_STYLES[p] || 'bg-purple-100 text-purple-600';

interface PinViewProps {
  notes: Note[];
  onExit: () => void;
  onToggleComplete: (id: string) => void;
  onUpdatePriority: (id: string, priority: string | undefined) => void;
  onUpdateRemark: (id: string, remark: string) => void;
  onDelete: (id: string) => void;
}

export const PinView: React.FC<PinViewProps> = ({ notes, onExit, onToggleComplete, onUpdatePriority, onUpdateRemark, onDelete }) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(() => {
    const stored = localStorage.getItem('pin_always_on_top');
    return stored === null ? true : stored === 'true';
  });
  const [priorityMenuId, setPriorityMenuId] = useState<string | null>(null);
  const [expandedNote, setExpandedNote] = useState<Note | null>(null);
  const [detailPriorityOpen, setDetailPriorityOpen] = useState(false);
  const [detailCustomInput, setDetailCustomInput] = useState('');
  const detailPriorityRef = useRef<HTMLDivElement>(null);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const workNotes = notes.filter(n =>
    n.category !== '系统' &&
    (n.mode === 'work' || !n.mode)
  );

  const categories = [...new Set(workNotes.map(n => n.category))].sort();

  const displayNotes = selectedCategory
    ? workNotes.filter(n => n.category === selectedCategory)
    : workNotes;

  const applyAlwaysOnTop = async (pinned: boolean) => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('set_pin_window_level', { pinned });
    } catch {
      // 浏览器环境静默跳过
    }
  };

  // 进入 Pin 模式时按存储的偏好立即应用置顶
  useEffect(() => {
    applyAlwaysOnTop(isAlwaysOnTop);
  }, []);

  const toggleAlwaysOnTop = async () => {
    const next = !isAlwaysOnTop;
    localStorage.setItem('pin_always_on_top', String(next));
    setIsAlwaysOnTop(next);
    await applyAlwaysOnTop(next);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest('[data-priority-menu]')) {
        setPriorityMenuId(null);
      }
      if (detailPriorityRef.current && !detailPriorityRef.current.contains(target)) {
        setDetailPriorityOpen(false);
        setDetailCustomInput('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // 当 expandedNote 变化时，同步最新笔记数据（备注、优先级等操作后刷新详情面板）
  useEffect(() => {
    if (expandedNote) {
      const latest = notes.find(n => n.id === expandedNote.id);
      if (latest) setExpandedNote(latest);
    }
  }, [notes]);

  const handleNoteClick = (note: Note) => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      setExpandedNote(note);
    } else {
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null;
      }, 250);
    }
  };

  return (
    <div className="relative flex flex-col h-screen bg-white overflow-hidden">
      {/* 标题栏 — 可拖拽区域 */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 flex-shrink-0 cursor-default"
        data-tauri-drag-region
      >
        <img src={APP_AVATAR_URL} alt="logo" className="w-5 h-5 rounded object-cover flex-shrink-0" />
        <span className="text-xs font-bold text-gray-700 flex-1 truncate" data-tauri-drag-region>
          星星阁楼
        </span>
        <button
          onClick={toggleAlwaysOnTop}
          title={isAlwaysOnTop ? '取消始终最前' : '始终最前'}
          className={`flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-medium transition-colors ${
            isAlwaysOnTop
              ? 'bg-indigo-100 text-indigo-600'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
          }`}
        >
          <i className={`fas fa-thumbtack text-[8px] ${isAlwaysOnTop ? '' : 'opacity-60'}`} />
          <span>始终在最前</span>
        </button>
        <button
          onClick={onExit}
          title="恢复全屏"
          className="flex-shrink-0 flex items-center gap-1 px-2 py-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg text-[9px] font-medium transition-colors"
        >
          <i className="fas fa-expand-alt text-[8px]" />
          <span>恢复全屏</span>
        </button>
      </div>

      {/* 分类标签栏 */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-50 overflow-x-auto no-scrollbar flex-shrink-0">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
            selectedCategory === null
              ? 'bg-indigo-100 text-indigo-700'
              : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
          }`}
        >
          全部&nbsp;{workNotes.length}
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
              selectedCategory === cat
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 笔记列表 */}
      <div className="flex-1 overflow-y-auto">
        {displayNotes.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[10px] text-gray-300">暂无记录</p>
          </div>
        ) : (
          <ul>
            {displayNotes.map(note => (
              <li
                key={note.id}
                onClick={() => handleNoteClick(note)}
                className="flex items-start gap-2 px-3 py-2 border-b border-gray-50 hover:bg-gray-50 transition-colors group cursor-pointer select-none"
              >
                <button
                  onClick={() => onToggleComplete(note.id)}
                  className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    note.isCompleted
                      ? 'bg-indigo-500 border-indigo-500 text-white'
                      : 'border-gray-300 hover:border-indigo-400 bg-white'
                  }`}
                >
                  {note.isCompleted && <i className="fas fa-check text-[7px]" />}
                </button>

                <p className={`flex-1 text-[11px] leading-snug break-words min-w-0 pt-px ${
                  note.isCompleted ? 'line-through text-gray-300' : 'text-gray-700'
                }`}>
                  {note.content}
                </p>

                {/* 优先级 */}
                <div
                  className="relative flex-shrink-0"
                  data-priority-menu
                >
                  <button
                    onClick={() => setPriorityMenuId(priorityMenuId === note.id ? null : note.id)}
                    className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium transition-colors leading-tight ${
                      note.priority
                        ? getPriorityStyle(note.priority)
                        : 'text-gray-200 hover:text-gray-400 opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    {note.priority || '·'}
                  </button>

                  {priorityMenuId === note.id && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-20 p-1 min-w-[72px]">
                      {PRESET_PRIORITIES.map(p => (
                        <button
                          key={p}
                          onClick={() => {
                            onUpdatePriority(note.id, note.priority === p ? undefined : p);
                            setPriorityMenuId(null);
                          }}
                          className={`w-full text-left px-2 py-1 text-[10px] rounded-lg transition-colors ${
                            note.priority === p ? getPriorityStyle(p) : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                      {note.priority && (
                        <button
                          onClick={() => { onUpdatePriority(note.id, undefined); setPriorityMenuId(null); }}
                          className="w-full text-left px-2 py-1 text-[10px] text-gray-400 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors mt-0.5 border-t border-gray-50"
                        >
                          清空
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 底部状态提示 */}
      <div className="px-3 py-1 border-t border-gray-50 flex-shrink-0">
        <p className="text-[9px] text-gray-300 text-center tracking-wide">
          {isAlwaysOnTop ? '📌 始终最前' : 'Pin 模式'}
        </p>
      </div>

      {/* 笔记详情遮罩 */}
      {expandedNote && (
        <div
          className="absolute inset-0 bg-black/40 z-30 flex flex-col"
          onClick={() => setExpandedNote(null)}
        >
          <div
            className="absolute inset-x-2 top-8 bottom-2 bg-white rounded-xl shadow-xl flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* 详情头部 */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 flex-shrink-0">
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                {expandedNote.category}
              </span>
              <button
                onClick={() => setExpandedNote(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <i className="fas fa-times text-[11px]" />
              </button>
            </div>

            {/* 详情内容 */}
            <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3">
              {/* 完成状态 + 正文 */}
              <div className="flex items-start gap-2">
                <button
                  onClick={() => onToggleComplete(expandedNote.id)}
                  className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                    expandedNote.isCompleted
                      ? 'bg-indigo-500 border-indigo-500 text-white'
                      : 'border-gray-300 hover:border-indigo-400 bg-white'
                  }`}
                >
                  {expandedNote.isCompleted && <i className="fas fa-check text-[9px]" />}
                </button>
                <p className={`flex-1 text-sm leading-relaxed break-words whitespace-pre-wrap ${
                  expandedNote.isCompleted ? 'line-through text-gray-300' : 'text-gray-700'
                }`}>
                  {expandedNote.content}
                </p>
              </div>

              {/* 链接元数据 */}
              {expandedNote.isParsing && (
                <div className="flex items-center gap-2 animate-pulse">
                  <i className="fas fa-spinner fa-spin text-indigo-300 text-[10px]" />
                  <span className="text-[10px] text-gray-300">正在解析链接...</span>
                </div>
              )}
              {expandedNote.linkMetadata && !expandedNote.isParsing && (
                <button
                  onClick={() => openUrl(expandedNote.linkMetadata!.url)}
                  className="flex items-center gap-1.5 text-left text-indigo-600 hover:text-indigo-800 text-xs hover:underline"
                >
                  <i className="fas fa-link text-[9px]" />
                  <span className="truncate">{expandedNote.linkMetadata.title || expandedNote.linkMetadata.url}</span>
                </button>
              )}

              {/* 优先级 */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 flex-shrink-0">优先级</span>
                <div className="relative" ref={detailPriorityRef}>
                  <button
                    onClick={() => setDetailPriorityOpen(v => !v)}
                    className={`text-[10px] px-2 py-0.5 rounded-full border font-medium transition-colors ${
                      expandedNote.priority
                        ? getPriorityStyle(expandedNote.priority) + ' border-current/20'
                        : 'text-gray-400 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {expandedNote.priority || '设置优先级'}
                  </button>
                  {detailPriorityOpen && (
                    <div className="absolute left-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-20 p-1.5 min-w-[100px]">
                      {PRESET_PRIORITIES.map(p => (
                        <button
                          key={p}
                          onClick={() => {
                            onUpdatePriority(expandedNote.id, expandedNote.priority === p ? undefined : p);
                            setDetailPriorityOpen(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors ${
                            expandedNote.priority === p ? getPriorityStyle(p) : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                      <div className="border-t border-gray-100 mt-1 pt-1 px-1 flex items-center gap-1">
                        <input
                          type="text"
                          value={detailCustomInput}
                          onChange={e => setDetailCustomInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && detailCustomInput.trim()) {
                              onUpdatePriority(expandedNote.id, detailCustomInput.trim());
                              setDetailPriorityOpen(false);
                              setDetailCustomInput('');
                            }
                            if (e.key === 'Escape') setDetailPriorityOpen(false);
                          }}
                          placeholder="自定义..."
                          className="flex-1 text-xs px-2 py-1 border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-300 min-w-0"
                        />
                        <button
                          onClick={() => {
                            if (detailCustomInput.trim()) {
                              onUpdatePriority(expandedNote.id, detailCustomInput.trim());
                              setDetailPriorityOpen(false);
                              setDetailCustomInput('');
                            }
                          }}
                          className="text-indigo-400 hover:text-indigo-600 flex-shrink-0"
                        >
                          <i className="fas fa-check text-[10px]" />
                        </button>
                      </div>
                      {expandedNote.priority && (
                        <button
                          onClick={() => { onUpdatePriority(expandedNote.id, undefined); setDetailPriorityOpen(false); }}
                          className="w-full text-left px-3 py-1.5 text-xs text-gray-400 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors mt-0.5"
                        >
                          清空
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 备注 */}
              <input
                type="text"
                value={expandedNote.remark || ''}
                onChange={e => onUpdateRemark(expandedNote.id, e.target.value)}
                placeholder="添加备注..."
                className="w-full text-xs p-2 bg-gray-50 border border-gray-100 hover:border-gray-200 focus:border-indigo-200 focus:bg-white rounded-lg transition-all focus:outline-none text-gray-500 italic"
              />

              {/* 时间 */}
              <span className="text-[10px] text-gray-300">
                {new Date(expandedNote.timestamp).toLocaleDateString('zh-CN', {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </span>
            </div>

            {/* 详情底部操作 */}
            <div className="px-3 py-2 border-t border-gray-50 flex justify-end flex-shrink-0">
              <button
                onClick={() => { onDelete(expandedNote.id); setExpandedNote(null); }}
                className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-red-500 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"
              >
                <i className="fas fa-trash-alt text-[9px]" />
                <span>删除</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
