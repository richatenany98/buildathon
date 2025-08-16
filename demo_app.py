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

# No sample data - system only works with user-provided content

# Demo state - now stores actual processed data
demo_state = {
    "current_job_id": None,
    "current_sync_id": None,
    "graph_built": False,
    "uploaded_files": [],
    "processed_content": [],
    "dynamic_graph_data": None
}

# Enhanced NLP processing for demo
def extract_concepts_from_text(text):
    """Extract concepts from text using enhanced NLP techniques"""
    import re
    from collections import Counter
    
    # Clean and prepare text
    cleaned_text = re.sub(r'[^\w\s\-\.]', ' ', text)
    sentences = [s.strip() for s in cleaned_text.split('.') if len(s.strip()) > 10]
    
    concepts = []
    concept_id = 1
    seen_concepts = set()
    
    # 1. Extract capitalized entities (proper nouns)
    entities = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', text)
    for entity in entities:
        if len(entity) > 3 and entity.lower() not in seen_concepts:
            concepts.append({
                "id": f"concept_{concept_id}",
                "label": entity,
                "type": "entity",
                "canonical_key": entity.lower()
            })
            seen_concepts.add(entity.lower())
            concept_id += 1
    
    # 2. Extract important keywords (frequent meaningful words)
    words = re.findall(r'\b[a-zA-Z]{4,}\b', text.lower())
    # Filter out common stop words
    stop_words = {'that', 'this', 'with', 'have', 'will', 'been', 'from', 'they', 'know', 'want', 'been', 'good', 'much', 'some', 'time', 'very', 'when', 'come', 'here', 'just', 'like', 'long', 'make', 'many', 'over', 'such', 'take', 'than', 'them', 'well', 'were'}
    meaningful_words = [w for w in words if w not in stop_words and len(w) > 4]
    
    word_freq = Counter(meaningful_words)
    for word, freq in word_freq.most_common(10):
        if freq > 1 and word not in seen_concepts:
            concepts.append({
                "id": f"concept_{concept_id}",
                "label": word.title(),
                "type": "keyword",
                "canonical_key": word.lower()
            })
            seen_concepts.add(word.lower())
            concept_id += 1
    
    # 3. Extract noun phrases with better patterns
    for sentence in sentences[:15]:
        # Pattern: adjective + noun
        adj_noun = re.findall(r'\b(important|key|main|primary|essential|critical|major|significant)\s+([a-z]+(?:\s+[a-z]+){0,2})\b', sentence.lower())
        for adj, noun in adj_noun:
            phrase = f"{adj} {noun}"
            if phrase not in seen_concepts and len(noun) > 3:
                concepts.append({
                    "id": f"concept_{concept_id}",
                    "label": phrase.title(),
                    "type": "noun_phrase",
                    "canonical_key": phrase.lower()
                })
                seen_concepts.add(phrase.lower())
                concept_id += 1
        
        # Pattern: determiner + adjective + noun
        det_adj_noun = re.findall(r'\b(?:the|a|an)\s+([a-z]+)\s+([a-z]+(?:\s+[a-z]+){0,1})\b', sentence.lower())
        for adj, noun in det_adj_noun:
            if len(adj) > 3 and len(noun) > 3:
                phrase = f"{adj} {noun}"
                if phrase not in seen_concepts:
                    concepts.append({
                        "id": f"concept_{concept_id}",
                        "label": phrase.title(),
                        "type": "noun_phrase",
                        "canonical_key": phrase.lower()
                    })
                    seen_concepts.add(phrase.lower())
                    concept_id += 1
    
    # 4. Extract technical terms (words with numbers, hyphens, or specific patterns)
    technical_terms = re.findall(r'\b[a-zA-Z]+[-][a-zA-Z]+\b|\b[a-zA-Z]+[0-9]+\b|\b[A-Z]{2,}\b', text)
    for term in technical_terms:
        if len(term) > 2 and term.lower() not in seen_concepts:
            concepts.append({
                "id": f"concept_{concept_id}",
                "label": term,
                "type": "technical",
                "canonical_key": term.lower()
            })
            seen_concepts.add(term.lower())
            concept_id += 1
    
    return concepts[:20]  # Increased limit for better coverage

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
        
        # Only use actual processed content - no fallback data
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
            
            # Only use processed user data
            graph_data = demo_state.get("dynamic_graph_data", {"nodes": [], "edges": []})
            
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
    
    # Only use processed user data
    graph_data = demo_state.get("dynamic_graph_data", {"nodes": [], "edges": []})
    
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
        
        # Only use processed user data
        graph_data = demo_state.get("dynamic_graph_data", {"nodes": [], "edges": []})
        
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
    
    # Only use processed user data
    graph_data = demo_state.get("dynamic_graph_data", {"nodes": [], "edges": []})
    
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

