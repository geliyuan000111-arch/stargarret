import React, { useState, useEffect, useRef } from 'react';
import { Note, CATEGORY_COLORS } from '../types';

interface SearchOverlayProps {
  notes: Note[];
  appMode: 'work' | 'chat';
  onClose: () => void;
  onNavigate: (noteId: string, category: string) => void;
}

export const SearchOverlay: React.FC<SearchOverlayProps> = ({ notes, appMode, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const searchableNotes = notes.filter(n =>
    n.category !== '系统' &&
    (n.mode === appMode || (!n.mode && appMode === 'work'))
  );

  const results = query.trim()
    ? searchableNotes.filter(n => {
        const q = query.toLowerCase();
        return (
          n.content.toLowerCase().includes(q) ||
          (n.remark && n.remark.toLowerCase().includes(q)) ||
          (n.priority && n.priority.toLowerCase().includes(q)) ||
          n.category.toLowerCase().includes(q)
        );
      })
    : [];

  const highlight = (text: string) => {
    if (!query.trim()) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-yellow-200 text-yellow-900 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
        {text.slice(idx + query.length)}
      </>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* 搜索输入 */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <i className="fas fa-search text-gray-400 text-sm" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={`搜索${appMode === 'work' ? '笔记' : '羁绊'}内容、分类、优先级…`}
            className="flex-1 text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
          />
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <i className="fas fa-times text-sm" />
          </button>
        </div>

        {/* 搜索结果 */}
        <div className="max-h-[60vh] overflow-y-auto">
          {query.trim() === '' ? (
            <p className="text-center text-xs text-gray-400 py-10">输入关键词开始搜索</p>
          ) : results.length === 0 ? (
            <p className="text-center text-xs text-gray-400 py-10">没有找到匹配内容</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {results.map(note => (
                <li key={note.id}>
                  <button
                    onClick={() => { onNavigate(note.id, note.category); onClose(); }}
                    className="w-full text-left px-5 py-3.5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${CATEGORY_COLORS[note.category] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {note.category}
                      </span>
                      {note.priority && (
                        <span className="text-[10px] text-gray-400">{note.priority}</span>
                      )}
                      <span className="text-[10px] text-gray-300 ml-auto">
                        {new Date(note.timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2 leading-relaxed">
                      {highlight(note.content)}
                    </p>
                    {note.remark && (
                      <p className="text-xs text-gray-400 mt-0.5 italic line-clamp-1">
                        {highlight(note.remark)}
                      </p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {results.length > 0 && (
          <div className="px-5 py-2.5 border-t border-gray-50 text-[10px] text-gray-400">
            找到 {results.length} 条结果
          </div>
        )}
      </div>
    </div>
  );
};
