import logging
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from models import ConceptNode, DocumentNode, GraphEdge, SyncStatus

graph_bp = Blueprint('graph', __name__)

def check_auth():
    """Check authentication token"""
    auth_header = request.headers.get('Authorization', '')
    expected_token = f"Bearer {current_app.config['MONGODB_AUTH_TOKEN']}"
    
    if auth_header != expected_token:
        return False
    return True

@graph_bp.route('/graph/build', methods=['POST'])
def build_graph():
    """Build knowledge graph from ingested documents"""
    try:
        # Check authentication
        if not check_auth():
            return jsonify({'error': 'Unauthorized access'}), 401
        
        data = request.get_json()
        if not data or 'ingest_job_id' not in data:
            return jsonify({'error': 'ingest_job_id is required'}), 400
        
        ingest_job_id = data['ingest_job_id']
        
        # Verify job exists and is completed
        mongodb_service = current_app.mongodb_service
        job = mongodb_service.get_ingest_job(ingest_job_id)
        
        if not job:
            return jsonify({'error': 'Ingest job not found'}), 404
        
        if job['status'] != 'completed':
            return jsonify({'error': f'Ingest job status is {job["status"]}, expected completed'}), 400
        
        # Create graph sync record
        sync_id = mongodb_service.create_graph_sync(ingest_job_id)
        
        # Process graph building asynchronously
        _build_knowledge_graph(sync_id, ingest_job_id)
        
        return jsonify({
            'sync_id': sync_id,
            'status': 'pending'
        }), 201
        
    except Exception as e:
        logging.error(f"Error building graph: {e}")
        return jsonify({'error': 'Failed to build graph'}), 500

@graph_bp.route('/graph/build/<sync_id>', methods=['GET'])
def get_build_status(sync_id):
    """Get graph build status"""
    try:
        # Check authentication
        if not check_auth():
            return jsonify({'error': 'Unauthorized access'}), 401
        
        mongodb_service = current_app.mongodb_service
        sync_record = mongodb_service.get_graph_sync(sync_id)
        
        if not sync_record:
            return jsonify({'error': 'Graph sync record not found'}), 404
        
        return jsonify({
            'sync_id': sync_id,
            'status': sync_record['status'],
            'stats': sync_record.get('stats', {}),
            'error': sync_record.get('error'),
            'created_at': sync_record['created_at'].isoformat(),
            'updated_at': sync_record['updated_at'].isoformat()
        })
        
    except Exception as e:
        logging.error(f"Error getting build status: {e}")
        return jsonify({'error': 'Failed to get build status'}), 500

@graph_bp.route('/graph/summary', methods=['GET'])
def get_graph_summary():
    """Get graph summary statistics"""
    try:
        # Check authentication
        if not check_auth():
            return jsonify({'error': 'Unauthorized access'}), 401
        
        neo4j_service = current_app.neo4j_service
        summary = neo4j_service.get_graph_summary()
        
        return jsonify(summary)
        
    except Exception as e:
        logging.error(f"Error getting graph summary: {e}")
        return jsonify({'error': 'Failed to get graph summary'}), 500

@graph_bp.route('/graph/subgraph', methods=['POST'])
def get_subgraph():
    """Get subgraph data for visualization"""
    try:
        # Check authentication
        if not check_auth():
            return jsonify({'error': 'Unauthorized access'}), 401
        
        data = request.get_json() or {}
        
        # Extract parameters
        concept_ids = data.get('concept_ids')
        query = data.get('query')
        max_hops = data.get('max_hops', 1)
        max_nodes = data.get('max_nodes', 100)
        relation_types = data.get('relation_types')
        
        # Validate parameters
        if max_hops > 3:
            max_hops = 3  # Limit to prevent excessive queries
        if max_nodes > 200:
            max_nodes = 200  # Limit to prevent UI overload
        
        neo4j_service = current_app.neo4j_service
        subgraph = neo4j_service.get_subgraph(
            concept_ids=concept_ids,
            query=query,
            max_hops=max_hops,
            max_nodes=max_nodes,
            relation_types=relation_types
        )
        
        # Add layout seed for consistent positioning
        import random
        random.seed(42)  # Fixed seed for consistent layouts
        subgraph['layout_seed'] = 42
        
        return jsonify(subgraph)
        
    except Exception as e:
        logging.error(f"Error getting subgraph: {e}")
        return jsonify({'error': 'Failed to get subgraph'}), 500

