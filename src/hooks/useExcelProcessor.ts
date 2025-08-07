import { useState, useCallback } from 'react';
import { ExcelParser, ProcessingProgress } from '@/services/dataProcessing/excelParser';
import { DataValidator, ValidationResult } from '@/services/dataProcessing/dataValidator';
import { ComponentData, FileProcessingResult, ProcessingError } from '@/types';
import { useApp } from '@/contexts/hooks';

export interface UseExcelProcessorReturn {
  processFile: (file: File) => Promise<FileProcessingResult | null>;
  processing: boolean;
  progress: ProcessingProgress | null;
  validationResult: ValidationResult | null;
  error: ProcessingError | null;
  cancel: () => void;
  reset: () => void;
}

export const useExcelProcessor = (): UseExcelProcessorReturn => {
  const { addNotification } = useApp();
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<ProcessingProgress | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<ProcessingError | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const reset = useCallback(() => {
    setProcessing(false);
    setProgress(null);
    setValidationResult(null);
    setError(null);
    setAbortController(null);
  }, []);

  const cancel = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    setProcessing(false);
    setProgress(null);
    addNotification({
      type: 'info',
      title: 'Processing cancelled',
      message: 'File processing was cancelled by the user.',
      duration: 3000,
    });
  }, [abortController, addNotification]);

  const processFile = useCallback(async (file: File): Promise<FileProcessingResult | null> => {
    if (processing) {
      addNotification({
        type: 'warning',
        title: 'Already processing',
        message: 'Please wait for the current file to finish processing.',
        duration: 3000,
      });
      return null;
    }

    // Reset state
    reset();
    setProcessing(true);
    setError(null);

    // Create abort controller for cancellation
    const controller = new AbortController();
    setAbortController(controller);

    const startTime = performance.now();

    try {
      addNotification({
        type: 'info',
        title: 'Processing started',
        message: `Starting to process ${file.name}...`,
        duration: 5000,
      });

      // Process the Excel file
      const componentData = await ExcelParser.processFile(
        file,
        {
          maxFileSize: 10 * 1024 * 1024, // 10MB
          validateStructure: true,
        },
        (progressUpdate) => {
          if (controller.signal.aborted) {
            throw new Error('Processing cancelled');
          }
          setProgress(progressUpdate);
        }
      );

      if (controller.signal.aborted) {
        return null;
      }

      // Validate the processed data
      addNotification({
        type: 'info',
        title: 'Validating data',
        message: 'Running data validation checks...',
        duration: 3000,
      });

      const validation = DataValidator.validate(componentData);
      setValidationResult(validation);

      const processingTime = performance.now() - startTime;

      // Show validation results
      if (!validation.isValid) {
        addNotification({
          type: 'error',
          title: 'Validation failed',
          message: `Found ${validation.errors.length} error(s) in the data. Please review the validation results.`,
          duration: 0,
          actions: [
            {
              label: 'View Details',
              onClick: () => console.log('Validation errors:', validation.errors),
              variant: 'primary'
            }
          ]
        });
      } else if (validation.warnings.length > 0) {
        addNotification({
          type: 'warning',
          title: 'Data processed with warnings',
          message: `Found ${validation.warnings.length} warning(s). Data is valid but could be improved.`,
          duration: 8000,
          actions: [
            {
              label: 'View Warnings',
              onClick: () => console.log('Validation warnings:', validation.warnings),
              variant: 'secondary'
            }
          ]
        });
      } else {
        addNotification({
          type: 'success',
          title: 'File processed successfully!',
          message: `Generated ${componentData.nodes.length} components with ${componentData.links.length} connections in ${Math.round(processingTime)}ms.`,
          duration: 5000,
        });
      }

      // Create result
      const result: FileProcessingResult = {
        data: componentData,
        warnings: validation.warnings.map(w => w.message),
        processingTime: Math.round(processingTime)
      };

      setProcessing(false);
      setAbortController(null);
      
      return result;

    } catch (err) {
      console.error('Excel processing error:', err);
      
      if (controller.signal.aborted) {
        return null;
      }

      const processingError = err as ProcessingError;
      setError(processingError);
      setProcessing(false);
      setAbortController(null);

      // Show appropriate error message
      let errorTitle = 'Processing failed';
      let errorMessage = processingError.message;
      let showDetails = false;

      switch (processingError.code) {
        case 'FILE_TOO_LARGE':
          errorTitle = 'File too large';
          break;
        case 'INVALID_FORMAT':
          errorTitle = 'Invalid file format';
          errorMessage = 'Please ensure you upload a valid Excel file (.xlsx or .xls)';
          break;
        case 'NO_SHEETS':
          errorTitle = 'Empty file';
          errorMessage = 'The Excel file appears to be empty or has no data sheets';
          break;
        case 'NO_DATA':
          errorTitle = 'No data found';
          errorMessage = 'No component data found in the Excel file';
          break;
        case 'MISSING_COLUMNS':
          errorTitle = 'Missing required columns';
          showDetails = true;
          break;
        case 'INVALID_DATA_TYPE':
          errorTitle = 'Invalid data format';
          showDetails = true;
          break;
        default:
          showDetails = true;
      }

      addNotification({
        type: 'error',
        title: errorTitle,
        message: errorMessage,
        duration: 0,
        actions: showDetails ? [
          {
            label: 'Show Details',
            onClick: () => {
              console.error('Processing error details:', {
                code: processingError.code,
                message: processingError.message,
                details: processingError.details
              });
            },
            variant: 'secondary'
          }
        ] : undefined
      });

      return null;
    }
  }, [processing, addNotification, reset]);

  return {
    processFile,
    processing,
    progress,
    validationResult,
    error,
    cancel,
    reset
  };
};