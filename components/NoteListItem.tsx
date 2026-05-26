import React, { useState, useRef, useEffect } from 'react';
import { Note } from '../types';
import { openUrl } from '../utils/openUrl';

const PRESET_PRIORITIES = ['紧急', '本周', '下周', '暂停'];

const PRIORITY_STYLES: Record<string, string> = {
  '紧急': 'bg-red-100 text-red-600 border-red-200',
  '暂停': 'bg-gray-100 text-gray-500 border-gray-200',
  '本周': 'bg-amber-100 text-amber-600 border-amber-200',
  '下周': 'bg-blue-100 text-blue-600 border-blue-200',
};

const getPriorityStyle = (p: string) =>
  PRIORITY_STYLES[p] || 'bg-purple-100 text-purple-600 border-purple-200';

interface NoteListItemProps {
  note: Note;
  isHighlighted?: boolean;
  onDelete: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onUpdateRemark: (id: string, remark: string) => void;
  onUpdatePriority: (id: string, priority: string | undefined) => void;
  onAnchor?: () => void;
}

export const NoteListItem: React.FC<NoteListItemProps> = ({
  note, isHighlighted, onDelete, onToggleComplete, onUpdateRemark, onUpdatePriority, onAnchor,
}) => {
  const dateStr = new Date(note.timestamp).toLocaleDateString('zh-CN', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const priorityRef = useRef<HTMLDivElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  const isBond = note.category === '羁绊';

  const renderContent = () => {
    const completedCls = note.isCompleted ? 'line-through opacity-40' : '';
    if (!note.linkMetadata || note.isParsing) {
      return (
        <p className={`text-gray-700 text-sm md:text-base leading-relaxed break-words whitespace-pre-wrap flex-1 ${note.isCompleted ? 'line-through decoration-gray-400 text-gray-400' : ''}`}>
          {note.content}
        </p>
      );
    }
    const url = note.linkMetadata.url;
    const title = note.linkMetadata.title || url;
    const idx = note.content.indexOf(url);
    const linkBtn = (
      <button
        onClick={() => openUrl(url)}
        className={`text-indigo-600 hover:text-indigo-800 hover:underline transition-colors text-left ${completedCls}`}
      >
        {title}
      </button>
    );
    if (idx === -1 || (!note.content.slice(0, idx).trim() && !note.content.slice(idx + url.length).trim())) {
      return <div className={`text-sm md:text-base leading-relaxed flex-1 ${completedCls}`}>{linkBtn}</div>;
    }
    const before = note.content.slice(0, idx);
    const after = note.content.slice(idx + url.length);
    return (
      <p className={`text-gray-700 text-sm md:text-base leading-relaxed break-words whitespace-pre-wrap flex-1 ${note.isCompleted ? 'line-through decoration-gray-400 text-gray-400' : ''}`}>
        {before}{linkBtn}{after}
      </p>
    );
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (priorityRef.current && !priorityRef.current.contains(e.target as Node)) {
        setShowPriorityMenu(false);
        setCustomInput('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (showPriorityMenu) customInputRef.current?.focus();
  }, [showPriorityMenu]);

  const handlePrioritySelect = (p: string) => {
    onUpdatePriority(note.id, note.priority === p ? undefined : p);
    setShowPriorityMenu(false);
    setCustomInput('');
  };

  const handleCustomSubmit = () => {
    const val = customInput.trim();
    if (val) onUpdatePriority(note.id, val);
    setShowPriorityMenu(false);
    setCustomInput('');
  };

  return (
    <div
      id={`note-${note.id}`}
      className={`group flex flex-col p-4 bg-white border rounded-xl transition-all duration-500
        ${note.isCompleted ? 'bg-gray-50 border-gray-100 opacity-60' : 'border-gray-100 hover:shadow-md'}
        ${isHighlighted ? 'ring-4 ring-yellow-400/50 scale-[1.02] shadow-xl bg-yellow-50 z-10' : ''}
        ${isBond ? 'border-pink-50 hover:border-pink-200' : ''}
      `}
    >
      <div className="flex items-start gap-3">
        {!isBond ? (
          <button
            onClick={() => onToggleComplete(note.id)}
            className={`mt-1 flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors
              ${note.isCompleted ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-gray-300 bg-white hover:border-indigo-400'}
            `}
          >
            {note.isCompleted && <i className="fas fa-check text-[10px]" />}
          </button>
        ) : (
          <div className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-pink-100 flex items-center justify-center text-pink-500">
            <i className="fas fa-heart text-[10px]" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* 内容 + 优先级 */}
          <div className="flex items-start justify-between gap-2">
            {renderContent()}

            {!isBond && (
              <div className="relative flex-shrink-0" ref={priorityRef}>
                <button
                  onClick={() => setShowPriorityMenu(v => !v)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border font-medium transition-colors ${
                    note.priority
                      ? getPriorityStyle(note.priority)
                      : 'text-gray-300 border-gray-200 hover:border-gray-300 hover:text-gray-400'
                  }`}
                >
                  {note.priority || '优先级'}
                </button>

                {showPriorityMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-20 p-1.5 min-w-[100px]">
                    {PRESET_PRIORITIES.map(p => (
                      <button
                        key={p}
                        onClick={() => handlePrioritySelect(p)}
                        className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors ${
                          note.priority === p ? getPriorityStyle(p) : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <div className="flex items-center gap-1 px-1">
                        <input
                          ref={customInputRef}
                          type="text"
                          value={customInput}
                          onChange={e => setCustomInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleCustomSubmit(); if (e.key === 'Escape') setShowPriorityMenu(false); }}
                          placeholder="自定义..."
                          className="flex-1 text-xs px-2 py-1 border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-300 min-w-0"
                        />
                        <button onClick={handleCustomSubmit} className="text-indigo-400 hover:text-indigo-600 flex-shrink-0">
                          <i className="fas fa-check text-[10px]" />
                        </button>
                      </div>
                      {note.priority && (
                        <button
                          onClick={() => { onUpdatePriority(note.id, undefined); setShowPriorityMenu(false); }}
                          className="w-full text-left px-3 py-1.5 text-xs text-gray-400 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors mt-0.5"
                        >
                          清空
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 链接来源 */}
          {!isBond && note.isParsing ? (
            <div className="mt-2 flex items-center gap-2 animate-pulse">
              <i className="fas fa-spinner fa-spin text-indigo-300 text-[10px]" />
              <span className="text-[10px] text-gray-300">正在解析链接标题...</span>
            </div>
          ) : note.linkMetadata ? (
            <div className="mt-1 flex items-center gap-1.5">
              <i className="fas fa-link text-gray-300 text-[9px]" />
              <span className="text-[10px] text-gray-400 truncate">{note.linkMetadata.siteName}</span>
            </div>
          ) : null}

          {/* 备注输入 */}
          <input
            type="text"
            value={note.remark || ''}
            onChange={e => onUpdateRemark(note.id, e.target.value)}
            placeholder="添加备注..."
            className="mt-2 w-full text-xs p-1.5 bg-transparent border border-transparent hover:border-gray-200 focus:border-indigo-200 focus:bg-white rounded transition-all focus:outline-none text-gray-500 italic"
          />

          {/* 底部：时间 + 操作 */}
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] text-gray-300 tracking-wide">{dateStr}</span>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
              {onAnchor && (
                <button onClick={onAnchor} className="text-gray-300 hover:text-indigo-500 p-1" title="回到原对话位置">
                  <i className="fas fa-anchor text-xs" />
                </button>
              )}
              <button onClick={() => onDelete(note.id)} className="text-gray-300 hover:text-red-500 p-1" title="删除">
                <i className="fas fa-trash-alt text-xs" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
