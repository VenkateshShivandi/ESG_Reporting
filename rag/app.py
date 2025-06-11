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
neo4j_initializer = None

try:
        logging.info("⏳ Waiting 30s before initializing Neo4j...")
        time.sleep(30)

        neo4j_uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
        neo4j_username = os.getenv("NEO4J_USERNAME", "")
        neo4j_password = os.getenv("NEO4J_PASSWORD", "")

        app.logger.info(f"🔌 Connecting to Neo4j at {neo4j_uri} with no auth")

        from rag.initialize_neo4j import Neo4jGraphInitializer

        neo4j_initializer = Neo4jGraphInitializer(
            uri=neo4j_uri,
            user=neo4j_username or None,
            password=neo4j_password or None,
        )
        globals()["neo4j_initializer"] = neo4j_initializer
        
        if not Neo4jGraphInitializer.wait_for_neo4j(uri=neo4j_uri):
            raise Exception("Neo4j not ready")

        neo4j_driver = neo4j_initializer.getNeo4jDriver()
        neo4j_initializer.initializeGraphWithRoot()

        logging.info("✅ Neo4j initialized.")
except Exception as e:
        logging.warning(f"⚠️ Neo4j init skipped or failed: {str(e)}")


# Enable CORS for all routes
CORS(
    app,
    resources={
        r"/api/*": {
            "origins": [
                "*"
            ],  # Allow requests from Next.js dev server
            "methods": ["GET", "POST", "OPTIONS"],  # Allow these methods
            "allow_headers": ["Content-Type", "Authorization"],  # Allow these headers
        }
    },
)

app.config["MAX_CONTENT_LENGTH"] = 100 * 1024 * 1024  # 100MB max file size
app.config["UPLOAD_FOLDER"] = tempfile.gettempdir()

# Configure basic logging
logging.basicConfig(level=logging.INFO)

# Global Neo4j initializer and driver
neo4j_initializer = None
neo4j_driver = None
def init_neo4j():
    """Initialize Neo4j connection and ensure root node exists."""
    global neo4j_initializer, neo4j_driver
    try:
        neo4j_initializer = Neo4jGraphInitializer()
        globals()["neo4j_initializer"] = neo4j_initializer
        if not Neo4jGraphInitializer.wait_for_neo4j():
            raise Exception("Neo4j not ready")
        neo4j_driver = neo4j_initializer.getNeo4jDriver()
        neo4j_initializer.initializeGraphWithRoot()
    except Exception as e:
        neo4j_initializer = None
        logging.warning(f"Neo4j initialization failed: {e}")


@app.route("/health")
def health():
    """Health check endpoint for Docker."""
    return flask.jsonify({"status": "healthy"}), 200


