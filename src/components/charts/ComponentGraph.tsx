import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { ComponentData, VisualizationNode, VisualizationLink } from '@/types';

interface ComponentGraphProps {
  data: ComponentData;
  width?: number;
  height?: number;
  onNodeClick?: (node: VisualizationNode) => void;
  onNodeHover?: (node: VisualizationNode | null) => void;
}

interface GraphConfig {
  nodeRadius: number;
  linkDistance: number;
  chargeStrength: number;
  collisionRadius: number;
  colors: {
    service: string;
    interface: string;
    module: string;
    class: string;
    utility: string;
    [key: string]: string;
  };
}

export const ComponentGraph: React.FC<ComponentGraphProps> = ({
  data,
  width = 800,
  height = 600,
  onNodeClick,
  onNodeHover
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const config: GraphConfig = {
    nodeRadius: 8,
    linkDistance: 80,
    chargeStrength: -300,
    collisionRadius: 20,
    colors: {
      service: '#3b82f6',    // Blue
      interface: '#10b981',  // Green
      module: '#f59e0b',     // Yellow
      class: '#ef4444',      // Red
      utility: '#8b5cf6',    // Purple
      default: '#6b7280'     // Gray
    }
  };

  const processGraphData = useCallback(() => {
    // Clone and process nodes
    const nodes: VisualizationNode[] = data.nodes.map(node => ({
      ...node,
      x: width / 2 + (Math.random() - 0.5) * 200,
      y: height / 2 + (Math.random() - 0.5) * 200,
      fx: null,
      fy: null
    }));

    // Process links with proper source/target references
    const nodeMap = new Map(nodes.map(node => [node.id, node]));
    const links: VisualizationLink[] = data.links
      .filter(link => nodeMap.has(link.source) && nodeMap.has(link.target))
      .map(link => ({
        ...link,
        source: nodeMap.get(link.source)!,
        target: nodeMap.get(link.target)!
      }));

    return { nodes, links };
  }, [data, width, height]);

  const createVisualization = useCallback(() => {
    if (!svgRef.current || !data.nodes.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { nodes, links } = processGraphData();

    // Create container group for zoom/pan
    const container = svg.append('g').attr('class', 'graph-container');

    // Create arrow markers for directed links
    const defs = svg.append('defs');
    
    defs.selectAll('marker')
      .data(['dependency', 'implements', 'extends', 'uses'])
      .enter()
      .append('marker')
      .attr('id', d => `arrow-${d}`)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 15)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#999')
      .attr('stroke', 'none');

    // Create force simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink<VisualizationNode, VisualizationLink>(links)
        .id(d => d.id)
        .distance(config.linkDistance)
        .strength(0.7))
      .force('charge', d3.forceManyBody()
        .strength(config.chargeStrength))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide()
        .radius(config.collisionRadius)
        .strength(0.7));

    // Create links
    const linkElements = container.selectAll('.link')
      .data(links)
      .enter()
      .append('line')
      .attr('class', 'link')
      .attr('stroke', d => d.metadata?.color || '#999')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.7)
      .attr('marker-end', d => `url(#arrow-${d.type})`)
      .style('cursor', 'pointer');

    // Create nodes
    const nodeElements = container.selectAll('.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer');

    // Add circles for nodes
    nodeElements.append('circle')
      .attr('r', config.nodeRadius)
      .attr('fill', d => config.colors[d.type] || config.colors.default)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('opacity', 0.9);

    // Add labels
    nodeElements.append('text')
      .text(d => d.name)
      .attr('font-size', '12px')
      .attr('font-family', 'Inter, sans-serif')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', '#374151')
      .attr('pointer-events', 'none')
      .style('user-select', 'none');

    // Add interaction handlers
    nodeElements
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedNode(d.id === selectedNode ? null : d.id);
        onNodeClick?.(d);
      })
      .on('mouseenter', (event, d) => {
        setHoveredNode(d.id);
        onNodeHover?.(d);
      })
      .on('mouseleave', () => {
        setHoveredNode(null);
        onNodeHover?.(null);
      });

    // Add drag behavior
    const drag = d3.drag<SVGGElement, VisualizationNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    nodeElements.call(drag);

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Update positions on simulation tick
    simulation.on('tick', () => {
      linkElements
        .attr('x1', d => (d.source as VisualizationNode).x!)
        .attr('y1', d => (d.source as VisualizationNode).y!)
        .attr('x2', d => (d.target as VisualizationNode).x!)
        .attr('y2', d => (d.target as VisualizationNode).y!);

      nodeElements
        .attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Apply visual states
    updateVisualStates();

    return () => {
      simulation.stop();
    };
  }, [data, width, height, config, selectedNode, onNodeClick, onNodeHover, processGraphData]);

  const updateVisualStates = useCallback(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    
    // Update node styles based on selection/hover
    svg.selectAll('.node circle')
      .attr('stroke-width', (d: any) => {
        if (d.id === selectedNode) return 4;
        if (d.id === hoveredNode) return 3;
        return 2;
      })
      .attr('stroke', (d: any) => {
        if (d.id === selectedNode) return '#f59e0b';
        if (d.id === hoveredNode) return '#6b7280';
        return '#fff';
      })
      .attr('r', (d: any) => {
        if (d.id === selectedNode) return config.nodeRadius + 2;
        if (d.id === hoveredNode) return config.nodeRadius + 1;
        return config.nodeRadius;
      });

    // Update link styles based on connected nodes
    svg.selectAll('.link')
      .attr('stroke-opacity', (d: any) => {
        if (selectedNode && (d.source.id === selectedNode || d.target.id === selectedNode)) {
          return 1;
        }
        if (hoveredNode && (d.source.id === hoveredNode || d.target.id === hoveredNode)) {
          return 0.9;
        }
        return 0.7;
      })
      .attr('stroke-width', (d: any) => {
        if (selectedNode && (d.source.id === selectedNode || d.target.id === selectedNode)) {
          return 3;
        }
        return 2;
      });

    // Update text visibility and style
    svg.selectAll('.node text')
      .attr('font-weight', (d: any) => {
        if (d.id === selectedNode) return 'bold';
        if (d.id === hoveredNode) return '600';
        return 'normal';
      })
      .attr('font-size', (d: any) => {
        if (d.id === selectedNode) return '14px';
        if (d.id === hoveredNode) return '13px';
        return '12px';
      });
  }, [selectedNode, hoveredNode, config.nodeRadius]);

  useEffect(() => {
    const cleanup = createVisualization();
    return cleanup;
  }, [createVisualization]);

  useEffect(() => {
    updateVisualStates();
  }, [updateVisualStates]);

  const handleBackgroundClick = () => {
    setSelectedNode(null);
    onNodeClick?.(null as any);
  };

  return (
    <div className="relative w-full h-full">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 cursor-move"
        onClick={handleBackgroundClick}
      />
      
      {/* Legend */}
      <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Component Types</h4>
        <div className="space-y-1">
          {Object.entries(config.colors).filter(([key]) => key !== 'default').map(([type, color]) => (
            <div key={type} className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full border border-white"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                {type}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 border border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          <div>• Click nodes to select</div>
          <div>• Drag nodes to reposition</div>
          <div>• Scroll to zoom</div>
          <div>• Drag background to pan</div>
        </div>
      </div>

      {/* Stats */}
      <div className="absolute top-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 border border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          <div className="font-semibold text-gray-900 dark:text-white">Graph Stats</div>
          <div>Nodes: {data.nodes.length}</div>
          <div>Links: {data.links.length}</div>
          {selectedNode && (
            <div className="pt-1 border-t border-gray-200 dark:border-gray-600">
              <div className="text-blue-600 dark:text-blue-400 font-medium">Selected: {selectedNode}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};