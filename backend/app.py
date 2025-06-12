from flask import (
    Flask,
    render_template,
    request,
    jsonify,
    send_from_directory,
    send_file,
)
import os
import traceback
import io
from dotenv import load_dotenv
from security import require_auth, require_role
from flask_cors import CORS, cross_origin
import uuid
from werkzeug.utils import secure_filename
from datetime import datetime, timedelta
from supabase import create_client, Client
from openai import OpenAI
import time
import redis
from etl_docx.chunking import semantic_chunk_text
import json
import tempfile
import hashlib
import tempfile
import requests
from pathlib import Path
from pathlib import Path

# Load environment variables
# load_dotenv(".env.local")
if os.getenv("ZEA_ENV") != "production":
    load_dotenv(".env.local")

# Get Supabase credentials
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
OPENAI_ASSISTANT_ID = os.getenv("OPENAI_ASSISTANT_ID")
OPENAI_ASSISTANT_ID_2 = os.getenv("OPENAI_ASSISTANT_ID_2")
REDIS_URL = os.getenv("REDIS_URL")
# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Verify they exist
if not SUPABASE_URL or not SUPABASE_ANON_KEY or not SUPABASE_SERVICE_ROLE_KEY:
    raise ValueError("Missing Supabase credentials. Please check your .env file.")

# Initialize Flask app
app = Flask(__name__)
CORS(
    app,
    resources={
        r"/api/*": {
            "origins": ["http://localhost:3000", "http://127.0.0.1:3000"],
            "methods": ["GET", "POST", "DELETE", "PUT"],
            "allow_headers": ["*"],
        }
    },
)

# Configure logging
if not app.debug:
    import logging
    from logging.handlers import RotatingFileHandler

    # Ensure log directory exists
    os.makedirs("logs", exist_ok=True)

    # Use RotatingFileHandler which handles file rotation automatically
    log_file = "logs/app.log"
    file_handler = RotatingFileHandler(
        log_file,
        maxBytes=10485760,  # 10MB max file size
        backupCount=3,  # Keep 3 backup files
    )
    file_handler.setFormatter(
        logging.Formatter(
            "%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]"
        )
    )
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)
    app.logger.setLevel(logging.INFO)
    app.logger.info("ESG Reporting API startup")

# Configure upload folder
UPLOAD_FOLDER = "uploads"
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
    app.logger.info(f"Upload folder: {UPLOAD_FOLDER}")
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# Add these constants after UPLOAD_FOLDER configuration
CHUNKS_DIR = os.path.join(UPLOAD_FOLDER, "chunks")
if not os.path.exists(CHUNKS_DIR):
    os.makedirs(CHUNKS_DIR)
    app.logger.info(f"Chunks folder: {CHUNKS_DIR}")

# Initialize Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)


@app.route("/")
def home():
    """Render the home page."""
    return render_template("index.html")


@app.route("/api/status")
def status():
    """Public endpoint to check API status."""
    return jsonify({"status": "operational", "api_version": "1.0.0"})


@app.route("/api/profile")
@require_auth
def user_profile():
    """Get the authenticated user's profile information."""
    # User data is added to request by the require_auth decorator

    return jsonify(
        {
            "id": request.user["id"],
            "email": request.user["email"],
            "role": request.user["role"],
            "provider": request.user.get("app_metadata", {}).get("provider", "email"),
        }
    )


@app.route("/api/esg-data")
@require_auth
def get_esg_data():
    """Get ESG data for the authenticated user's organization."""
    # In a real implementation, you would query your Supabase database here
    # Supabase RLS will automatically filter data based on the user's permissions

    # Mocked response for demonstration
    return jsonify(
        {
            "esg_metrics": [
                {
                    "id": "1",
                    "category": "Environment",
                    "name": "Carbon Emissions",
                    "value": 25.4,
                    "unit": "tons",
                    "year": 2023,
                    "quarter": "Q1",
                },
                {
                    "id": "2",
                    "category": "Social",
                    "name": "Employee Diversity",
                    "value": 78.3,
                    "unit": "percent",
                    "year": 2023,
                    "quarter": "Q1",
                },
            ]
        }
    )


@app.route("/api/admin/users")
@require_auth
@require_role(["admin"])
def get_all_users():
    """Admin endpoint to get all users (requires admin role)."""
    # In a real implementation, you would query your Supabase database
    # This is protected by the require_role decorator to ensure only admins can access

    return jsonify(
        {"message": "This endpoint is protected and only accessible to admins"}
    )


@app.route("/api/list-tree", methods=["GET"])
@require_auth
def list_tree():
    try:
        path = request.args.get("path", "")
        app.logger.info(f"📞 API Call - list_tree: Requested path={path}")

        # Get file list from Supabase storage
        storage_response = supabase.storage.from_("documents").list(path=path)

        # Create a mapping of file paths to their document records
        doc_map = {}
        try:
            # Get documents data from esg_data.documents table
            db_result = (
                supabase.postgrest.schema("esg_data")
                .table("documents")
                .select("*")
                .execute()
            )

            app.logger.info(f"Retrieved {len(db_result.data)} documents from database")

            if db_result.data:
                for doc in db_result.data:
                    file_path = doc.get("file_path", "")
                    # Convert file_path string to array and handle empty path
                    path_array = file_path.split("/") if file_path else []
                    # Remove the filename from path_array as it will be the name field
                    file_name = (
                        path_array.pop() if path_array else doc.get("file_name", "")
                    )

                    # Store both the document and its processed path information
                    doc_map[file_name] = {
                        "doc": doc,
                        "path_array": path_array,
                        "file_name": file_name,
                    }

                    # Log the chunked status for debugging
                    app.logger.debug(
                        f"Document {file_name} chunked status: {doc.get('chunked', False)}"
                    )
        except Exception as db_error:
            app.logger.warning(f"⚠️ Could not fetch document metadata: {str(db_error)}")
            # Continue without document metadata

        # Process the returned data
        files = []
        current_path_array = path.split("/") if path else []

        for item in storage_response:
            # Skip the .folder placeholder files
            if item["name"] == ".folder":
                continue

            if item["id"] is None:
                # Folder
                files.append(
                    {
                        "id": None,
                        "name": item["name"],
                        "type": "folder",
                        "size": 0,
                        "modified": item.get("last_accessed_at"),
                        "path": current_path_array,
                        "created_at": item.get("created_at"),
                        "updated_at": item.get("updated_at"),
                        "chunked": False,  # Folders are never chunked
                    }
                )
            else:
                # File - check if we have a corresponding document record
                doc_info = doc_map.get(item["name"], {})
                doc_record = doc_info.get("doc", {})
                doc_path_array = doc_info.get("path_array", [])

                # Only include files that are in the current directory
                if not doc_path_array or doc_path_array == current_path_array:
                    metadata = item.get("metadata", {}) or {}

                    # Explicitly check for chunked status and log it
                    chunked_status = False
                    if doc_record and "chunked" in doc_record:
                        chunked_status = bool(doc_record.get("chunked"))

                    files.append(
                        {
                            "id": doc_record.get("id", item["id"]),
                            "name": item["name"],
                            "type": doc_record.get("file_type", "file"),
                            "size": doc_record.get(
                                "file_size", metadata.get("size", 0)
                            ),
                            "modified": doc_record.get(
                                "updated_at", item.get("last_accessed_at")
                            ),
                            "path": current_path_array,
                            "created_at": item.get("created_at"),
                            "updated_at": doc_record.get(
                                "updated_at", item.get("updated_at")
                            ),
                            "chunked": chunked_status,
                        }
                    )

        app.logger.info(f"📥 API Response: Found {len(files)} items")
        return jsonify(files), 200
    except Exception as e:
        app.logger.error(f"❌ API Error in list_tree: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/list-reports", methods=["GET"])
@require_auth
def list_reports():
    try:
        storage_response = supabase.storage.from_("reports").list()

        # Filter for valid report objects
        # A valid report should have an 'id' (not None) and 'metadata' (not None)
        # and its name should not be the folder name itself if it appears as an item.
        valid_reports = [
            item
            for item in storage_response
            if item.get("id") is not None
            and item.get("metadata") is not None
            and item.get("name")
            != "reports"  # Explicitly filter out an entry named "reports"
        ]

        return jsonify(valid_reports), 200
    except Exception as e:
        app.logger.error(f"❌ API Error in list_reports: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/view-report", methods=["GET"])
@require_auth
def view_report():
    try:
        report_name = request.args.get("report_name")
        if not report_name:
            return jsonify({"error": "report_name parameter is required"}), 400

        # Fetches the report from Supabase storage
        # The 'download' method returns the file's content as bytes
        response_data = supabase.storage.from_("reports").download(report_name)

        # Decode the bytes to a string (assuming UTF-8 encoding for text reports)
        report_content = response_data.decode("utf-8")

        return jsonify({"content": report_content}), 200
    except Exception as e:
        # Log the specific error for better debugging
        app.logger.error(f"❌ API Error in view_report for '{report_name}': {str(e)}")
        # Check if it's a Supabase storage error (e.g., file not found)
        if "NotFound" in str(e) or "FileNotFoundError" in str(
            e
        ):  # A bit simplistic, Supabase might have specific error types/codes
            return jsonify({"error": f"Report '{report_name}' not found."}), 404
        return jsonify({"error": "An error occurred while retrieving the report."}), 500


@app.route("/api/download-report", methods=["GET"])
@require_auth
def download_report():
    try:
        report_name = request.args.get("report_name")
        response = supabase.storage.from_("reports").download(report_name)
        return send_file(response, as_attachment=True), 200
    except Exception as e:
        app.logger.error(f"❌ API Error in download_report: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/upload-file", methods=["POST"])
