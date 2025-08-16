/**
 * Q&A Interface for Natural Language Questions
 * Integrates with the knowledge graph visualization
 */

class QAInterface {
    constructor(app) {
        this.app = app;
        this.currentAnswer = null;
        this.questionHistory = [];
        this.isProcessing = false;
        
        this.init();
    }

    init() {
        console.log('Initializing Q&A interface...');
        
        this.setupEventListeners();
        this.loadQuestionHistory();
        
        console.log('Q&A interface initialized');
    }

    setupEventListeners() {
        // Q&A form submission
        document.getElementById('qa-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleQuestionSubmit();
        });

        // Question input - handle Enter key
        const questionInput = document.getElementById('question');
        questionInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleQuestionSubmit();
            }
        });

        // Auto-resize question textarea
        questionInput.addEventListener('input', () => {
            this.autoResizeTextarea(questionInput);
        });

        // Clear answer when new question is typed
        questionInput.addEventListener('input', () => {
            if (this.currentAnswer && questionInput.value !== this.currentAnswer.question) {
                this.clearAnswer();
            }
        });
    }

    async handleQuestionSubmit() {
        if (this.isProcessing) return;

        const questionInput = document.getElementById('question');
        const question = questionInput.value.trim();
        
        if (!question) {
            this.app.showToast('Please enter a question', 'error');
            return;
        }

        this.isProcessing = true;
        this.showProcessingState(true);

        try {
            const options = {
                return_subgraph: document.getElementById('highlight-evidence').checked,
                max_hops: 2
            };

            const response = await fetch('/api/qa/ask', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.app.authToken}`
                },
                body: JSON.stringify({
                    question: question,
                    options: options
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `HTTP ${response.status}`);
            }

            this.currentAnswer = {
                question: question,
                answer: result.answer,
                evidence: result.evidence,
                subgraph: result.subgraph,
                timestamp: new Date()
            };

            this.displayAnswer(this.currentAnswer);
            this.addToHistory(this.currentAnswer);

            // Highlight evidence in graph if requested
            if (options.return_subgraph && result.evidence) {
                this.app.highlightEvidence(result.evidence);
            }

        } catch (error) {
            console.error('Q&A request failed:', error);
            this.app.showToast(`Question failed: ${error.message}`, 'error');
            this.displayError(error.message);
        } finally {
            this.isProcessing = false;
            this.showProcessingState(false);
        }
    }

    displayAnswer(answerData) {
        const answerContainer = document.getElementById('qa-answer');
        const answerText = document.getElementById('answer-text');
        const evidenceInfo = document.getElementById('evidence-info');

        answerText.textContent = answerData.answer;

        // Display evidence information
        const evidence = answerData.evidence || {};
        const nodeCount = evidence.node_ids ? evidence.node_ids.length : 0;
        const edgeCount = evidence.edge_ids ? evidence.edge_ids.length : 0;
        const docCount = evidence.document_ids ? evidence.document_ids.length : 0;

        if (nodeCount > 0 || edgeCount > 0) {
            evidenceInfo.innerHTML = `
                <i class="fas fa-lightbulb me-1"></i>
                Evidence: ${nodeCount} concepts, ${edgeCount} relationships, ${docCount} source documents
                <button class="btn btn-sm btn-outline-secondary ms-2" onclick="qaInterface.clearHighlights()">
                    Clear Highlights
                </button>
            `;
        } else {
            evidenceInfo.innerHTML = '<i class="fas fa-info-circle me-1"></i>No specific evidence found in the graph.';
        }

        answerContainer.style.display = 'block';
        answerContainer.classList.add('fade-in');
    }

    displayError(errorMessage) {
        const answerContainer = document.getElementById('qa-answer');
        const answerText = document.getElementById('answer-text');
        const evidenceInfo = document.getElementById('evidence-info');

        answerText.textContent = 'Sorry, I encountered an error while processing your question.';
        evidenceInfo.innerHTML = `<i class="fas fa-exclamation-triangle me-1"></i>Error: ${errorMessage}`;

        answerContainer.style.display = 'block';
        answerContainer.classList.remove('alert-info');
        answerContainer.classList.add('alert-danger');
    }

    clearAnswer() {
        const answerContainer = document.getElementById('qa-answer');
        answerContainer.style.display = 'none';
        answerContainer.classList.remove('alert-danger');
        answerContainer.classList.add('alert-info');
        
        this.currentAnswer = null;
        this.app.clearHighlights();
    }

    clearHighlights() {
        this.app.clearHighlights();
        
        // Update evidence info to show highlights are cleared
        if (this.currentAnswer) {
            const evidenceInfo = document.getElementById('evidence-info');
            const evidence = this.currentAnswer.evidence || {};
            const nodeCount = evidence.node_ids ? evidence.node_ids.length : 0;
            const edgeCount = evidence.edge_ids ? evidence.edge_ids.length : 0;
            const docCount = evidence.document_ids ? evidence.document_ids.length : 0;
            
            evidenceInfo.innerHTML = `
                <i class="fas fa-lightbulb me-1"></i>
                Evidence: ${nodeCount} concepts, ${edgeCount} relationships, ${docCount} source documents
                <button class="btn btn-sm btn-outline-primary ms-2" onclick="qaInterface.showEvidence()">
                    Show Highlights
                </button>
            `;
        }
    }

    showEvidence() {
        if (this.currentAnswer && this.currentAnswer.evidence) {
            this.app.highlightEvidence(this.currentAnswer.evidence);
            
            // Update button
            const evidenceInfo = document.getElementById('evidence-info');
            const evidence = this.currentAnswer.evidence || {};
            const nodeCount = evidence.node_ids ? evidence.node_ids.length : 0;
            const edgeCount = evidence.edge_ids ? evidence.edge_ids.length : 0;
            const docCount = evidence.document_ids ? evidence.document_ids.length : 0;
            
            evidenceInfo.innerHTML = `
                <i class="fas fa-lightbulb me-1"></i>
                Evidence: ${nodeCount} concepts, ${edgeCount} relationships, ${docCount} source documents
                <button class="btn btn-sm btn-outline-secondary ms-2" onclick="qaInterface.clearHighlights()">
                    Clear Highlights
                </button>
            `;
        }
    }

    showProcessingState(show) {
        const askBtn = document.getElementById('ask-btn');
        const questionInput = document.getElementById('question');

        if (show) {
            askBtn.disabled = true;
            askBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
            questionInput.disabled = true;
        } else {
            askBtn.disabled = false;
            askBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Ask Question';
            questionInput.disabled = false;
        }
    }

    addToHistory(answerData) {
        // Add to local history
        this.questionHistory.unshift({
            question: answerData.question,
            answer: answerData.answer.substring(0, 100) + (answerData.answer.length > 100 ? '...' : ''),
            timestamp: answerData.timestamp,
            evidence_count: {
                nodes: answerData.evidence.node_ids ? answerData.evidence.node_ids.length : 0,
                edges: answerData.evidence.edge_ids ? answerData.evidence.edge_ids.length : 0
            }
        });

        // Keep only last 10 questions
        if (this.questionHistory.length > 10) {
            this.questionHistory = this.questionHistory.slice(0, 10);
        }

        this.saveQuestionHistory();
    }

    saveQuestionHistory() {
        try {
            localStorage.setItem('kg_question_history', JSON.stringify(this.questionHistory));
        } catch (error) {
            console.warn('Failed to save question history to localStorage:', error);
        }
    }

    loadQuestionHistory() {
        try {
            const saved = localStorage.getItem('kg_question_history');
            if (saved) {
                this.questionHistory = JSON.parse(saved);
            }
        } catch (error) {
            console.warn('Failed to load question history from localStorage:', error);
            this.questionHistory = [];
        }
    }

    autoResizeTextarea(textarea) {
        // Reset height to auto to get the correct scrollHeight
        textarea.style.height = 'auto';
        
        // Set the height to match the content
        const minHeight = 76; // 3 rows approximately
        const maxHeight = 200; // Maximum height
        const scrollHeight = textarea.scrollHeight;
        
        textarea.style.height = Math.min(Math.max(scrollHeight, minHeight), maxHeight) + 'px';
    }

    // Public methods for external access
    getCurrentAnswer() {
        return this.currentAnswer;
    }

    getQuestionHistory() {
        return this.questionHistory;
    }

    suggestQuestion(question) {
        document.getElementById('question').value = question;
        this.autoResizeTextarea(document.getElementById('question'));
    }

    // Predefined example questions
    getExampleQuestions() {
        return [
            "What are the main concepts in the documents?",
            "How are the concepts related to each other?",
            "What is the most important concept?",
            "Show me concepts related to [specific term]",
            "How many different types of entities are there?",
            "What connections exist between [concept A] and [concept B]?",
            "What are the key themes in the knowledge graph?",
            "Which concepts appear most frequently?",
            "What relationships connect the most concepts?",
            "Show me the central concepts in the graph"
        ];
    }

    showExampleQuestions() {
        const examples = this.getExampleQuestions();
        const questionInput = document.getElementById('question');
        
        // Create a simple dropdown or modal with example questions
        // This is a simplified implementation - could be enhanced with a proper dropdown
        const randomExample = examples[Math.floor(Math.random() * examples.length)];
        
        if (confirm(`Try this example question?\n\n"${randomExample}"`)) {
            this.suggestQuestion(randomExample);
        }
    }
}

// Initialize Q&A interface when the app is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for the main app to initialize
    setTimeout(() => {
        if (window.app) {
            window.qaInterface = new QAInterface(window.app);
        }
    }, 100);
});

// Utility functions for template access
function clearHighlights() {
    if (window.qaInterface) {
        window.qaInterface.clearHighlights();
    }
}

function showEvidence() {
    if (window.qaInterface) {
        window.qaInterface.showEvidence();
    }
}

function showExampleQuestions() {
    if (window.qaInterface) {
        window.qaInterface.showExampleQuestions();
    }
}
