import React from 'react';
import { Note, CATEGORY_COLORS } from '../types';
import { APP_AVATAR_URL } from '../App';

interface ChatMessageProps {
  note: Note;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
  isHighlighted?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ note, onDelete, isDeleting, isHighlighted }) => {
  const isSystem = note.category === '系统';
  const isBond = note.category === '羁绊';
  const colorClass = CATEGORY_COLORS[note.category] || CATEGORY_COLORS['其他'];
  
  // Special UI for system automated messages (Birthday/Christmas) or Egg responses
  if (isSystem && note.rawInput.startsWith('System:')) {
    return (
      <div 
        id={`chat-msg-${note.id}`}
        className={`flex justify-start mb-8 transition-all duration-500 
          ${isDeleting ? 'egg-delete-flash scale-110' : 'animate-in fade-in slide-in-from-left-4 duration-500'}
          ${isHighlighted ? 'highlight-flash' : ''}
        `}
      >
        <div className="flex gap-3 max-w-[85%] md:max-w-[75%] items-start">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 flex-shrink-0 shadow-sm">
            <img src={APP_AVATAR_URL} alt="Bot Avatar" className="w-full h-full object-cover" />
          </div>
          <div className={`bg-white border border-gray-100 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm ${isHighlighted ? 'ring-2 ring-indigo-200' : ''}`}>
            <p className="text-sm text-gray-700 leading-relaxed">{note.content}</p>
            <div className="flex items-center justify-start gap-2 mt-1 opacity-40">
               <span className="text-[10px] uppercase">{new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If it's a "system" user message (the trigger), just show it as a user bubble
  if (isSystem) {
    return (
      <div 
        id={`chat-msg-${note.id}`}
        className={`flex justify-end mb-8 transition-all duration-500 
          ${isDeleting ? 'egg-delete-flash scale-110' : 'animate-in fade-in slide-in-from-right-4 duration-500'}
          ${isHighlighted ? 'highlight-flash' : ''}
        `}
      >
        <div className={`max-w-[80%] md:max-w-[70%] bg-indigo-600 text-white rounded-2xl rounded-tr-none px-4 py-3 shadow-sm ${isHighlighted ? 'ring-2 ring-white' : ''}`}>
          <p className="text-sm md:text-base whitespace-pre-wrap">{note.content}</p>
          <div className="flex items-center justify-end gap-2 mt-1 opacity-60">
             <span className="text-[10px] uppercase">{new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      </div>
    );
  }

  // Default Standard Note Message
  return (
    <div 
      id={`chat-msg-${note.id}`}
      className={`flex flex-col gap-4 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500 ${isHighlighted ? 'highlight-flash' : ''}`}
    >
      {/* User Message */}
      <div className="flex justify-end">
        <div className="max-w-[80%] md:max-w-[70%] bg-indigo-600 text-white rounded-2xl rounded-tr-none px-4 py-3 shadow-sm">
          <p className="text-sm md:text-base whitespace-pre-wrap">{note.rawInput}</p>
          <div className="flex items-center justify-end gap-2 mt-1 opacity-60">
             <span className="text-[10px] uppercase">{new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      </div>

      {/* System Response */}
      <div className="flex justify-start group">
        <div className="flex gap-3 max-w-[85%] md:max-w-[75%] items-start">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 flex-shrink-0 shadow-sm">
            <img src={APP_AVATAR_URL} alt="Bot Avatar" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col gap-2">
            <div className={`bg-white border border-gray-100 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm relative ${isHighlighted ? 'ring-2 ring-indigo-200' : ''}`}>
              <p className="text-sm text-gray-700">
                好的，已保存到{isBond ? '羁绊回忆录' : '笔记'} <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${isBond ? 'bg-pink-100 text-pink-600' : colorClass}`}>{note.category}</span>
              </p>
              <div className={`mt-2 pt-2 border-t border-gray-50 text-gray-600 italic text-sm ${isBond ? 'text-pink-600 font-medium' : ''}`}>
                "{note.content}"
              </div>
              
              {/* Delete action */}
              <button 
                onClick={() => onDelete(note.id)}
                className="absolute -right-10 top-2 p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                title="删除此条记录"
              >
                <i className="fas fa-trash-alt text-xs"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};