@app.route("/api/v1/process_document", methods=["POST"])
def process_document_endpoint():
    """
    Accepts file upload, processes it, generates embeddings, stores results
    in Supabase, and returns the document ID.
    """
    app.logger.info(f"---------------/api/v1/process_document-----------------")
    if "file" not in flask.request.files:
        return flask.jsonify({"error": "No file part in the request"}), 400

    file = flask.request.files["file"]
    file_id = flask.request.form.get("file_id")
    if not file_id:
        return flask.jsonify({"error": "No file_id provided"}), 400

    if file.filename == "":
        return flask.jsonify({"error": "No selected file"}), 400

    if not file:
        # This case should theoretically not be reached due to earlier checks
        return flask.jsonify({"error": "Invalid file upload state."}), 400

    filename = secure_filename(file.filename)
    fd, temp_file_path = tempfile.mkstemp(suffix=f"_{filename}")
    logging.info(f"Saving uploaded file temporarily to: {temp_file_path}")

    # document_id = None
    processing_status = "error"  # Default status
    source_type = "unknown"

    try:
        file.save(temp_file_path)
        os.close(fd)

        # 1. Process and Chunk File
        logging.info(f"[{filename}] Processing and chunking file...")
        # The processor determines the source_type internally now
        chunks = process_uploaded_file(temp_file_path)

        if not chunks:
            # Handle case where processing yields no chunks (could be error or empty file)
            logging.warning(
                f"[{filename}] No chunks generated. File might be empty or processing failed internally."
            )
            # Store a document record with status 'processed_empty' or 'error'?
            # For now, let's assume an empty chunk list is not a critical failure for the endpoint itself
            # but we won't proceed to embedding/storage.
            # We need the source_type determined by the processor
            # Let's assume process_uploaded_file could return source_type even if chunks are empty
            # Re-fetching source_type here for simplicity, ideally processor returns it.
            _, ext = os.path.splitext(filename)
            source_type = ext.lower().strip(".") if ext else "unknown"
            # Store a basic record indicating processing attempt?
            return (
                flask.jsonify(
                    {
                        "success": True,
                        "message": "File processed, but no content chunks generated.",
                        "filename": filename,
                        "document_id": file_id,
                        "chunk_count": 0,
                    }
                ),
                200,
            )  # Return 200 OK, but indicate no chunks

        # Extract source_type from the first chunk (assuming all chunks have the same type)
        source_type = chunks[0].get("source_type", "unknown")
        logging.info(
            f"[{filename}] File processing complete. Found {len(chunks)} chunks. Source type: {source_type}"
        )

        # 2. Generate Embeddings
        logging.info(f"[{filename}] Generating embeddings for {len(chunks)} chunks...")
        chunk_texts = [chunk.get("text", "") for chunk in chunks]
        embeddings = generate_embeddings(chunk_texts)

        if not embeddings or len(embeddings) != len(chunks):
            logging.error(
                f"[{filename}] Embedding generation failed or returned incorrect number of vectors."
            )
            # Store document record with error status before failing
            # store_document_record(filename, source_type, status="embedding_error")
            return flask.jsonify({"error": "Embedding generation failed."}), 500

        logging.info(f"[{filename}] Embeddings generated successfully.")

        # 3. Update Document Status in Supabase
        logging.info(f"{filename} Using existing document ID: {file_id}")
        # update_document_status(file_id, "processing")
        # update_document_status(file_id, "processed")

        logging.info(f"[{filename}] Document record stored. ID: {file_id}")

        # 4. Store Chunks and Embeddings in Supabase
        logging.info(
            f"[{filename}] Storing {len(chunks)} chunks and embeddings for document ID: {file_id}..."
        )
        chunks_stored_successfully = store_chunks(file_id, chunks, embeddings)

        if not chunks_stored_successfully:
            logging.error(
                f"[{filename}] Failed to store chunks/embeddings in Supabase for document ID: {file_id}"
            )
            # Update document status to indicate partial failure?
            # For now, return error
            # TODO: Consider updating document status to 'chunk_storage_error'
            return (
                flask.jsonify({"error": "Failed to save chunk data to database."}),
                500,
            )

        # processing_status = "completed"  # Final success status
        logging.info(
            f"[{filename}] Successfully processed, embedded, and stored document. ID: {file_id}"
        )
        # 5. Extract Entities and Relationships
        try:
            # Initialize the EntityRelationshipManager
            er_manager = EntityRelationshipManager(model_name="gpt-4o-mini")
            # Process the chunks in parallel
            entities, relationships = er_manager.process_document(
                file_id, chunks, embeddings
            )
            # Store the entities and relationships in the database
            er_manager.store_results(file_id, entities, relationships)
            logging.info(
                f"[{filename}] Successfully extracted entities and relationships and stored in the supabase"
            )

        except Exception as e:
            logging.exception(f"[{filename}] Critical error during processing: {e}")
            return (
                flask.jsonify({"error": f"An unexpected error occurred: {str(e)}"}),
                500,
            )

        # 6. Return Success Response
        return (
            flask.jsonify(
                {
                    "success": True,
                    "message": "File processed and stored successfully.",
                    "filename": filename,
                    "document_id": file_id,
                    "chunk_count": len(chunks),
                }
            ),
            200,
        )

    except Exception as e:
        logging.exception(f"[{filename}] Critical error during processing: {e}")
        # Attempt to store/update document record with error status if possible
        if file_id:
            # TODO: Implement update_document_status function if needed
            pass
        elif source_type != "unknown":  # Store basic error record if we know the type
            # store_document_record(filename, source_type, status="processing_error")
            pass

        return flask.jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500
    finally:
        # Ensure the temporary file is deleted
        if os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
                logging.info(f"Removed temporary file: {temp_file_path}")
            except OSError as e:
                logging.error(f"Error removing temporary file {temp_file_path}: {e}")