@require_auth
def upload_file():
    """Upload a file to a specific path."""
    try:
        app.logger.info("📞 API Call - upload_file")
        if "file" not in request.files:
            return jsonify({"error": "No file part"}), 400

        file = request.files["file"]
        path = request.form.get("path", "")

        if file.filename == "":
            return jsonify({"error": "No selected file"}), 400

        # Use the original filename, just make it secure
        filename = secure_filename(file.filename)

        # Get file size from request headers or calculate it
        file_size = request.content_length
        if not file_size or file_size == 0:
            # If content_length is not in headers, calculate from file
            file.seek(0, 2)  # Seek to end of file
            file_size = file.tell()  # Get current position (file size)
            file.seek(0)  # Reset to beginning of file

        # Read the file data
        file_data = file.read()

        # Upload to Supabase with original filename
        file_path = os.path.join(path, filename) if path else filename
        response = supabase.storage.from_("documents").upload(
            file_path, file_data, file_options={"contentType": file.content_type}
        )

        file_type = str(file.content_type)  # Ensure it's text type
        uploaded_at = (
            datetime.now().replace(tzinfo=None).isoformat()
        )  # Remove timezone info

        response = (
            supabase.postgrest.schema("public")
            .rpc(
                "manage_document_metadata",
                {
                    "p_action": "create",
                    "p_user_id": request.user["id"],
                    "p_file_name": filename,
                    "p_file_type": file_type,
                    "p_uploaded_at": uploaded_at,
                    "p_size": str(file_size),
                    "p_file_path": file_path,
                },
            )
            .execute()
        )

        app.logger.info(f"📥 API Response: {response}")

        # Return the file path as the ID since Supabase storage doesn't return an ID
        return (
            jsonify(
                {
                    "fileId": file_path,
                    "name": filename,
                    "path": path.split("/") if path else [],
                }
            ),
            200,
        )
    except Exception as e:
        # Reverted error logging and response
        app.logger.error(f"❌ API Error in upload_file: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/process-file", methods=["POST"])
@require_auth
def process_file():
    """Triggers RAG processing for a file already in Supabase storage."""
    try:
        data = request.get_json()
        storage_path = data.get("storage_path")

        if not storage_path:
            return jsonify({"error": "Missing storage_path in request body"}), 400

        app.logger.info(
            f"📞 API Call - process_file: Processing file at Supabase path '{storage_path}'"
        )
        try:
            # Get the file ID from the documents table
            response = (
                supabase.postgrest.schema("esg_data")
                .table("documents")
                .select("id")
                .eq("file_path", storage_path)
                .execute()
            )
            if not response.data:
                return jsonify({"error": "File not found in Supabase"}), 404

            file_id = response.data[0]["id"]
            app.logger.info(f"📄 File ID: {file_id}")
        except Exception as e:
            app.logger.error(f"❌ Error getting file ID: {str(e)}")
            return jsonify({"error": "Failed to get file ID"}), 500

        # 1. Download the file from Supabase storage
        app.logger.info(f"⬇️ Downloading file from Supabase: {storage_path}")
        try:
            # Download file data
            download_response = supabase.storage.from_("documents").download(
                storage_path
            )
            file_data = download_response
            filename = os.path.basename(storage_path)
            content_type = "application/octet-stream"
            ext = filename.split(".")[-1].lower() if "." in filename else ""
            if ext == "pdf":
                content_type = "application/pdf"
            elif ext == "xlsx":
                content_type = (
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                )
            elif ext == "csv":
                content_type = "text/csv"
            elif ext == "docx":
                content_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            elif ext == "txt":
                content_type = "text/plain"

            app.logger.info(
                f"✅ Downloaded {len(file_data)} bytes for {filename} (Type: {content_type})"
            )

        except Exception as download_error:
            app.logger.error(
                f"❌ Failed to download file from Supabase storage '{storage_path}': {str(download_error)}"
            )
            if "not found" in str(download_error).lower():
                return (
                    jsonify(
                        {"error": f"File not found in storage at path: {storage_path}"}
                    ),
                    404,
                )
            else:
                return (
                    jsonify(
                        {
                            "error": f"Error downloading file from storage: {str(download_error)}"
                        }
                    ),
                    500,
                )

        # 2. Call RAG Service process_document endpoint
        rag_error = None
        try:
            app.logger.info(f"🚀 Calling RAG service for: {filename}")
            rag_url = "http://localhost:8000/api/v1/process_document"

            # Send file, user_id, and file_id in the request
            files_payload = {"file": (filename, file_data, content_type)}
            form_data = {"file_id": file_id}
            # Call with both files and form data
            rag_response = requests.post(
                rag_url,
                files=files_payload,  # Include both user_id and file_id
                data=form_data,
            )

            app.logger.info(
                f"📊 RAG Service Response Status: {rag_response.status_code}"
            )
            if rag_response.ok:
                rag_result = rag_response.json()
                app.logger.info(f"📄 RAG Service Response JSON: {rag_result}")
                if rag_result.get("success"):
                    app.logger.info(
                        f"✅ RAG processing successful via process_file for {filename}..."
                    )
                    # Update the document record with the RAG result
                    response = (
                        supabase.postgrest.schema("esg_data")
                        .table("documents")
                        .update({"chunked": True})
                        .eq("id", file_id)
                        .execute()
                    )
                    return (
                        jsonify(
                            {
                                "success": True,
                                "message": rag_result.get(
                                    "message", "Processing completed."
                                ),
                                "chunk_count": rag_result.get("chunk_count"),
                                "filename": filename,
                            }
                        ),
                        200,
                    )
                else:
                    rag_error = rag_result.get(
                        "message", "RAG processing failed internally."
                    )
            else:
                rag_error = f"RAG service returned status {rag_response.status_code}..."

        except requests.exceptions.RequestException as rag_e:
            rag_error = f"Could not connect to RAG service: {str(rag_e)}"
        except Exception as rag_e:
            rag_error = f"Unexpected error during RAG call: {str(rag_e)}"
            app.logger.exception(f"❌ Unexpected error during RAG call...")

        # Reverted error response
        app.logger.error(f"❌ RAG processing failed for {filename}: {rag_error}")
        return jsonify({"error": rag_error, "success": False}), 500

    except Exception as e:
        # Reverted outer error response
        app.logger.error(f"❌ API Error in process_file (outer try): {str(e)}")
        return (
            jsonify(
                {"error": f"Failed to process file request: {str(e)}", "success": False}
            ),
            500,
        )


@app.route("/api/create-folder", methods=["POST"])
@require_auth
def create_folder():
    """Create a new folder."""
    try:
        data = request.json
        name = data.get("name")
        path = data.get("path", "")

        app.logger.info(f"📞 API Call - create_folder: {name} in {path}")

        # Handle path - use path as-is since frontend sends it with proper separator
        # Windows uses backslashes, but we need to handle paths consistently with forward slashes
        folder_path = f"{path}/{name}" if path else name

        # Create a placeholder file path for the folder marker
        placeholder_path = f"{folder_path}/.folder"

        app.logger.info(
            f"Creating folder with path: {folder_path}, placeholder: {placeholder_path}"
        )

        # Create a placeholder file with minimal content
        response = supabase.storage.from_("documents").upload(
            placeholder_path,
            "folder".encode(),  # Convert string to bytes
            {"contentType": "application/x-directory"},
        )

        # Store folder metadata using RPC
        uploaded_at = (
            datetime.now().replace(tzinfo=None).isoformat()
        )  # Remove timezone info
        metadata_response = (
            supabase.postgrest.schema("public")
            .rpc(
                "manage_document_metadata",
                {
                    "p_action": "create",
                    "p_user_id": request.user["id"],
                    "p_file_name": name,
                    "p_file_type": "folder",  # Special type for folders
                    "p_uploaded_at": uploaded_at,
                    "p_size": "0",  # Folders themselves don't have a size
                    "p_file_path": folder_path,
                },
            )
            .execute()
        )

        app.logger.info(f"📥 API Response - Storage: {response}")
        app.logger.info(f"📥 API Response - Metadata: {metadata_response}")

        return (
            jsonify(
                {
                    "folderId": folder_path,
                    "name": name,
                    "path": path.split("/") if path else [],
                    "type": "folder",
                }
            ),
            200,
        )
    except Exception as e:
        app.logger.error(f"❌ API Error in create_folder: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/files/<file_id>/download", methods=["GET"])
@require_auth
def get_download_url(file_id):
    """Get a download URL for a file."""
    try:
        app.logger.info(f"📞 API Call - get_download_url: {file_id}")

        # Generate signed URL from Supabase
        response = supabase.storage.from_("documents").create_signed_url(file_id, 3600)

        app.logger.info(f"📥 API Response: {response}")
        return jsonify({"url": response["signedURL"]})
    except Exception as e:
        app.logger.error(f"❌ API Error in get_download_url: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/search-files", methods=["GET"])
