import * as XLSX from 'xlsx-js-style';
import { ExcelData, ComponentData, ComponentNode, ComponentLink, ProcessingError } from '@/types';

export interface ProcessingOptions {
  maxFileSize?: number;
  chunkSize?: number;
  validateStructure?: boolean;
}

export interface ProcessingProgress {
  stage: 'reading' | 'parsing' | 'validating' | 'transforming' | 'complete';
  progress: number;
  message: string;
}

export class ExcelParser {
  private static readonly DEFAULT_OPTIONS: Required<ProcessingOptions> = {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    chunkSize: 1000,
    validateStructure: true,
  };

  private static readonly REQUIRED_COLUMNS = [
    'Solutions',
    'Solution Input',
    'Solution Output'
  ];

  private static readonly OPTIONAL_COLUMNS = [
    'High Level Input',
    'Inputs',
    'High Level Output',
    'Outputs'
  ];

  static async processFile(
    file: File,
    options: ProcessingOptions = {},
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<ComponentData> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    try {
      // Validate file size
      this.validateFileSize(file, opts.maxFileSize);
      
      onProgress?.({
        stage: 'reading',
        progress: 10,
        message: 'Reading Excel file...'
      });

      // Read file as array buffer
      const arrayBuffer = await this.readFileAsArrayBuffer(file);
      
      onProgress?.({
        stage: 'parsing',
        progress: 30,
        message: 'Parsing Excel data...'
      });

      // Parse Excel workbook
      const workbook = this.parseWorkbook(arrayBuffer);
      
      // Extract JSON data
      const jsonData = this.extractJSONData(workbook);
      
      onProgress?.({
        stage: 'validating',
        progress: 60,
        message: 'Validating data structure...'
      });

      // Validate structure if required
      if (opts.validateStructure) {
        this.validateDataStructure(jsonData);
      }
      
      onProgress?.({
        stage: 'transforming',
        progress: 80,
        message: 'Transforming to component data...'
      });

      // Transform to component data
      const componentData = this.transformToComponentData(jsonData, file.name);
      
      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'Processing complete!'
      });

