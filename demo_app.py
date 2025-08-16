import os
import logging
from flask import Flask, render_template, request, jsonify
from werkzeug.middleware.proxy_fix import ProxyFix
from datetime import datetime
import json
import random

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Create Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "demo-secret-key")
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# Demo data for interactive graph visualization
SAMPLE_GRAPH_DATA = {
    "nodes": [
        {"id": "concept_1", "label": "Machine Learning", "type": "entity", "canonical_key": "machine learning"},
        {"id": "concept_2", "label": "Neural Networks", "type": "entity", "canonical_key": "neural networks"},
        {"id": "concept_3", "label": "Deep Learning", "type": "entity", "canonical_key": "deep learning"},
        {"id": "concept_4", "label": "Data Science", "type": "entity", "canonical_key": "data science"},
        {"id": "concept_5", "label": "Artificial Intelligence", "type": "entity", "canonical_key": "artificial intelligence"},
        {"id": "concept_6", "label": "Algorithm", "type": "keyword", "canonical_key": "algorithm"},
        {"id": "concept_7", "label": "Training Data", "type": "noun_phrase", "canonical_key": "training data"},
        {"id": "concept_8", "label": "Model Architecture", "type": "noun_phrase", "canonical_key": "model architecture"},
        {"id": "concept_9", "label": "Optimization", "type": "keyword", "canonical_key": "optimization"},
        {"id": "concept_10", "label": "Feature Engineering", "type": "noun_phrase", "canonical_key": "feature engineering"},
        {"id": "concept_11", "label": "Supervised Learning", "type": "entity", "canonical_key": "supervised learning"},
        {"id": "concept_12", "label": "Unsupervised Learning", "type": "entity", "canonical_key": "unsupervised learning"},
        {"id": "concept_13", "label": "Classification", "type": "keyword", "canonical_key": "classification"},
        {"id": "concept_14", "label": "Regression", "type": "keyword", "canonical_key": "regression"},
        {"id": "concept_15", "label": "Pattern Recognition", "type": "noun_phrase", "canonical_key": "pattern recognition"}
    ],
    "edges": [
        {"id": "edge_1", "source": "concept_1", "target": "concept_2", "type": "RELATED_TO"},
        {"id": "edge_2", "source": "concept_2", "target": "concept_3", "type": "RELATED_TO"},
        {"id": "edge_3", "source": "concept_1", "target": "concept_4", "type": "RELATED_TO"},
        {"id": "edge_4", "source": "concept_5", "target": "concept_1", "type": "RELATED_TO"},
        {"id": "edge_5", "source": "concept_1", "target": "concept_6", "type": "MENTIONS"},
        {"id": "edge_6", "source": "concept_1", "target": "concept_7", "type": "MENTIONS"},
        {"id": "edge_7", "source": "concept_2", "target": "concept_8", "type": "MENTIONS"},
        {"id": "edge_8", "source": "concept_1", "target": "concept_9", "type": "RELATED_TO"},
        {"id": "edge_9", "source": "concept_4", "target": "concept_10", "type": "MENTIONS"},
        {"id": "edge_10", "source": "concept_1", "target": "concept_11", "type": "RELATED_TO"},
        {"id": "edge_11", "source": "concept_1", "target": "concept_12", "type": "RELATED_TO"},
        {"id": "edge_12", "source": "concept_11", "target": "concept_13", "type": "MENTIONS"},
        {"id": "edge_13", "source": "concept_11", "target": "concept_14", "type": "MENTIONS"},
        {"id": "edge_14", "source": "concept_15", "target": "concept_1", "type": "RELATED_TO"}
    ]
}

# Demo state - now stores actual processed data
demo_state = {
    "current_job_id": None,
    "current_sync_id": None,
    "graph_built": False,
    "uploaded_files": [],
    "processed_content": [],
    "dynamic_graph_data": None
}

# Simple NLP processing for demo
def extract_concepts_from_text(text):
    """Extract basic concepts from text for demo purposes"""
    import re
    
    # Simple keyword extraction
    words = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', text)
    sentences = text.split('.')
    
    concepts = []
    concept_id = 1
    
    # Extract capitalized words/phrases as concepts
    seen_concepts = set()
    for word in words:
        if len(word) > 3 and word.lower() not in seen_concepts:
            concepts.append({
                "id": f"concept_{concept_id}",
                "label": word,
                "type": "entity",
                "canonical_key": word.lower()
            })
            seen_concepts.add(word.lower())
            concept_id += 1
    
    # Extract some noun phrases from sentences
    for sentence in sentences[:10]:  # Limit to first 10 sentences
        sentence = sentence.strip()
        if len(sentence) > 20:
            # Simple noun phrase detection
            noun_phrases = re.findall(r'\b(?:the|a|an)\s+([a-z]+(?:\s+[a-z]+){1,2})\b', sentence.lower())
            for phrase in noun_phrases:
                if phrase not in seen_concepts and len(phrase) > 5:
                    concepts.append({
                        "id": f"concept_{concept_id}",
                        "label": phrase.title(),
                        "type": "noun_phrase",
                        "canonical_key": phrase.lower()
                    })
                    seen_concepts.add(phrase)
                    concept_id += 1
    
    return concepts[:15]  # Limit to 15 concepts for demo

