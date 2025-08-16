import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from pymongo import MongoClient
from pymongo.errors import PyMongoError
from bson import ObjectId
from models import Document, IngestJob, GraphSync, QALog, JobStatus, SyncStatus

class MongoDBService:
    """Service for MongoDB operations"""
    
    def __init__(self, uri: str):
        self.client = MongoClient(uri)
        self.db = self.client.get_default_database()
        self._setup_indexes()
    
    def get_database(self):
        """Get database instance"""
        return self.db
    
    def _setup_indexes(self):
        """Create necessary indexes"""
        try:
            # Documents collection indexes
            self.db.documents.create_index("content_hash")
            self.db.documents.create_index("ingest_job_id")
            self.db.documents.create_index("source_type")
            
            # Ingest jobs collection indexes
            self.db.ingest_jobs.create_index("status")
            self.db.ingest_jobs.create_index("created_at")
            
            # Graph sync collection indexes
            self.db.graph_sync.create_index("ingest_job_id")
            self.db.graph_sync.create_index("status")
            
            # QA logs collection indexes
            self.db.qa_logs.create_index("created_at")
            self.db.qa_logs.create_index("question")
            
            logging.info("MongoDB indexes created successfully")
        except PyMongoError as e:
            logging.error(f"Failed to create MongoDB indexes: {e}")
    
    # Document operations
    def save_document(self, document: Document) -> str:
        """Save a document to MongoDB"""
        try:
            doc_dict = {
                "source_type": document.source_type,
                "source_uri": document.source_uri,
                "content_hash": document.content_hash,
                "content_text": document.content_text,
                "byte_size": document.byte_size,
                "ingest_job_id": document.ingest_job_id,
                "created_at": document.created_at,
                "updated_at": document.updated_at
            }
            
            result = self.db.documents.insert_one(doc_dict)
            logging.info(f"Document saved with ID: {result.inserted_id}")
            return str(result.inserted_id)
        except PyMongoError as e:
            logging.error(f"Failed to save document: {e}")
            raise
    
    def get_document_by_hash(self, content_hash: str) -> Optional[Dict[str, Any]]:
        """Get document by content hash"""
        try:
            return self.db.documents.find_one({"content_hash": content_hash})
        except PyMongoError as e:
            logging.error(f"Failed to get document by hash: {e}")
            return None
    
    def get_documents_by_job(self, job_id: str) -> List[Dict[str, Any]]:
        """Get all documents for a job"""
        try:
            return list(self.db.documents.find({"ingest_job_id": job_id}))
        except PyMongoError as e:
            logging.error(f"Failed to get documents by job: {e}")
            return []
    
    # Ingest job operations
    def create_ingest_job(self, inputs: List[Dict[str, Any]], total_bytes: int) -> str:
        """Create a new ingest job"""
        try:
            job = IngestJob(
                status=JobStatus.QUEUED,
                inputs=inputs,
                total_bytes=total_bytes,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            job_dict = {
                "status": job.status.value,
                "inputs": job.inputs,
                "total_bytes": job.total_bytes,
                "error": job.error,
                "created_at": job.created_at,
                "updated_at": job.updated_at
            }
            
            result = self.db.ingest_jobs.insert_one(job_dict)
            logging.info(f"Ingest job created with ID: {result.inserted_id}")
            return str(result.inserted_id)
        except PyMongoError as e:
            logging.error(f"Failed to create ingest job: {e}")
            raise
    
    def get_ingest_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get ingest job by ID"""
        try:
            return self.db.ingest_jobs.find_one({"_id": ObjectId(job_id)})
        except (PyMongoError, ValueError) as e:
            logging.error(f"Failed to get ingest job: {e}")
            return None
    
    def update_ingest_job_status(self, job_id: str, status: JobStatus, error: Optional[str] = None) -> bool:
        """Update ingest job status"""
        try:
            update_data = {
                "status": status.value,
                "updated_at": datetime.utcnow()
            }
            if error:
                update_data["error"] = error
            
            result = self.db.ingest_jobs.update_one(
                {"_id": ObjectId(job_id)},
                {"$set": update_data}
            )
            return result.modified_count > 0
        except (PyMongoError, ValueError) as e:
            logging.error(f"Failed to update ingest job status: {e}")
            return False
    
    # Graph sync operations
    def create_graph_sync(self, ingest_job_id: str) -> str:
        """Create a new graph sync record"""
        try:
            sync = GraphSync(
                ingest_job_id=ingest_job_id,
                neo4j_tx_id=None,
                status=SyncStatus.PENDING,
                stats={"nodes_created": 0, "edges_created": 0, "concepts_merged": 0},
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            sync_dict = {
                "ingest_job_id": sync.ingest_job_id,
                "neo4j_tx_id": sync.neo4j_tx_id,
                "status": sync.status.value,
                "stats": sync.stats,
                "error": sync.error,
                "created_at": sync.created_at,
                "updated_at": sync.updated_at
            }
            
            result = self.db.graph_sync.insert_one(sync_dict)
            logging.info(f"Graph sync created with ID: {result.inserted_id}")
            return str(result.inserted_id)
        except PyMongoError as e:
            logging.error(f"Failed to create graph sync: {e}")
            raise
    
    def get_graph_sync(self, sync_id: str) -> Optional[Dict[str, Any]]:
        """Get graph sync by ID"""
        try:
            return self.db.graph_sync.find_one({"_id": ObjectId(sync_id)})
        except (PyMongoError, ValueError) as e:
            logging.error(f"Failed to get graph sync: {e}")
            return None
    
    def update_graph_sync(self, sync_id: str, status: SyncStatus, 
                         stats: Optional[Dict[str, int]] = None,
                         error: Optional[str] = None) -> bool:
        """Update graph sync record"""
        try:
            update_data = {
                "status": status.value,
                "updated_at": datetime.utcnow()
            }
            if stats:
                update_data["stats"] = stats
            if error:
                update_data["error"] = error
            
            result = self.db.graph_sync.update_one(
                {"_id": ObjectId(sync_id)},
                {"$set": update_data}
            )
            return result.modified_count > 0
        except (PyMongoError, ValueError) as e:
            logging.error(f"Failed to update graph sync: {e}")
            return False
    
    # QA log operations
    def log_qa_interaction(self, question: str, params: Dict[str, Any],
                          answer_text: Optional[str], evidence: Dict[str, List[str]],
                          status: str, duration_ms: int, error: Optional[str] = None) -> str:
        """Log a Q&A interaction"""
        try:
            qa_log = QALog(
                question=question,
                params=params,
                answer_text=answer_text,
                evidence=evidence,
                status=status,
                error=error,
                duration_ms=duration_ms,
                created_at=datetime.utcnow()
            )
            
            log_dict = {
                "question": qa_log.question,
                "params": qa_log.params,
                "answer_text": qa_log.answer_text,
                "evidence": qa_log.evidence,
                "status": qa_log.status,
                "error": qa_log.error,
                "duration_ms": qa_log.duration_ms,
                "created_at": qa_log.created_at
            }
            
            result = self.db.qa_logs.insert_one(log_dict)
            logging.info(f"QA interaction logged with ID: {result.inserted_id}")
            return str(result.inserted_id)
        except PyMongoError as e:
            logging.error(f"Failed to log QA interaction: {e}")
            raise
    
    def get_qa_logs(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent Q&A logs"""
        try:
            return list(self.db.qa_logs.find().sort("created_at", -1).limit(limit))
        except PyMongoError as e:
            logging.error(f"Failed to get QA logs: {e}")
            return []
    
    def close(self):
        """Close MongoDB connection"""
        if self.client:
            self.client.close()
            logging.info("MongoDB connection closed")