@app.route("/api/v1/create-graph", methods=["POST"])
def create_graph():
    """Create a graph from a file.

    Accepts multipart/form-data with a file field named 'file'

    Returns:
        JSON response with processing results and graph data
    """
    app.logger.info(f"---------------/api/v1/create-graph-----------------")
    # get the entities and relationships from the request
    data = flask.request.json
    entities = data.get("entities")
    relationships = data.get("relationships")
    user_id = data.get("user_id")

    if not user_id:
            return flask.jsonify({"error": "Missing user_id"}), 400

    if not neo4j_initializer:
            return flask.jsonify({"error": "Neo4j not initialized"}), 503


    # 1. check if the user has already created a subgraph, if yes, delete/detach it first before creating a new one
    if neo4j_initializer.userExists(user_id):
        # delete the subgraph, if it exists
        neo4j_initializer.deleteSubgraph(user_id)

        # 2. create the subgraph using GDS and return the projection name
        subgraph_projection = neo4j_initializer.createSubgraph(
            entities, relationships, user_id
        )
        # 3. Run community detection and insights on the subgraph using the graph projection
        neo4j_initializer.runCommunityDetection(
            projection_name=subgraph_projection,
            algorithm="louvain",
            min_community_size=3,
        )
        # 4. return the subgraph id
        return (
            flask.jsonify(
                {
                    "success": True,
                    "message": "Graph created successfully",
                    "subgraph_id": subgraph_projection,
                }
            ),
            200,
        )
    else:
        # provide a message to the user that the user does not exist
        return flask.jsonify({"error": "User does not exist"}), 400


@app.route("/api/v1/process-file", methods=["POST"])
def process_file():
    """Process a file through the ESG pipeline and create a graph from it.

    Accepts multipart/form-data with a file field named 'file'

    Returns:
        JSON response with processing results and graph data
    """
    app.logger.info(f"---------------/api/v1/process-file-----------------")
    if "file" not in flask.request.files:
        return flask.jsonify({"error": "No file provided"}), 400

    file = flask.request.files["file"]
    if file.filename == "":
        return flask.jsonify({"error": "No file selected"}), 400

    # Parameters from request
    output_dir = flask.request.form.get("output_dir", "pipeline_output")
    chunk_size = int(flask.request.form.get("chunk_size", 600))
    chunk_overlap = int(flask.request.form.get("chunk_overlap", 200))
    max_chunks = int(flask.request.form.get("max_chunks", 0))
    neo4j_uri = flask.request.form.get("neo4j_uri", os.getenv("NEO4J_URI"))
    neo4j_username = flask.request.form.get(
        "neo4j_username", os.getenv("NEO4J_USERNAME")
    )
    neo4j_password = flask.request.form.get(
        "neo4j_password", os.getenv("NEO4J_PASSWORD")
    )
    neo4j_database = flask.request.form.get("neo4j_database", "neo4j")
    # Create timestamp for unique directory
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_stem = Path(secure_filename(file.filename)).stem
    unique_output_dir = f"{output_dir}/{file_stem}_{timestamp}"

    temp_file_path = None  # Initialize path variable
    try:
        # Save uploaded file to temp directory defined by UPLOAD_FOLDER
        # Ensure the directory exists
        upload_folder = app.config["UPLOAD_FOLDER"]
        if not os.path.exists(upload_folder):
            os.makedirs(upload_folder)
        temp_file_path = os.path.join(upload_folder, secure_filename(file.filename))
        file.save(temp_file_path)

        # Initialize and run the pipeline
        pipeline = ESGPipeline(
            input_path=temp_file_path,
            output_dir=unique_output_dir,
            neo4j_uri=neo4j_uri,
            neo4j_username=neo4j_username,
            neo4j_password=neo4j_password,
            neo4j_database=neo4j_database,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            max_chunks=max_chunks,
        )

        # Run the pipeline
        results = pipeline.run()

        # Load community insights if available
        community_insights_path = os.path.join(
            unique_output_dir, "graph", "community_insights.json"
        )
        community_insights = []
        if os.path.exists(community_insights_path):
            with open(community_insights_path, "r") as f:
                community_insights = json.load(f)

        return flask.jsonify(
            {
                "success": True,
                "message": f"File processed successfully: {file.filename}",
                "results": results,
                "community_insights": community_insights,
                "output_directory": unique_output_dir,
            }
        )

    except Exception as e:
        # Log the error with traceback
        app.logger.error(f"Error processing file: {str(e)}")
        app.logger.error(traceback.format_exc())

        return (
            flask.jsonify(
                {
                    "success": False,
                    "error": str(e),
                    "message": f"Failed to process file: {file.filename}",
                }
            ),
            500,
        )
    finally:
        # Clean up the temporary file if it exists
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except OSError as e:
                app.logger.error(f"Error removing temp file {temp_file_path}: {e}")