def create_relationships(concepts):
    """Create simple relationships between concepts"""
    edges = []
    edge_id = 1
    
    for i, concept1 in enumerate(concepts):
        for j, concept2 in enumerate(concepts[i+1:], i+1):
            # Create relationships based on simple rules
            if j - i <= 3:  # Connect nearby concepts
                edges.append({
                    "id": f"edge_{edge_id}",
                    "source": concept1["id"],
                    "target": concept2["id"],
                    "type": "RELATED_TO" if concept1["type"] == concept2["type"] else "MENTIONS"
                })
                edge_id += 1
                if len(edges) >= 20:  # Limit edges for demo
                    break
        if len(edges) >= 20:
            break
    
    return edges

@app.route('/')
def index():
    """Main application interface"""
    return render_template('index.html')

@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'mode': 'demo',
        'message': 'Running in demonstration mode with sample data'
    })

# Demo API Endpoints

@app.route('/api/ingest/jobs', methods=['POST'])
def create_ingest_job():
    """Demo ingestion job creation - now processes actual file content"""
    try:
        files = request.files.getlist('files')
        urls_json = request.form.get('urls', '[]')
        urls = json.loads(urls_json) if urls_json else []
        
        if not files and not urls:
            return jsonify({'error': 'No files or URLs provided'}), 400
        
        # Clear previous data
        demo_state["processed_content"] = []
        demo_state["dynamic_graph_data"] = None
        demo_state["graph_built"] = False
        
        # Process uploaded files
        total_bytes = 0
        for file in files:
            if file.filename:
                content = file.read().decode('utf-8', errors='ignore')
                total_bytes += len(content)
                demo_state["processed_content"].append({
                    'name': file.filename,
                    'content': content,
                    'type': 'file'
                })
                file.seek(0)  # Reset file pointer
        
        # Process URLs (simple demo)
        if urls:
            for url in urls:
                # For demo purposes, create some sample content based on URL
                sample_content = f"Content from {url}. This is demonstration content that would normally be extracted from the web page. The system would analyze this text to find key concepts and relationships."
                demo_state["processed_content"].append({
                    'name': url,
                    'content': sample_content,
                    'type': 'url'
                })
                total_bytes += len(sample_content)
        
        # Create job
        job_id = f"demo_job_{random.randint(1000, 9999)}"
        demo_state["current_job_id"] = job_id
        demo_state["uploaded_files"] = [f.filename for f in files] + urls
        
        return jsonify({
            'job_id': job_id,
            'status': 'queued',
            'total_bytes': total_bytes,
            'inputs_count': len(files) + len(urls)
        }), 201
        
    except Exception as e:
        logging.error(f"Error creating demo ingest job: {e}")
        return jsonify({'error': 'Failed to create ingestion job'}), 500

@app.route('/api/ingest/jobs/<job_id>', methods=['GET'])
def get_ingest_job_status(job_id):
    """Demo job status"""
    try:
        if job_id == demo_state.get("current_job_id"):
            return jsonify({
                'job_id': job_id,
                'status': 'completed',
                'inputs': [{'name': name, 'type': 'file'} for name in demo_state.get("uploaded_files", [])],
                'total_bytes': 150000,
                'documents_count': len(demo_state.get("uploaded_files", [])),
                'error': None,
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            })
        else:
            return jsonify({'error': 'Job not found'}), 404
            
    except Exception as e:
        logging.error(f"Error getting demo job status: {e}")
        return jsonify({'error': 'Failed to get job status'}), 500

