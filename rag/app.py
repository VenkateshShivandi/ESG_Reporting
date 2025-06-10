import flask
import os
import json
import tempfile
import traceback
from werkzeug.utils import secure_filename
from pathlib import Path
from datetime import datetime
import logging
from flask_cors import CORS
import concurrent.futures
from tqdm import tqdm
from run_esg_pipeline import ESGPipeline
from rag.processor import process_uploaded_file
from rag.embedding_service import generate_embeddings
from rag.supabase_storage import store_chunks
from rag.initialize_neo4j import Neo4jGraphInitializer
from rag.er_parallel import EntityRelationshipManager
from rag.llmservice import LLMService

app = flask.Flask(__name__)

# Enable CORS
CORS(app, resources={
    r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

app.config["MAX_CONTENT_LENGTH"] = 100 * 1024 * 1024  # 100MB
app.config["UPLOAD_FOLDER"] = tempfile.gettempdir()
logging.basicConfig(level=logging.INFO)

# ✅ Neo4j: initialize immediately
neo4j_initializer = None
neo4j_driver = None

def init_neo4j():
    global neo4j_initializer, neo4j_driver
    neo4j_initializer = Neo4jGraphInitializer()
    if not Neo4jGraphInitializer.wait_for_neo4j():
        raise Exception("Neo4j not ready")
    neo4j_driver = neo4j_initializer.getNeo4jDriver()
    neo4j_initializer.initializeGraphWithRoot()

init_neo4j()  # ✅ Run on import (also works in Zeabur)

@app.route("/health")
def health():
    return flask.jsonify({"status": "healthy"}), 200

# === rest of your routes (unchanged except one minor fix below) ===

@app.route("/api/v1/add-user", methods=["POST"])
def add_user():
    app.logger.info(f"---------------/api/v1/add-user-----------------")
    try:
        data = flask.request.json
        user_id = data.get("user_id")
        email = data.get("email")
        if not user_id or not email:
            return flask.jsonify({"error": "Missing user_id or email"}), 400

        if not neo4j_initializer:
            return flask.jsonify({"error": "Neo4j not initialized"}), 500

        if neo4j_initializer.userExists(user_id):
            return flask.jsonify({
                "success": True,
                "message": "User already exists",
                "user_id": user_id,
                "email": email
            }), 200

        neo4j_initializer.createUserNode(user_id, email)
        return flask.jsonify({
            "success": True,
            "message": "User created successfully",
            "user_id": user_id,
            "email": email
        }), 201

    except Exception as e:
        app.logger.error(f"Error adding user: {str(e)}")
        app.logger.error(traceback.format_exc())
        return flask.jsonify({"error": str(e)}), 500

# (leave your other routes unchanged here – just keep them after this block)
# ... routes like /process_document, /create-graph, etc.

@app.route("/")
def home():
    return "RAG is up!"

@app.route("/api/v1/query", methods=["POST"])
def query():
    app.logger.info(f"---------------/api/v1/query-----------------")
    data = flask.request.json
    query = data.get("query")
    llm_service = LLMService()
    response = llm_service.handle_query(query)
    return flask.jsonify({"success": True, "response": response}), 200

# (Optional) Do NOT need to re-initialize Neo4j in __main__ anymore
if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    app.run(host="0.0.0.0", port=port)
