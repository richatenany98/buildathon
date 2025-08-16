import logging
import time
from flask import Blueprint, request, jsonify, current_app
from typing import Dict, Any, List

qa_bp = Blueprint('qa', __name__)

def check_auth():
    """Check authentication token"""
    auth_header = request.headers.get('Authorization', '')
    expected_token = f"Bearer {current_app.config['MONGODB_AUTH_TOKEN']}"
    
    if auth_header != expected_token:
        return False
    return True

@qa_bp.route('/qa/ask', methods=['POST'])
def ask_question():
    """Answer natural language questions over the knowledge graph"""
    try:
        # Check authentication
        if not check_auth():
            return jsonify({'error': 'Unauthorized access'}), 401
        
        start_time = time.time()
        
        data = request.get_json()
        if not data or 'question' not in data:
            return jsonify({'error': 'Question is required'}), 400
        
        question = data['question'].strip()
        if not question:
            return jsonify({'error': 'Question cannot be empty'}), 400
        
        options = data.get('options', {})
        return_subgraph = options.get('return_subgraph', False)
        max_hops = options.get('max_hops', 2)
        
        # Limit max_hops to prevent excessive queries
        max_hops = min(max_hops, 3)
        
        try:
            # Get relevant graph data for the question
            graph_data = _get_relevant_graph_data(question, max_hops)
            
            if not graph_data.get('nodes'):
                # No relevant data found
                duration_ms = int((time.time() - start_time) * 1000)
                
                # Log the interaction
                _log_qa_interaction(
                    question=question,
                    params={'max_hops': max_hops, 'return_subgraph': return_subgraph},
                    answer_text="I couldn't find any relevant information in the knowledge graph to answer your question.",
                    evidence={'node_ids': [], 'edge_ids': [], 'document_ids': []},
                    status='ok',
                    duration_ms=duration_ms
                )
                
                return jsonify({
                    'answer': "I couldn't find any relevant information in the knowledge graph to answer your question.",
                    'evidence': {
                        'node_ids': [],
                        'edge_ids': [],
                        'document_ids': []
                    }
                })
            
            # Use NLP service to generate answer
            nlp_service = current_app.nlp_service
            answer_text, evidence_node_ids, evidence_edge_ids = nlp_service.answer_question(
                question, graph_data
            )
            
            # Get document IDs from evidence nodes (simplified approach)
            document_ids = _get_document_ids_from_evidence(evidence_node_ids)
            
            duration_ms = int((time.time() - start_time) * 1000)
            
            # Prepare response
            response = {
                'answer': answer_text,
                'evidence': {
                    'node_ids': evidence_node_ids,
                    'edge_ids': evidence_edge_ids,
                    'document_ids': document_ids
                }
            }
            
            # Include subgraph data if requested
            if return_subgraph and evidence_node_ids:
                response['subgraph'] = {
                    'nodes': [node for node in graph_data['nodes'] if node['id'] in evidence_node_ids],
                    'edges': [edge for edge in graph_data['edges'] if edge.get('id', '') in evidence_edge_ids]
                }
            
            # Log the interaction
            _log_qa_interaction(
                question=question,
                params={'max_hops': max_hops, 'return_subgraph': return_subgraph},
                answer_text=answer_text,
                evidence={
                    'node_ids': evidence_node_ids,
                    'edge_ids': evidence_edge_ids,
                    'document_ids': document_ids
                },
                status='ok',
                duration_ms=duration_ms
            )
            
            return jsonify(response)
            
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            error_msg = f"Error processing question: {str(e)}"
            
            # Log the error
            _log_qa_interaction(
                question=question,
                params={'max_hops': max_hops, 'return_subgraph': return_subgraph},
                answer_text=None,
                evidence={'node_ids': [], 'edge_ids': [], 'document_ids': []},
                status='error',
                duration_ms=duration_ms,
                error=error_msg
            )
            
            return jsonify({
                'error': 'Failed to process question',
                'answer': 'I encountered an error while processing your question.',
                'evidence': {
                    'node_ids': [],
                    'edge_ids': [],
                    'document_ids': []
                }
            }), 500
        
    except Exception as e:
        logging.error(f"Error in ask_question endpoint: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@qa_bp.route('/qa/logs', methods=['GET'])
def get_qa_logs():
    """Get recent Q&A interaction logs"""
    try:
        # Check authentication
        if not check_auth():
            return jsonify({'error': 'Unauthorized access'}), 401
        
        limit = min(int(request.args.get('limit', 20)), 100)  # Cap at 100
        
        mongodb_service = current_app.mongodb_service
        logs = mongodb_service.get_qa_logs(limit)
        
        # Format logs for response
        formatted_logs = []
        for log in logs:
            formatted_logs.append({
                'id': str(log['_id']),
                'question': log['question'],
                'answer_text': log.get('answer_text'),
                'status': log['status'],
                'duration_ms': log['duration_ms'],
                'evidence_counts': {
                    'nodes': len(log['evidence'].get('node_ids', [])),
                    'edges': len(log['evidence'].get('edge_ids', [])),
                    'documents': len(log['evidence'].get('document_ids', []))
                },
                'created_at': log['created_at'].isoformat()
            })
        
        return jsonify({'logs': formatted_logs})
        
    except Exception as e:
        logging.error(f"Error getting QA logs: {e}")
        return jsonify({'error': 'Failed to get QA logs'}), 500

def _get_relevant_graph_data(question: str, max_hops: int) -> Dict[str, Any]:
    """Get relevant graph data for answering a question"""
    try:
        neo4j_service = current_app.neo4j_service
        
        # Try to find relevant concepts by searching the question text
        # Extract key terms from question
        import re
        words = re.findall(r'\b[a-zA-Z]{3,}\b', question.lower())
        
        # Search for concepts matching question terms
        all_concepts = []
        for word in words[:5]:  # Limit to first 5 words
            concepts = neo4j_service.search_concepts(word, limit=10)
            all_concepts.extend(concepts)
        
        # Remove duplicates
        unique_concepts = {}
        for concept in all_concepts:
            unique_concepts[concept['id']] = concept
        
        if not unique_concepts:
            # Fallback: get a general subgraph
            return neo4j_service.get_subgraph(max_nodes=50, max_hops=1)
        
        # Get subgraph for relevant concepts
        concept_ids = list(unique_concepts.keys())[:10]  # Limit to top 10
        return neo4j_service.get_subgraph(
            concept_ids=concept_ids,
            max_hops=max_hops,
            max_nodes=100
        )
        
    except Exception as e:
        logging.error(f"Error getting relevant graph data: {e}")
        return {'nodes': [], 'edges': []}

def _get_document_ids_from_evidence(evidence_node_ids: List[str]) -> List[str]:
    """Get source document IDs from evidence nodes"""
    try:
        if not evidence_node_ids:
            return []
        
        neo4j_service = current_app.neo4j_service
        document_ids = []
        
        # For each evidence node, find connected document nodes
        for node_id in evidence_node_ids[:10]:  # Limit to prevent excessive queries
            neighbors = neo4j_service.get_concept_neighbors(node_id, hops=1)
            
            for edge in neighbors.get('edges', []):
                if edge['type'] == 'MENTIONS':
                    # The document is either source or target
                    doc_id = edge['source'] if edge['target'] == node_id else edge['target']
                    if doc_id not in document_ids:
                        document_ids.append(doc_id)
        
        return document_ids[:20]  # Limit return size
        
    except Exception as e:
        logging.error(f"Error getting document IDs from evidence: {e}")
        return []

def _log_qa_interaction(question: str, params: Dict[str, Any], 
                       answer_text: str, evidence: Dict[str, List[str]],
                       status: str, duration_ms: int, error: str = None):
    """Log Q&A interaction to MongoDB"""
    try:
        mongodb_service = current_app.mongodb_service
        mongodb_service.log_qa_interaction(
            question=question,
            params=params,
            answer_text=answer_text,
            evidence=evidence,
            status=status,
            duration_ms=duration_ms,
            error=error
        )
    except Exception as e:
        logging.error(f"Error logging QA interaction: {e}")
