import { GoogleGenAI, Type } from "@google/genai";

const getAI = () => {
  const key = localStorage.getItem('gemini_api_key') || '';
  return new GoogleGenAI({ apiKey: key });
};

export interface ParsedNote {
  category: string;
  content: string;
}

/**
 * 快速分类：仅根据文本或URL进行初步分类
 */
export const parseNoteWithAI = async (input: string): Promise<ParsedNote> => {
  const isUrl = /^(https?:\/\/[^\s]+)/.test(input.trim());
  
  try {
    const response = await getAI().models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Parse the following note input into a category and content. 
           Input: "${input}"
           Standard categories: 想法 (Idea), 待办 (Todo), 工作 (Work), 生活 (Life), 学习 (Study), 链接 (Link), 其他 (Other).
           If it's a URL, categorize as "链接".
           Pick the most suitable Chinese category name.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING, description: "The single word category name in Chinese" },
            content: { type: Type.STRING, description: "The refined text content" }
          },
          required: ["category", "content"]
        }
      }
    });

    const parsed = JSON.parse(response.text.trim()) as ParsedNote;
    return parsed;
  } catch (error) {
    console.error("AI Fast Parsing Error:", error);
    return { category: isUrl ? '链接' : '其他', content: input };
  }
};

/**
 * 闲聊对话：调用大模型进行自然语言交流，带有人设
 */
export const generateChatResponse = async (input: string, history: {role: string, parts: any[]}[] = []): Promise<string> => {
  try {
    const response = await getAI().models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...history,
        { role: 'user', parts: [{ text: input }] }
      ],
      config: {
        systemInstruction: "你是一个可爱的机器人，名叫'小叽'（ちぃ）。你非常关心主人，说话语气温和、治愈，经常在句尾加个'叽'字。现在主人正在和你闲聊，请根据内容给出温暖、有趣或体贴的回应。保持回复精简，通常2-3句话以内。",
        temperature: 0.8,
        topP: 0.95,
      }
    });

    return response.text.trim();
  } catch (error) {
    console.error("AI Chat Error:", error);
    throw error;
  }
};

/**
 * 羁绊总结：总结最近的聊天内容
 */
export const generateBondSummary = async (chatHistory: string[]): Promise<string> => {
  try {
    const response = await getAI().models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `这是我与主人最近的聊天记录，请以小叽的口吻，为这段对话写一个温馨的“羁绊总结”，记录我们此时此刻的情感。
      聊天记录：
      ${chatHistory.join('\n')}
      
      要求：
      1. 语气必须是小叽的人设：温馨、治愈，句尾加“叽”。
      2. 总结内容要具体，提到我们聊了什么话题或是什么样的心情。
      3. 长度控制在60字以内。`,
      config: {
        temperature: 0.7,
      }
    });

    return response.text.trim();
  } catch (error) {
    console.error("AI Bond Summary Error:", error);
    return "虽然刚才聊了什么有点模糊了，但小叽记得和主人在一起的感觉很温暖叽！";
  }
};

/**
 * 深度解析链接
 */
export const fetchLinkMetadata = async (url: string): Promise<any> => {
  try {
    const response = await getAI().models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `The user provided a link: "${url}". 
           Use your search tool to find information about this URL.
           Extract the article title and a concise summary of the content.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING, description: "A summary of the article content" },
            siteName: { type: Type.STRING }
          },
          required: ["title", "description", "siteName"]
        }
      }
    });

    const metadata = JSON.parse(response.text.trim());
    return { ...metadata, url };
  } catch (error) {
    console.error("AI Metadata Fetch Error:", error);
    return {
      title: "网页内容",
      description: "解析失败，点击链接查看原文。",
      siteName: new URL(url).hostname,
      url
    };
  }
};

export const searchNotesWithAI = async (query: string, notes: {id: string, content: string}[]): Promise<string | null> => {
  if (notes.length === 0) return null;
  
  try {
    const response = await getAI().models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a search assistant. Given a list of notes and a search query, find the ID of the single most relevant note.
      Query: "${query}"
      Notes: ${JSON.stringify(notes)}
      
      Return a JSON object with a key "matchId". If no match is found, set "matchId" to null.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            matchId: { type: Type.STRING, nullable: true }
          },
          required: ["matchId"]
        }
      }
    });

    const text = response.text.trim();
    const result = JSON.parse(text);
    return result.matchId || null;
  } catch (error) {
    console.error("AI Search Error:", error);
    return null;
  }
};