@app.route('/api/graph/build', methods=['POST'])
def build_graph():
    """Demo graph building - now processes uploaded content"""
    try:
        data = request.get_json()
        job_id = data.get('ingest_job_id')
        
        if job_id != demo_state.get("current_job_id"):
            return jsonify({'error': 'Invalid job ID'}), 400
        
        # Process the uploaded content to create dynamic graph data
        all_concepts = []
        all_edges = []
        concept_counter = 1
        edge_counter = 1
        
        for content_item in demo_state.get("processed_content", []):
            text = content_item['content']
            
            # Extract concepts from this content
            concepts = extract_concepts_from_text(text)
            
            # Renumber concepts to avoid ID conflicts
            for concept in concepts:
                concept['id'] = f"concept_{concept_counter}"
                concept_counter += 1
            
            all_concepts.extend(concepts)
            
            # Create relationships within this content
            edges = create_relationships(concepts)
            for edge in edges:
                edge['id'] = f"edge_{edge_counter}"
                edge_counter += 1
            
            all_edges.extend(edges)
        
        # If no content was processed, use sample data
        if not all_concepts:
            demo_state["dynamic_graph_data"] = SAMPLE_GRAPH_DATA
        else:
            demo_state["dynamic_graph_data"] = {
                "nodes": all_concepts,
                "edges": all_edges
            }
        
        sync_id = f"demo_sync_{random.randint(1000, 9999)}"
        demo_state["current_sync_id"] = sync_id
        
        return jsonify({
            'sync_id': sync_id,
            'status': 'pending'
        }), 201
        
    except Exception as e:
        logging.error(f"Error building demo graph: {e}")
        return jsonify({'error': 'Failed to build graph'}), 500

@app.route('/api/graph/build/<sync_id>', methods=['GET'])
def get_build_status(sync_id):
    """Demo build status"""
    try:
        if sync_id == demo_state.get("current_sync_id"):
            demo_state["graph_built"] = True
            
            # Use dynamic graph data if available
            graph_data = demo_state.get("dynamic_graph_data", SAMPLE_GRAPH_DATA)
            
            return jsonify({
                'sync_id': sync_id,
                'status': 'completed',
                'stats': {
                    'nodes_created': len(graph_data["nodes"]),
                    'edges_created': len(graph_data["edges"]),
                    'concepts_merged': 3,
                    'documents_processed': len(demo_state.get("processed_content", []))
                },
                'error': None,
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            })
        else:
            return jsonify({'error': 'Sync record not found'}), 404
            
    except Exception as e:
        logging.error(f"Error getting demo build status: {e}")
        return jsonify({'error': 'Failed to get build status'}), 500

@app.route('/api/graph/summary', methods=['GET'])
def get_graph_summary():
    """Demo graph summary"""
    if not demo_state.get("graph_built", False):
        return jsonify({
            'nodes_by_label': {},
            'relationships_by_type': {},
            'total_nodes': 0,
            'total_relationships': 0
        })
    
    # Use dynamic graph data if available
    graph_data = demo_state.get("dynamic_graph_data", SAMPLE_GRAPH_DATA)
    
    return jsonify({
        'nodes_by_label': {
            'Concept': len(graph_data["nodes"])
        },
        'relationships_by_type': {
            'RELATED_TO': len([e for e in graph_data["edges"] if e["type"] == "RELATED_TO"]),
            'MENTIONS': len([e for e in graph_data["edges"] if e["type"] == "MENTIONS"])
        },
        'total_nodes': len(graph_data["nodes"]),
        'total_relationships': len(graph_data["edges"])
    })

@app.route('/api/graph/subgraph', methods=['POST'])
def get_subgraph():
    """Demo subgraph data - now uses dynamic content"""
    if not demo_state.get("graph_built", False):
        return jsonify({'nodes': [], 'edges': []})
    
    try:
        data = request.get_json() or {}
        concept_ids = data.get('concept_ids')
        query = data.get('query')
        max_nodes = min(data.get('max_nodes', 100), 200)
        
        # Use dynamic graph data if available
        graph_data = demo_state.get("dynamic_graph_data", SAMPLE_GRAPH_DATA)
        
        # Filter data based on request
        if concept_ids:
            # Return specific concepts and their neighbors
            filtered_nodes = [n for n in graph_data["nodes"] if n["id"] in concept_ids]
            connected_edges = [e for e in graph_data["edges"] 
                             if e["source"] in concept_ids or e["target"] in concept_ids]
            # Add connected nodes
            connected_node_ids = set()
            for edge in connected_edges:
                connected_node_ids.add(edge["source"])
                connected_node_ids.add(edge["target"])
            filtered_nodes.extend([n for n in graph_data["nodes"] 
                                 if n["id"] in connected_node_ids and n not in filtered_nodes])
        elif query:
            # Search by label
            filtered_nodes = [n for n in graph_data["nodes"] 
                            if query.lower() in n["label"].lower()][:max_nodes]
            node_ids = [n["id"] for n in filtered_nodes]
            connected_edges = [e for e in graph_data["edges"] 
                             if e["source"] in node_ids or e["target"] in node_ids]
        else:
            # Return all data limited by max_nodes
            filtered_nodes = graph_data["nodes"][:max_nodes]
            node_ids = [n["id"] for n in filtered_nodes]
            connected_edges = [e for e in graph_data["edges"] 
                             if e["source"] in node_ids and e["target"] in node_ids]
        
        return jsonify({
            'nodes': filtered_nodes,
            'edges': connected_edges,
            'layout_seed': 42
        })
        
    except Exception as e:
        logging.error(f"Error getting demo subgraph: {e}")
        return jsonify({'error': 'Failed to get subgraph'}), 500