      return componentData;
      
    } catch (error) {
      console.error('Excel processing error:', error);
      throw this.createProcessingError(error, 'PROCESSING_FAILED');
    }
  }

  private static validateFileSize(file: File, maxSize: number): void {
    if (file.size > maxSize) {
      throw this.createProcessingError(
        `File size (${this.formatFileSize(file.size)}) exceeds maximum allowed size (${this.formatFileSize(maxSize)})`,
        'FILE_TOO_LARGE'
      );
    }
  }

  private static async readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          resolve(e.target.result as ArrayBuffer);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('File reading failed'));
      reader.readAsArrayBuffer(file);
    });
  }

  private static parseWorkbook(arrayBuffer: ArrayBuffer): XLSX.WorkBook {
    try {
      return XLSX.read(arrayBuffer, {
        type: 'array',
        cellDates: true,
        cellNF: false,  // Disable number formatting to prevent ReDoS
        cellStyles: false  // Disable styles to prevent potential exploits
      });
    } catch (error) {
      throw this.createProcessingError(
        'Invalid Excel file format or corrupted file',
        'INVALID_FORMAT'
      );
    }
  }

  private static extractJSONData(workbook: XLSX.WorkBook): ExcelData[] {
    if (!workbook.SheetNames.length) {
      throw this.createProcessingError(
        'Excel file contains no sheets',
        'NO_SHEETS'
      );
    }

    // Get first sheet (or find sheet with component data)
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    
    if (!worksheet) {
      throw this.createProcessingError(
        'Could not access worksheet',
        'WORKSHEET_ERROR'
      );
    }

    // Convert to JSON with validation
    const jsonData = XLSX.utils.sheet_to_json<ExcelData>(worksheet, {
      defval: '',  // Use empty string for empty cells
      raw: false   // Convert everything to strings to prevent formula injection
    });

    if (!jsonData.length) {
      throw this.createProcessingError(
        'No data found in Excel sheet',
        'NO_DATA'
      );
    }

    return jsonData;
  }

  private static validateDataStructure(data: ExcelData[]): void {
    if (!data.length) {
      throw this.createProcessingError(
        'No data rows found',
        'NO_DATA'
      );
    }

    const firstRow = data[0];
    const availableColumns = Object.keys(firstRow);
    const missingColumns = this.REQUIRED_COLUMNS.filter(
      col => !availableColumns.includes(col)
    );

    if (missingColumns.length > 0) {
      throw this.createProcessingError(
        `Missing required columns: ${missingColumns.join(', ')}. Available columns: ${availableColumns.join(', ')}`,
        'MISSING_COLUMNS',
        { missingColumns, availableColumns }
      );
    }

    // Validate data types and content
    data.forEach((row, index) => {
      Object.entries(row).forEach(([key, value]) => {
        if (value && typeof value !== 'string') {
          throw this.createProcessingError(
            `Invalid value type in row ${index + 1}, column ${key}. Expected string, got ${typeof value}`,
            'INVALID_DATA_TYPE',
            { row: index + 1, column: key, value, type: typeof value }
          );
        }
      });
    });
  }

  private static transformToComponentData(data: ExcelData[], fileName: string): ComponentData {
    const nodes = new Map<string, ComponentNode>();
    const links: ComponentLink[] = [];
    const colorMap = new Map<string, string>();
    
    // Process each row
    data.forEach((row, index) => {
      try {
        // Add solution node (main component)
        if (row.Solutions?.trim()) {
          const solutionId = this.sanitizeId(row.Solutions);
          nodes.set(solutionId, {
            id: solutionId,
            name: row.Solutions.trim(),
            type: 'service',
            description: `Component from row ${index + 1}`,
            metadata: {
              rowIndex: index + 1,
              highLevelInput: row['High Level Input']?.trim() || '',
              highLevelOutput: row['High Level Output']?.trim() || ''
            }
          });
        }
        
        // Process inputs
        if (row['Solution Input']?.trim() && row.Solutions?.trim()) {
          const inputId = this.sanitizeId(row['Solution Input']);
          const solutionId = this.sanitizeId(row.Solutions);
          
          // Add input node
          nodes.set(inputId, {
            id: inputId,
            name: row['Solution Input'].trim(),
            type: 'interface',
            description: 'Input interface',
            metadata: {
              category: row['High Level Input']?.trim() || 'Input',
              rowIndex: index + 1
            }
          });
          
          // Add input -> solution link
          links.push({
            source: inputId,
            target: solutionId,
            type: 'dependency',
            label: 'provides input to',
            metadata: {
              color: this.getColorForCategory(row['High Level Input'] || 'Input', colorMap),
              category: row['High Level Input']?.trim() || 'Input'
            }
          });
        }
        
        // Process outputs
        if (row['Solution Output']?.trim() && row.Solutions?.trim()) {
          const outputId = this.sanitizeId(row['Solution Output']);
          const solutionId = this.sanitizeId(row.Solutions);
          
          // Add output node
          nodes.set(outputId, {
            id: outputId,
            name: row['Solution Output'].trim(),
            type: 'interface',
            description: 'Output interface',
            metadata: {
              category: row['High Level Output']?.trim() || 'Output',
              rowIndex: index + 1
            }
          });
          
          // Add solution -> output link
          links.push({
            source: solutionId,
            target: outputId,
            type: 'dependency',
            label: 'produces output',
            metadata: {
              color: this.getColorForCategory(row['High Level Output'] || 'Output', colorMap),
              category: row['High Level Output']?.trim() || 'Output'
            }
          });
        }
        
      } catch (rowError) {
        console.warn(`Error processing row ${index + 1}:`, rowError);
        // Continue processing other rows
      }
    });

    return {
      nodes: Array.from(nodes.values()),
      links,
      metadata: {
        title: `Component Map - ${fileName}`,
        description: `Generated from ${fileName} with ${nodes.size} components and ${links.length} connections`,
        lastModified: new Date(),
        version: '1.0.0'
      }
    };
  }

  private static sanitizeId(input: string): string {
    return input
      .trim()
      .replace(/[^a-zA-Z0-9\s-_]/g, '') // Remove special chars
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .toLowerCase();
  }

  private static getColorForCategory(category: string, colorMap: Map<string, string>): string {
    if (!colorMap.has(category)) {
      const hue = (colorMap.size * 137.508) % 360; // Golden angle approximation
      colorMap.set(category, `hsl(${hue}, 70%, 50%)`);
    }
    return colorMap.get(category)!;
  }

  private static createProcessingError(
    message: string | Error, 
    code: string, 
    details?: Record<string, any>
  ): ProcessingError {
    const errorMessage = message instanceof Error ? message.message : message;
    const error = new Error(errorMessage) as ProcessingError;
    error.name = 'ProcessingError';
    error.code = code;
    error.details = details;
    return error;
  }

  private static formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}