import React, { createContext, useReducer, useCallback, useEffect } from 'react';
import { Notification, Theme, AccessibilitySettings, AppState } from '@/types';

// Action types
export type AppAction =
  | { type: 'SET_THEME'; payload: Theme }
  | { type: 'SET_ACCESSIBILITY'; payload: Partial<AccessibilitySettings> }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'CLEAR_NOTIFICATIONS' };

// Context interface
export interface AppContextType {
  state: AppState;
  setTheme: (theme: Theme) => void;
  setAccessibility: (settings: Partial<AccessibilitySettings>) => void;
  setGlobalLoading: (loading: boolean) => void;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

// Initial state
export const initialState: AppState = {
  theme: 'light',
  accessibility: {
    reduceMotion: false,
    highContrast: false,
    screenReaderMode: false,
    keyboardNavigation: true,
  },
  globalLoading: false,
  notifications: [],
};

// Reducer
export const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_THEME':
      return {
        ...state,
        theme: action.payload,
      };
    case 'SET_ACCESSIBILITY':
      return {
        ...state,
        accessibility: {
          ...state.accessibility,
          ...action.payload,
        },
      };
    case 'SET_LOADING':
      return {
        ...state,
        globalLoading: action.payload,
      };
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [...state.notifications, action.payload],
      };
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload),
      };
    case 'CLEAR_NOTIFICATIONS':
      return {
        ...state,
        notifications: [],
      };
    default:
      return state;
  }
};

// Create context - EXPORTED!
export const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider component
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('theme') as Theme;
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
      
      dispatch({ type: 'SET_THEME', payload: initialTheme });
    } catch (error) {
      console.warn('Could not access localStorage for theme:', error);
    }
  }, []);

  // Initialize accessibility settings from localStorage or system preferences
  useEffect(() => {
    try {
      const savedAccessibility = localStorage.getItem('accessibility');
      const systemReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const systemHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
      
      let accessibility = state.accessibility;
      
      if (savedAccessibility) {
        accessibility = { ...accessibility, ...JSON.parse(savedAccessibility) };
      }
      
      // Override with system preferences
      accessibility = {
        ...accessibility,
        reduceMotion: systemReduceMotion,
        highContrast: systemHighContrast,
      };
      
      dispatch({ type: 'SET_ACCESSIBILITY', payload: accessibility });
    } catch (error) {
      console.warn('Could not access localStorage for accessibility:', error);
    }
  }, []); // Remove dependency on state.accessibility to prevent infinite loop

  // Save theme to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('theme', state.theme);
      // Apply theme to document
      document.documentElement.classList.toggle('dark', state.theme === 'dark');
    } catch (error) {
      console.warn('Could not save theme to localStorage:', error);
    }
  }, [state.theme]);

  // Save accessibility settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('accessibility', JSON.stringify(state.accessibility));
      // Apply accessibility settings to document
      document.documentElement.style.setProperty(
        '--animation-duration',
        state.accessibility.reduceMotion ? '0s' : '0.3s'
      );
    } catch (error) {
      console.warn('Could not save accessibility settings:', error);
    }
  }, [state.accessibility]);

  const setTheme = useCallback((theme: Theme) => {
    dispatch({ type: 'SET_THEME', payload: theme });
  }, []);

  const setAccessibility = useCallback((settings: Partial<AccessibilitySettings>) => {
    dispatch({ type: 'SET_ACCESSIBILITY', payload: settings });
  }, []);

  const setGlobalLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Date.now().toString();
    const newNotification: Notification = { ...notification, id };
    dispatch({ type: 'ADD_NOTIFICATION', payload: newNotification });

    // Auto-remove notification after duration
    if (notification.duration !== 0) {
      setTimeout(() => {
        dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
      }, notification.duration || 5000);
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  }, []);

  const clearNotifications = useCallback(() => {
    dispatch({ type: 'CLEAR_NOTIFICATIONS' });
  }, []);

  const value: AppContextType = {
    state,
    setTheme,
    setAccessibility,
    setGlobalLoading,
    addNotification,
    removeNotification,
    clearNotifications,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};