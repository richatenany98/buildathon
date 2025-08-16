import os
import logging
from flask import Flask, render_template, request, jsonify
from werkzeug.middleware.proxy_fix import ProxyFix
from config import Config
from services.neo4j_service import Neo4jService
from services.mongodb_service import MongoDBService
from services.nlp_service import NLPService

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Create Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key-change-in-production")
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# Load configuration
app.config.from_object(Config)

# Initialize services
neo4j_service = Neo4jService(
    uri=app.config['NEO4J_URI'],
    username=app.config['NEO4J_USERNAME'], 
    password=app.config['NEO4J_PASSWORD']
)
mongodb_service = MongoDBService(app.config['MONGODB_URI'])
nlp_service = NLPService()

# Register blueprints
from api.ingestion import ingestion_bp
from api.graph import graph_bp
from api.qa import qa_bp

app.register_blueprint(ingestion_bp, url_prefix='/api')
app.register_blueprint(graph_bp, url_prefix='/api')
app.register_blueprint(qa_bp, url_prefix='/api')

# Make services available to blueprints
app.neo4j_service = neo4j_service
app.mongodb_service = mongodb_service
app.nlp_service = nlp_service

@app.route('/')
def index():
    """Main application interface"""
    return render_template('index.html')

@app.route('/health')
def health():
    """Health check endpoint"""
    try:
        # Test Neo4j connection
        neo4j_service.verify_connection()
        
        # Test MongoDB connection
        mongodb_service.get_database().command('ping')
        
        return jsonify({
            'status': 'healthy',
            'neo4j': 'connected',
            'mongodb': 'connected'
        })
    except Exception as e:
        logging.error(f"Health check failed: {e}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
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
