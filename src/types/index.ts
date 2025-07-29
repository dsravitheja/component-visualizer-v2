// Core component types
export interface ComponentNode {
  id: string;
  name: string;
  type: 'input' | 'solution' | 'output' | 'module' | 'class' | 'interface' | 'service';
  category?: string;
  description?: string;
  x?: number;
  y?: number;
  fx?: number; // Fixed position for D3
  fy?: number;
}

export interface ComponentLink {
  source: string;
  target: string;
  type: 'input' | 'output' | 'dependency';
  color?: string;
  category?: string;
  strength?: number;
}

export interface ComponentData {
  nodes: ComponentNode[];
  links: ComponentLink[];
  metadata?: {
    title?: string;
    description?: string;
    version?: string;
    lastModified?: Date;
  };
}

// Excel data structure
export interface ExcelData {
  Solutions: string;
  'Solution Input': string;
  'High Level Input': string;
  Inputs: string;
  'Solution Output': string;
  'High Level Output': string;
  Outputs: string;
}

// Processing result types
export interface ProcessingResult {
  success: boolean;
  data?: ComponentData;
  error?: string;
  warnings?: string[];
  processingTime?: number;
}

// UI State types
export interface AppState {
  theme: 'light' | 'dark';
  accessibility: AccessibilitySettings;
  globalLoading: boolean;
  notifications: Notification[];
}

export interface AccessibilitySettings {
  reduceMotion: boolean;
  highContrast: boolean;
  screenReaderMode: boolean;
  keyboardNavigation: boolean;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

// File processing types
export interface FileUploadState {
  dragActive: boolean;
  uploading: boolean;
  validationErrors: ValidationError[];
  previewData: PreviewData | null;
}

export interface ValidationError {
  type: 'size' | 'format' | 'structure' | 'security';
  message: string;
  severity: 'error' | 'warning';
  field?: string;
}

export interface PreviewData {
  fileName: string;
  fileSize: number;
  sheets: string[];
  rowCount: number;
  columnCount: number;
  columns: string[];
  sampleData: Record<string, any>[];
}

// Theme types
export type Theme = 'light' | 'dark';

// Export format types
export type ExportFormat = 'png' | 'svg' | 'pdf' | 'json';