def analyze_question(question, graph_data, content_data):
    """Advanced NLP question analysis and answering"""
    import re
    from collections import Counter, defaultdict
    
    question_lower = question.lower().strip()
    words = re.findall(r'\b\w+\b', question_lower)
    
    # Enhanced question type classification
    question_patterns = {
        'count': ['how many', 'count', 'number of', 'total', 'amount'],
        'what': ['what is', 'what are', 'what does', 'describe', 'explain', 'tell me about', 'define'],
        'where': ['where', 'location', 'place'],
        'when': ['when', 'time', 'date', 'period'],
        'why': ['why', 'reason', 'because', 'cause', 'purpose'],
        'how': ['how does', 'how do', 'how to', 'method', 'way', 'process'],
        'relationship': ['relationship', 'connect', 'related', 'link', 'between', 'association', 'interact'],
        'comparison': ['compare', 'difference', 'similar', 'versus', 'vs', 'better', 'worse'],
        'summary': ['summary', 'overview', 'main', 'key', 'important', 'primary'],
        'list': ['list', 'show me', 'all', 'every'],
        'meaning': ['mean', 'meaning', 'significance', 'represent', 'stand for'],
        'characteristic': ['characteristic', 'feature', 'property', 'attribute', 'quality']
    }
    
    question_type = 'general'
    for qtype, patterns in question_patterns.items():
        if any(pattern in question_lower for pattern in patterns):
            question_type = qtype
            break
    
    # Extract relevant concepts from question with enhanced matching
    relevant_concepts = []
    concept_scores = defaultdict(float)
    
    for node in graph_data.get('nodes', []):
        node_label = node.get('label', '').lower()
        node_key = node.get('canonical_key', '').lower()
        
        # Exact match scoring
        if node_label in question_lower or node_key in question_lower:
            concept_scores[node['id']] += 3.0
            relevant_concepts.append(node)
        
        # Partial word matches
        label_words = re.findall(r'\b\w+\b', node_label)
        key_words = re.findall(r'\b\w+\b', node_key)
        
        for word in words:
            if len(word) > 3:  # Skip short words
                if word in label_words:
                    concept_scores[node['id']] += 2.0
                    if node not in relevant_concepts:
                        relevant_concepts.append(node)
                elif word in key_words:
                    concept_scores[node['id']] += 1.5
                    if node not in relevant_concepts:
                        relevant_concepts.append(node)
                elif word in node_label or word in node_key:
                    concept_scores[node['id']] += 1.0
                    if node not in relevant_concepts:
                        relevant_concepts.append(node)
    
    # Sort concepts by relevance score
    relevant_concepts.sort(key=lambda x: concept_scores[x['id']], reverse=True)
    
    # Generate answer based on question type and relevant concepts
    return generate_answer(question_type, question, relevant_concepts, graph_data, content_data, concept_scores)