@require_auth
def search_files():
    """Search for files."""
    try:
        query = request.args.get("query", "")
        file_type = request.args.get("type")
        path = request.args.get("path", "")

        app.logger.info(
            f"📞 API Call - search_files: query='{query}', type='{file_type}', path='{path}'"
        )

        if not query:
            return jsonify([]), 200

        # Fetch all files first (we'll filter them based on the search query)
        response = supabase.storage.from_("documents").list(path=path)

        # Prepare results
        results = []
        matched_files = []

        # First, filter files by name (case-insensitive)
        for item in response:
            if item["name"] == ".folder":
                continue

            # Skip folders if a file type is specified
            if file_type and item["id"] is None:
                continue

            # Only include files that match the query
            if query.lower() in item["name"].lower():
                if item["id"] is None:
                    # Folder
                    results.append(
                        {
                            "id": f"folder_{path}_{item['name']}",  # Generate a pseudo-ID for folders
                            "name": item["name"],
                            "type": "folder",
                            "size": 0,
                            "modified": item.get("last_accessed_at"),
                            "path": path.split("/") if path else [],
                            "metadata": {
                                "mimetype": "folder",
                                "lastModified": None,
                                "contentLength": 0,
                            },
                            "created_at": item.get("created_at"),
                            "updated_at": item.get("updated_at"),
                        }
                    )
                else:
                    # File
                    metadata = item.get("metadata", {}) or {}
                    results.append(
                        {
                            "id": item["id"],
                            "name": item["name"],
                            "type": "file",
                            "size": metadata.get("size", 0),
                            "modified": item.get("last_accessed_at"),
                            "path": path.split("/") if path else [],
                            "metadata": {
                                "mimetype": metadata.get(
                                    "mimetype", "application/octet-stream"
                                ),
                                "lastModified": metadata.get("lastModified"),
                                "contentLength": metadata.get("contentLength"),
                            },
                            "created_at": item.get("created_at"),
                            "updated_at": item.get("updated_at"),
                        }
                    )
                matched_files.append(item["name"])

        # Now search in subfolders if needed (but only if we have fewer than 5 matches so far)
        if len(results) < 5 and not file_type:
            folders = [
                item
                for item in response
                if item["id"] is None and item["name"] != ".folder"
            ]

            for folder in folders:
                if (
                    len(results) >= 10
                ):  # Limit total results to avoid too much recursion
                    break

                folder_path = f"{path}/{folder['name']}" if path else folder["name"]

                try:
                    # Recursively search in subfolders
                    with app.app_context():
                        # Simulate a request to our own endpoint
                        with app.test_request_context(
                            f"/api/search-files?query={query}&path={folder_path}",
                            headers={
                                "Authorization": request.headers.get("Authorization")
                            },
                        ):
                            # Get the response from our own function
                            sub_response = search_files()
                            # Extract the JSON data
                            sub_data = sub_response[0].json

                            # Add each result from subfolder
                            for item in sub_data:
                                # Avoid duplicates
                                if item["name"] not in matched_files:
                                    # Update path to include the subfolder
                                    if path:
                                        item["path"] = (
                                            path.split("/")
                                            + [folder["name"]]
                                            + item["path"][len(path.split("/")) :]
                                        )
                                    else:
                                        item["path"] = [folder["name"]] + item["path"]
                                    results.append(item)
                                    matched_files.append(item["name"])

                                    # Limit results
                                    if len(results) >= 10:
                                        break
                except Exception as subfolder_error:
                    app.logger.error(
                        f"Error searching in subfolder {folder_path}: {str(subfolder_error)}"
                    )

        # Sort results by relevance (exact matches first, then by name)
        results.sort(
            key=lambda x: (
                (
                    0
                    if x["name"].lower() == query.lower()
                    else (1 if x["name"].lower().startswith(query.lower()) else 2)
                ),
                x["name"],
            )
        )

        # Limit to maximum 10 results
        results = results[:10]

        app.logger.info(
            f"📥 API Response: Found {len(results)} matches for query '{query}'"
        )
        return jsonify(results), 200
    except Exception as e:
        app.logger.error(f"❌ API Error in search_files: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/storage-quota", methods=["GET"])
@require_auth
def get_storage_quota():
    """Get storage quota information."""
    try:
        app.logger.info("📞 API Call - get_storage_quota")

        # Implement actual storage calculation here
        # This is a placeholder implementation
        quota = {
            "used": 1024 * 1024 * 500,  # 500MB
            "total": 1024 * 1024 * 1000,  # 1GB
            "percentage": 50,
        }

        app.logger.info(f"📥 API Response: {quota}")
        return jsonify(quota)
    except Exception as e:
        app.logger.error(f"❌ API Error in get_storage_quota: {str(e)}")
        return jsonify({"error": str(e)}), 500


def initialize_assistant():
    """Initialize the assistant."""
    try:
        # Initialize the assistant
        if OPENAI_ASSISTANT_ID:
            print("OPENAI_ASSISTANT_ID: ", OPENAI_ASSISTANT_ID)
            return OPENAI_ASSISTANT_ID
        else:
            response = client.beta.assistants.create(
                name="ESG Reporting Assistant",
                instructions="You are a helpful assistant that can answer questions about the ESG data.",
            )
            return response.id
    except Exception as e:
        app.logger.error(f"Error initializing assistant: {str(e)}")
        return None


@app.route("/api/chat", methods=["POST"])
def chat():
    """Chat with the AI."""
    try:
        if OPENAI_ASSISTANT_ID_2:
            assistant_id = OPENAI_ASSISTANT_ID_2
            print("OPENAI_ASSISTANT_ID: ", assistant_id)
        else:
            assistant_id = initialize_assistant()
            if not assistant_id:
                return jsonify({"error": "Failed to initialize assistant"}), 500

        # Get the user's message
        message = request.json.get("data", {}).get("content", "")
        # Create or retrieve thread
        if REDIS_URL:
            redis_client = redis.from_url(REDIS_URL)
            thread_id = redis_client.get("thread_id")
            if not thread_id:
                thread = client.beta.threads.create()
                thread_id = thread.id
                redis_client.set("thread_id", thread_id)
            else:
                # Convert bytes to string if needed
                thread_id = (
                    thread_id.decode("utf-8")
                    if isinstance(thread_id, bytes)
                    else thread_id
                )
        else:
            thread = client.beta.threads.create()
            thread_id = thread.id

        print("thread_id: ", thread_id)
        print("assistant_id: ", assistant_id)

        # use llm service to process the query
        # llm_service = LLMService()
        # response = llm_service.handle_query(message)
        # print("response: ", response)
        rag_api_url = "http://localhost:8000/api/v1/query"
        print("request object: ", request)
        response = requests.post(rag_api_url, json={"query": message})
        print("response: ", response)

        # Add the user's message to the thread
        client.beta.threads.messages.create(
            thread_id=thread_id,  # Use thread_id instead of thread.id
            role="user",
            content=message,
        )

        # Run the assistant
        run = client.beta.threads.runs.create(
            thread_id=thread_id,  # Use thread_id instead of thread.id
            assistant_id=assistant_id,
        )

        # Wait for the run to complete
        while run.status not in ["completed", "failed"]:
            time.sleep(0.5)
            run = client.beta.threads.runs.retrieve(
                thread_id=thread_id, run_id=run.id  # Use thread_id instead of thread.id
            )

        if run.status == "failed":
            return jsonify({"error": "Assistant run failed"}), 500

        # Get the assistant's response
        messages = client.beta.threads.messages.list(thread_id=thread_id)

        # Get the latest assistant message (messages are returned in reverse chronological order)
        assistant_response = None
        for msg in messages.data:
            if msg.role == "assistant":
                for content_part in msg.content:
                    if content_part.type == "text":
                        assistant_response = content_part.text.value
                        break
                if assistant_response:
                    break

        # Return the assistant's message
        if assistant_response:
            return (
                jsonify(
                    {
                        "id": str(uuid.uuid4()),
                        "role": "assistant",
                        "content": assistant_response,
                    }
                ),
                200,
            )
        else:
            return jsonify({"error": "No response from assistant"}), 500

    except Exception as e:
        app.logger.error(f"Error in chat endpoint: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/delete", methods=["DELETE"])
