import logging
import hashlib
import os
from datetime import datetime
from typing import List, Dict, Any
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from models import Document, JobStatus
from services.web_scraper import WebScraperService

ingestion_bp = Blueprint('ingestion', __name__)

def check_auth():
    """Check authentication token"""
    auth_header = request.headers.get('Authorization', '')
    expected_token = f"Bearer {current_app.config['MONGODB_AUTH_TOKEN']}"
    
    if auth_header != expected_token:
        return False
    return True

@ingestion_bp.route('/ingest/jobs', methods=['POST'])
def create_ingest_job():
    """Create new ingestion job with files and URLs"""
    try:
        # Check authentication
        if not check_auth():
            return jsonify({'error': 'Unauthorized access'}), 401
        
        # Get files and URLs from request
        files = request.files.getlist('files')
        urls_json = request.form.get('urls', '[]')
        
        try:
            import json
            urls = json.loads(urls_json) if urls_json else []
        except json.JSONDecodeError:
            return jsonify({'error': 'Invalid URLs format. Must be valid JSON array.'}), 400
        
        # Validate inputs
        if not files and not urls:
            return jsonify({'error': 'No files or URLs provided'}), 400
        
        # Calculate total size and validate
        total_bytes = 0
        inputs = []
        
        # Process files
        for file in files:
            if file.filename and file.filename != '':
                # Get file size
                file.seek(0, os.SEEK_END)
                file_size = file.tell()
                file.seek(0)
                
                total_bytes += file_size
                inputs.append({
                    'type': 'txt',
                    'name': secure_filename(file.filename),
                    'byte_size': file_size
                })
        
        # Process URLs - estimate sizes
        if urls:
            scraper = WebScraperService()
            try:
                valid_urls, estimated_bytes, invalid_urls = scraper.validate_and_estimate_size(urls)
                
                if invalid_urls:
                    logging.warning(f"Invalid URLs found: {invalid_urls}")
                
                for url_info in valid_urls:
                    total_bytes += url_info['estimated_size']
                    inputs.append({
                        'type': 'url',
                        'url': url_info['url'],
                        'estimated_size': url_info['estimated_size']
                    })
                
            finally:
                scraper.close()
        
        # Check size limit (100MB)
        max_size = current_app.config.get('MAX_CONTENT_LENGTH', 100 * 1024 * 1024)
        if total_bytes > max_size:
            size_mb = total_bytes / (1024 * 1024)
            max_mb = max_size / (1024 * 1024)
            return jsonify({
                'error': f'Total payload too large: {size_mb:.1f}MB exceeds limit of {max_mb}MB',
                'total_bytes': total_bytes,
                'max_bytes': max_size,
                'inputs': inputs
            }), 413
        
        # Create ingest job
        mongodb_service = current_app.mongodb_service
        job_id = mongodb_service.create_ingest_job(inputs, total_bytes)
        
        # Process files and URLs asynchronously
        _process_ingestion_job(job_id, files, urls)
        
        return jsonify({
            'job_id': job_id,
            'status': 'queued',
            'total_bytes': total_bytes,
            'inputs_count': len(inputs)
        }), 201
        
    except Exception as e:
        logging.error(f"Error creating ingest job: {e}")
        return jsonify({'error': 'Failed to create ingestion job'}), 500

@ingestion_bp.route('/ingest/jobs/<job_id>', methods=['GET'])
def get_ingest_job_status(job_id):
    """Get ingestion job status and details"""
    try:
        # Check authentication
        if not check_auth():
            return jsonify({'error': 'Unauthorized access'}), 401
        
        mongodb_service = current_app.mongodb_service
        job = mongodb_service.get_ingest_job(job_id)
        
        if not job:
            return jsonify({'error': 'Job not found'}), 404
        
        # Get associated documents count
        documents = mongodb_service.get_documents_by_job(job_id)
        
        return jsonify({
            'job_id': str(job['_id']),
            'status': job['status'],
            'inputs': job['inputs'],
            'total_bytes': job['total_bytes'],
            'documents_count': len(documents),
            'error': job.get('error'),
            'created_at': job['created_at'].isoformat(),
            'updated_at': job['updated_at'].isoformat()
        })
        
    except Exception as e:
        logging.error(f"Error getting job status: {e}")
        return jsonify({'error': 'Failed to get job status'}), 500

