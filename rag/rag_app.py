"""
Flask application for the RAG (Retrieval-Augmented Generation) microservice.

This service exposes endpoints for chunking documents, generating embeddings,
and performing semantic queries over the embedded data.
It is designed to be called by the main backend application.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import tempfile
import logging
from .chunking import process_document
from .rag_service import embed_texts, add_embeddings, query

app = Flask(__name__)
CORS(app)

# Configure logging
log_file = 'rag_app.log'
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler()
    ]
)

@app.route('/rag/chunk', methods=['POST'])
def chunk_file():
    """
    Chunks a document provided either as a file upload or via a local file path.

    Handles multipart/form-data for file uploads and application/json for paths.
    Uses a temporary file for uploaded content.

    Args:
        request: The Flask request object.
                 - If multipart/form-data: Expects a file part named 'file'.
                 - If application/json: Expects JSON body with 'file_path' key.
                   Optional 'chunk_size' and 'chunk_overlap' can be provided.

    Returns:
        JSON response:
        - Success (200): {"chunks": [list of chunk dictionaries]}
        - Error (400/500): {"error": "error message"}
    """
    tmp_path = None
    try:
        app.logger.info(f"📞 RAG Call - chunk_file: Request Headers: {request.headers}")
        # Handle file upload
        if 'file' in request.files:
            file = request.files['file']
            if file.filename == '':
                 app.logger.error("❌ Received file upload part but no file selected")
                 return jsonify({'error': 'No selected file'}), 400
                 
            suffix = os.path.splitext(file.filename)[1]
            # Use with statement for safe temp file handling
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                file.save(tmp)
                tmp_path = tmp.name # Store path for processing
            
            app.logger.info(f"📄 Saved uploaded file to temp path: {tmp_path}")
            chunks = process_document(tmp_path)
            # Deletion now happens in finally block

        # Handle JSON with file_path (check content type)
        elif request.is_json:
            data = request.get_json() or {}
            app.logger.info(f"📄 Received JSON payload: {data}")
            file_path = data.get('file_path')
            if not file_path:
                app.logger.error("❌ Missing 'file_path' in JSON request")
                return jsonify({'error': 'file_path required in JSON payload'}), 400
            chunks = process_document(
                file_path,
                chunk_size=data.get('chunk_size'),
                chunk_overlap=data.get('chunk_overlap')
            )
        else:
            # Neither file nor valid JSON provided
            app.logger.error("❌ Request is not file upload or valid JSON")
            return jsonify({'error': 'Request must be file upload or JSON with file_path'}), 400
            
        app.logger.info(f"✅ Successfully chunked document. Returning {len(chunks)} chunks.")
        return jsonify({'chunks': chunks}), 200
    except Exception as e:
        app.logger.error(f"❌ Error in chunk_file: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500
    finally:
        # Ensure temporary file is deleted even if errors occur
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
                app.logger.info(f"🗑️ Deleted temp file: {tmp_path}")
            except Exception as del_e:
                app.logger.error(f"❌ Failed to delete temp file {tmp_path}: {del_e}")

@app.route('/rag/embed', methods=['POST'])
def embed_chunks():
    """
    Generates embeddings for a list of text chunks and adds them to the vector store.

    Args:
        request: The Flask request object. Expects JSON body:
                 {
                   "chunks": [ { "text": "...", "chunk_id": "...", ... }, ... ]
                 }

    Returns:
        JSON response:
        - Success (200): {"embeddings": [list of embedding vectors]}
        - Error (400/500): {"error": "error message"}
    """
    try:
        app.logger.info(f"📞 RAG Call - embed_chunks: Request Headers: {request.headers}")
        data = request.get_json() or {}
        app.logger.info(f"🔡 Received {len(data.get('chunks', []))} chunks for embedding.")
        chunks = data.get('chunks')
        if not isinstance(chunks, list):
            app.logger.error("❌ Invalid payload: 'chunks' must be a list.")
            return jsonify({'error': 'chunks list is required'}), 400
        texts = [c.get('text', '') for c in chunks]
        embeddings = embed_texts(texts)
        add_embeddings(chunks, embeddings)
        app.logger.info(f"✅ Successfully embedded {len(chunks)} chunks. Returning {len(embeddings)} embeddings.")
        return jsonify({'embeddings': embeddings}), 200
    except Exception as e:
        app.logger.error(f"❌ Error in embed_chunks: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/rag/query', methods=['POST'])
def query_rag():
    """
    Performs a semantic search query against the embedded chunks.

    Args:
        request: The Flask request object. Expects JSON body:
                 {
                   "query": "The user's search query text",
                   "top_k": 5  (Optional, defaults to 5)
                 }

    Returns:
        JSON response:
        - Success (200): {"results": [list of matching chunk dictionaries with scores]}
        - Error (400/500): {"error": "error message"}
    """
    try:
        app.logger.info(f"📞 RAG Call - query_rag: Request Headers: {request.headers}")
        data = request.get_json() or {}
        app.logger.info(f"❓ Received query: '{data.get('query')}' with top_k={data.get('top_k', 5)}")
        query_text = data.get('query')
        top_k = data.get('top_k', 5)
        if not query_text:
            app.logger.error("❌ Missing 'query' text in request.")
            return jsonify({'error': 'query text is required'}), 400
        results = query(query_text, top_k)
        app.logger.info(f"✅ Query successful. Returning {len(results)} results.")
        return jsonify({'results': results}), 200
    except Exception as e:
        app.logger.error(f"❌ Error in query_rag: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

if __name__ == "__main__":
    # Entry point for running the Flask development server
    app.logger.info("🚀 Starting RAG service on port 8000...")
    app.run(host="0.0.0.0", port=8000) 