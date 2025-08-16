import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from neo4j import GraphDatabase, RoutingControl
from neo4j.exceptions import ServiceUnavailable, TransientError
from models import ConceptNode, DocumentNode, GraphEdge

class Neo4jService:
    """Service for Neo4j database operations"""
    
    def __init__(self, uri: str, username: str, password: str):
        self.driver = GraphDatabase.driver(
            uri,
            auth=(username, password),
            max_connection_lifetime=30 * 60,  # 30 minutes
            max_connection_pool_size=50,
            connection_acquisition_timeout=60.0
        )
        self._setup_constraints()
    
    def verify_connection(self):
        """Verify Neo4j connectivity"""
        try:
            self.driver.verify_connectivity()
            logging.info("Neo4j connection verified")
        except Exception as e:
            logging.error(f"Neo4j connection failed: {e}")
            raise
    
    def _setup_constraints(self):
        """Create necessary constraints and indexes"""
        constraints = [
            "CREATE CONSTRAINT concept_id IF NOT EXISTS FOR (c:Concept) REQUIRE c.id IS UNIQUE",
            "CREATE CONSTRAINT document_id IF NOT EXISTS FOR (d:Document) REQUIRE d.id IS UNIQUE",
            "CREATE INDEX concept_canonical_key IF NOT EXISTS FOR (c:Concept) ON (c.canonical_key)",
            "CREATE INDEX concept_label IF NOT EXISTS FOR (c:Concept) ON (c.label)"
        ]
        
        try:
            with self.driver.session(database="neo4j") as session:
                for constraint in constraints:
                    session.run(constraint)
            logging.info("Neo4j constraints and indexes created")
        except Exception as e:
            logging.error(f"Failed to create constraints: {e}")
    
    def create_concept_node(self, concept: ConceptNode) -> bool:
        """Create a concept node"""
        def _create_concept(tx, concept_data):
            return tx.run(
                """
                MERGE (c:Concept {id: $id})
                SET c.label = $label,
                    c.canonical_key = $canonical_key,
                    c.created_at = $created_at
                RETURN c
                """,
                id=concept_data.id,
                label=concept_data.label,
                canonical_key=concept_data.canonical_key,
                created_at=concept_data.created_at
            )
        
        try:
            with self.driver.session(database="neo4j") as session:
                result = session.execute_write(_create_concept, concept)
                return result.single() is not None
        except Exception as e:
            logging.error(f"Failed to create concept node: {e}")
            return False
    
    def create_document_node(self, document: DocumentNode) -> bool:
        """Create a document node"""
        def _create_document(tx, doc_data):
            return tx.run(
                """
                MERGE (d:Document {id: $id})
                SET d.source_uri = $source_uri,
                    d.content_hash = $content_hash
                RETURN d
                """,
                id=doc_data.id,
                source_uri=doc_data.source_uri,
                content_hash=doc_data.content_hash
            )
        
        try:
            with self.driver.session(database="neo4j") as session:
                result = session.execute_write(_create_document, document)
                return result.single() is not None
        except Exception as e:
            logging.error(f"Failed to create document node: {e}")
            return False
    
    def create_relationship(self, edge: GraphEdge) -> bool:
        """Create a relationship between nodes"""
        def _create_relationship(tx, edge_data):
            query = f"""
            MATCH (source {{id: $source_id}})
            MATCH (target {{id: $target_id}})
            MERGE (source)-[r:{edge_data.relationship_type}]->(target)
            SET r += $properties
            RETURN r
            """
            return tx.run(
                query,
                source_id=edge_data.source_id,
                target_id=edge_data.target_id,
                properties=edge_data.properties or {}
            )
        
        try:
            with self.driver.session(database="neo4j") as session:
                result = session.execute_write(_create_relationship, edge)
                return result.single() is not None
        except Exception as e:
            logging.error(f"Failed to create relationship: {e}")
            return False
    
    def get_graph_summary(self) -> Dict[str, Any]:
        """Get graph statistics"""
        def _get_summary(tx):
            # Get node counts by label
            node_result = tx.run("MATCH (n) RETURN labels(n) as labels, count(n) as count")
            nodes_by_label = {}
            for record in node_result:
                labels = record["labels"]
                count = record["count"]
                for label in labels:
                    nodes_by_label[label] = nodes_by_label.get(label, 0) + count
            
            # Get relationship counts by type
            rel_result = tx.run("MATCH ()-[r]->() RETURN type(r) as rel_type, count(r) as count")
            rels_by_type = {record["rel_type"]: record["count"] for record in rel_result}
            
            return {
                "nodes_by_label": nodes_by_label,
                "relationships_by_type": rels_by_type,
                "total_nodes": sum(nodes_by_label.values()),
                "total_relationships": sum(rels_by_type.values())
            }
        
        try:
            with self.driver.session(database="neo4j") as session:
                return session.execute_read(_get_summary)
        except Exception as e:
            logging.error(f"Failed to get graph summary: {e}")
            return {}
    
    def get_subgraph(self, concept_ids: Optional[List[str]] = None,
                    query: Optional[str] = None, max_hops: int = 1,
                    max_nodes: int = 100, relation_types: Optional[List[str]] = None) -> Dict[str, Any]:
        """Get subgraph data for visualization"""
        def _get_subgraph(tx, params):
            # Build query based on parameters
            if params.get("concept_ids"):
                # Start from specific concepts
                cypher = """
                MATCH (c:Concept)
                WHERE c.id IN $concept_ids
                CALL {
                    WITH c
                    MATCH (c)-[r*1..""" + str(params["max_hops"]) + """]->(connected)
                    RETURN connected, r[-1] as rel
                    UNION
                    WITH c
                    MATCH (c)<-[r*1..""" + str(params["max_hops"]) + """]-(connected)
                    RETURN connected, r[-1] as rel
                    UNION
                    WITH c
                    RETURN c as connected, null as rel
                }
                """
            elif params.get("query"):
                # Text search on concept labels
                cypher = """
                MATCH (c:Concept)
                WHERE c.label CONTAINS $query OR c.canonical_key CONTAINS $query
                CALL {
                    WITH c
                    MATCH (c)-[r*1..""" + str(params["max_hops"]) + """]->(connected)
                    RETURN connected, r[-1] as rel
                    UNION
                    WITH c
                    MATCH (c)<-[r*1..""" + str(params["max_hops"]) + """]-(connected)
                    RETURN connected, r[-1] as rel
                    UNION
                    WITH c
                    RETURN c as connected, null as rel
                }
                """
            else:
                # Return all nodes with limited connections
                cypher = """
                MATCH (c:Concept)
                OPTIONAL MATCH (c)-[r]-(connected:Concept)
                """
            
            # Add limits and collect results
            cypher += """
            WITH DISTINCT connected, rel
            LIMIT $max_nodes
            RETURN connected, collect(DISTINCT rel) as relationships
            """
            
            result = tx.run(cypher, **params)
            
            nodes = []
            edges = []
            edge_ids = set()
            
            for record in result:
                node = record["connected"]
                if node:
                    # Add node
                    nodes.append({
                        "id": node["id"],
                        "label": node.get("label", ""),
                        "type": list(node.labels)[0],
                        "canonical_key": node.get("canonical_key", ""),
                        "created_at": node.get("created_at", "")
                    })
                    
                    # Add relationships
                    relationships = record["relationships"]
                    for rel in relationships:
                        if rel:
                            edge_id = f"{rel.start_node.element_id}_{rel.end_node.element_id}_{rel.type}"
                            if edge_id not in edge_ids:
                                edges.append({
                                    "id": edge_id,
                                    "source": rel.start_node["id"],
                                    "target": rel.end_node["id"],
                                    "type": rel.type,
                                    "properties": dict(rel)
                                })
                                edge_ids.add(edge_id)
            
            return {"nodes": nodes, "edges": edges}
        
        try:
            params = {
                "concept_ids": concept_ids,
                "query": query,
                "max_hops": max_hops,
                "max_nodes": max_nodes,
                "relation_types": relation_types
            }
            
            with self.driver.session(database="neo4j") as session:
                return session.execute_read(_get_subgraph, params)
        except Exception as e:
            logging.error(f"Failed to get subgraph: {e}")
            return {"nodes": [], "edges": []}
    
    def search_concepts(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Search for concepts by label or canonical key"""
        def _search_concepts(tx, search_query, search_limit):
            result = tx.run(
                """
                MATCH (c:Concept)
                WHERE c.label CONTAINS $query OR c.canonical_key CONTAINS $query
                RETURN c.id as id, c.label as label, c.canonical_key as canonical_key
                ORDER BY c.label
                LIMIT $limit
                """,
                query=search_query,
                limit=search_limit
            )
            return [dict(record) for record in result]
        
        try:
            with self.driver.session(database="neo4j") as session:
                return session.execute_read(_search_concepts, query, limit)
        except Exception as e:
            logging.error(f"Failed to search concepts: {e}")
            return []
    
    def get_concept_neighbors(self, concept_id: str, hops: int = 1) -> Dict[str, Any]:
        """Get neighbors of a specific concept"""
        def _get_neighbors(tx, c_id, max_hops):
            result = tx.run(
                """
                MATCH (c:Concept {id: $concept_id})
                OPTIONAL MATCH (c)-[r*1..""" + str(max_hops) + """]->(neighbor:Concept)
                OPTIONAL MATCH (c)<-[r2*1..""" + str(max_hops) + """]-(neighbor2:Concept)
                WITH c, collect(DISTINCT neighbor) + collect(DISTINCT neighbor2) as neighbors
                UNWIND neighbors as neighbor
                MATCH (c)-[rel]-(neighbor)
                RETURN DISTINCT neighbor, rel
                """,
                concept_id=c_id
            )
            
            nodes = []
            edges = []
            
            for record in result:
                neighbor = record["neighbor"]
                rel = record["rel"]
                
                if neighbor:
                    nodes.append({
                        "id": neighbor["id"],
                        "label": neighbor.get("label", ""),
                        "type": list(neighbor.labels)[0],
                        "canonical_key": neighbor.get("canonical_key", "")
                    })
                
                if rel:
                    edges.append({
                        "source": rel.start_node["id"],
                        "target": rel.end_node["id"],
                        "type": rel.type,
                        "properties": dict(rel)
                    })
            
            return {"nodes": nodes, "edges": edges}
        
        try:
            with self.driver.session(database="neo4j") as session:
                return session.execute_read(_get_neighbors, concept_id, hops)
        except Exception as e:
            logging.error(f"Failed to get concept neighbors: {e}")
            return {"nodes": [], "edges": []}
    
    def find_paths(self, start_concept: str, end_concept: str, max_length: int = 3) -> List[Dict[str, Any]]:
        """Find paths between two concepts"""
        def _find_paths(tx, start_id, end_id, max_len):
            result = tx.run(
                """
                MATCH path = (start:Concept {id: $start_id})-[*1..""" + str(max_len) + """]->(end:Concept {id: $end_id})
                RETURN path
                ORDER BY length(path)
                LIMIT 5
                """,
                start_id=start_id,
                end_id=end_id
            )
            
            paths = []
            for record in result:
                path = record["path"]
                path_data = {
                    "length": len(path.relationships),
                    "nodes": [{"id": node["id"], "label": node.get("label", "")} for node in path.nodes],
                    "relationships": [{"type": rel.type, "properties": dict(rel)} for rel in path.relationships]
                }
                paths.append(path_data)
            
            return paths
        
        try:
            with self.driver.session(database="neo4j") as session:
                return session.execute_read(_find_paths, start_concept, end_concept, max_length)
        except Exception as e:
            logging.error(f"Failed to find paths: {e}")
            return []
    
    def close(self):
        """Close the driver connection"""
        if self.driver:
            self.driver.close()
            logging.info("Neo4j driver closed")