@require_auth
def delete_item():
    """Delete a file or folder."""
    try:
        path = request.args.get("path", "")
        app.logger.info(f"📞 API Call - delete_item: {path}")

        if not path:
            return jsonify({"error": "No path provided"}), 400

        # Check if path ends with a file extension to determine if it's a file
        if "." in os.path.basename(path):
            # It's a file
            app.logger.info(f"🔺 Attempting to delete file: {path}")

            try:
                # Get document_id from database instead of the filename
                doc_result = (
                    supabase.postgrest.schema("esg_data")
                    .table("documents")
                    .select("id")
                    .eq("file_path", path)
                    .execute()
                )

                if doc_result and doc_result.data and len(doc_result.data) > 0:
                    document_id = doc_result.data[0]["id"]
                    app.logger.info(
                        f"🔍 Found document ID: {document_id} for file: {path}"
                    )

                    # Call RAG API to delete graph entity
                    rag_api_url = "http://localhost:8000/api/v1/delete-graph-entity"

                    import requests

                    response = requests.post(
                        rag_api_url,
                        json={
                            "user_id": request.user["id"],
                            "document_id": document_id,
                        },
                        headers={"Content-Type": "application/json"},
                    )

                    if response.status_code == 200:
                        app.logger.info(
                            f"🔺 Successfully deleted Neo4j graph data for file: {path}"
                        )
                    else:
                        app.logger.error(
                            f"❌ Failed to delete Neo4j graph data with status {response.status_code}: {response.text}"
                        )
                else:
                    app.logger.warning(f"⚠️ Could not find document ID for file: {path}")
            except Exception as neo4j_error:
                app.logger.error(
                    f"❌ Warning: Failed to delete Neo4j graph data: {str(neo4j_error)}"
                )
                # Continue even if Neo4j deletion fails, as the primary deletion in Supabase succeeded

            try:
                response = (
                    supabase.postgrest.schema("public")
                    .rpc(
                        "manage_document_metadata",
                        {
                            "p_action": "delete",
                            "p_user_id": request.user["id"],
                            "p_file_name": None,  # Not needed for delete
                            "p_file_type": None,  # Not needed for delete
                            "p_uploaded_at": None,  # Not needed for delete
                            "p_size": None,
                            "p_file_path": path,
                        },
                    )
                    .execute()
                )
                app.logger.info(f"🔺 Successfully deleted metadata for file: {path}")
                app.logger.info(f"🔺 Metadata response: {response}")
            except Exception as metadata_error:
                app.logger.error(f"❌ Failed to delete metadata: {str(metadata_error)}")
                return jsonify({"error": str(metadata_error)}), 500

            # Delete the actual file
            supabase.storage.from_("documents").remove([path])
        else:
            # It's a folder - recursive deletion function
            app.logger.info(f"🔺 Attempting to delete folder: {path}")

            def delete_folder_recursive(folder_path):
                """Recursively delete a folder and all its contents"""
                try:
                    # List contents of the folder
                    contents = supabase.storage.from_("documents").list(
                        path=folder_path
                    )

                    # First process all subfolders recursively
                    for item in contents:
                        item_path = os.path.join(folder_path, item["name"])
                        if item["id"] is None and item["name"] != ".folder":
                            # It's a subfolder - delete recursively
                            app.logger.info(
                                f"🔺 Recursively deleting subfolder: {item_path}"
                            )
                            delete_folder_recursive(item_path)
                        elif item["id"] is not None:
                            # It's a file - delete metadata and file
                            app.logger.info(f"🔺 Deleting file in folder: {item_path}")
                            try:
                                # Delete metadata first
                                response = (
                                    supabase.postgrest.schema("public")
                                    .rpc(
                                        "manage_document_metadata",
                                        {
                                            "p_action": "delete",
                                            "p_user_id": request.user["id"],
                                            "p_file_name": None,  # Not needed for delete
                                            "p_file_type": None,  # Not needed for delete
                                            "p_uploaded_at": None,  # Not needed for delete
                                            "p_size": None,
                                            "p_file_path": item_path,
                                        },
                                    )
                                    .execute()
                                )
                                app.logger.info(
                                    f"🔺 Successfully deleted metadata for file: {item_path}"
                                )
                                app.logger.info(f"🔺 Metadata response: {response}")
                            except Exception as metadata_error:
                                app.logger.error(
                                    f"❌ Failed to delete metadata for file {item_path}: {str(metadata_error)}"
                                )
                                # Continue with file deletion even if metadata deletion fails

                            # Delete the actual file
                            supabase.storage.from_("documents").remove([item_path])

                            # Delete related Neo4j graph data for this file
                            try:
                                # Get document_id from database instead of the filename
                                doc_result = (
                                    supabase.postgrest.schema("esg_data")
                                    .table("documents")
                                    .select("id")
                                    .eq("file_path", item_path)
                                    .execute()
                                )

                                if (
                                    doc_result
                                    and doc_result.data
                                    and len(doc_result.data) > 0
                                ):
                                    document_id = doc_result.data[0]["id"]
                                    app.logger.info(
                                        f"🔍 Found document ID: {document_id} for file: {item_path}"
                                    )

                                    rag_api_url = "http://localhost:8000/api/v1/delete-graph-entity"

                                    import requests

                                    response = requests.post(
                                        rag_api_url,
                                        json={
                                            "user_id": request.user["id"],
                                            "document_id": document_id,
                                        },
                                        headers={"Content-Type": "application/json"},
                                    )

                                    if response.status_code == 200:
                                        app.logger.info(
                                            f"🔺 Successfully deleted Neo4j graph data for file: {item_path}"
                                        )
                                    else:
                                        app.logger.error(
                                            f"❌ Failed to delete Neo4j graph data with status {response.status_code}: {response.text}"
                                        )
                                else:
                                    app.logger.warning(
                                        f"⚠️ Could not find document ID for file: {item_path}"
                                    )
                            except Exception as neo4j_error:
                                app.logger.error(
                                    f"❌ Warning: Failed to delete Neo4j graph data: {str(neo4j_error)}"
                                )
                                # Continue with file deletion even if Neo4j deletion fails

                    # Finally delete the folder placeholder
                    folder_placeholder = os.path.join(folder_path, ".folder")
                    app.logger.info(
                        f"🔺 Deleting folder placeholder: {folder_placeholder}"
                    )
                    supabase.storage.from_("documents").remove([folder_placeholder])

                    # Delete the folder's metadata
                    try:
                        response = (
                            supabase.postgrest.schema("public")
                            .rpc(
                                "manage_document_metadata",
                                {
                                    "p_action": "delete",
                                    "p_user_id": request.user["id"],
                                    "p_file_name": None,  # Not needed for delete
                                    "p_file_type": None,  # Not needed for delete
                                    "p_uploaded_at": None,  # Not needed for delete
                                    "p_size": None,  # Not needed for delete
                                    "p_file_path": folder_path,
                                },
                            )
                            .execute()
                        )
                        app.logger.info(
                            f"🔺 Successfully deleted metadata for folder: {folder_path}"
                        )
                        app.logger.info(f"🔺 Metadata response: {response}")
                    except Exception as metadata_error:
                        app.logger.error(
                            f"❌ Failed to delete metadata for folder {folder_path}: {str(metadata_error)}"
                        )

                    app.logger.info(f"🔺 Successfully deleted folder: {folder_path}")
                    return True

                except Exception as folder_error:
                    app.logger.error(
                        f"❌ Failed to delete folder or its contents: {str(folder_error)}"
                    )
                    raise folder_error

            # Start the recursive deletion process
            delete_folder_recursive(path)

        app.logger.info(f"📥 API Response: Successfully deleted {path}")
        return jsonify({"success": True, "path": path}), 200
    except Exception as e:
        app.logger.error(f"❌ API Error in delete_item: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/rename", methods=["POST"])
