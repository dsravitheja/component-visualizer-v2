import { ComponentData, ComponentNode, ComponentLink, ProcessingError } from '@/types';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metrics: ValidationMetrics;
}

export interface ValidationError {
  code: string;
  message: string;
  severity: 'error' | 'warning';
  context?: {
    nodeId?: string;
    linkIndex?: number;
    field?: string;
  };
}

export interface ValidationWarning {
  code: string;
  message: string;
  suggestion?: string;
  context?: {
    nodeId?: string;
    linkIndex?: number;
    affectedNodes?: string[];
  };
}

export interface ValidationMetrics {
  totalNodes: number;
  totalLinks: number;
  orphanedNodes: number;
  circularDependencies: number;
  nodesByType: Record<string, number>;
  linksByType: Record<string, number>;
  complexityScore: number;
}

export class DataValidator {
  private static readonly MAX_NODE_NAME_LENGTH = 100;
  private static readonly MAX_NODES = 1000;
  private static readonly MAX_LINKS = 5000;

  static validate(data: ComponentData): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    try {
      // Basic structure validation
      this.validateBasicStructure(data, errors);
      
      // Node validation
      this.validateNodes(data.nodes, errors, warnings);
      
      // Link validation
      this.validateLinks(data.links, data.nodes, errors, warnings);
      
      // Relationship validation
      this.validateRelationships(data, warnings);
      
      // Performance validation
      this.validatePerformance(data, warnings);
      
      // Calculate metrics
      const metrics = this.calculateMetrics(data);
      
      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        metrics
      };
      
    } catch (error) {
      console.error('Validation error:', error);
      errors.push({
        code: 'VALIDATION_FAILED',
        message: 'Internal validation error occurred',
        severity: 'error'
      });
      
      return {
        isValid: false,
        errors,
        warnings,
        metrics: this.getEmptyMetrics()
      };
    }
  }

  private static validateBasicStructure(data: ComponentData, errors: ValidationError[]): void {
    if (!data) {
      errors.push({
        code: 'MISSING_DATA',
        message: 'No component data provided',
        severity: 'error'
      });
      return;
    }

    if (!Array.isArray(data.nodes)) {
      errors.push({
        code: 'INVALID_NODES',
        message: 'Nodes must be an array',
        severity: 'error'
      });
    }

    if (!Array.isArray(data.links)) {
      errors.push({
        code: 'INVALID_LINKS',
        message: 'Links must be an array',
        severity: 'error'
      });
    }

    if (data.nodes?.length === 0) {
      errors.push({
        code: 'NO_NODES',
        message: 'No components found in the data',
        severity: 'error'
      });
    }
  }

  private static validateNodes(nodes: ComponentNode[], errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!nodes || !Array.isArray(nodes)) return;

    const seenIds = new Set<string>();
    const seenNames = new Set<string>();

    nodes.forEach((node, index) => {
      this.validateNode(node, index, seenIds, seenNames, errors, warnings);
    });

    // Check for performance limits
    if (nodes.length > this.MAX_NODES) {
      warnings.push({
        code: 'TOO_MANY_NODES',
        message: `Large number of nodes (${nodes.length}) may impact performance`,
        suggestion: 'Consider filtering or splitting the data'
      });
    }
  }

  private static validateNode(
    node: ComponentNode,
    index: number,
    seenIds: Set<string>,
    seenNames: Set<string>,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const context = { nodeId: node?.id || `node_${index}` };

    // Required fields
    if (!node?.id || typeof node.id !== 'string' || !node.id.trim()) {
      errors.push({
        code: 'MISSING_NODE_ID',
        message: `Node at index ${index} is missing a valid ID`,
        severity: 'error',
        context
      });
    }

    if (!node?.name || typeof node.name !== 'string' || !node.name.trim()) {
      errors.push({
        code: 'MISSING_NODE_NAME',
        message: `Node '${node?.id}' is missing a valid name`,
        severity: 'error',
        context
      });
    }

    if (!node?.type || typeof node.type !== 'string') {
      errors.push({
        code: 'MISSING_NODE_TYPE',
        message: `Node '${node?.id}' is missing a valid type`,
        severity: 'error',
        context
      });
    }

    // Duplicate checks
    if (node?.id && seenIds.has(node.id)) {
      errors.push({
        code: 'DUPLICATE_NODE_ID',
        message: `Duplicate node ID: '${node.id}'`,
        severity: 'error',
        context
      });
    } else if (node?.id) {
      seenIds.add(node.id);
    }

    if (node?.name && seenNames.has(node.name.trim().toLowerCase())) {
      warnings.push({
        code: 'DUPLICATE_NODE_NAME',
        message: `Duplicate node name: '${node.name}' (node: ${node.id})`,
        suggestion: 'Consider using unique names for better clarity',
        context
      });
    } else if (node?.name) {
      seenNames.add(node.name.trim().toLowerCase());
    }

    // Length validation
    if (node?.name && node.name.length > this.MAX_NODE_NAME_LENGTH) {
      warnings.push({
        code: 'LONG_NODE_NAME',
        message: `Node '${node.id}' has a very long name (${node.name.length} characters)`,
        suggestion: 'Consider shortening for better visualization',
        context
      });
    }

    // Type validation
    const validTypes = ['service', 'interface', 'module', 'class', 'utility'];
    if (node?.type && !validTypes.includes(node.type)) {
      warnings.push({
        code: 'UNKNOWN_NODE_TYPE',
        message: `Node '${node.id}' has unknown type: '${node.type}'`,
        suggestion: `Consider using one of: ${validTypes.join(', ')}`,
        context
      });
    }
  }

  private static validateLinks(
    links: ComponentLink[],
    nodes: ComponentNode[],
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!links || !Array.isArray(links)) return;

    const nodeIds = new Set(nodes?.map(n => n.id) || []);
    const linkSet = new Set<string>();

    links.forEach((link, index) => {
      this.validateLink(link, index, nodeIds, linkSet, errors, warnings);
    });

    // Performance check
    if (links.length > this.MAX_LINKS) {
      warnings.push({
        code: 'TOO_MANY_LINKS',
        message: `Large number of links (${links.length}) may impact performance`,
        suggestion: 'Consider simplifying the component relationships'
      });
    }
  }

  private static validateLink(
    link: ComponentLink,
    index: number,
    nodeIds: Set<string>,
    linkSet: Set<string>,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const context = { linkIndex: index };

    if (!link?.source || typeof link.source !== 'string') {
      errors.push({
        code: 'MISSING_LINK_SOURCE',
        message: `Link at index ${index} is missing a valid source`,
        severity: 'error',
        context
      });
    }

    if (!link?.target || typeof link.target !== 'string') {
      errors.push({
        code: 'MISSING_LINK_TARGET',
        message: `Link at index ${index} is missing a valid target`,
        severity: 'error',
        context
      });
    }

    // Check if nodes exist
    if (link?.source && !nodeIds.has(link.source)) {
      errors.push({
        code: 'INVALID_LINK_SOURCE',
        message: `Link references non-existent source node: '${link.source}'`,
        severity: 'error',
        context: { ...context, nodeId: link.source }
      });
    }

    if (link?.target && !nodeIds.has(link.target)) {
      errors.push({
        code: 'INVALID_LINK_TARGET',
        message: `Link references non-existent target node: '${link.target}'`,
        severity: 'error',
        context: { ...context, nodeId: link.target }
      });
    }

    // Self-reference check
    if (link?.source && link?.target && link.source === link.target) {
      warnings.push({
        code: 'SELF_REFERENCE',
        message: `Node '${link.source}' has a link to itself`,
        suggestion: 'Self-references may create visual clutter',
        context
      });
    }

    // Duplicate link check
    if (link?.source && link?.target) {
      const linkKey = `${link.source}->${link.target}`;
      const reverseKey = `${link.target}->${link.source}`;
      
      if (linkSet.has(linkKey)) {
        warnings.push({
          code: 'DUPLICATE_LINK',
          message: `Duplicate link from '${link.source}' to '${link.target}'`,
          suggestion: 'Remove duplicate connections',
          context
        });
      } else {
        linkSet.add(linkKey);
        
        // Check for bidirectional links
        if (linkSet.has(reverseKey)) {
          warnings.push({
            code: 'BIDIRECTIONAL_LINK',
            message: `Bidirectional link between '${link.source}' and '${link.target}'`,
            suggestion: 'Consider if both directions are necessary',
            context
          });
        }
      }
    }

    // Type validation
    const validTypes = ['dependency', 'implements', 'extends', 'uses'];
    if (link?.type && !validTypes.includes(link.type)) {
      warnings.push({
        code: 'UNKNOWN_LINK_TYPE',
        message: `Link has unknown type: '${link.type}'`,
        suggestion: `Consider using one of: ${validTypes.join(', ')}`,
        context
      });
    }
  }

  private static validateRelationships(data: ComponentData, warnings: ValidationWarning[]): void {
    if (!data.nodes || !data.links) return;

    // Find orphaned nodes (nodes with no connections)
    const connectedNodes = new Set<string>();
    data.links.forEach(link => {
      if (link.source) connectedNodes.add(link.source);
      if (link.target) connectedNodes.add(link.target);
    });

    const orphanedNodes = data.nodes.filter(node => !connectedNodes.has(node.id));
    
    if (orphanedNodes.length > 0) {
      warnings.push({
        code: 'ORPHANED_NODES',
        message: `Found ${orphanedNodes.length} isolated components with no connections`,
        suggestion: 'Verify these components should be included',
        context: {
          affectedNodes: orphanedNodes.slice(0, 5).map(n => n.id) // Show first 5
        }
      });
    }

    // Detect potential circular dependencies (basic check)
    const circularDeps = this.detectCircularDependencies(data.nodes, data.links);
    if (circularDeps.length > 0) {
      warnings.push({
        code: 'CIRCULAR_DEPENDENCIES',
        message: `Found ${circularDeps.length} potential circular dependencies`,
        suggestion: 'Review component relationships for cycles',
        context: {
          affectedNodes: circularDeps.slice(0, 3) // Show first 3 cycles
        }
      });
    }
  }

  private static validatePerformance(data: ComponentData, warnings: ValidationWarning[]): void {
    const metrics = this.calculateMetrics(data);
    
    if (metrics.complexityScore > 100) {
      warnings.push({
        code: 'HIGH_COMPLEXITY',
        message: `High system complexity score: ${metrics.complexityScore}`,
        suggestion: 'Consider breaking down into smaller subsystems'
      });
    }

    // Check for highly connected nodes (potential bottlenecks)
    const connectionCounts = new Map<string, number>();
    data.links.forEach(link => {
      connectionCounts.set(link.source, (connectionCounts.get(link.source) || 0) + 1);
      connectionCounts.set(link.target, (connectionCounts.get(link.target) || 0) + 1);
    });

    const highlyConnected = Array.from(connectionCounts.entries())
      .filter(([_, count]) => count > 10)
      .sort((a, b) => b[1] - a[1]);

    if (highlyConnected.length > 0) {
      warnings.push({
        code: 'HIGHLY_CONNECTED_NODES',
        message: `Found ${highlyConnected.length} highly connected components`,
        suggestion: 'Review if these components have too many responsibilities',
        context: {
          affectedNodes: highlyConnected.slice(0, 3).map(([id]) => id)
        }
      });
    }
  }

  private static detectCircularDependencies(nodes: ComponentNode[], links: ComponentLink[]): string[][] {
    // Simple DFS-based cycle detection
    const graph = new Map<string, string[]>();
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[][] = [];

    // Build adjacency list
    links.forEach(link => {
      if (!graph.has(link.source)) graph.set(link.source, []);
      graph.get(link.source)!.push(link.target);
    });

    const dfs = (node: string, path: string[]): void => {
      if (recursionStack.has(node)) {
        // Found a cycle
        const cycleStart = path.indexOf(node);
        if (cycleStart >= 0) {
          cycles.push(path.slice(cycleStart).concat(node));
        }
        return;
      }

      if (visited.has(node)) return;

      visited.add(node);
      recursionStack.add(node);

      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        dfs(neighbor, [...path, node]);
      }

      recursionStack.delete(node);
    };

    // Check each node for cycles
    nodes.forEach(node => {
      if (!visited.has(node.id)) {
        dfs(node.id, []);
      }
    });

    return cycles.slice(0, 10); // Limit to first 10 cycles found
  }

  private static calculateMetrics(data: ComponentData): ValidationMetrics {
    const nodesByType: Record<string, number> = {};
    const linksByType: Record<string, number> = {};

    // Count nodes by type
    data.nodes?.forEach(node => {
      nodesByType[node.type] = (nodesByType[node.type] || 0) + 1;
    });

    // Count links by type
    data.links?.forEach(link => {
      linksByType[link.type] = (linksByType[link.type] || 0) + 1;
    });

    // Find orphaned nodes
    const connectedNodes = new Set<string>();
    data.links?.forEach(link => {
      connectedNodes.add(link.source);
      connectedNodes.add(link.target);
    });
    const orphanedNodes = data.nodes?.filter(node => !connectedNodes.has(node.id)).length || 0;

    // Detect circular dependencies
    const circularDependencies = this.detectCircularDependencies(data.nodes || [], data.links || []).length;

    // Calculate complexity score (simple heuristic)
    const nodeCount = data.nodes?.length || 0;
    const linkCount = data.links?.length || 0;
    const avgConnections = nodeCount > 0 ? linkCount / nodeCount : 0;
    const complexityScore = Math.round(nodeCount + (avgConnections * 10) + (circularDependencies * 5));

    return {
      totalNodes: nodeCount,
      totalLinks: linkCount,
      orphanedNodes,
      circularDependencies,
      nodesByType,
      linksByType,
      complexityScore
    };
  }

  private static getEmptyMetrics(): ValidationMetrics {
    return {
      totalNodes: 0,
      totalLinks: 0,
      orphanedNodes: 0,
      circularDependencies: 0,
      nodesByType: {},
      linksByType: {},
      complexityScore: 0
    };
  }
}