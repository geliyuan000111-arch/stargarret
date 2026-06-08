
export interface LinkMetadata {
  title: string;
  description: string;
  siteName?: string;
  imageUrl?: string;
  url: string;
}

export interface Note {
  id: string;
  category: string;
  content: string;
  rawInput: string;
  timestamp: number;
  mode?: 'work' | 'chat'; // New field for mode isolation
  isCompleted?: boolean;
  remark?: string;
  priority?: string;
  tags?: string[];
  linkMetadata?: LinkMetadata;
  isParsing?: boolean;
  pinned?: boolean;
}

export interface CategoryStats {
  name: string;
  count: number;
  color: string;
}

export const CATEGORY_COLORS: Record<string, string> = {
  '想法': 'bg-blue-100 text-blue-700 border-blue-200',
  '待办': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  '工作': 'bg-purple-100 text-purple-700 border-purple-200',
  '生活': 'bg-orange-100 text-orange-700 border-orange-200',
  '学习': 'bg-rose-100 text-rose-700 border-rose-200',
  '链接': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  '其他': 'bg-slate-100 text-slate-700 border-slate-200',
  '系统': 'bg-gray-100 text-gray-700 border-gray-200',
};

export const DEFAULT_CATEGORY = '其他';
