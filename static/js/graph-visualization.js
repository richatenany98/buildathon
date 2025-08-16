/**
 * Interactive D3.js Graph Visualization with Force Simulation
 * Supports drag-and-drop, zoom, pan, and real-time physics
 */

class GraphVisualization {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = d3.select(`#${containerId}`);
        this.width = 0;
        this.height = 0;
        this.graphData = { nodes: [], edges: [] };
        this.simulation = null;
        this.nodeRadius = 8;
        this.linkDistance = 50;
        this.zoomBehavior = null;
        this.dragBehavior = null;
        
        // Visual elements
        this.svg = null;
        this.g = null;
        this.linkElements = null;
        this.nodeElements = null;
        this.labelElements = null;
        
        // State
        this.selectedNode = null;
        this.evidenceNodes = new Set();
        this.evidenceEdges = new Set();
        
        this.init();
    }

    init() {
        console.log('Initializing graph visualization...');
        
        this.setupSVG();
        this.setupSimulation();
        this.setupZoom();
        this.setupDrag();
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });
        
        console.log('Graph visualization initialized');
    }

    setupSVG() {
        this.svg = this.container;
        
        // Get container dimensions
        const containerNode = document.getElementById(this.containerId.replace('#', ''));
        const rect = containerNode.getBoundingClientRect();
        this.width = rect.width || 800;
        this.height = rect.height || 600;
        
        // Clear any existing content
        this.svg.selectAll('*').remove();
        
        // Create main group for zoom/pan
        this.g = this.svg.append('g')
            .attr('class', 'graph-container');
        
        // Define arrow markers for directed edges
        this.svg.append('defs').selectAll('marker')
            .data(['default', 'evidence'])
            .enter().append('marker')
            .attr('id', d => `arrow-${d}`)
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 15)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('class', d => d === 'evidence' ? 'evidence' : 'default')
            .style('fill', d => d === 'evidence' ? '#dc3545' : '#495057');
    }

    setupSimulation() {
        this.simulation = d3.forceSimulation()
            .force('link', d3.forceLink()
                .id(d => d.id)
                .distance(this.linkDistance)
                .strength(0.3))
            .force('charge', d3.forceManyBody()
                .strength(-300)
                .distanceMax(200))
            .force('center', d3.forceCenter(this.width / 2, this.height / 2))
            .force('collision', d3.forceCollide()
                .radius(this.nodeRadius * 2)
                .strength(0.5))
            .alphaDecay(0.0228)
            .velocityDecay(0.4);

        // Handle simulation tick events
        this.simulation.on('tick', () => {
            this.updateElementPositions();
        });
    }

    setupZoom() {
        this.zoomBehavior = d3.zoom()
            .scaleExtent([0.1, 5])
            .on('zoom', (event) => {
                this.g.attr('transform', event.transform);
            });

        this.svg.call(this.zoomBehavior);
        
        // Prevent zoom on double-click
        this.svg.on('dblclick.zoom', null);
    }

    setupDrag() {
        this.dragBehavior = d3.drag()
            .on('start', (event, d) => {
                if (!event.active) this.simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
                
                // Add dragging class for visual feedback
                d3.select(event.sourceEvent.target)
                    .classed('dragging', true)
                    .style('cursor', 'grabbing');
                
                // Bring dragged node to front
                d3.select(event.sourceEvent.target).raise();
                
                // Highlight connected edges during drag
                this.highlightConnectedElements(d, true);
            })
            .on('drag', (event, d) => {
                d.fx = event.x;
                d.fy = event.y;
                
                // Update node position immediately
                d3.select(event.sourceEvent.target)
                    .attr('cx', d.fx)
                    .attr('cy', d.fy);
                
                // Update label position immediately to keep it stuck to the node
                if (this.labelElements) {
                    this.labelElements
                        .filter(labelData => labelData.id === d.id)
                        .attr('x', d.fx)
                        .attr('y', d.fy);
                }
            })
            .on('end', (event, d) => {
                if (!event.active) this.simulation.alphaTarget(0);
                
                // Allow nodes to float freely after dragging for natural behavior
                d.fx = null;
                d.fy = null;
                
                // Remove dragging visual feedback
                d3.select(event.sourceEvent.target)
                    .classed('dragging', false)
                    .style('cursor', 'pointer');
                
                // Remove highlight from connected elements
                this.highlightConnectedElements(d, false);
            });
    }

    updateGraph(graphData) {
        console.log('Updating graph with new data:', graphData);
        
        if (!graphData.nodes || !graphData.edges) {
            console.warn('Invalid graph data structure');
            return;
        }

        this.graphData = {
            nodes: [...graphData.nodes],
            edges: [...graphData.edges]
        };

        // Process nodes to ensure they have required properties
        this.graphData.nodes.forEach(node => {
            if (!node.x) node.x = this.width / 2 + (Math.random() - 0.5) * 100;
            if (!node.y) node.y = this.height / 2 + (Math.random() - 0.5) * 100;
            if (!node.type) node.type = 'default';
        });

        this.render();
    }

    render() {
        // Update links
        this.linkElements = this.g.selectAll('.edge')
            .data(this.graphData.edges, d => d.id || `${d.source.id || d.source}-${d.target.id || d.target}`);

        // Remove old links
        this.linkElements.exit().remove();

        // Add new links
        const linkEnter = this.linkElements.enter()
            .append('line')
            .attr('class', 'edge')
            .attr('marker-end', 'url(#arrow-default)')
            .style('stroke', '#495057')
            .style('stroke-width', 1.5)
            .style('opacity', 0.6);

        // Merge enter and update selections
        this.linkElements = linkEnter.merge(this.linkElements);

        // Update link styles based on type
        this.linkElements
            .attr('class', d => `edge ${this.evidenceEdges.has(d.id || `${d.source.id || d.source}-${d.target.id || d.target}`) ? 'evidence' : ''}`)
            .attr('marker-end', d => this.evidenceEdges.has(d.id || `${d.source.id || d.source}-${d.target.id || d.target}`) ? 'url(#arrow-evidence)' : 'url(#arrow-default)');

        // Update nodes
        this.nodeElements = this.g.selectAll('.node')
            .data(this.graphData.nodes, d => d.id);

        // Remove old nodes
        this.nodeElements.exit().remove();

        // Add new nodes
        const nodeEnter = this.nodeElements.enter()
            .append('circle')
            .attr('class', d => `node ${d.type}`)
            .attr('r', this.nodeRadius)
            .style('cursor', 'pointer')
            .call(this.dragBehavior)
            .on('click', (event, d) => {
                this.handleNodeClick(event, d);
            })
            .on('mouseover', (event, d) => {
                this.handleNodeHover(event, d, true);
            })
            .on('mouseout', (event, d) => {
                this.handleNodeHover(event, d, false);
            });

        // Merge enter and update selections
        this.nodeElements = nodeEnter.merge(this.nodeElements);

        // Update node styles
        this.nodeElements
            .attr('class', d => {
                const classes = ['node', d.type];
                if (this.evidenceNodes.has(d.id)) classes.push('evidence');
                if (this.selectedNode && this.selectedNode.id === d.id) classes.push('selected');
                return classes.join(' ');
            });

        // Update labels
        this.labelElements = this.g.selectAll('.node-label')
            .data(this.graphData.nodes, d => d.id);

        // Remove old labels
        this.labelElements.exit().remove();

        // Add new labels
        const labelEnter = this.labelElements.enter()
            .append('text')
            .attr('class', 'node-label')
            .style('pointer-events', 'none')
            .style('font-size', '11px')
            .style('fill', '#ffffff')
            .style('text-anchor', 'middle')
            .style('dominant-baseline', 'central')
            .style('font-weight', '500')
            .style('text-shadow', '1px 1px 2px rgba(0, 0, 0, 0.8)');

        // Merge enter and update selections
        this.labelElements = labelEnter.merge(this.labelElements);

        // Update label text and position
        this.labelElements
            .text(d => this.truncateLabel(d.label || d.id, 15))
            .attr('x', d => d.x || 0)
            .attr('y', d => d.y || 0);

        // Update simulation with new data
        this.simulation.nodes(this.graphData.nodes);
        this.simulation.force('link').links(this.graphData.edges);

        // Restart simulation
        this.simulation.alpha(1).restart();

        console.log(`Rendered ${this.graphData.nodes.length} nodes and ${this.graphData.edges.length} edges`);
    }

    updateElementPositions() {
        // Update link positions
        if (this.linkElements) {
            this.linkElements
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);
        }

        // Update node positions
        if (this.nodeElements) {
            this.nodeElements
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);
        }

        // Update label positions - always keep them perfectly centered on nodes
        if (this.labelElements) {
            this.labelElements
                .attr('x', d => d.x)
                .attr('y', d => d.y);
        }
    }
    
    updateLabelPosition(node) {
        // Update specific node's label position immediately during drag
        if (this.labelElements) {
            this.labelElements
                .filter(d => d.id === node.id)
                .attr('x', node.x)
                .attr('y', node.y);
        }
    }
    
    highlightConnectedElements(node, highlight) {
        if (!this.linkElements) return;
        
        if (highlight) {
            // Highlight connected edges and nodes with transitions
            this.linkElements
                .transition()
                .duration(100)
                .style('opacity', d => 
                    (d.source.id === node.id || d.target.id === node.id) ? 0.9 : 0.15
                )
                .style('stroke-width', d => 
                    (d.source.id === node.id || d.target.id === node.id) ? 3 : 1.5
                );
                
            this.nodeElements
                .filter(d => d.id !== node.id)  // Don't affect the dragged node
                .transition()
                .duration(100)
                .style('opacity', d => {
                    // Check if this node is connected to the dragged node
                    const isConnected = this.graphData.edges.some(edge => 
                        (edge.source.id === node.id && edge.target.id === d.id) ||
                        (edge.target.id === node.id && edge.source.id === d.id)
                    );
                    return isConnected ? 0.8 : 0.2;
                });
        } else {
            // Reset all elements smoothly
            this.linkElements
                .transition()
                .duration(200)
                .style('opacity', 0.6)
                .style('stroke-width', 1.5);
                
            this.nodeElements
                .transition()
                .duration(200)
                .style('opacity', 1);
        }
    }

    handleNodeClick(event, nodeData) {
        event.stopPropagation();
        
        // Update selection
        this.selectedNode = nodeData;
        
        // Update visual selection
        this.nodeElements.classed('selected', d => d.id === nodeData.id);
        
        // Show node details
        if (window.app) {
            window.app.showNodeDetails(nodeData.id, nodeData);
        }
        
        console.log('Node clicked:', nodeData);
    }

    handleNodeHover(event, nodeData, isEntering) {
        const node = d3.select(event.target);
        
        // Prevent hover effects during dragging
        if (node.classed('dragging')) {
            return;
        }
        
        // Clear any existing hover states first
        if (isEntering) {
            this.clearHoverStates();
        }
        
        if (isEntering) {
            // Add hover class for CSS styling
            node.classed('hovering', true);
            
            // Highlight connected edges without transitions to prevent glitching
            if (this.linkElements) {
                this.linkElements
                    .style('opacity', d => 
                        (d.source.id === nodeData.id || d.target.id === nodeData.id) ? 0.9 : 0.2
                    )
                    .style('stroke-width', d => 
                        (d.source.id === nodeData.id || d.target.id === nodeData.id) ? 3 : 1.5
                    );
            }
            
            // Highlight connected nodes
            if (this.nodeElements) {
                this.nodeElements
                    .style('opacity', d => {
                        if (d.id === nodeData.id) return 1;
                        // Check if connected
                        const isConnected = this.graphData.edges.some(edge => 
                            (edge.source.id === nodeData.id && edge.target.id === d.id) ||
                            (edge.target.id === nodeData.id && edge.source.id === d.id)
                        );
                        return isConnected ? 0.8 : 0.3;
                    });
            }
            
            // Ensure labels stay visible and properly positioned
            if (this.labelElements) {
                this.labelElements
                    .style('opacity', d => {
                        if (d.id === nodeData.id) return 1;
                        const isConnected = this.graphData.edges.some(edge => 
                            (edge.source.id === nodeData.id && edge.target.id === d.id) ||
                            (edge.target.id === nodeData.id && edge.source.id === d.id)
                        );
                        return isConnected ? 0.9 : 0.4;
                    });
            }
                
            // Show tooltip
            this.showTooltip(event, nodeData);
        } else {
            // Remove hover class
            node.classed('hovering', false);
            
            // Reset all elements
            this.resetHoverStates();
                
            // Hide tooltip
            this.hideTooltip();
        }
    }
    
    clearHoverStates() {
        // Remove all existing hover classes
        if (this.nodeElements) {
            this.nodeElements.classed('hovering', false);
        }
    }
    
    resetHoverStates() {
        // Reset all elements to default state
        if (this.linkElements) {
            this.linkElements
                .style('opacity', 0.6)
                .style('stroke-width', 1.5);
        }
        
        if (this.nodeElements) {
            this.nodeElements
                .style('opacity', 1);
        }
        
        if (this.labelElements) {
            this.labelElements
                .style('opacity', 1);
        }
    }

    showTooltip(event, nodeData) {
        // Remove any existing tooltips first to prevent conflicts
        this.hideTooltip();
        
        // Create improved tooltip
        const tooltip = d3.select('body').append('div')
            .attr('class', 'graph-tooltip')
            .style('position', 'absolute')
            .style('background', 'rgba(0, 0, 0, 0.9)')
            .style('color', 'white')
            .style('padding', '8px 12px')
            .style('border-radius', '6px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('z-index', '10000')
            .style('box-shadow', '0 4px 12px rgba(0, 0, 0, 0.3)')
            .style('backdrop-filter', 'blur(10px)')
            .style('border', '1px solid rgba(255, 255, 255, 0.1)')
            .html(`
                <div style="font-weight: 600; margin-bottom: 4px;">${nodeData.label || nodeData.id}</div>
                <div style="font-size: 10px; opacity: 0.8;">Type: ${nodeData.type}</div>
                ${nodeData.entity_label ? `<div style="font-size: 10px; opacity: 0.8;">Entity: ${nodeData.entity_label}</div>` : ''}
            `);
        
        // Smart positioning to avoid going off screen
        const tooltipNode = tooltip.node();
        const rect = tooltipNode.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        let left = event.pageX + 10;
        let top = event.pageY - 10;
        
        // Adjust if tooltip would go off screen
        if (left + rect.width > windowWidth) {
            left = event.pageX - rect.width - 10;
        }
        if (top + rect.height > windowHeight) {
            top = event.pageY - rect.height - 10;
        }
        
        tooltip
            .style('left', left + 'px')
            .style('top', top + 'px')
            .style('opacity', 0)
            .transition()
            .duration(150)
            .style('opacity', 1);
    }

    hideTooltip() {
        // Immediately remove tooltips without transition to prevent conflicts
        d3.selectAll('.graph-tooltip').remove();
    }

    highlightEvidence(evidence) {
        console.log('Highlighting evidence:', evidence);
        
        // Clear previous highlights
        this.clearHighlights();
        
        // Highlight evidence nodes
        if (evidence.node_ids && evidence.node_ids.length > 0) {
            evidence.node_ids.forEach(nodeId => {
                this.evidenceNodes.add(nodeId);
            });
        }
        
        // Highlight evidence edges
        if (evidence.edge_ids && evidence.edge_ids.length > 0) {
            evidence.edge_ids.forEach(edgeId => {
                this.evidenceEdges.add(edgeId);
            });
        }
        
        // Update visual highlighting
        this.updateHighlights();
    }

    clearHighlights() {
        this.evidenceNodes.clear();
        this.evidenceEdges.clear();
        this.updateHighlights();
    }

    updateHighlights() {
        // Update node classes
        if (this.nodeElements) {
            this.nodeElements
                .attr('class', d => {
                    const classes = ['node', d.type];
                    if (this.evidenceNodes.has(d.id)) classes.push('evidence');
                    if (this.selectedNode && this.selectedNode.id === d.id) classes.push('selected');
                    return classes.join(' ');
                });
        }
        
        // Update edge classes
        if (this.linkElements) {
            this.linkElements
                .attr('class', d => {
                    const edgeId = d.id || `${d.source.id || d.source}-${d.target.id || d.target}`;
                    return `edge ${this.evidenceEdges.has(edgeId) ? 'evidence' : ''}`;
                })
                .attr('marker-end', d => {
                    const edgeId = d.id || `${d.source.id || d.source}-${d.target.id || d.target}`;
                    return this.evidenceEdges.has(edgeId) ? 'url(#arrow-evidence)' : 'url(#arrow-default)';
                });
        }
    }

    highlightNode(nodeId) {
        // Find and highlight specific node
        this.selectedNode = this.graphData.nodes.find(n => n.id === nodeId);
        
        if (this.selectedNode) {
            // Update visual selection
            this.nodeElements.classed('selected', d => d.id === nodeId);
            
            // Center the view on the node
            this.centerOnNode(this.selectedNode);
        }
    }

    centerOnNode(node) {
        if (!node) return;
        
        const transform = d3.zoomTransform(this.svg.node());
        const x = -node.x * transform.k + this.width / 2;
        const y = -node.y * transform.k + this.height / 2;
        
        this.svg.transition()
            .duration(750)
            .call(this.zoomBehavior.transform,
                d3.zoomIdentity.translate(x, y).scale(transform.k)
            );
    }

    centerGraph() {
        if (this.graphData.nodes.length === 0) return;
        
        // Calculate bounding box of all nodes
        const bounds = {
            minX: d3.min(this.graphData.nodes, d => d.x),
            maxX: d3.max(this.graphData.nodes, d => d.x),
            minY: d3.min(this.graphData.nodes, d => d.y),
            maxY: d3.max(this.graphData.nodes, d => d.y)
        };
        
        const centerX = (bounds.minX + bounds.maxX) / 2;
        const centerY = (bounds.minY + bounds.maxY) / 2;
        
        // Calculate appropriate scale
        const graphWidth = bounds.maxX - bounds.minX;
        const graphHeight = bounds.maxY - bounds.minY;
        const scale = Math.min(
            this.width / (graphWidth + 100),
            this.height / (graphHeight + 100),
            1.5 // Max scale
        );
        
        const x = -centerX * scale + this.width / 2;
        const y = -centerY * scale + this.height / 2;
        
        this.svg.transition()
            .duration(750)
            .call(this.zoomBehavior.transform,
                d3.zoomIdentity.translate(x, y).scale(scale)
            );
    }

    resetZoom() {
        this.svg.transition()
            .duration(750)
            .call(this.zoomBehavior.transform, d3.zoomIdentity);
    }

    reheatSimulation() {
        if (this.simulation) {
            this.simulation.alpha(1).restart();
        }
    }

    handleResize() {
        const containerNode = document.getElementById(this.containerId.replace('#', ''));
        const rect = containerNode.getBoundingClientRect();
        const newWidth = rect.width || 800;
        const newHeight = rect.height || 600;
        
        if (newWidth !== this.width || newHeight !== this.height) {
            this.width = newWidth;
            this.height = newHeight;
            
            // Update center force
            this.simulation
                .force('center', d3.forceCenter(this.width / 2, this.height / 2))
                .alpha(0.3)
                .restart();
        }
    }

    truncateLabel(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }

    // Utility methods for external access
    getGraphData() {
        return this.graphData;
    }

    getSimulationAlpha() {
        return this.simulation ? this.simulation.alpha() : 0;
    }

    isSimulationRunning() {
        return this.simulation && this.simulation.alpha() > this.simulation.alphaMin();
    }
}
