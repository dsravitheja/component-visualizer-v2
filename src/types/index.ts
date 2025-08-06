// Core data types for component visualization
export interface ComponentNode {
  id: string;
  name: string;
  type: 'service' | 'interface' | 'module' | 'class' | 'utility';
  description?: string;
  metadata?: Record<string, any>;
}

export interface ComponentLink {
  source: string;
  target: string;
  type: 'dependency' | 'implements' | 'extends' | 'uses';
  label?: string;
  metadata?: Record<string, any>;
}

export interface ComponentData {
  nodes: ComponentNode[];
  links: ComponentLink[];
  metadata?: {
    title?: string;
    description?: string;
    lastModified?: Date;
    version?: string;
  };
}

// Theme and UI types
export type Theme = 'light' | 'dark';

export interface AccessibilitySettings {
  reduceMotion: boolean;
  highContrast: boolean;
  screenReaderMode: boolean;
  keyboardNavigation: boolean;
}

// Notification system
export interface NotificationAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number; // 0 means permanent
  actions?: NotificationAction[];
}

// Application state
export interface AppState {
  theme: Theme;
  accessibility: AccessibilitySettings;
  globalLoading: boolean;
  notifications: Notification[];
}

// File processing types
export interface FileProcessingResult {
  data: ComponentData;
  warnings?: string[];
  processingTime?: number;
}

export interface ProcessingError extends Error {
  code: string;
  details?: Record<string, any>;
}

// Excel data structure (matching your existing processor)
export interface ExcelData {
  Solutions: string;
  'Solution Input': string;
  'High Level Input': string;
  Inputs: string;
  'Solution Output': string;
  'High Level Output': string;
  Outputs: string;
}

// Visualization types for D3
export interface VisualizationNode extends ComponentNode {
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
}

export interface VisualizationLink extends ComponentLink {
  source: VisualizationNode | string;
  target: VisualizationNode | string;
  color?: string;
  category?: string;
}