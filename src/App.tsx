import React, { useEffect } from 'react';
import { AppProvider, useApp } from '@/contexts/AppContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { NotificationContainer } from '@/components/ui/Notification';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ComponentData } from '@/types';

// Main App Content Component
const AppContent: React.FC = () => {
  const { state, addNotification } = useApp();
  const [data, setData] = React.useState<ComponentData | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  // Welcome message on first load
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (!hasSeenWelcome) {
      addNotification({
        type: 'info',
        title: 'Welcome to Component Visualizer!',
        message: 'Upload an Excel file to visualize your software component interfaces.',
        duration: 8000,
      });
      localStorage.setItem('hasSeenWelcome', 'true');
    }
  }, [addNotification]);

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    
    try {
      // Simulate file processing (we'll implement this in the next module)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock data for now
      const mockData: ComponentData = {
        nodes: [
          { id: 'node1', name: 'User Service', type: 'service' },
          { id: 'node2', name: 'Auth API', type: 'interface' },
          { id: 'node3', name: 'Database', type: 'module' },
        ],
        links: [
          { source: 'node1', target: 'node2', type: 'dependency' },
          { source: 'node2', target: 'node3', type: 'dependency' },
        ],
        metadata: {
          title: 'Sample Component Map',
          description: 'Generated from uploaded Excel file',
          lastModified: new Date(),
        },
      };
      
      setData(mockData);
      addNotification({
        type: 'success',
        title: 'File processed successfully!',
        message: `Generated visualization with ${mockData.nodes.length} components.`,
        duration: 5000,
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Processing failed',
        message: error instanceof Error ? error.message : 'An unknown error occurred',
        duration: 0,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Visualize Your Software Components
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Upload an Excel file containing your component interface mappings to generate an interactive visualization.
          </p>
        </div>

        {/* File Upload Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="max-w-md mx-auto">
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-primary-500 transition-colors">
              <div className="mb-4">
                <svg
                  className="mx-auto w-12 h-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              <div className="mb-4">
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                >
                  Choose Excel File
                </label>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload(file);
                    }
                  }}
                  className="sr-only"
                  disabled={isLoading}
                />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Supports .xlsx and .xls files up to 10MB
              </p>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-600 dark:text-gray-400">Processing your file...</p>
            </div>
          </div>
        )}

        {/* Data Display (temporary) */}
        {data && !isLoading && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {data.metadata?.title || 'Component Visualization'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Components ({data.nodes.length})
                </h4>
                <ul className="space-y-1">
                  {data.nodes.map((node) => (
                    <li key={node.id} className="text-sm text-gray-600 dark:text-gray-400">
                      • {node.name} ({node.type})
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Connections ({data.links.length})
                </h4>
                <ul className="space-y-1">
                  {data.links.map((link, index) => (
                    <li key={index} className="text-sm text-gray-600 dark:text-gray-400">
                      • {link.source} → {link.target}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                📊 Visualization will be rendered here in the next phase of development.
              </p>
            </div>
          </div>
        )}

        {/* Getting Started Guide */}
        {!data && !isLoading && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Getting Started
            </h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Prepare your Excel file
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Your Excel file should contain columns for Solutions, Solution Input, High Level Input, etc.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Upload your file
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Click "Choose Excel File" above to upload your component mapping data.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Explore your visualization
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Interact with the generated component diagram to understand your system architecture.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

// Main App Component with Providers
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
        <NotificationContainer />
      </AppProvider>
    </ErrorBoundary>
  );
};

export default App;