@require_auth
def rename_item():
    """Rename a file or folder."""
    try:
        data = request.json
        old_path = data.get("oldPath", "")
        new_name_or_path = data.get("newName", "")

        app.logger.info(f"📞 API Call - rename_item: {old_path} to {new_name_or_path}")

        # Normalize paths to use forward slashes, expected by Supabase storage
        old_path = old_path.replace("\\", "/")
        new_name_or_path = new_name_or_path.replace("\\", "/")

        if not old_path or not new_name_or_path:
            return jsonify({"error": "Missing required parameters"}), 400

        # Determine old parent directory and name
        if "/" in old_path:
            parent_dir = old_path.rsplit("/", 1)[0]
            old_name = old_path.rsplit("/", 1)[1]
        else:
            parent_dir = ""  # Root directory
            old_name = old_path

        # Determine the new path, the final name component, and the target parent directory
        if "/" in new_name_or_path:
            # Case 1: Input contains a path, indicating a move or rename-with-path
            new_path = new_name_or_path
            if "/" in new_path:
                target_parent_dir = new_path.rsplit("/", 1)[0]
                new_name_final = new_path.rsplit("/", 1)[
                    1
                ]  # Extract the final name part
            else:
                # Should not happen if '/' is in new_name_or_path, but handle defensively
                target_parent_dir = ""
                new_name_final = new_path
            app.logger.info(f"Detected operation to target path: {new_path}")
        else:
            # Case 2: Input is just a name (no slashes)
            new_name_final = new_name_or_path  # The provided value is just the new name

            # Case 2a: Check for move-to-root intention (name same, was in subfolder)
            if new_name_final == old_name and parent_dir != "":
                new_path = (
                    new_name_final  # The new path is just the filename at the root
                )
                target_parent_dir = ""  # Target is root
                app.logger.info(f"Detected move-to-root operation for {old_path}")
            # Case 2b: Simple rename within the original directory (name changed OR already in root)
            else:
                new_path = (
                    f"{parent_dir}/{new_name_final}" if parent_dir else new_name_final
                )
                target_parent_dir = parent_dir
                app.logger.info(
                    f"Detected simple rename within directory '{parent_dir}': {new_name_final}"
                )

        app.logger.info(
            f"🔄 Processing operation from {old_path} to {new_path} (target dir: '{target_parent_dir}', final name: '{new_name_final}')"
        )

        # Check if it's a file or folder
        # Heuristic: Check if the *old* name contained a dot. This might be fragile if folder names contain dots.
        # A better approach would be to *try* listing the old_path. If it succeeds, it's likely a folder.
        # However, sticking to the original logic for now to minimize changes.
        is_file = "." in old_name

        # First approach: Check if the target exists by trying to list parent directory
        try:
            # List the parent directory to see if the target name exists
            parent_contents = supabase.storage.from_("documents").list(
                path=target_parent_dir
            )

            # Check if the new name already exists in the parent directory
            for item in parent_contents:
                if item["name"] == new_name_final:
                    app.logger.error(
                        f"❌ An item named '{new_name_final}' already exists in directory '{target_parent_dir}'"
                    )
                    if is_file and item["id"] is None:
                        return (
                            jsonify(
                                {
                                    "error": f"Cannot rename to '{new_name_final}' because a folder with this name already exists"
                                }
                            ),
                            400,
                        )
                    elif not is_file and item["id"] is not None:
                        return (
                            jsonify(
                                {
                                    "error": f"Cannot rename to '{new_name_final}' because a file with this name already exists"
                                }
                            ),
                            400,
                        )
                    else:
                        return (
                            jsonify(
                                {
                                    "error": f"Cannot rename to '{new_name_final}' because an item with this name already exists"
                                }
                            ),
                            400,
                        )
        except Exception as check_error:
            app.logger.warning(
                f"⚠️ Could not check parent directory: {str(check_error)}"
            )
            if is_file:
                try:
                    # Try to get file metadata first (using get_public_url as a proxy for existence check)
                    supabase.storage.from_("documents").get_public_url(new_path)
                    # If the above line doesn't throw an error, the file exists
                    app.logger.error(
                        f"❌ File with path '{new_path}' already exists (fallback check)"
                    )
                    return (
                        jsonify(
                            {
                                "error": f"Cannot rename to '{new_name_final}' because a file with this name/path already exists"
                            }
                        ),
                        400,
                    )
                except Exception:
                    # If the existence check fails (throws an error), we assume the file doesn't exist
                    app.logger.info(
                        f"✅ Target file '{new_path}' likely does not exist (fallback check), proceeding with rename"
                    )
                    pass  # Continue to the rename operation

        # If we've reached here, the target doesn't exist (or we couldn't confirm its existence), so we proceed

        # Rename/Move operation for file or folder
        if is_file:  # Use the determined type from earlier
            # Supabase storage doesn't have a direct rename function, so we need to:
            # 1. Download the file
            # 2. Upload it with the new name
            # 3. Delete the old file
            try:
                # Download file data
                file_data = supabase.storage.from_("documents").download(old_path)

                # Determine content type based on extension
                content_type = "application/octet-stream"
                ext = new_path.split(".")[-1].lower() if "." in new_path else ""
                if ext == "pdf":
                    content_type = "application/pdf"
                elif ext == "xlsx":
                    content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                elif ext == "csv":
                    content_type = "text/csv"
                elif ext == "docx":
                    content_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

                # Upload with new name
                upload_response = supabase.storage.from_("documents").upload(
                    new_path, file_data, file_options={"contentType": content_type}
                )

                if upload_response:
                    # Create new metadata for the new path
                    try:
                        supabase.postgrest.schema("public").rpc(
                            "manage_document_metadata",
                            {
                                "p_action": "create",
                                "p_user_id": request.user["id"],
                                "p_file_name": new_name_final,
                                "p_file_type": content_type,
                                "p_uploaded_at": datetime.now()
                                .replace(tzinfo=None)
                                .isoformat(),
                                "p_size": str(len(file_data)),
                                "p_file_path": new_path,
                            },
                        ).execute()
                        app.logger.info(
                            f"📄 Created new metadata for renamed file: {new_path}"
                        )
                    except Exception as metadata_error:
                        app.logger.error(
                            f"❌ Failed to create new metadata: {str(metadata_error)}"
                        )

                    # Delete old file from storage
                    supabase.storage.from_("documents").remove([old_path])

                    # Delete old metadata
                    try:
                        supabase.postgrest.schema("public").rpc(
                            "manage_document_metadata",
                            {
                                "p_action": "delete",
                                "p_user_id": request.user["id"],
                                "p_file_path": old_path,
                            },
                        ).execute()
                        app.logger.info(f"🗑️ Deleted old metadata for: {old_path}")
                    except Exception as metadata_del_error:
                        app.logger.error(
                            f"❌ Failed to delete old metadata: {str(metadata_del_error)}"
                        )

                    app.logger.info(
                        f"📄 Successfully renamed file from {old_path} to {new_path}"
                    )
                else:
                    raise Exception("Failed to upload file with new name")
            except Exception as file_error:
                app.logger.error(f"❌ Failed to rename file: {str(file_error)}")
                try:
                    supabase.storage.from_("documents").remove([new_path])
                except:
                    pass
                raise file_error
        else:  # It's a folder
            try:
                # First check if the source folder exists
                try:
                    source_contents = supabase.storage.from_("documents").list(
                        path=old_path
                    )
                except Exception as source_error:
                    app.logger.error(f"❌ Source folder does not exist: {old_path}")
                    raise Exception(f"Source folder not found: {old_path}")

                # Create new folder placeholder
                try:
                    placeholder_path = f"{new_path}/.folder"
                    supabase.storage.from_("documents").upload(
                        placeholder_path,
                        "folder".encode(),
                        {"contentType": "application/x-directory"},
                    )
                    app.logger.info(
                        f"✅ Created new folder placeholder: {placeholder_path}"
                    )
                except Exception as ph_error:
                    if "Duplicate" in str(ph_error):
                        app.logger.warning(
                            f"⚠️ Folder placeholder already exists: {placeholder_path}"
                        )
                    else:
                        raise ph_error

                # Update folder metadata
                try:
                    # Create new metadata for the folder
                    supabase.postgrest.schema("public").rpc(
                        "manage_document_metadata",
                        {
                            "p_action": "create",
                            "p_user_id": request.user["id"],
                            "p_file_name": new_name_final,
                            "p_file_type": "folder",
                            "p_uploaded_at": datetime.now()
                            .replace(tzinfo=None)
                            .isoformat(),
                            "p_size": "0",
                            "p_file_path": new_path,
                        },
                    ).execute()
                    app.logger.info(f"✅ Created metadata for new folder: {new_path}")
                except Exception as folder_metadata_error:
                    app.logger.error(
                        f"❌ Failed to create folder metadata: {str(folder_metadata_error)}"
                    )
                    raise folder_metadata_error

                # If there are files in the folder, move them
                moved_files = []
                for item in source_contents:
                    if item["name"] == ".folder":
                        continue

                    old_item_path = f"{old_path}/{item['name']}"
                    new_item_path = f"{new_path}/{item['name']}"

                    if item["id"] is None:  # It's a subfolder
                        try:
                            # Create subfolder placeholder
                            supabase.storage.from_("documents").upload(
                                f"{new_item_path}/.folder",
                                "folder".encode(),
                                {"contentType": "application/x-directory"},
                            )
                            # Update subfolder metadata
                            supabase.postgrest.schema("public").rpc(
                                "manage_document_metadata",
                                {
                                    "p_action": "create",
                                    "p_user_id": request.user["id"],
                                    "p_file_name": item["name"],
                                    "p_file_type": "folder",
                                    "p_uploaded_at": datetime.now()
                                    .replace(tzinfo=None)
                                    .isoformat(),
                                    "p_size": "0",
                                    "p_file_path": new_item_path,
                                },
                            ).execute()
                            moved_files.append(old_item_path)
                        except Exception as subfolder_error:
                            if not "Duplicate" in str(subfolder_error):
                                raise subfolder_error
                    else:  # It's a file
                        try:
                            file_data = supabase.storage.from_("documents").download(
                                old_item_path
                            )
                            content_type = item.get("metadata", {}).get(
                                "mimetype", "application/octet-stream"
                            )

                            # Upload to new location
                            upload_response = supabase.storage.from_(
                                "documents"
                            ).upload(
                                new_item_path,
                                file_data,
                                file_options={"contentType": content_type},
                            )

                            if upload_response:
                                # Update file metadata
                                supabase.postgrest.schema("public").rpc(
                                    "manage_document_metadata",
                                    {
                                        "p_action": "create",
                                        "p_user_id": request.user["id"],
                                        "p_file_name": item["name"],
                                        "p_file_type": content_type,
                                        "p_uploaded_at": datetime.now()
                                        .replace(tzinfo=None)
                                        .isoformat(),
                                        "p_size": str(len(file_data)),
                                        "p_file_path": new_item_path,
                                    },
                                ).execute()
                                moved_files.append(old_item_path)
                        except Exception as file_error:
                            app.logger.error(
                                f"❌ Failed to move file {old_item_path}: {str(file_error)}"
                            )
                            raise file_error

                # Now delete the old folder structure
                try:
                    # Delete old files
                    for old_path_item in moved_files:
                        try:
                            supabase.storage.from_("documents").remove([old_path_item])
                            # Delete old metadata entry if it exists
                            supabase.postgrest.schema("public").rpc(
                                "manage_document_metadata",
                                {
                                    "p_action": "delete",
                                    "p_user_id": request.user["id"],
                                    "p_file_path": old_path_item,
                                },
                            ).execute()
                        except Exception as del_error:
                            app.logger.error(
                                f"Failed to delete original item {old_path_item}: {str(del_error)}"
                            )

                    # Delete old folder placeholder and metadata
                    try:
                        supabase.storage.from_("documents").remove(
                            [f"{old_path}/.folder"]
                        )
                        supabase.postgrest.schema("public").rpc(
                            "manage_document_metadata",
                            {
                                "p_action": "delete",
                                "p_user_id": request.user["id"],
                                "p_file_path": old_path,
                            },
                        ).execute()
                        app.logger.info(f"✅ Deleted old folder structure: {old_path}")
                    except Exception as folder_del_error:
                        app.logger.error(
                            f"Failed to delete old folder structure: {str(folder_del_error)}"
                        )
                        raise folder_del_error

                except Exception as cleanup_error:
                    app.logger.error(
                        f"❌ Failed to clean up old folder structure: {str(cleanup_error)}"
                    )
                    raise cleanup_error

                app.logger.info(
                    f"📁 Successfully renamed folder from {old_path} to {new_path}"
                )

            except Exception as folder_error:
                app.logger.error(f"❌ Failed to rename folder: {str(folder_error)}")
                # Clean up the new folder if the operation failed
                try:

                    def clean_folder(folder_path):
                        try:
                            contents = supabase.storage.from_("documents").list(
                                path=folder_path
                            )
                            for item in contents:
                                if item["id"] is not None:  # File
                                    item_path = f"{folder_path}/{item['name']}"
                                    try:
                                        supabase.storage.from_("documents").remove(
                                            [item_path]
                                        )
                                        # Delete new metadata entry if it exists
                                        supabase.postgrest.schema("public").rpc(
                                            "manage_document_metadata",
                                            {
                                                "p_action": "delete",
                                                "p_user_id": request.user["id"],
                                                "p_file_path": item_path,
                                            },
                                        ).execute()
                                        app.logger.info(
                                            f"🗑️ Cleanup: Deleted {item_path} and its metadata"
                                        )
                                    except Exception as del_error:
                                        app.logger.error(
                                            f"Cleanup: Failed to delete {item_path}: {str(del_error)}"
                                        )
                                elif item["name"] != ".folder":  # Subfolder
                                    child_path = f"{folder_path}/{item['name']}"
                                    clean_folder(child_path)
                            try:
                                placeholder = f"{folder_path}/.folder"
                                supabase.storage.from_("documents").remove(
                                    [placeholder]
                                )
                                # Delete folder metadata
                                supabase.postgrest.schema("public").rpc(
                                    "manage_document_metadata",
                                    {
                                        "p_action": "delete",
                                        "p_user_id": request.user["id"],
                                        "p_file_path": folder_path,
                                    },
                                ).execute()
                                app.logger.info(
                                    f"🗑️ Cleanup: Deleted placeholder {placeholder} and its metadata"
                                )
                            except Exception as ph_error:
                                app.logger.error(
                                    f"Cleanup: Failed to delete placeholder {folder_path}: {str(ph_error)}"
                                )
                        except Exception as list_error:
                            app.logger.error(
                                f"Cleanup: Failed to list contents of {folder_path}: {str(list_error)}"
                            )

                    clean_folder(new_path)
                except Exception as cleanup_error:
                    app.logger.error(
                        f"❌ Failed to clean up after failed rename: {str(cleanup_error)}"
                    )
                raise folder_error

        return jsonify({"success": True, "oldPath": old_path, "newPath": new_path}), 200
    except Exception as e:
        app.logger.error(f"❌ API Error in rename_item: {str(e)}")
        return jsonify({"error": str(e)}), 500


# Analytics API endpoints
@app.route("/api/analytics/metrics", methods=["GET"])
@require_auth
def get_metrics():
    """Get ESG metrics and KPIs."""
    try:
        app.logger.info("📊 API Call - get_metrics")
        # Mock response
        metrics = {
            "environmental": {
                "carbon_emissions": {"value": 1250.5, "unit": "tons", "trend": -5.2},
                "energy_consumption": {"value": 45000, "unit": "kWh", "trend": -2.1},
                "waste_management": {"value": 85.5, "unit": "tons", "trend": -10.0},
            },
            "social": {
                "employee_satisfaction": {"value": 4.2, "unit": "score", "trend": 0.3},
                "diversity_ratio": {"value": 42, "unit": "percent", "trend": 5.0},
                "training_hours": {"value": 1200, "unit": "hours", "trend": 15.0},
            },
            "governance": {
                "board_diversity": {"value": 38, "unit": "percent", "trend": 8.0},
                "compliance_rate": {"value": 98.5, "unit": "percent", "trend": 1.5},
                "risk_assessment": {"value": 4.5, "unit": "score", "trend": 0.2},
            },
        }
        app.logger.info("📥 API Response: Metrics data sent")
        return jsonify(metrics), 200
    except Exception as e:
        app.logger.error(f"❌ API Error in get_metrics: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/analytics/data-chunks", methods=["GET"])