@app.route("/api/v1/community-insights", methods=["GET"])
def get_community_insights():
    """Get community insights from a processed file.

    Query parameters:
        output_dir: Directory containing the processed file results

    Returns:
        JSON response with community insights
    """
    app.logger.info(f"---------------/api/v1/community-insights-----------------")
    output_dir = flask.request.args.get("output_dir")
    if not output_dir:
        return flask.jsonify({"error": "No output_dir provided"}), 400

    community_insights_path = os.path.join(
        output_dir, "graph", "community_insights.json"
    )

    if not os.path.exists(community_insights_path):
        return (
            flask.jsonify(
                {"error": f"No community insights found at {community_insights_path}"}
            ),
            404,
        )

    try:
        with open(community_insights_path, "r") as f:
            community_insights = json.load(f)

        return flask.jsonify(
            {"success": True, "community_insights": community_insights}
        )

    except Exception as e:
        return flask.jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/v1/debug/neo4j", methods=["GET"])
def debug_neo4j():
    if not neo4j_initializer:
        return {"status": "not initialized"}, 500
    try:
        with neo4j_initializer.driver.session() as session:
            result = session.run("RETURN 1 AS check")
            return {"status": "connected", "result": result.single()["check"]}, 200
    except Exception as e:
        return {"status": "error", "message": str(e)}, 500


@app.route("/api/v1/add-user", methods=["POST"])
def add_user():
    """Add a user to the graph database.
    If the user already exists, do nothing.

    Accepts JSON body with user_id and email fields.
    """
    app.logger.info(f"---------------/api/v1/add-user-----------------")
    try:
        data = flask.request.json
        user_id = data.get("user_id")
        email = data.get("email")

        if not user_id or not email:
            return flask.jsonify({"error": "Missing user_id or email"}), 400
        if not neo4j_initializer:
            return flask.jsonify({"error": "Neo4j not initialized"}), 503

        # Use global Neo4j initializer
        if neo4j_initializer.userExists(user_id):
            return (
                flask.jsonify(
                    {
                        "success": True,
                        "message": "User already exists",
                        "user_id": user_id,
                        "email": email,
                    }
                ),
                200,
            )

        # Create new user node using existing connection
        neo4j_initializer.createUserNode(user_id, email)
        return (
            flask.jsonify(
                {
                    "success": True,
                    "message": "User created successfully",
                    "user_id": user_id,
                    "email": email,
                }
            ),
            201,
        )
    except Exception as e:
        app.logger.error(f"Error adding user: {str(e)}")
        app.logger.error(traceback.format_exc())
        return flask.jsonify({"error": str(e)}), 500


@app.route("/api/v1/delete-user", methods=["POST"])
def delete_user():
    """Delete a user from the graph database.

    Accepts JSON body with user_id field.
    """
    app.logger.info(f"---------------/api/v1/delete-user-----------------")
    try:
        data = flask.request.json
        user_id = data.get("user_id")

        if not user_id:
            return flask.jsonify({"error": "Missing user_id"}), 400

        # TODO: Delete user from the graph database
        neo4j_initializer.deleteUserNode(user_id)
        return flask.jsonify({"success": True, "user_id": user_id}), 200
    except Exception as e:
        return flask.jsonify({"error": str(e)}), 500