def _process_ingestion_job(job_id: str, files, urls):
    """Process ingestion job (files and URLs)"""
    try:
        mongodb_service = current_app.mongodb_service
        
        # Update job status to processing
        mongodb_service.update_ingest_job_status(job_id, JobStatus.PROCESSING)
        
        processed_docs = []
        errors = []
        
        # Process files
        for file in files:
            if file.filename and file.filename != '':
                try:
                    content = file.read().decode('utf-8', errors='ignore')
                    content_hash = hashlib.md5(content.encode('utf-8')).hexdigest()
                    
                    # Check for duplicate
                    existing_doc = mongodb_service.get_document_by_hash(content_hash)
                    if existing_doc:
                        logging.info(f"Duplicate document found: {file.filename}")
                        processed_docs.append(str(existing_doc['_id']))
                        continue
                    
                    # Create new document
                    document = Document(
                        source_type='txt',
                        source_uri=secure_filename(file.filename),
                        content_hash=content_hash,
                        content_text=content,
                        byte_size=len(content.encode('utf-8')),
                        ingest_job_id=job_id,
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    
                    doc_id = mongodb_service.save_document(document)
                    processed_docs.append(doc_id)
                    logging.info(f"Processed file: {file.filename}")
                    
                except Exception as e:
                    error_msg = f"Failed to process file {file.filename}: {str(e)}"
                    errors.append(error_msg)
                    logging.error(error_msg)
        
        # Process URLs
        if urls:
            scraper = WebScraperService()
            try:
                for url in urls:
                    try:
                        content = scraper.get_website_text_content(url)
                        if content:
                            content_hash = hashlib.md5(content.encode('utf-8')).hexdigest()
                            
                            # Check for duplicate
                            existing_doc = mongodb_service.get_document_by_hash(content_hash)
                            if existing_doc:
                                logging.info(f"Duplicate document found: {url}")
                                processed_docs.append(str(existing_doc['_id']))
                                continue
                            
                            # Create new document
                            document = Document(
                                source_type='url',
                                source_uri=url,
                                content_hash=content_hash,
                                content_text=content,
                                byte_size=len(content.encode('utf-8')),
                                ingest_job_id=job_id,
                                created_at=datetime.utcnow(),
                                updated_at=datetime.utcnow()
                            )
                            
                            doc_id = mongodb_service.save_document(document)
                            processed_docs.append(doc_id)
                            logging.info(f"Processed URL: {url}")
                        else:
                            error_msg = f"Failed to extract content from URL: {url}"
                            errors.append(error_msg)
                            logging.error(error_msg)
                            
                    except Exception as e:
                        error_msg = f"Failed to process URL {url}: {str(e)}"
                        errors.append(error_msg)
                        logging.error(error_msg)
            finally:
                scraper.close()
        
        # Update job status
        if errors and not processed_docs:
            # Complete failure
            mongodb_service.update_ingest_job_status(
                job_id, JobStatus.FAILED, 
                f"All inputs failed: {'; '.join(errors[:3])}"
            )
        elif errors:
            # Partial success
            mongodb_service.update_ingest_job_status(
                job_id, JobStatus.COMPLETED,
                f"Partial success. Errors: {'; '.join(errors[:3])}"
            )
        else:
            # Complete success
            mongodb_service.update_ingest_job_status(job_id, JobStatus.COMPLETED)
        
        logging.info(f"Ingestion job {job_id} completed. Processed {len(processed_docs)} documents.")
        
    except Exception as e:
        logging.error(f"Error processing ingestion job {job_id}: {e}")
        mongodb_service.update_ingest_job_status(job_id, JobStatus.FAILED, str(e))