@require_auth
def get_data_chunks():
    """Get available data chunks for chart generation."""
    try:
        app.logger.info("📊 API Call - get_data_chunks")

        # Mock response with available data chunks
        chunks = [
            {
                "id": "carbon_emissions_2023",
                "name": "Carbon Emissions 2023",
                "description": "Monthly carbon emissions data for 2023",
                "category": "Environmental",
                "updated_at": datetime.now().isoformat(),
            },
            {
                "id": "energy_consumption_quarterly",
                "name": "Energy Consumption (Quarterly)",
                "description": "Quarterly energy consumption over the past 3 years",
                "category": "Environmental",
                "updated_at": datetime.now().isoformat(),
            },
            {
                "id": "diversity_metrics_2023",
                "name": "Diversity Metrics 2023",
                "description": "Diversity statistics across departments",
                "category": "Social",
                "updated_at": datetime.now().isoformat(),
            },
            {
                "id": "governance_compliance",
                "name": "Governance Compliance",
                "description": "Compliance metrics by region",
                "category": "Governance",
                "updated_at": datetime.now().isoformat(),
            },
        ]

        app.logger.info(f"📥 API Response: Sent {len(chunks)} data chunks")
        return jsonify(chunks), 200
    except Exception as e:
        app.logger.error(f"❌ API Error in get_data_chunks: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/analytics/data-chunks/<chunk_id>", methods=["GET"])
@require_auth
def get_data_chunk(chunk_id):
    """Get chart data for a specific data chunk."""
    try:
        app.logger.info(f"📊 API Call - get_data_chunk: {chunk_id}")

        # Mock responses based on chunk_id
        chart_data = {}

        if chunk_id == "carbon_emissions_2023":
            chart_data = {
                "title": "Carbon Emissions 2023",
                "type": "bar",
                "labels": [
                    "Jan",
                    "Feb",
                    "Mar",
                    "Apr",
                    "May",
                    "Jun",
                    "Jul",
                    "Aug",
                    "Sep",
                    "Oct",
                    "Nov",
                    "Dec",
                ],
                "series": [
                    {
                        "name": "Office Emissions",
                        "data": [42, 38, 35, 40, 36, 33, 34, 31, 35, 32, 29, 25],
                    },
                    {
                        "name": "Manufacturing",
                        "data": [65, 59, 80, 81, 56, 55, 60, 58, 56, 52, 49, 48],
                    },
                    {
                        "name": "Transportation",
                        "data": [28, 25, 26, 32, 30, 27, 29, 28, 25, 23, 24, 20],
                    },
                ],
            }
        elif chunk_id == "energy_consumption_quarterly":
            chart_data = {
                "title": "Energy Consumption (Quarterly)",
                "type": "line",
                "labels": [
                    "Q1 2021",
                    "Q2 2021",
                    "Q3 2021",
                    "Q4 2021",
                    "Q1 2022",
                    "Q2 2022",
                    "Q3 2022",
                    "Q4 2022",
                    "Q1 2023",
                    "Q2 2023",
                    "Q3 2023",
                    "Q4 2023",
                ],
                "series": [
                    {
                        "name": "Electricity (kWh)",
                        "data": [
                            48000,
                            46500,
                            47200,
                            45800,
                            44900,
                            43500,
                            42800,
                            41200,
                            40500,
                            38900,
                            37500,
                            36200,
                        ],
                    },
                    {
                        "name": "Natural Gas (therms)",
                        "data": [
                            12500,
                            9800,
                            8500,
                            13200,
                            11900,
                            9200,
                            7900,
                            12600,
                            10800,
                            8600,
                            7200,
                            11500,
                        ],
                    },
                ],
            }
        elif chunk_id == "diversity_metrics_2023":
            chart_data = {
                "title": "Diversity Metrics 2023",
                "type": "bar",
                "labels": [
                    "Engineering",
                    "Marketing",
                    "Operations",
                    "Finance",
                    "HR",
                    "Sales",
                    "Executive",
                ],
                "series": [
                    {"name": "Women", "data": [35, 62, 48, 53, 72, 45, 38]},
                    {
                        "name": "Underrepresented Minorities",
                        "data": [28, 32, 29, 25, 35, 30, 22],
                    },
                    {"name": "Veterans", "data": [8, 5, 12, 7, 6, 9, 10]},
                ],
            }
        elif chunk_id == "governance_compliance":
            chart_data = {
                "title": "Governance Compliance",
                "type": "donut",
                "labels": [
                    "North America",
                    "Europe",
                    "Asia Pacific",
                    "Latin America",
                    "Africa",
                ],
                "series": [{"name": "Compliance Rate", "data": [98, 97, 92, 88, 85]}],
            }
        else:
            chart_data = {
                "title": "Sample Data",
                "type": "bar",
                "labels": ["Jan", "Feb", "Mar", "Apr", "May"],
                "series": [
                    {"name": "Series 1", "data": [40, 30, 20, 27, 18]},
                    {"name": "Series 2", "data": [24, 13, 98, 39, 48]},
                    {"name": "Series 3", "data": [65, 45, 35, 20, 75]},
                ],
            }

        app.logger.info(f"📥 API Response: Sent chart data for chunk {chunk_id}")
        return jsonify(chart_data), 200
    except Exception as e:
        app.logger.error(f"❌ API Error in get_data_chunk: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/analytics/reports", methods=["GET"])
@require_auth
def get_reports():
    """Get generated ESG reports."""
    try:
        app.logger.info("📊 API Call - get_reports")

        # Get user ID from the authenticated request
        user_id = request.user["id"]

        # In a real implementation, we would query the database for reports
        # associated with this user's organization.
        # For now, return a more detailed mock response

        current_date = datetime.now()

        # Create mock report data
        recent_reports = [
            {
                "id": "rep_001",
                "name": "Q4 2023 ESG Report",
                "type": "GRI",
                "generated_at": (current_date - timedelta(days=30)).isoformat(),
                "status": "completed",
                "files": ["file1", "file2", "file3"],
                "metrics": {
                    "environmental_score": 82,
                    "social_score": 78,
                    "governance_score": 91,
                },
            },
            {
                "id": "rep_002",
                "name": "Annual Sustainability Report 2023",
                "type": "SASB",
                "generated_at": (current_date - timedelta(days=60)).isoformat(),
                "status": "completed",
                "files": ["file1", "file4"],
                "metrics": {
                    "environmental_score": 79,
                    "social_score": 85,
                    "governance_score": 88,
                },
            },
            {
                "id": "rep_003",
                "name": "Q1 2024 ESG Report",
                "type": "GRI",
                "generated_at": (current_date - timedelta(days=15)).isoformat(),
                "status": "pending_review",
                "files": ["file3", "file5"],
                "metrics": {
                    "environmental_score": 84,
                    "social_score": 79,
                    "governance_score": 90,
                },
            },
        ]

        scheduled_reports = [
            {
                "id": "rep_004",
                "name": "Q2 2024 ESG Report",
                "type": "GRI",
                "scheduled_for": (current_date + timedelta(days=15)).isoformat(),
                "status": "scheduled",
                "template": "quarterly_report_template",
                "files": [],
            },
            {
                "id": "rep_005",
                "name": "Climate Risk Assessment",
                "type": "TCFD",
                "scheduled_for": (current_date + timedelta(days=30)).isoformat(),
                "status": "scheduled",
                "template": "climate_risk_template",
                "files": [],
            },
        ]

        # Try to get the storage file list to associate real files with reports
        try:
            storage_files = supabase.storage.from_("documents").list()
            file_ids = [file["id"] for file in storage_files if file["id"] is not None]

            # Assign real file IDs to reports if available
            for report in recent_reports:
                if file_ids:
                    # Assign up to 3 random files to each report
                    num_files = min(3, len(file_ids))
                    report["files"] = [file_ids[i] for i in range(num_files)]

        except Exception as file_error:
            app.logger.warning(
                f"Could not retrieve file list for reports: {str(file_error)}"
            )

        reports = {
            "recent_reports": recent_reports,
            "scheduled_reports": scheduled_reports,
        }

        app.logger.info(
            f"📥 API Response: Sent {len(recent_reports)} recent reports and {len(scheduled_reports)} scheduled reports"
        )
        return jsonify(reports), 200

    except Exception as e:
        app.logger.error(f"❌ API Error in get_reports: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/analytics/trends", methods=["GET"])
@require_auth
def get_trends():
    """Get ESG metric trends over time."""
    try:
        app.logger.info("📊 API Call - get_trends")
        period = request.args.get("period", "yearly")  # yearly, quarterly, monthly
        metric = request.args.get("metric", "all")

        # Mock response
        trends = {
            "timeline": ["2023-Q1", "2023-Q2", "2023-Q3", "2023-Q4"],
            "metrics": {
                "carbon_emissions": [1300, 1280, 1265, 1250.5],
                "energy_consumption": [48000, 47000, 46000, 45000],
                "waste_management": [95, 92, 88, 85.5],
            },
            "benchmarks": {
                "industry_average": {
                    "carbon_emissions": 1400,
                    "energy_consumption": 50000,
                    "waste_management": 100,
                }
            },
        }
        app.logger.info("📥 API Response: Trends data sent")
        return jsonify(trends), 200
    except Exception as e:
        app.logger.error(f"❌ API Error in get_trends: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/analytics/benchmarks", methods=["GET"])