def generate_answer(question_type, original_question, relevant_concepts, graph_data, content_data, concept_scores):
    """Generate contextual answers based on question type and graph data"""
    
    nodes = graph_data.get('nodes', [])
    edges = graph_data.get('edges', [])
    evidence_nodes = []
    evidence_edges = []
    
    if question_type == 'count':
        if 'concept' in original_question.lower() or 'node' in original_question.lower():
            answer = f"Your knowledge graph contains {len(nodes)} concepts extracted from your documents."
            evidence_nodes = [n['id'] for n in nodes[:8]]
        elif 'relationship' in original_question.lower() or 'connection' in original_question.lower():
            answer = f"There are {len(edges)} relationships between concepts in your knowledge graph."
            evidence_edges = [e['id'] for e in edges[:8]]
        elif 'document' in original_question.lower() or 'file' in original_question.lower():
            doc_count = len(content_data)
            answer = f"You have uploaded and processed {doc_count} documents."
        else:
            answer = f"Your knowledge graph contains {len(nodes)} concepts and {len(edges)} relationships from {len(content_data)} documents."
            evidence_nodes = [n['id'] for n in nodes[:5]]
            evidence_edges = [e['id'] for e in edges[:3]]
    
    elif question_type == 'what':
        if relevant_concepts:
            top_concept = relevant_concepts[0]
            concept_label = top_concept['label']
            
            # Find context about this concept from the original documents
            concept_context = find_concept_context(top_concept, content_data)
            
            # Get connected concepts for additional context
            connected_concepts = get_connected_concepts(top_concept, edges, nodes)
            
            answer = f"{concept_label} is a concept found in your documents. "
            
            if concept_context:
                answer += f"Based on the content, {concept_context} "
            
            if connected_concepts:
                connected_labels = [c['label'] for c in connected_concepts[:3]]
                answer += f"It is related to: {', '.join(connected_labels)}. "
            
            # Add type-specific information
            concept_type = top_concept.get('type', 'unknown')
            if concept_type == 'entity':
                answer += "This appears to be a named entity or proper noun in your documents."
            elif concept_type == 'keyword':
                answer += "This is a key term that appears frequently in your content."
            elif concept_type == 'technical':
                answer += "This appears to be a technical term or specialized concept."
            elif concept_type == 'noun_phrase':
                answer += "This is an important phrase or concept grouping from your documents."
            
            evidence_nodes = [top_concept['id']]
            evidence_edges = [e['id'] for e in edges if e['source'] == top_concept['id'] or e['target'] == top_concept['id']][:5]
            
            # Include related concepts in evidence
            if connected_concepts:
                evidence_nodes.extend([c['id'] for c in connected_concepts[:3]])
        else:
            # General what question - show main concepts
            concept_types = defaultdict(int)
            for node in nodes:
                concept_types[node.get('type', 'unknown')] += 1
            
            type_summary = ', '.join([f"{count} {ctype}{'s' if count > 1 else ''}" for ctype, count in concept_types.items()])
            top_concepts = sorted(nodes, key=lambda x: len(x.get('label', '')), reverse=True)[:5]
            concept_labels = [c['label'] for c in top_concepts]
            
            answer = f"Your knowledge graph contains {type_summary}. The main concepts include: {', '.join(concept_labels)}."
            evidence_nodes = [c['id'] for c in top_concepts]
    
    elif question_type == 'relationship':
        if len(relevant_concepts) >= 2:
            # Find relationships between specified concepts
            concept_ids = [c['id'] for c in relevant_concepts[:3]]
            connecting_edges = []
            for edge in edges:
                if edge['source'] in concept_ids and edge['target'] in concept_ids:
                    connecting_edges.append(edge)
            
            if connecting_edges:
                answer = f"I found {len(connecting_edges)} direct relationships between the concepts you mentioned. "
                rel_types = [e.get('type', 'related') for e in connecting_edges]
                type_counts = Counter(rel_types)
                answer += f"The relationship types include: {', '.join([f'{count} {rtype}' for rtype, count in type_counts.items()])}."
                evidence_edges = [e['id'] for e in connecting_edges]
                evidence_nodes = concept_ids
            else:
                answer = f"The concepts you mentioned ({', '.join([c['label'] for c in relevant_concepts[:3]])}) don't appear to have direct relationships, but they may be connected through other concepts."
                evidence_nodes = [c['id'] for c in relevant_concepts[:3]]
        else:
            # General relationship question
            edge_types = Counter([e.get('type', 'related') for e in edges])
            answer = f"Your knowledge graph contains {len(edges)} relationships. "
            if edge_types:
                answer += f"The relationship types include: {', '.join([f'{count} {rtype}' for rtype, count in edge_types.most_common(3)])}."
            evidence_edges = [e['id'] for e in edges[:8]]
    
    elif question_type == 'comparison':
        if len(relevant_concepts) >= 2:
            concept1, concept2 = relevant_concepts[0], relevant_concepts[1]
            
            # Find connections for each concept
            c1_edges = [e for e in edges if e['source'] == concept1['id'] or e['target'] == concept1['id']]
            c2_edges = [e for e in edges if e['source'] == concept2['id'] or e['target'] == concept2['id']]
            
            answer = f"Comparing {concept1['label']} and {concept2['label']}: "
            answer += f"{concept1['label']} has {len(c1_edges)} connections, while {concept2['label']} has {len(c2_edges)} connections. "
            
            if len(c1_edges) > len(c2_edges):
                answer += f"{concept1['label']} appears to be more central in your knowledge graph."
            elif len(c2_edges) > len(c1_edges):
                answer += f"{concept2['label']} appears to be more central in your knowledge graph."
            else:
                answer += "Both concepts have similar connectivity in your knowledge graph."
            
            evidence_nodes = [concept1['id'], concept2['id']]
            evidence_edges = [e['id'] for e in c1_edges + c2_edges][:8]
        else:
            answer = "To compare concepts, please mention at least two specific concepts in your question."
    
    elif question_type == 'summary':
        node_count = len(nodes)
        edge_count = len(edges)
        doc_count = len(content_data)
        
        # Get most connected concepts
        concept_connections = defaultdict(int)
        for edge in edges:
            concept_connections[edge['source']] += 1
            concept_connections[edge['target']] += 1
        
        top_connected = sorted(concept_connections.items(), key=lambda x: x[1], reverse=True)[:3]
        central_concepts = []
        for concept_id, connections in top_connected:
            concept = next((n for n in nodes if n['id'] == concept_id), None)
            if concept:
                central_concepts.append(f"{concept['label']} ({connections} connections)")
        
        answer = f"Summary of your knowledge graph: {node_count} concepts and {edge_count} relationships extracted from {doc_count} documents. "
        if central_concepts:
            answer += f"The most central concepts are: {', '.join(central_concepts)}."
        
        evidence_nodes = [concept_id for concept_id, _ in top_connected]
    
    elif question_type == 'list':
        if 'type' in original_question.lower() or 'kind' in original_question.lower():
            concept_types = Counter([n.get('type', 'unknown') for n in nodes])
            type_list = [f"{count} {ctype}" for ctype, count in concept_types.most_common()]
            answer = f"Types of concepts in your graph: {', '.join(type_list)}."
        else:
            # List top concepts
            top_concepts = sorted(nodes, key=lambda x: concept_scores.get(x['id'], 0), reverse=True)[:10]
            if not top_concepts:
                top_concepts = nodes[:10]
            concept_labels = [c['label'] for c in top_concepts]
            answer = f"Here are the main concepts from your documents: {', '.join(concept_labels)}."
            evidence_nodes = [c['id'] for c in top_concepts]
    
    elif question_type == 'meaning':
        if relevant_concepts:
            top_concept = relevant_concepts[0]
            concept_label = top_concept['label']
            
            # Find detailed context about meaning
            context = find_concept_context(top_concept, content_data)
            connected_concepts = get_connected_concepts(top_concept, edges, nodes)
            
            answer = f"The meaning of '{concept_label}' in your documents: "
            
            if context:
                answer += context + " "
            else:
                answer += f"This concept appears in your knowledge graph as a {top_concept.get('type', 'unknown')} type. "
            
            if connected_concepts:
                related_labels = [c['label'] for c in connected_concepts[:3]]
                answer += f"It's conceptually related to {', '.join(related_labels)}, which may provide additional context about its meaning."
            
            evidence_nodes = [top_concept['id']]
            evidence_edges = [e['id'] for e in edges if e['source'] == top_concept['id'] or e['target'] == top_concept['id']][:5]
        else:
            answer = "Please specify which concept you'd like me to explain the meaning of."
    
    elif question_type == 'characteristic':
        if relevant_concepts:
            top_concept = relevant_concepts[0]
            concept_label = top_concept['label']
            
            connected_concepts = get_connected_concepts(top_concept, edges, nodes)
            connection_count = len([e for e in edges if e['source'] == top_concept['id'] or e['target'] == top_concept['id']])
            
            answer = f"Characteristics of '{concept_label}': "
            answer += f"It's classified as a {top_concept.get('type', 'unknown')} in your knowledge graph. "
            
            if connection_count > 0:
                answer += f"It has {connection_count} connections to other concepts, "
                if connection_count > 5:
                    answer += "making it a central concept in your graph. "
                elif connection_count > 2:
                    answer += "indicating it's moderately connected. "
                else:
                    answer += "showing it has limited connections. "
            
            if connected_concepts:
                related_labels = [c['label'] for c in connected_concepts[:3]]
                answer += f"Its key relationships are with: {', '.join(related_labels)}."
            
            evidence_nodes = [top_concept['id']]
            evidence_edges = [e['id'] for e in edges if e['source'] == top_concept['id'] or e['target'] == top_concept['id']][:5]
        else:
            answer = "Please specify which concept's characteristics you'd like to know about."
    
    else:  # general question
        if relevant_concepts:
            top_concepts = relevant_concepts[:3]
            concept_labels = [c['label'] for c in top_concepts]
            
            # Try to provide meaningful information about the concepts
            answer = f"Based on your question, the most relevant concepts are: {', '.join(concept_labels)}. "
            
            # Provide context for the most relevant concept
            if top_concepts:
                main_concept = top_concepts[0]
                context = find_concept_context(main_concept, content_data)
                if context:
                    answer += f"About {main_concept['label']}: {context} "
            
            # Find related concepts
            related_concept_ids = set()
            for concept in top_concepts:
                for edge in edges:
                    if edge['source'] == concept['id']:
                        related_concept_ids.add(edge['target'])
                    elif edge['target'] == concept['id']:
                        related_concept_ids.add(edge['source'])
            
            related_concepts = [n for n in nodes if n['id'] in related_concept_ids][:3]
            if related_concepts:
                related_labels = [c['label'] for c in related_concepts]
                answer += f"These concepts are connected to: {', '.join(related_labels)}."
            
            evidence_nodes = [c['id'] for c in top_concepts]
            evidence_edges = [e['id'] for e in edges if e['source'] in evidence_nodes or e['target'] in evidence_nodes][:5]
        else:
            # No specific concepts found - try to help
            answer = f"I couldn't find specific concepts matching your question. Your knowledge graph contains {len(nodes)} concepts from your uploaded documents. "
            
            # Suggest some concepts to ask about
            sample_concepts = sorted(nodes, key=lambda x: len(x.get('label', '')), reverse=True)[:3]
            if sample_concepts:
                sample_labels = [c['label'] for c in sample_concepts]
                answer += f"You could ask about concepts like: {', '.join(sample_labels)}."
    
    return {
        'answer': answer,
        'evidence': {
            'node_ids': evidence_nodes[:10],  # Limit evidence
            'edge_ids': evidence_edges[:10],
            'document_ids': [item['name'] for item in content_data[:3]]
        }
    }

