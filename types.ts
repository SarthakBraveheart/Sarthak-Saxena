
export type Platform = 'YouTube' | 'Instagram' | 'Twitter' | 'Pinterest';

export interface HookVariation {
  text: string;
  explanation: string;
}

export interface ThumbnailConcept {
  prompt: string;
  style: string;
}

export interface SEOData {
  hooks: HookVariation[];
  title: string;
  description: string;
  keywords: string[];
  hashtags: string[];
}

export interface Controversy {
  topic: string;
  explanation: string;
}

export interface AnalysisResult {
  summary: string;
  category: string;
  mood: string;
  sentiment: string;
  controversies: Controversy[];
  keyScenes: string[];
}

export interface MediaState {
  file: File | null;
  preview: string | null;
  type: 'image' | 'video' | null;
  base64: string | null;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  mediaType: 'image' | 'video';
  mediaSummary: string;
  platform: Platform;
  seo?: SEOData;
  thumbnailConcepts?: ThumbnailConcept[];
  analysis: AnalysisResult;
}