@require_auth
def get_benchmarks():
    """Get industry benchmarks and comparisons."""
    try:
        app.logger.info("📊 API Call - get_benchmarks")
        industry = request.args.get("industry", "technology")

        # Mock response
        benchmarks = {
            "industry_averages": {
                "environmental": {
                    "carbon_emissions": 1400,
                    "energy_consumption": 50000,
                    "waste_management": 100,
                },
                "social": {
                    "employee_satisfaction": 3.8,
                    "diversity_ratio": 35,
                    "training_hours": 800,
                },
                "governance": {
                    "board_diversity": 30,
                    "compliance_rate": 95,
                    "risk_assessment": 4.0,
                },
            },
            "rankings": {"overall": 12, "total_companies": 100, "percentile": 88},
            "peer_comparison": {
                "better_than": 75,
                "areas_of_improvement": ["waste_management", "training_hours"],
                "leading_in": ["carbon_emissions", "board_diversity"],
            },
        }
        app.logger.info("📥 API Response: Benchmarks data sent")
        return jsonify(benchmarks), 200
    except Exception as e:
        app.logger.error(f"❌ API Error in get_benchmarks: {str(e)}")
        return jsonify({"error": str(e)}), 500


# @app.route("/api/analytics/generate-report", methods=["POST"])
# @require_auth
# def generate_report():
#     """Generate a new ESG report."""
#     try:
#         app.logger.info("📊 API Call - generate_report")
#         data = request.json
#         report_type = data.get("type", "quarterly")

#         # Mock response
#         response = {
#             "report_id": str(uuid.uuid4()),
#             "status": "processing",
#             "estimated_completion": "2024-03-08T15:00:00Z",
#             "type": report_type,
#             "notification": "You will be notified when the report is ready.",
#         }
#         app.logger.info("📥 API Response: Report generation initiated")
#         return jsonify(response), 200
#     except Exception as e:
#         app.logger.error(f"❌ API Error in generate_report: {str(e)}")
#         return jsonify({"error": str(e)}), 500


@app.route("/api/analytics/report-status/<report_id>", methods=["GET"])
@require_auth
def get_report_status(report_id):
    """Get the status of a report generation process."""
    try:
        app.logger.info(f"📊 API Call - get_report_status: {report_id}")

        # Mock response
        status = {
            "report_id": report_id,
            "status": "processing",
            "progress": 65,
            "current_step": "Analyzing environmental metrics",
            "steps_completed": ["Data collection", "Validation", "Initial analysis"],
            "steps_remaining": ["Final review", "PDF generation"],
            "estimated_completion": "2024-03-08T15:00:00Z",
        }
        app.logger.info("📥 API Response: Report status sent")
        return jsonify(status), 200
    except Exception as e:
        app.logger.error(f"❌ API Error in get_report_status: {str(e)}")
        return jsonify({"error": str(e)}), 500


def create_embeddings_batch(
    texts: list[str], model: str = "text-embedding-3-small"
) -> list[dict]:
    """
    Create embeddings for multiple texts in batch using OpenAI's API.

    Args:
        texts (list[str]): List of texts to create embeddings for
        model (str): The OpenAI model to use for embeddings. Defaults to text-embedding-3-small.

    Returns:
        list[dict]: A list of dictionaries containing embeddings and metadata

    Raises:
        Exception: If the OpenAI API call fails
    """
    try:
        app.logger.info(f"🔄 Creating embeddings for {len(texts)} texts")

        # Create embeddings in batch using OpenAI's API
        response = client.embeddings.create(
            model=model, input=texts, encoding_format="float"
        )

        # Process each embedding and create metadata
        results = []
        for i, embedding_data in enumerate(response.data):
            embedding = embedding_data.embedding
            metadata = {
                "model": model,
                "timestamp": datetime.now().isoformat(),
                "dimensions": len(embedding),
                "text_length": len(texts[i]),
            }

            results.append({"embedding": embedding, "metadata": metadata})

        app.logger.info(f"✅ Successfully created {len(results)} embeddings")
        return results

    except Exception as e:
        app.logger.error(f"❌ Error creating embeddings batch: {str(e)}")
        raise Exception(f"Failed to create embeddings batch: {str(e)}")


@app.route("/api/chunked-files", methods=["GET"])
@require_auth
def get_chunked_files():
    """
    Return a list of files that have been chunked, with chunk count and latest chunked time.
    """
    try:
        # 1. query all chunk stats
        chunk_stats_resp = (
            supabase.postgrest.schema("esg_data")
            .table("document_chunks")
            .select("document_id, created_at")
            .execute()
        )
        chunk_rows = chunk_stats_resp.data

        # 2. count chunk number and latest time for each document_id
        from collections import defaultdict

        chunk_map = defaultdict(lambda: {"chunk_count": 0, "chunked_at": None})
        for row in chunk_rows:
            doc_id = row["document_id"]
            chunk_map[doc_id]["chunk_count"] += 1
            # get the latest created_at
            if (
                chunk_map[doc_id]["chunked_at"] is None
                or row["created_at"] > chunk_map[doc_id]["chunked_at"]
            ):
                chunk_map[doc_id]["chunked_at"] = row["created_at"]

        document_ids = list(chunk_map.keys())
        if not document_ids:
            return jsonify({"chunked_files": []}), 200

        # 3. batch query file names
        docs_resp = (
            supabase.postgrest.schema("esg_data")
            .table("documents")
            .select("id, file_name")
            .in_("id", document_ids)
            .execute()
        )
        docs = {doc["id"]: doc["file_name"] for doc in docs_resp.data}

        # 4. assemble the result
        result = []
        for doc_id, stats in chunk_map.items():
            result.append(
                {
                    "id": doc_id,
                    "name": docs.get(doc_id, "Unknown"),
                    "chunk_count": stats["chunk_count"],
                    "chunked_at": stats["chunked_at"],
                }
            )

        return jsonify({"chunked_files": result}), 200

    except Exception as e:
        app.logger.error(f"❌ API Error in get_chunked_files: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/create-graph", methods=["POST"])
@require_auth
def create_graph():
    """
    Create a subgraph in neo4j for a specific user, given the attached document ids for the platform.

    Args:
        document_ids (list[str]): List of document ids to create a subgraph for
        user_id (str): The user id to create the subgraph for

    Returns:
        str: The id of the created subgraph

    Raises:
        Exception: If the subgraph creation fails
    """
    # Enforce application/json content type
    if not request.is_json:
        return jsonify({"error": "Content-Type must be application/json"}), 415
    try:
        app.logger.info("📊 API Call - create_graph")
        data = request.get_json()
        document_ids = data.get("document_ids")
        user_id = data.get("user_id")

        # 1. get the entities and relationships from supabase based on the chunk ids/ document ids
        entities = (
            supabase.postgrest.schema("esg_data")
            .table("entities")
            .select("*")
            .in_("document_id", document_ids)
            .execute()
        )

        relationships = (
            supabase.postgrest.schema("esg_data")
            .table("relationships")
            .select("*")
            .in_("document_id", document_ids)
            .execute()
        )

        # call the rag/app.py create_graph endpoint to create the subgraph
        response = requests.post(
            "http://localhost:8000/api/v1/create-graph",
            json={
                "entities": entities.data,
                "relationships": relationships.data,
                "user_id": user_id,
            },
        )
        if response.status_code != 200:
            return jsonify({"error": "Failed to create subgraph"}), response.status_code

        return jsonify({"subgraph_id": "123"}), 200

    except Exception as e:
        app.logger.error(f"❌ API Error in create_graph: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/generate-report", methods=["POST"])
@require_auth
def generate_report():
    """
    Generate a report for a specific user, given the attached document ids for the platform.
    """
    try:
        app.logger.info("📊 API Call - generate_report")
        data = request.get_json()
        document_ids = data.get("document_ids")
        report_type = data.get("report_type")
        prompt = data.get("prompt")
        request_body = {
            "document_ids": document_ids,
            "report_type": report_type,
            "prompt": prompt,
        }
        print("request_body: ", request_body)
        rag_api_url = "http://localhost:8000/api/v1/generate-report"
<<<<<<< users/zenan/bugfix
        response = requests.post(rag_api_url, json=json.dumps(request_body))
=======
        response = requests.post(
            rag_api_url, 
            json=json.dumps(request_body)
        )
>>>>>>> feature/bugfix
        response_data = response.json()
        return (
            jsonify(
                {
                    "success": True,
                    "report_name": response_data["report_name"],
                    "report_url": response_data["report_url"],
                }
            ),
            200,
        )
    except Exception as e:
        app.logger.error(f"❌ API Error in generate_report: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/analytics/excel-files", methods=["GET"])
@require_auth
def get_excel_files():
    """Get list of available Excel and CSV files from Supabase storage."""
    try:
        app.logger.info("📊 API Call - get_excel_files")

        # List all files in the documents bucket
        response = supabase.storage.from_("documents").list()

        if response:
            # Filter Excel files
            excel_files = [
                {
                    "name": item["name"],
                    "path": item["name"],
                    "size": item.get("metadata", {}).get("size"),
                    "modified": item.get("created_at"),
                }
                for item in response
                if item["name"].lower().endswith((".xlsx", ".xls"))
            ]

            # Filter CSV files
            csv_files = [
                {
                    "name": item["name"],
                    "path": item["name"],
                    "size": item.get("metadata", {}).get("size"),
                    "modified": item.get("created_at"),
                }
                for item in response
                if item["name"].lower().endswith(".csv")
            ]

            app.logger.info(
                f"📥 API Response: Found {len(excel_files)} Excel files and {len(csv_files)} CSV files"
            )
            return jsonify({"excel": excel_files, "csv": csv_files}), 200
        else:
            app.logger.info("🤷 No files found in storage")
            return jsonify({"excel": [], "csv": []}), 200

    except Exception as e:
        app.logger.error(f"❌ API Error in get_chunked_files: {str(e)}")
        return jsonify({"error": str(e)}), 500