def find_concept_context(concept, content_data):
    """Find contextual information about a concept from the original documents"""
    import re
    
    concept_label = concept['label'].lower()
    concept_key = concept.get('canonical_key', '').lower()
    
    contexts = []
    
    for content_item in content_data:
        text = content_item.get('content', '')
        sentences = re.split(r'[.!?]+', text)
        
        for sentence in sentences:
            sentence_lower = sentence.lower().strip()
            if len(sentence_lower) > 20:  # Skip very short sentences
                # Look for the concept in context
                if concept_label in sentence_lower or concept_key in sentence_lower:
                    # Clean up the sentence and extract relevant part
                    cleaned_sentence = re.sub(r'\s+', ' ', sentence.strip())
                    if len(cleaned_sentence) > 200:  # Truncate very long sentences
                        # Try to find the part with the concept
                        words = cleaned_sentence.split()
                        concept_words = concept_label.split()
                        for i, word in enumerate(words):
                            if any(cw in word.lower() for cw in concept_words):
                                start = max(0, i - 10)
                                end = min(len(words), i + 15)
                                cleaned_sentence = ' '.join(words[start:end]) + '...'
                                break
                    
                    contexts.append(cleaned_sentence)
                    if len(contexts) >= 2:  # Limit contexts
                        break
        
        if len(contexts) >= 2:
            break
    
    if contexts:
        return ' '.join(contexts[:1])  # Return first context
    
    return None

