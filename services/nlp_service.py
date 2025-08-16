import logging
import hashlib
from typing import List, Dict, Any, Set, Tuple
import spacy
from spacy.tokens import Doc
import re

class NLPService:
    """Service for natural language processing and concept extraction"""
    
    def __init__(self, model_name: str = "en_core_web_sm"):
        try:
            self.nlp = spacy.load(model_name)
            logging.info(f"Loaded spaCy model: {model_name}")
        except OSError:
            logging.error(f"spaCy model {model_name} not found. Please install it with: python -m spacy download {model_name}")
            raise
        
        # Configure processing pipeline
        self.nlp.max_length = 2000000  # Increase max length for large documents
        
        # Stop words to filter out
        self.stop_words = self.nlp.Defaults.stop_words
        
        # Minimum concept length
        self.min_concept_length = 3
        
        # Maximum concepts per document
        self.max_concepts_per_doc = 200
    
    def extract_concepts_and_relations(self, text: str, doc_id: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Extract concepts and their relationships from text"""
        try:
            # Process text with spaCy
            doc = self.nlp(text[:self.nlp.max_length])  # Truncate if too long
            
            # Extract concepts
            concepts = self._extract_concepts(doc, doc_id)
            
            # Extract relationships
            relations = self._extract_relations(doc, concepts, doc_id)
            
            logging.info(f"Extracted {len(concepts)} concepts and {len(relations)} relations from document {doc_id}")
            return concepts, relations
            
        except Exception as e:
            logging.error(f"Failed to extract concepts from document {doc_id}: {e}")
            return [], []
    
    def _extract_concepts(self, doc: Doc, doc_id: str) -> List[Dict[str, Any]]:
        """Extract concepts from processed document"""
        concepts = []
        seen_concepts = set()
        
        # Extract named entities
        for ent in doc.ents:
            if self._is_valid_concept(ent.text):
                canonical_key = self._canonicalize_concept(ent.text)
                if canonical_key not in seen_concepts:
                    concepts.append({
                        "id": self._generate_concept_id(canonical_key),
                        "label": ent.text.strip(),
                        "canonical_key": canonical_key,
                        "type": "entity",
                        "entity_label": ent.label_,
                        "doc_id": doc_id,
                        "span_start": ent.start_char,
                        "span_end": ent.end_char
                    })
                    seen_concepts.add(canonical_key)
        
        # Extract noun phrases as concepts
        for chunk in doc.noun_chunks:
            if self._is_valid_concept(chunk.text):
                canonical_key = self._canonicalize_concept(chunk.text)
                if canonical_key not in seen_concepts and len(concepts) < self.max_concepts_per_doc:
                    concepts.append({
                        "id": self._generate_concept_id(canonical_key),
                        "label": chunk.text.strip(),
                        "canonical_key": canonical_key,
                        "type": "noun_phrase",
                        "entity_label": "PHRASE",
                        "doc_id": doc_id,
                        "span_start": chunk.start_char,
                        "span_end": chunk.end_char
                    })
                    seen_concepts.add(canonical_key)
        
        # Extract important keywords using TF-IDF approach
        keywords = self._extract_keywords(doc)
        for keyword in keywords:
            if len(concepts) >= self.max_concepts_per_doc:
                break
            canonical_key = self._canonicalize_concept(keyword)
            if canonical_key not in seen_concepts:
                concepts.append({
                    "id": self._generate_concept_id(canonical_key),
                    "label": keyword,
                    "canonical_key": canonical_key,
                    "type": "keyword",
                    "entity_label": "KEYWORD",
                    "doc_id": doc_id,
                    "span_start": -1,
                    "span_end": -1
                })
                seen_concepts.add(canonical_key)
        
        return concepts
    
    def _extract_relations(self, doc: Doc, concepts: List[Dict[str, Any]], doc_id: str) -> List[Dict[str, Any]]:
        """Extract relationships between concepts"""
        relations = []
        
        # Create concept lookup by span positions
        concept_spans = {}
        for concept in concepts:
            if concept["span_start"] >= 0 and concept["span_end"] >= 0:
                concept_spans[(concept["span_start"], concept["span_end"])] = concept
        
        # Extract dependency-based relations
        for token in doc:
            if token.dep_ in ["nsubj", "dobj", "pobj", "compound"]:
                head_concept = self._find_concept_for_token(token.head, concept_spans)
                child_concept = self._find_concept_for_token(token, concept_spans)
                
                if head_concept and child_concept and head_concept["id"] != child_concept["id"]:
                    relation_type = self._determine_relation_type(token.dep_)
                    relations.append({
                        "source_id": head_concept["id"],
                        "target_id": child_concept["id"],
                        "relation_type": relation_type,
                        "weight": 1.0,
                        "doc_id": doc_id,
                        "dependency": token.dep_
                    })
        
        # Extract co-occurrence relations (concepts appearing in same sentence)
        for sent in doc.sents:
            sent_concepts = []
            for concept in concepts:
                if (concept["span_start"] >= sent.start_char and 
                    concept["span_end"] <= sent.end_char):
                    sent_concepts.append(concept)
            
            # Create co-occurrence relations
            for i in range(len(sent_concepts)):
                for j in range(i + 1, len(sent_concepts)):
                    concept1 = sent_concepts[i]
                    concept2 = sent_concepts[j]
                    
                    # Calculate distance weight
                    distance = abs(concept1["span_start"] - concept2["span_start"])
                    weight = max(0.1, 1.0 / (1 + distance / 100))
                    
                    relations.append({
                        "source_id": concept1["id"],
                        "target_id": concept2["id"],
                        "relation_type": "CO_OCCURS",
                        "weight": weight,
                        "doc_id": doc_id,
                        "dependency": "co_occurrence"
                    })
        
        return relations
    
    def _is_valid_concept(self, text: str) -> bool:
        """Check if text is valid for a concept"""
        text = text.strip()
        
        # Check length
        if len(text) < self.min_concept_length or len(text) > 100:
            return False
        
        # Check if it's just stop words
        tokens = text.lower().split()
        if all(token in self.stop_words for token in tokens):
            return False
        
        # Check if it's mostly punctuation or numbers
        if re.match(r'^[^\w\s]*$', text) or re.match(r'^\d+$', text):
            return False
        
        # Filter out common non-informative phrases
        non_informative = ['this', 'that', 'these', 'those', 'here', 'there', 'where', 'when', 'what', 'how']
        if text.lower() in non_informative:
            return False
        
        return True
    
    def _canonicalize_concept(self, text: str) -> str:
        """Create canonical form of concept for deduplication"""
        # Remove extra whitespace, convert to lowercase
        canonical = ' '.join(text.strip().lower().split())
        
        # Remove common prefixes/suffixes
        canonical = re.sub(r'^(the|a|an)\s+', '', canonical)
        canonical = re.sub(r'\s+(inc|corp|ltd|llc)$', '', canonical)
        
        return canonical
    
    def _generate_concept_id(self, canonical_key: str) -> str:
        """Generate unique ID for concept"""
        return hashlib.md5(canonical_key.encode('utf-8')).hexdigest()[:16]
    
    def _extract_keywords(self, doc: Doc) -> List[str]:
        """Extract important keywords using simple frequency analysis"""
        word_freq = {}
        
        for token in doc:
            if (not token.is_stop and not token.is_punct and 
                not token.is_space and len(token.text) >= self.min_concept_length):
                lemma = token.lemma_.lower()
                word_freq[lemma] = word_freq.get(lemma, 0) + 1
        
        # Sort by frequency and return top keywords
        sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        return [word for word, freq in sorted_words[:50] if freq >= 2]
    
    def _find_concept_for_token(self, token, concept_spans: Dict) -> Dict[str, Any]:
        """Find concept that contains the given token"""
        token_start = token.idx
        token_end = token.idx + len(token.text)
        
        for (span_start, span_end), concept in concept_spans.items():
            if span_start <= token_start < span_end:
                return concept
        
        return None
    
    def _determine_relation_type(self, dependency: str) -> str:
        """Map dependency relation to graph relation type"""
        relation_mapping = {
            "nsubj": "SUBJECT_OF",
            "dobj": "OBJECT_OF", 
            "pobj": "PREPOSITIONAL_OBJECT",
            "compound": "COMPOUND_WITH",
            "amod": "MODIFIES",
            "poss": "POSSESSES"
        }
        return relation_mapping.get(dependency, "RELATED_TO")
    
    def answer_question(self, question: str, graph_data: Dict[str, Any]) -> Tuple[str, List[str], List[str]]:
        """Answer a question based on the knowledge graph"""
        try:
            # Process the question
            question_doc = self.nlp(question.lower())
            
            # Extract key concepts from question
            question_concepts = []
            for ent in question_doc.ents:
                canonical_key = self._canonicalize_concept(ent.text)
                question_concepts.append(canonical_key)
            
            for chunk in question_doc.noun_chunks:
                canonical_key = self._canonicalize_concept(chunk.text)
                if canonical_key not in question_concepts:
                    question_concepts.append(canonical_key)
            
            # Find matching nodes in the graph
            matching_nodes = []
            node_lookup = {node["id"]: node for node in graph_data.get("nodes", [])}
            
            for node in graph_data.get("nodes", []):
                node_canonical = self._canonicalize_concept(node.get("label", ""))
                if any(concept in node_canonical or node_canonical in concept 
                       for concept in question_concepts):
                    matching_nodes.append(node)
            
            if not matching_nodes:
                return "I couldn't find any relevant information in the knowledge graph to answer your question.", [], []
            
            # Determine question type and generate answer
            answer, evidence_nodes, evidence_edges = self._generate_answer(
                question_doc, matching_nodes, graph_data
            )
            
            return answer, evidence_nodes, evidence_edges
            
        except Exception as e:
            logging.error(f"Failed to answer question: {e}")
            return "I encountered an error while processing your question.", [], []
    
    def _generate_answer(self, question_doc, matching_nodes: List[Dict], graph_data: Dict) -> Tuple[str, List[str], List[str]]:
        """Generate answer based on question type and matching nodes"""
        question_text = question_doc.text.lower()
        
        # Question type detection
        if any(word in question_text for word in ["what is", "what are", "define", "definition"]):
            return self._answer_definition_question(matching_nodes, graph_data)
        elif any(word in question_text for word in ["how many", "count", "number"]):
            return self._answer_count_question(matching_nodes, graph_data)
        elif any(word in question_text for word in ["related", "connected", "associated"]):
            return self._answer_relationship_question(matching_nodes, graph_data)
        elif any(word in question_text for word in ["where", "location"]):
            return self._answer_location_question(matching_nodes, graph_data)
        else:
            return self._answer_general_question(matching_nodes, graph_data)
    
    def _answer_definition_question(self, matching_nodes: List[Dict], graph_data: Dict) -> Tuple[str, List[str], List[str]]:
        """Answer definition questions"""
        if not matching_nodes:
            return "No matching concepts found.", [], []
        
        primary_node = matching_nodes[0]
        evidence_nodes = [primary_node["id"]]
        evidence_edges = []
        
        # Find related concepts
        related_concepts = []
        for edge in graph_data.get("edges", []):
            if edge["source"] == primary_node["id"]:
                target_node = next((n for n in graph_data["nodes"] if n["id"] == edge["target"]), None)
                if target_node:
                    related_concepts.append(target_node["label"])
                    evidence_nodes.append(target_node["id"])
                    evidence_edges.append(edge["id"] if "id" in edge else f"{edge['source']}_{edge['target']}")
        
        if related_concepts:
            answer = f"{primary_node['label']} is a concept that is related to: {', '.join(related_concepts[:5])}"
        else:
            answer = f"{primary_node['label']} is a concept in the knowledge graph, but I don't have additional context about it."
        
        return answer, evidence_nodes, evidence_edges
    
    def _answer_count_question(self, matching_nodes: List[Dict], graph_data: Dict) -> Tuple[str, List[str], List[str]]:
        """Answer counting questions"""
        count = len(matching_nodes)
        evidence_nodes = [node["id"] for node in matching_nodes]
        
        if count == 1:
            answer = f"There is 1 concept matching your query: {matching_nodes[0]['label']}"
        else:
            labels = [node["label"] for node in matching_nodes[:5]]
            answer = f"There are {count} concepts matching your query"
            if count <= 5:
                answer += f": {', '.join(labels)}"
            else:
                answer += f". Some examples: {', '.join(labels)}"
        
        return answer, evidence_nodes, []
    
    def _answer_relationship_question(self, matching_nodes: List[Dict], graph_data: Dict) -> Tuple[str, List[str], List[str]]:
        """Answer relationship questions"""
        if len(matching_nodes) < 2:
            return self._answer_general_question(matching_nodes, graph_data)
        
        # Find relationships between matching nodes
        evidence_nodes = [node["id"] for node in matching_nodes]
        evidence_edges = []
        relationships = []
        
        for edge in graph_data.get("edges", []):
            if edge["source"] in evidence_nodes and edge["target"] in evidence_nodes:
                source_label = next(n["label"] for n in matching_nodes if n["id"] == edge["source"])
                target_label = next(n["label"] for n in matching_nodes if n["id"] == edge["target"])
                relationships.append(f"{source_label} -> {target_label}")
                evidence_edges.append(edge["id"] if "id" in edge else f"{edge['source']}_{edge['target']}")
        
        if relationships:
            answer = f"Found the following relationships: {'; '.join(relationships[:3])}"
        else:
            answer = f"The concepts {', '.join(node['label'] for node in matching_nodes[:3])} appear in the knowledge graph but don't have direct relationships."
        
        return answer, evidence_nodes, evidence_edges
    
    def _answer_location_question(self, matching_nodes: List[Dict], graph_data: Dict) -> Tuple[str, List[str], List[str]]:
        """Answer location-based questions"""
        location_nodes = [node for node in matching_nodes 
                         if node.get("entity_label") in ["GPE", "LOC", "LOCATION"]]
        
        if location_nodes:
            evidence_nodes = [node["id"] for node in location_nodes]
            answer = f"Found these locations: {', '.join(node['label'] for node in location_nodes[:3])}"
        else:
            evidence_nodes = [node["id"] for node in matching_nodes]
            answer = "No specific location information found for the matching concepts."
        
        return answer, evidence_nodes, []
    
    def _answer_general_question(self, matching_nodes: List[Dict], graph_data: Dict) -> Tuple[str, List[str], List[str]]:
        """Answer general questions"""
        if not matching_nodes:
            return "I couldn't find relevant information to answer your question.", [], []
        
        primary_node = matching_nodes[0]
        evidence_nodes = [primary_node["id"]]
        evidence_edges = []
        
        # Get connected nodes
        connected_concepts = []
        for edge in graph_data.get("edges", []):
            if edge["source"] == primary_node["id"] or edge["target"] == primary_node["id"]:
                other_id = edge["target"] if edge["source"] == primary_node["id"] else edge["source"]
                other_node = next((n for n in graph_data["nodes"] if n["id"] == other_id), None)
                if other_node and other_node["id"] not in evidence_nodes:
                    connected_concepts.append(other_node["label"])
                    evidence_nodes.append(other_node["id"])
                    evidence_edges.append(edge["id"] if "id" in edge else f"{edge['source']}_{edge['target']}")
                    
                if len(connected_concepts) >= 3:  # Limit to avoid overly long answers
                    break
        
        if connected_concepts:
            answer = f"Based on the knowledge graph, {primary_node['label']} is connected to: {', '.join(connected_concepts)}"
        else:
            answer = f"I found {primary_node['label']} in the knowledge graph, but it has limited connections."
        
        return answer, evidence_nodes, evidence_edges