@graph_bp.route('/graph/nodes/<node_id>', methods=['GET'])
def get_node_details(node_id):
    """Get detailed information about a specific node"""
    try:
        # Check authentication
        if not check_auth():
            return jsonify({'error': 'Unauthorized access'}), 401
        
        neo4j_service = current_app.neo4j_service
        mongodb_service = current_app.mongodb_service
        
        # Get node neighbors to find provenance
        neighbors = neo4j_service.get_concept_neighbors(node_id, hops=1)
        
        # Find source documents
        documents = []
        for edge in neighbors.get('edges', []):
            if edge['type'] == 'MENTIONS':
                # Find document node
                doc_node_id = edge['source'] if edge['target'] == node_id else edge['target']
                # This is a simplified approach - in practice, you'd query Neo4j for document details
                # and then lookup in MongoDB
        
        return jsonify({
            'node_id': node_id,
            'neighbors': neighbors,
            'provenance': {
                'documents': documents,
                'source_count': len(documents)
            }
        })
        
    except Exception as e:
        logging.error(f"Error getting node details: {e}")
        return jsonify({'error': 'Failed to get node details'}), 500

@graph_bp.route('/graph/search', methods=['GET'])
def search_concepts():
    """Search for concepts by label or canonical key"""
    try:
        # Check authentication
        if not check_auth():
            return jsonify({'error': 'Unauthorized access'}), 401
        
        query = request.args.get('q', '').strip()
        limit = min(int(request.args.get('limit', 20)), 50)  # Cap at 50
        
        if not query:
            return jsonify({'concepts': []})
        
        neo4j_service = current_app.neo4j_service
        concepts = neo4j_service.search_concepts(query, limit)
        
        return jsonify({'concepts': concepts})
        
    except Exception as e:
        logging.error(f"Error searching concepts: {e}")
        return jsonify({'error': 'Failed to search concepts'}), 500

def _build_knowledge_graph(sync_id: str, ingest_job_id: str):
    """Build knowledge graph from documents"""
    try:
        mongodb_service = current_app.mongodb_service
        neo4j_service = current_app.neo4j_service
        nlp_service = current_app.nlp_service
        
        # Update sync status to in_progress
        mongodb_service.update_graph_sync(sync_id, SyncStatus.IN_PROGRESS)
        
        # Get all documents for the job
        documents = mongodb_service.get_documents_by_job(ingest_job_id)
        
        stats = {
            'nodes_created': 0,
            'edges_created': 0,
            'concepts_merged': 0,
            'documents_processed': 0
        }
        
        all_concepts = {}  # canonical_key -> concept_data
        all_relations = []
        
        # Process each document
        for doc in documents:
            try:
                doc_id = str(doc['_id'])
                content = doc['content_text']
                
                # Create document node in Neo4j
                doc_node = DocumentNode(
                    id=doc_id,
                    source_uri=doc['source_uri'] or '',
                    content_hash=doc['content_hash']
                )
                neo4j_service.create_document_node(doc_node)
                
                # Extract concepts and relations
                concepts, relations = nlp_service.extract_concepts_and_relations(content, doc_id)
                
                # Process concepts
                for concept_data in concepts:
                    canonical_key = concept_data['canonical_key']
                    
                    if canonical_key in all_concepts:
                        # Merge concepts
                        existing = all_concepts[canonical_key]
                        existing['doc_ids'].append(doc_id)
                        stats['concepts_merged'] += 1
                    else:
                        # New concept
                        concept_data['doc_ids'] = [doc_id]
                        all_concepts[canonical_key] = concept_data
                        
                        # Create concept node
                        concept_node = ConceptNode(
                            id=concept_data['id'],
                            label=concept_data['label'],
                            canonical_key=canonical_key,
                            created_at=datetime.utcnow()
                        )
                        
                        if neo4j_service.create_concept_node(concept_node):
                            stats['nodes_created'] += 1
                    
                    # Create MENTIONS relationship from document to concept
                    mentions_edge = GraphEdge(
                        source_id=doc_id,
                        target_id=concept_data['id'],
                        relationship_type='MENTIONS',
                        properties={
                            'span_start': concept_data.get('span_start', -1),
                            'span_end': concept_data.get('span_end', -1)
                        }
                    )
                    
                    if neo4j_service.create_relationship(mentions_edge):
                        stats['edges_created'] += 1
                
                # Process relations
                for relation in relations:
                    relation_edge = GraphEdge(
                        source_id=relation['source_id'],
                        target_id=relation['target_id'],
                        relationship_type=relation['relation_type'],
                        properties={
                            'weight': relation.get('weight', 1.0),
                            'dependency': relation.get('dependency', ''),
                            'doc_id': doc_id
                        }
                    )
                    
                    if neo4j_service.create_relationship(relation_edge):
                        stats['edges_created'] += 1
                
                stats['documents_processed'] += 1
                logging.info(f"Processed document {doc_id} - found {len(concepts)} concepts, {len(relations)} relations")
                
            except Exception as e:
                logging.error(f"Error processing document {doc['_id']}: {e}")
                continue
        
        # Update sync status to completed
        mongodb_service.update_graph_sync(sync_id, SyncStatus.COMPLETED, stats)
        
        logging.info(f"Graph building completed for job {ingest_job_id}. Stats: {stats}")
        
    except Exception as e:
        logging.error(f"Error building knowledge graph: {e}")
        mongodb_service.update_graph_sync(sync_id, SyncStatus.FAILED, error=str(e))
