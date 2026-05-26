import React, { useState, useRef } from 'react';
import { Note } from '../types';

interface SettingsModalProps {
  onClose: () => void;
  notes: Note[];
  apiKey: string;
  onSaveApiKey: (key: string) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onClearAll: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose, notes, apiKey, onSaveApiKey, onExport, onImport, onClearAll,
}) => {
  const [keyInput, setKeyInput] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const [clearStep, setClearStep] = useState<0 | 1>(0);
  const [importPreview, setImportPreview] = useState<{ count: number; doImport: () => void } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (!Array.isArray(parsed)) throw new Error();
        setImportPreview({
          count: parsed.length,
          doImport: () => {
            onImport(file);
            setImportPreview(null);
          },
        });
      } catch {
        alert('文件格式不正确，请选择从星星阁楼导出的备份文件');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleClear = () => {
    if (clearStep === 0) {
      setClearStep(1);
    } else {
      onClearAll();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-800">设置</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <i className="fas fa-times text-sm" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6 max-h-[70vh] overflow-y-auto">

          {/* API 配置 */}
          <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">AI 配置</h3>
            <div className="space-y-2">
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="粘贴你的 Gemini API Key"
                  className="w-full px-4 py-2.5 pr-10 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 bg-gray-50"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <i className={`fas ${showKey ? 'fa-eye-slash' : 'fa-eye'} text-xs`} />
                </button>
              </div>
              <p className="text-[10px] text-gray-400 px-1">
                前往 <span className="font-mono">aistudio.google.com</span> 获取免费 API Key
              </p>
              <button
                onClick={() => onSaveApiKey(keyInput.trim())}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors"
              >
                保存
              </button>
            </div>
          </section>

          {/* 数据管理 */}
          <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">数据管理</h3>
            <div className="space-y-2">
              <button
                onClick={onExport}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-700 transition-colors"
              >
                <i className="fas fa-download text-indigo-500 w-4" />
                <span>导出备份</span>
                <span className="ml-auto text-xs text-gray-400">{notes.length} 条记录</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-700 transition-colors"
              >
                <i className="fas fa-upload text-indigo-500 w-4" />
                <span>从备份恢复</span>
              </button>
              <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} className="hidden" />

              {importPreview && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                  <p className="text-xs text-amber-700 font-medium">
                    即将导入 {importPreview.count} 条记录，当前 {notes.length} 条记录将被替换，此操作不可撤销。
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setImportPreview(null)}
                      className="flex-1 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                    >
                      取消
                    </button>
                    <button
                      onClick={importPreview.doImport}
                      className="flex-1 py-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium"
                    >
                      确认恢复
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={handleClear}
                className={`w-full flex items-center gap-3 px-4 py-3 border rounded-xl text-sm transition-colors ${
                  clearStep === 1
                    ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <i className="fas fa-trash-alt text-red-400 w-4" />
                <span>{clearStep === 1 ? '再次点击确认清空全部数据' : '清空所有数据'}</span>
              </button>
              {clearStep === 1 && (
                <p className="text-[10px] text-red-400 px-1">此操作不可撤销，所有笔记和聊天记录将永久删除。</p>
              )}
            </div>
          </section>
</div>
      </div>
    </div>
  );
};