@app.route('/api/graph/search', methods=['GET'])
def search_concepts():
    """Demo concept search - now uses dynamic content"""
    if not demo_state.get("graph_built", False):
        return jsonify({'concepts': []})
    
    query = request.args.get('q', '').strip().lower()
    limit = min(int(request.args.get('limit', 20)), 50)
    
    if not query:
        return jsonify({'concepts': []})
    
    # Use dynamic graph data if available
    graph_data = demo_state.get("dynamic_graph_data", SAMPLE_GRAPH_DATA)
    
    matching_concepts = [
        {
            'id': node['id'],
            'label': node['label'],
            'canonical_key': node['canonical_key']
        }
        for node in graph_data["nodes"]
        if query in node['label'].lower() or query in node['canonical_key'].lower()
    ][:limit]
    
    return jsonify({'concepts': matching_concepts})

@app.route('/api/qa/ask', methods=['POST'])
def ask_question():
    """Demo Q&A functionality"""
    if not demo_state.get("graph_built", False):
        return jsonify({
            'answer': 'Please build the knowledge graph first before asking questions.',
            'evidence': {'node_ids': [], 'edge_ids': [], 'document_ids': []}
        })
    
    try:
        data = request.get_json()
        question = data.get('question', '').strip().lower()
        
        # Simple rule-based responses for demo
        if 'machine learning' in question or 'ml' in question:
            answer = "Machine Learning is a central concept in the knowledge graph, connected to Neural Networks, Deep Learning, and Data Science. It involves algorithms and training data to build predictive models."
            evidence_nodes = ["concept_1", "concept_2", "concept_3", "concept_4"]
            evidence_edges = ["edge_1", "edge_2", "edge_3"]
        elif 'neural' in question:
            answer = "Neural Networks are a key component of machine learning, particularly related to deep learning and model architecture. They form the foundation of modern AI systems."
            evidence_nodes = ["concept_2", "concept_3", "concept_8"]
            evidence_edges = ["edge_2", "edge_7"]
        elif 'how many' in question or 'count' in question:
            answer = f"The knowledge graph contains {len(SAMPLE_GRAPH_DATA['nodes'])} concepts and {len(SAMPLE_GRAPH_DATA['edges'])} relationships. The concepts include entities, keywords, and noun phrases related to machine learning and data science."
            evidence_nodes = [n["id"] for n in SAMPLE_GRAPH_DATA["nodes"][:5]]
            evidence_edges = [e["id"] for e in SAMPLE_GRAPH_DATA["edges"][:3]]
        elif 'related' in question or 'connection' in question:
            answer = "The concepts are interconnected through various relationships. Machine Learning is connected to Neural Networks, Data Science, and AI. These form a network of related concepts in the field of artificial intelligence."
            evidence_nodes = ["concept_1", "concept_2", "concept_4", "concept_5"]
            evidence_edges = ["edge_1", "edge_3", "edge_4"]
        else:
            answer = "This is a demonstration of the knowledge graph Q&A system. The graph contains concepts about machine learning, neural networks, and data science. Try asking about 'machine learning', 'neural networks', or 'how many concepts are there'."
            evidence_nodes = ["concept_1", "concept_2", "concept_3"]
            evidence_edges = ["edge_1", "edge_2"]
        
        return jsonify({
            'answer': answer,
            'evidence': {
                'node_ids': evidence_nodes,
                'edge_ids': evidence_edges,
                'document_ids': demo_state.get("uploaded_files", [])[:3]
            }
        })
        
    except Exception as e:
        logging.error(f"Error in demo Q&A: {e}")
        return jsonify({
            'error': 'Failed to process question',
            'answer': 'I encountered an error while processing your question.',
            'evidence': {'node_ids': [], 'edge_ids': [], 'document_ids': []}
        }), 500

@app.errorhandler(401)
def unauthorized(error):
    return jsonify({'error': 'Unauthorized access'}), 401

@app.errorhandler(413)
def payload_too_large(error):
    return jsonify({'error': 'Payload too large. Maximum size is 100MB.'}), 413

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000, debug=True)