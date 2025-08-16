/**
 * Main application logic for Knowledge Graph Builder
 * Handles API communication, authentication, and UI coordination
 */

class KnowledgeGraphApp {
    constructor() {
        this.apiBaseUrl = '';
        this.authToken = 'secure_token_here'; // This would come from environment in production
        this.currentJobId = null;
        this.currentSyncId = null;
        this.graphVisualization = null;
        this.qaInterface = null;
        
        this.init();
    }

    init() {
        console.log('Initializing Knowledge Graph Builder...');
        
        // Initialize components
        this.setupEventListeners();
        this.checkSystemHealth();
        
        // Initialize graph visualization
        this.graphVisualization = new GraphVisualization('graph-svg');
        
        // Initialize Q&A interface
        this.qaInterface = new QAInterface(this);
        
        console.log('Application initialized successfully');
    }

    setupEventListeners() {
        // Upload form submission
        document.getElementById('upload-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFileUpload();
        });

        // Build graph button
        document.getElementById('build-graph-btn').addEventListener('click', () => {
            this.buildGraph();
        });

        // Search concepts
        const searchInput = document.getElementById('search-concepts');
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.searchConcepts(e.target.value);
            }, 300);
        });

        // Graph controls
        document.getElementById('center-graph').addEventListener('click', () => {
            this.graphVisualization.centerGraph();
        });

        document.getElementById('reset-zoom').addEventListener('click', () => {
            this.graphVisualization.resetZoom();
        });

        document.getElementById('reheat-simulation').addEventListener('click', () => {
            this.graphVisualization.reheatSimulation();
        });

        // View filters
        document.getElementById('view-all').addEventListener('click', () => {
            this.loadGraphData();
        });

        document.getElementById('view-recent').addEventListener('click', () => {
            this.loadGraphData({ recent: true });
        });

        document.getElementById('view-entities').addEventListener('click', () => {
            this.loadGraphData({ nodeType: 'entity' });
        });

        document.getElementById('view-keywords').addEventListener('click', () => {
            this.loadGraphData({ nodeType: 'keyword' });
        });

        // Node details panel close button
        document.getElementById('close-node-details').addEventListener('click', () => {
            document.getElementById('node-details').style.display = 'none';
        });
    }

    async checkSystemHealth() {
        try {
            const response = await fetch('/health');
            const health = await response.json();
            
            const statusElement = document.getElementById('health-status');
            const icon = statusElement.querySelector('i');
            
            if (health.status === 'healthy') {
                icon.className = 'fas fa-circle text-success me-1';
                statusElement.innerHTML = '<i class="fas fa-circle text-success me-1"></i>System Healthy';
            } else {
                icon.className = 'fas fa-circle text-danger me-1';
                statusElement.innerHTML = '<i class="fas fa-circle text-danger me-1"></i>System Error';
            }
        } catch (error) {
            console.error('Health check failed:', error);
            const statusElement = document.getElementById('health-status');
            statusElement.innerHTML = '<i class="fas fa-circle text-warning me-1"></i>Connection Error';
        }
    }

    async handleFileUpload() {
        const form = document.getElementById('upload-form');
        const formData = new FormData();
        
        // Get files
        const filesInput = document.getElementById('files');
        const files = filesInput.files;
        
        // Get URLs
        const urlsInput = document.getElementById('urls');
        const urlsText = urlsInput.value.trim();
        const urls = urlsText ? urlsText.split('\n').map(url => url.trim()).filter(url => url) : [];
        
        if (files.length === 0 && urls.length === 0) {
            this.showToast('Please select files or enter URLs', 'error');
            return;
        }

        // Add files to form data
        for (let i = 0; i < files.length; i++) {
            formData.append('files', files[i]);
        }

        // Add URLs as JSON string
        if (urls.length > 0) {
            formData.append('urls', JSON.stringify(urls));
        }

        // Show progress
        this.showUploadProgress(true);
        this.updateUploadStatus('Uploading files and processing URLs...');

        try {
            const response = await fetch('/api/ingest/jobs', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: formData
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `HTTP ${response.status}`);
            }

            this.currentJobId = result.job_id;
            this.showToast(`Ingestion job started (ID: ${this.currentJobId})`, 'success');
            this.updateUploadStatus(`Job created: ${result.inputs_count} inputs, ${(result.total_bytes / 1024 / 1024).toFixed(1)}MB total`);
            
            // Enable build graph button
            document.getElementById('build-graph-btn').disabled = false;
            
            // Start polling for job status
            this.pollJobStatus(this.currentJobId);

        } catch (error) {
            console.error('Upload failed:', error);
            this.showToast(`Upload failed: ${error.message}`, 'error');
            this.hideUploadProgress();
        }
    }

    async pollJobStatus(jobId) {
        try {
            const response = await fetch(`/api/ingest/jobs/${jobId}`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });

            const job = await response.json();

            if (!response.ok) {
                throw new Error(job.error || `HTTP ${response.status}`);
            }

            this.updateUploadStatus(`Status: ${job.status} - ${job.documents_count} documents processed`);

            if (job.status === 'completed') {
                this.hideUploadProgress();
                this.showToast('Ingestion completed successfully!', 'success');
                
                if (job.error) {
                    this.showToast(`Warning: ${job.error}`, 'warning');
                }
            } else if (job.status === 'failed') {
                this.hideUploadProgress();
                this.showToast(`Ingestion failed: ${job.error}`, 'error');
            } else {
                // Continue polling
                setTimeout(() => this.pollJobStatus(jobId), 2000);
            }

        } catch (error) {
            console.error('Error polling job status:', error);
            this.hideUploadProgress();
            this.showToast(`Error checking status: ${error.message}`, 'error');
        }
    }

    async buildGraph() {
        if (!this.currentJobId) {
            this.showToast('No completed ingestion job found', 'error');
            return;
        }

        const buildBtn = document.getElementById('build-graph-btn');
        buildBtn.disabled = true;
        buildBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Building Graph...';

        this.updateBuildStatus('Starting graph construction...');

        try {
            const response = await fetch('/api/graph/build', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify({
                    ingest_job_id: this.currentJobId
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `HTTP ${response.status}`);
            }

            this.currentSyncId = result.sync_id;
            this.showToast('Graph building started', 'success');
            
            // Start polling for build status
            this.pollBuildStatus(this.currentSyncId);

        } catch (error) {
            console.error('Graph build failed:', error);
            this.showToast(`Graph build failed: ${error.message}`, 'error');
            this.resetBuildButton();
        }
    }

    async pollBuildStatus(syncId) {
        try {
            const response = await fetch(`/api/graph/build/${syncId}`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });

            const sync = await response.json();

            if (!response.ok) {
                throw new Error(sync.error || `HTTP ${response.status}`);
            }

            const stats = sync.stats || {};
            this.updateBuildStatus(
                `Status: ${sync.status} - Nodes: ${stats.nodes_created || 0}, Edges: ${stats.edges_created || 0}, Merged: ${stats.concepts_merged || 0}`
            );

            if (sync.status === 'completed') {
                this.showToast('Graph construction completed!', 'success');
                this.resetBuildButton();
                
                // Enable Q&A
                document.getElementById('ask-btn').disabled = false;
                
                // Load and display the graph
                await this.loadGraphData();

            } else if (sync.status === 'failed') {
                this.showToast(`Graph build failed: ${sync.error}`, 'error');
                this.resetBuildButton();
            } else {
                // Continue polling
                setTimeout(() => this.pollBuildStatus(syncId), 3000);
            }

        } catch (error) {
            console.error('Error polling build status:', error);
            this.showToast(`Error checking build status: ${error.message}`, 'error');
            this.resetBuildButton();
        }
    }

    async loadGraphData(filters = {}) {
        try {
            this.showGraphLoading(true);

            const requestBody = {
                max_nodes: 100,
                max_hops: 2,
                ...filters
            };

            const response = await fetch('/api/graph/subgraph', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify(requestBody)
            });

            const graphData = await response.json();

            if (!response.ok) {
                throw new Error(graphData.error || `HTTP ${response.status}`);
            }

            if (graphData.nodes && graphData.nodes.length > 0) {
                this.graphVisualization.updateGraph(graphData);
                this.updateGraphStats(graphData);
                this.showGraphEmpty(false);
            } else {
                this.showGraphEmpty(true);
            }

        } catch (error) {
            console.error('Error loading graph data:', error);
            this.showToast(`Error loading graph: ${error.message}`, 'error');
            this.showGraphEmpty(true);
        } finally {
            this.showGraphLoading(false);
        }
    }

    async searchConcepts(query) {
        if (!query || query.length < 2) {
            this.hideSearchResults();
            return;
        }

        try {
            const response = await fetch(`/api/graph/search?q=${encodeURIComponent(query)}&limit=10`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `HTTP ${response.status}`);
            }

            this.showSearchResults(result.concepts || []);

        } catch (error) {
            console.error('Search failed:', error);
            this.hideSearchResults();
        }
    }

    showSearchResults(concepts) {
        const resultsContainer = document.getElementById('search-results');
        
        if (concepts.length === 0) {
            resultsContainer.style.display = 'none';
            return;
        }

        resultsContainer.innerHTML = '';
        concepts.forEach(concept => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            item.innerHTML = `
                <div class="fw-medium">${this.escapeHtml(concept.label)}</div>
                <small class="text-muted">${this.escapeHtml(concept.canonical_key)}</small>
            `;
            
            item.addEventListener('click', () => {
                this.selectConcept(concept);
                this.hideSearchResults();
            });
            
            resultsContainer.appendChild(item);
        });

        resultsContainer.style.display = 'block';
    }

    hideSearchResults() {
        document.getElementById('search-results').style.display = 'none';
    }

    selectConcept(concept) {
        // Highlight the concept in the graph and load its neighborhood
        this.graphVisualization.highlightNode(concept.id);
        this.loadGraphData({ concept_ids: [concept.id], max_hops: 2 });
        
        // Clear search input
        document.getElementById('search-concepts').value = concept.label;
    }

    // UI Helper Methods
    showUploadProgress(show) {
        document.getElementById('upload-progress').style.display = show ? 'block' : 'none';
        const uploadBtn = document.getElementById('upload-btn');
        uploadBtn.disabled = show;
        uploadBtn.innerHTML = show ? 
            '<i class="fas fa-spinner fa-spin me-2"></i>Processing...' : 
            '<i class="fas fa-upload me-2"></i>Start Ingestion';
    }

    hideUploadProgress() {
        this.showUploadProgress(false);
    }

    updateUploadStatus(message) {
        document.getElementById('upload-status').textContent = message;
    }

    updateBuildStatus(message) {
        document.getElementById('build-status').textContent = message;
    }

    resetBuildButton() {
        const buildBtn = document.getElementById('build-graph-btn');
        buildBtn.disabled = false;
        buildBtn.innerHTML = '<i class="fas fa-play me-2"></i>Build Knowledge Graph';
    }

    showGraphLoading(show) {
        document.getElementById('graph-loading').style.display = show ? 'block' : 'none';
    }

    showGraphEmpty(show) {
        document.getElementById('graph-empty').style.display = show ? 'block' : 'none';
    }

    updateGraphStats(graphData) {
        const nodes = graphData.nodes ? graphData.nodes.length : 0;
        const edges = graphData.edges ? graphData.edges.length : 0;
        document.getElementById('graph-stats').textContent = `${nodes} nodes, ${edges} edges`;
    }

    showToast(message, type = 'info') {
        const toastId = type === 'error' ? 'error-toast' : 'success-toast';
        const toast = document.getElementById(toastId);
        const toastBody = toast.querySelector('.toast-body');
        
        toastBody.textContent = message;
        
        const bsToast = new bootstrap.Toast(toast, {
            autohide: true,
            delay: type === 'error' ? 5000 : 3000
        });
        
        bsToast.show();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Methods for Q&A interface integration
    highlightEvidence(evidence) {
        if (this.graphVisualization) {
            this.graphVisualization.highlightEvidence(evidence);
        }
    }

    clearHighlights() {
        if (this.graphVisualization) {
            this.graphVisualization.clearHighlights();
        }
    }

    showNodeDetails(nodeId, nodeData) {
        const detailsPanel = document.getElementById('node-details');
        const titleElement = document.getElementById('node-title');
        const contentElement = document.getElementById('node-content');

        titleElement.textContent = nodeData.label || nodeId;
        
        contentElement.innerHTML = `
            <div class="mb-2">
                <strong>Type:</strong> <span class="badge bg-secondary">${nodeData.type || 'Unknown'}</span>
            </div>
            <div class="mb-2">
                <strong>ID:</strong> <code class="small">${nodeId}</code>
            </div>
            ${nodeData.canonical_key ? `
                <div class="mb-2">
                    <strong>Canonical:</strong> ${this.escapeHtml(nodeData.canonical_key)}
                </div>
            ` : ''}
            ${nodeData.entity_label ? `
                <div class="mb-2">
                    <strong>Entity Type:</strong> <span class="badge bg-info">${nodeData.entity_label}</span>
                </div>
            ` : ''}
            <div class="mt-3">
                <button class="btn btn-sm btn-outline-primary" onclick="app.loadGraphData({concept_ids: ['${nodeId}'], max_hops: 2})">
                    <i class="fas fa-expand-arrows-alt me-1"></i>
                    Explore Neighborhood
                </button>
            </div>
        `;

        detailsPanel.style.display = 'block';
        detailsPanel.classList.add('fade-in');
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new KnowledgeGraphApp();
});
