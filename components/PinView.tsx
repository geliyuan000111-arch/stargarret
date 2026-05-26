import React, { useState, useEffect } from 'react';
import { Note } from '../types';
import { APP_AVATAR_URL } from '../App';

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
}

export const PinView: React.FC<PinViewProps> = ({ notes, onExit, onToggleComplete, onUpdatePriority }) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false);
  const [priorityMenuId, setPriorityMenuId] = useState<string | null>(null);

  const workNotes = notes.filter(n =>
    n.category !== '系统' &&
    (n.mode === 'work' || !n.mode)
  );

  const categories = [...new Set(workNotes.map(n => n.category))].sort();

  const displayNotes = selectedCategory
    ? workNotes.filter(n => n.category === selectedCategory)
    : workNotes;

  const toggleAlwaysOnTop = async () => {
    const next = !isAlwaysOnTop;
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('set_pin_window_level', { pinned: next });
    } catch {
      // 浏览器环境静默跳过
    }
    setIsAlwaysOnTop(next);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest('[data-priority-menu]')) {
        setPriorityMenuId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
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
                className="flex items-start gap-2 px-3 py-2 border-b border-gray-50 hover:bg-gray-50 transition-colors group"
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
    </div>
  );
};