# <<< NEW ENDPOINT FOR SPREADSHEET ANALYSIS >>>
@app.route("/api/analyze-sheet", methods=["POST"])
# @require_auth # Temporarily disable auth for easier testing if needed, re-enable later
def analyze_sheet():
    """Analyzes an uploaded Excel/CSV file for table data and chart payloads."""
    logger = app.logger  # Use Flask app logger
    logger.info("📞 API Call - analyze_sheet")

    if "file" not in request.files:
        logger.warning("No file part in request.")
        return jsonify({"error": "No file part"}), 400

    file = request.files["file"]

    if file.filename == "":
        logger.warning("No selected file.")
        return jsonify({"error": "No selected file"}), 400

    filename = secure_filename(file.filename)
    logger.info(f"Received file for analysis: {filename}")

    # Check for allowed extensions (optional but recommended)
    allowed_extensions = {".xlsx", ".xls", ".csv"}
    file_ext = os.path.splitext(filename)[1].lower()
    if file_ext not in allowed_extensions:
        logger.warning(f"Invalid file type received: {file_ext}")
        return (
            jsonify({"error": f"Invalid file type. Allowed: {allowed_extensions}"}),
            400,
        )

    try:
        # Read file content into BytesIO for ETL processing
        file_content = file.read()
        file_stream = io.BytesIO(file_content)

        # Ensure stream position is at the beginning
        file_stream.seek(0)

        # Import the ETL function locally to avoid circular dependencies if any
        from utils.robust_etl import etl_to_chart_payload

        logger.info(f"Calling etl_to_chart_payload for {filename}")
        # Call the refactored ETL function
        etl_result = etl_to_chart_payload(fp=file_stream, original_filename=filename)

        # Close the stream
        file_stream.close()

        logger.info(
            f"ETL completed for {filename}. Processed tables: {etl_result.get('tableCount', 0)}"
        )
        # Return the result from the ETL function
        # The ETL function now includes error details in its return structure
        status_code = 500 if etl_result.get("error") else 200
        return jsonify(etl_result), status_code

    except Exception as e:
        logger.error(f"❌ API Error in analyze_sheet: {str(e)}", exc_info=True)
        # Construct error response consistent with ETL function's error format
        error_payload = {
            "tables": [],
            "tableCount": 0,
            "fileMetadata": {
                "filename": filename,
                "duration": 0,
            },  # Duration not applicable here
            "error": True,
            "errorType": "api_error",
            "message": f"API error during analysis: {str(e)}",
            "errorDetails": str(e),
        }
        return jsonify(error_payload), 500


@app.route("/api/analytics/excel-data", methods=["GET"])
@require_auth
def get_excel_data():
    """
    Process Excel/CSV file directly from Supabase storage and return the processed data.
    Uses robust_etl utility for advanced file parsing, layout detection, and data transformation.
    Returns a structured response with potentially multiple detected tables.
    """
    try:
        file_name = request.args.get("file_name")

        if not file_name:
            app.logger.warning("Missing file_name parameter in get_excel_data")
            return jsonify({"error": "Missing file_name parameter"}), 400

        app.logger.info(f"API Call - get_excel_data for file: {file_name}")

        # 1. Download the file from Supabase storage
        app.logger.info(f"Downloading file from Supabase: {file_name}")
        try:
            # Download file data
            download_response = supabase.storage.from_("documents").download(file_name)
            file_data = download_response
            ext = file_name.split(".")[-1].lower() if "." in file_name else ""

            # Basic check for supported extensions (can be expanded)
            supported_extensions = {"xlsx", "xls", "csv", "xlsb", "tsv"}
            if ext not in supported_extensions:
                app.logger.warning(f"Unsupported file type requested: {ext}")
                return (
                    jsonify(
                        {
                            "error": f"Unsupported file type: {ext}. Only Excel and CSV files are supported."
                        }
                    ),
                    400,
                )

            app.logger.info(f"Downloaded {len(file_data)} bytes for {file_name}")

        except Exception as download_error:
            # More specific error handling for Supabase Storage
            error_message = str(download_error)
            status_code = 500
            if "NotFound" in error_message or "does not exist" in error_message:
                status_code = 404
                error_message = f"File not found in storage: {file_name}"
            else:
                error_message = f"Error downloading file from storage: {error_message}"

            app.logger.error(
                f"❌ Failed to download file from Supabase storage '{file_name}': {error_message}"
            )
            return jsonify({"error": error_message}), status_code

        # 2. Process the file using robust_etl utility
        try:
            from utils.robust_etl import etl_to_chart_payload
            import io

            # Use BytesIO to treat the downloaded bytes as a file
            file_stream = io.BytesIO(file_data)
            file_stream.seek(0)  # Ensure stream position is at the beginning

            # Call our robust ETL utility
            # Pass the original filename to ensure correct extension detection within ETL
            etl_response = etl_to_chart_payload(
                fp=file_stream, original_filename=file_name
            )

            # Close the stream
            file_stream.close()

            app.logger.info(
                f"Successfully processed {file_name} using robust ETL. Detected tables: {etl_response.get('tableCount', 0)}"
            )

            # Log the full payload before sending (optional, for debugging)
            # try:
            #     import json
            #     payload_str = json.dumps(etl_response, indent=2, default=str) # Use default=str for non-serializable types
            #     app.logger.debug(f"Payload being sent to frontend for {file_name}:\n{payload_str}")
            # except Exception as log_e:
            #     app.logger.error(f"Failed to log payload: {str(log_e)}")
            #     app.logger.debug(f"Raw payload (may contain non-serializable types): {etl_response}")

            # Return the structured response directly from the ETL function
            # Determine status code based on whether ETL reported an error
            status_code = 500 if etl_response.get("error") else 200
            return jsonify(etl_response), status_code

        except ValueError as ve:
            # Handle validation errors specifically from ETL utility
            app.logger.error(
                f"❌ File processing validation error for {file_name}: {str(ve)}"
            )
            # Return the error in the standard ETL response format
            error_payload = {
                "tables": [],
                "tableCount": 0,
                "fileMetadata": {"filename": file_name, "duration": 0},
                "error": True,
                "errorType": "etl_validation",
                "message": f"File processing error: {str(ve)}",
                "errorDetails": str(ve),
            }
            return jsonify(error_payload), 400  # Bad Request for validation issues

        except Exception as e:
            app.logger.error(
                f"❌ Unhandled error during ETL processing for {file_name}: {str(e)}",
                exc_info=True,
            )  # Log traceback
            # Return the error in the standard ETL response format
            error_payload = {
                "tables": [],
                "tableCount": 0,
                "fileMetadata": {"filename": file_name, "duration": 0},
                "error": True,
                "errorType": "etl_runtime",
                "message": f"Internal server error during ETL processing: {str(e)}",
                "errorDetails": traceback.format_exc(),  # Include traceback in details for debugging
            }
            return jsonify(error_payload), 500

    except Exception as e:
        app.logger.error(
            f"❌ API Error in get_excel_data (outer try): {str(e)}", exc_info=True
        )
        # Generic API error response
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500


<<<<<<< users/zenan/bugfix
@app.route("/api/graph-files", methods=["GET"])
@require_auth
def get_graph_files():
    """
    Get list of files that have graphs created in Neo4j.
    This will be used to restrict report generation to only files with graphs.
    """
    try:
        app.logger.info("📊 API Call - get_graph_files")

        # Call the RAG service to get files that have graphs in Neo4j
        rag_api_url = "http://localhost:8000/api/v1/get-graph-files"
        response = requests.get(
            rag_api_url,
            headers={"Content-Type": "application/json"},
            params={"user_id": request.user["id"]},
        )

        if response.status_code == 200:
            graph_files_data = response.json()

            # Get the document IDs that have graphs
            graph_document_ids = graph_files_data.get("document_ids", [])

            if not graph_document_ids:
                return jsonify({"graph_files": []}), 200
=======
@app.route("/api/edit-profile", methods=["PUT"])
@require_auth
def edit_profile():
    """Update the authenticated user's profile information."""
    try:
        # Get request data
        data = request.get_json()
        user_id = request.user["id"]
        
        # Extract updated profile data
        job_title = data.get("jobTitle")
        
        # In a real implementation, you would update this in Supabase or your database
        # For now, we'll just return a success message
        app.logger.info(f"📝 Updating profile for user {user_id}: jobTitle={job_title}")
        
        # Here you would add code to update the user's profile in your database
        # For example with Supabase:
        # update_response = supabase.from_("profiles").update({"job_title": job_title}).eq("user_id", user_id).execute()
        
        return jsonify({
            "user": request.user,
            "message": "Profile updated successfully"
        })
        
    except Exception as e:
        app.logger.error(f"❌ API Error in edit_profile: {str(e)}")
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5050)), debug=True)
>>>>>>> feature/bugfix

            # Fetch file details from Supabase for these document IDs
            docs_resp = (
                supabase.postgrest.schema("esg_data")
                .table("documents")
                .select("id, file_name, file_path, size, uploaded_at")
                .in_("id", graph_document_ids)
                .execute()
            )

            if not docs_resp.data:
                return jsonify({"graph_files": []}), 200

            # Get chunk counts for these files
            chunk_stats_resp = (
                supabase.postgrest.schema("esg_data")
                .table("document_chunks")
                .select("document_id, created_at")
                .in_("document_id", graph_document_ids)
                .execute()
            )

            # Count chunks per document
            from collections import defaultdict

            chunk_counts = defaultdict(int)
            for chunk in chunk_stats_resp.data:
                chunk_counts[chunk["document_id"]] += 1

            # Format the response
            graph_files = []
            for doc in docs_resp.data:
                file_path = doc.get("file_path", "")
                path_array = file_path.split("/")[:-1] if file_path else []

                graph_files.append(
                    {
                        "id": doc["id"],
                        "name": doc["file_name"],
                        "type": "file",
                        "size": doc.get("file_size", 0),
                        "modified": doc.get("updated_at", doc.get("created_at")),
                        "path": path_array,
                        "created_at": doc.get("created_at"),
                        "updated_at": doc.get("updated_at"),
                        "chunked": True,  # All graph files should be chunked
                        "has_graph": True,  # These files definitely have graphs
                        "chunk_count": chunk_counts.get(doc["id"], 0),
                    }
                )

            app.logger.info(
                f"📥 API Response: Found {len(graph_files)} files with graphs"
            )
            return jsonify({"graph_files": graph_files}), 200

        else:
            app.logger.error(
                f"❌ RAG service error: {response.status_code} - {response.text}"
            )
            return jsonify({"error": "Failed to get graph files from RAG service"}), 500

    except requests.exceptions.RequestException as e:
        app.logger.error(f"❌ RAG service connection error: {str(e)}")
        return jsonify({"error": "Could not connect to RAG service"}), 500
    except Exception as e:
        app.logger.error(f"❌ API Error in get_graph_files: {str(e)}")
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5050)), debug=True)
