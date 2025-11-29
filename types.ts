
export interface ProcessedImage {
  originalUrl: string;
  colorizedUrl: string;
  originalFile: File;
}

export interface ProcessingState {
  isLoading: boolean;
  error: string | null;
  progressStep: string;
}

export enum AppView {
  UPLOAD = 'UPLOAD',
  SELECTION = 'SELECTION',
  PROCESSING = 'PROCESSING',
  RESULT = 'RESULT'
}

export type ProcessingMode = 'COLORIZE' | 'UPSCALE' | 'BEAUTY' | 'CUSTOM';