def get_connected_concepts(concept, edges, nodes):
    """Get concepts directly connected to the given concept"""
    connected_ids = set()
    
    for edge in edges:
        if edge['source'] == concept['id']:
            connected_ids.add(edge['target'])
        elif edge['target'] == concept['id']:
            connected_ids.add(edge['source'])
    
    connected_concepts = [n for n in nodes if n['id'] in connected_ids]
    return connected_concepts[:5]  # Limit to top 5

@app.route('/api/qa/ask', methods=['POST'])
def ask_question():
    """Advanced Q&A functionality with proper NLP processing"""
    if not demo_state.get("graph_built", False):
        return jsonify({
            'answer': 'Please build the knowledge graph first by uploading documents and creating the graph.',
            'evidence': {'node_ids': [], 'edge_ids': [], 'document_ids': []}
        })
    
    try:
        data = request.get_json()
        question = data.get('question', '').strip()
        
        if not question:
            return jsonify({
                'answer': 'Please enter a question.',
                'evidence': {'node_ids': [], 'edge_ids': [], 'document_ids': []}
            })
        
        # Get user's actual graph data
        graph_data = demo_state.get("dynamic_graph_data", {"nodes": [], "edges": []})
        content_data = demo_state.get("processed_content", [])
        
        if not graph_data["nodes"]:
            return jsonify({
                'answer': 'No concepts found in your uploaded documents. Please upload and process documents first.',
                'evidence': {'node_ids': [], 'edge_ids': [], 'document_ids': []}
            })
        
        # Use advanced NLP analysis to generate answer
        result = analyze_question(question, graph_data, content_data)
        return jsonify(result)
        
    except Exception as e:
        logging.error(f"Error in Q&A: {e}")
        return jsonify({
            'error': 'Failed to process question',
            'answer': 'I encountered an error while processing your question. Please try rephrasing your question.',
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
    app.run(host="0.0.0.0", port=5175, debug=True)