@app.route("/api/v1/delete-org", methods=["POST"])
def delete_org():
    """Delete an organization from the graph database.

    Accepts JSON body with org_id field.
    """
    app.logger.info(f"---------------/api/v1/delete-org-----------------")
    try:
        data = flask.request.json
        org_id = data.get("org_id")

        if not org_id:
            return flask.jsonify({"error": "Missing org_id"}), 400

        # TODO: Delete organization from the graph database
        neo4j_initializer.deleteOrgNode(org_id)
        return flask.jsonify({"success": True, "org_id": org_id}), 200
    except Exception as e:
        return flask.jsonify({"error": str(e)}), 500


@app.route("/api/v1/delete-graph-entity", methods=["POST"])
def delete_graph_entity():
    """
    Delete an entity and its related subgraph from Neo4j.
    Expects JSON: { "user_id": "...", "document_id": "..." }

    Either deletes:
    1. All entities related to a user (if only user_id provided)
    2. Specific entities related to a document (if document_id provided)
    """
    app.logger.info(f"---------------/api/v1/delete-graph-entity-----------------")
    data = flask.request.json
    user_id = data.get("user_id")
    document_id = data.get("document_id")

    if not user_id:
        return flask.jsonify({"error": "Missing user_id"}), 400

    try:
        if document_id:
            # Find and delete only entities related to this document
            # This requires a new method to delete entities by document_id
            app.logger.info(f"Deleting graph entities for document: {document_id}")
            with neo4j_initializer.driver.session() as session:
                # Delete all entities with matching document_id
                session.run(
                    """
                    MATCH (e:Entity {document_id: $document_id})
                    DETACH DELETE e
                    """,
                    {"document_id": document_id},
                )
                app.logger.info(
                    f"Successfully deleted entities for document: {document_id}"
                )
            return flask.jsonify({"success": True, "document_id": document_id}), 200
        else:
            # Delete entire subgraph for user
            app.logger.info(f"Deleting entire subgraph for user: {user_id}")
            neo4j_initializer.deleteSubgraph(user_id)
            app.logger.info(f"Successfully deleted subgraph for user: {user_id}")
            return flask.jsonify({"success": True, "user_id": user_id}), 200
    except Exception as e:
        app.logger.error(f"Error deleting graph entity: {str(e)}")
        return flask.jsonify({"error": str(e)}), 500
    
@app.get("/neo4j/ping")
def ping_neo4j():
    from graph_store import Neo4jGraphStore
    store = Neo4jGraphStore()
    if store.connect():
        ok = store.ping()
        store.close()
        return {"neo4j_status": "connected" if ok else "ping failed"}
    return {"neo4j_status": "failed to connect"}

@app.route("/api/v1/generate-report", methods=["POST"])
def generate_report():
    """
    Generate a report for a specific user, given the attached document ids for the platform.
    """
    app.logger.info(f"---------------/api/v1/generate-report-----------------")
    try:
        data = json.loads(flask.request.json)
        document_ids = data.get("document_ids")
        report_type = data.get("report_type")
        custom_prompt = data.get("prompt")
        llm_service = LLMService()
        report_name, report_url = llm_service.generate_report(document_ids, report_type, custom_prompt)
        return flask.jsonify({"success": True, "report_name": report_name, "report_url": report_url}), 200
    except Exception as e:
        app.logger.error(f"Error generating report: {str(e)}")
        return flask.jsonify({"error": str(e)}), 500

@app.route("/")
def home():
    return "RAG is up!"
@app.route("/api/v1/query", methods=["POST"])
def query():
    """
    Query the graph database.
    """
    app.logger.info(f"---------------/api/v1/query-----------------")
    data = flask.request.json
    query = data.get("query")
    # user_id = data.get("user_id")
    llm_service = LLMService()
    response = llm_service.handle_query(query)
    return flask.jsonify({"success": True, "response": response}), 200

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    app.run(host="0.0.0.0", port=port)
