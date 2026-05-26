import React from 'react';
import { Note, CATEGORY_COLORS } from '../types';
import { APP_AVATAR_URL } from '../App';

interface SidebarProps {
  notes: Note[];
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  appMode: 'work' | 'chat';
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ notes, selectedCategory, onSelectCategory, appMode, onOpenSettings }) => {
  const categoryStats = notes.reduce((acc, note) => {
    // 排除系统消息类别
    if (note.category === '系统') return acc;
    // 隔离模式数据
    const noteMode = note.mode || 'work';
    if (noteMode !== appMode) return acc;
    
    acc[note.category] = (acc[note.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const categories = Object.keys(categoryStats).sort();

  return (
    <div className="w-full md:w-64 bg-white border-r border-gray-200 h-full flex flex-col p-6 overflow-y-auto">
      <div className="flex items-center gap-3 mb-10 px-2">
        <button
          onClick={onOpenSettings}
          className="w-10 h-10 bg-white border-2 rounded-lg flex items-center justify-center shadow-md overflow-hidden hover:opacity-80 transition-opacity flex-shrink-0"
          style={{ borderColor: appMode === 'work' ? '#FFE0E3' : '#FBCFE8' }}
          title="设置"
        >
          <img src={APP_AVATAR_URL} alt="Logo" className="w-full h-full object-cover" />
        </button>
        <h1 className="text-xl font-bold text-gray-800 tracking-tight">StarGarret</h1>
      </div>

      <div className="space-y-1">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-2">对话连接</h3>
        
        <button
          onClick={() => onSelectCategory(null)}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all ${
            selectedCategory === null ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <span className="flex items-center gap-3">
            <i className={`fas ${appMode === 'work' ? 'fa-paper-plane' : 'fa-comments'} w-4`}></i>
            发消息
          </span>
          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-500">
            {notes.filter(n => n.mode === appMode || (!n.mode && appMode === 'work')).length}
          </span>
        </button>

        <div className="pt-4 pb-2">
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-2">
            {appMode === 'work' ? '笔记阁楼' : '羁绊阁楼'}
          </h3>
        </div>

        {categories.length > 0 ? (
          categories.map((cat) => (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all ${
                selectedCategory === cat 
                ? (appMode === 'work' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'bg-pink-50 text-pink-700 font-medium')
                : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${appMode === 'work' ? (CATEGORY_COLORS[cat]?.split(' ')[0] || 'bg-slate-400') : 'bg-pink-400'}`}></span>
                {cat}
              </span>
              <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-500">{categoryStats[cat]}</span>
            </button>
          ))
        ) : (
          <p className="px-2 text-[10px] text-gray-400 italic">暂无记录数据</p>
        )}
      </div>

      <div className="mt-auto pt-6 border-t border-gray-100">
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">我是小叽ちぃ</p>
          <p className="text-xs text-slate-600 leading-relaxed">
            {appMode === 'work' ? '发消息给我吧，我会帮主人分类整理的！叽' : '主人对我敞开心扉吧，小叽永远不会让你失望的叽～'}
          </p>
        </div>
      </div>
    </div>
  );
};