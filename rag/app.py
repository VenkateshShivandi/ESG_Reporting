import flask
import os
import json
import tempfile
import traceback
from werkzeug.utils import secure_filename
from pathlib import Path
from datetime import datetime

from run_esg_pipeline import ESGPipeline

app = flask.Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB max file size
app.config['UPLOAD_FOLDER'] = tempfile.gettempdir()

@app.route('/api/v1/process-file', methods=['POST'])
def process_file():
    """Process a file through the ESG pipeline and create a graph from it.
    
    Accepts multipart/form-data with a file field named 'file'
    
    Returns:
        JSON response with processing results and graph data
    """
    if 'file' not in flask.request.files:
        return flask.jsonify({"error": "No file provided"}), 400
    
    file = flask.request.files['file']
    if file.filename == '':
        return flask.jsonify({"error": "No file selected"}), 400
    
    # Parameters from request
    output_dir = flask.request.form.get('output_dir', 'pipeline_output')
    chunk_size = int(flask.request.form.get('chunk_size', 600))
    chunk_overlap = int(flask.request.form.get('chunk_overlap', 200))
    max_chunks = int(flask.request.form.get('max_chunks', 0))
    neo4j_uri = flask.request.form.get('neo4j_uri', os.getenv('NEO4J_URI'))
    neo4j_username = flask.request.form.get('neo4j_username', os.getenv('NEO4J_USERNAME'))
    neo4j_password = flask.request.form.get('neo4j_password', os.getenv('NEO4J_PASSWORD'))
    neo4j_database = flask.request.form.get('neo4j_database', 'neo4j')
    
    # Create timestamp for unique directory
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_stem = Path(secure_filename(file.filename)).stem
    unique_output_dir = f"{output_dir}/{file_stem}_{timestamp}"
    
    try:
        # Save uploaded file to temp directory
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], secure_filename(file.filename))
        file.save(file_path)
        
        # Initialize and run the pipeline
        pipeline = ESGPipeline(
            input_path=file_path,
            output_dir=unique_output_dir,
            neo4j_uri=neo4j_uri,
            neo4j_username=neo4j_username, 
            neo4j_password=neo4j_password,
            neo4j_database=neo4j_database,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            max_chunks=max_chunks
        )
        
        # Run the pipeline
        results = pipeline.run()
        
        # Load community insights if available
        community_insights_path = os.path.join(unique_output_dir, "graph", "community_insights.json")
        community_insights = []
        if os.path.exists(community_insights_path):
            with open(community_insights_path, 'r') as f:
                community_insights = json.load(f)
        
        # Clean up the temporary file
        os.remove(file_path)
        
        return flask.jsonify({
            "success": True,
            "message": f"File processed successfully: {file.filename}",
            "results": results,
            "community_insights": community_insights,
            "output_directory": unique_output_dir
        })
    
    except Exception as e:
        # Log the error with traceback
        app.logger.error(f"Error processing file: {str(e)}")
        app.logger.error(traceback.format_exc())
        
        # Clean up temporary file if it exists
        if os.path.exists(file_path):
            os.remove(file_path)
        
        return flask.jsonify({
            "success": False,
            "error": str(e),
            "message": f"Failed to process file: {file.filename}"
        }), 500

@app.route('/api/v1/community-insights', methods=['GET'])
def get_community_insights():
    """Get community insights from a processed file.
    
    Query parameters:
        output_dir: Directory containing the processed file results
    
    Returns:
        JSON response with community insights
    """
    output_dir = flask.request.args.get('output_dir')
    if not output_dir:
        return flask.jsonify({"error": "No output_dir provided"}), 400
    
    community_insights_path = os.path.join(output_dir, "graph", "community_insights.json")
    
    if not os.path.exists(community_insights_path):
        return flask.jsonify({"error": f"No community insights found at {community_insights_path}"}), 404
    
    try:
        with open(community_insights_path, 'r') as f:
            community_insights = json.load(f)
        
        return flask.jsonify({
            "success": True,
            "community_insights": community_insights
        })
    
    except Exception as e:
        return flask.jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=6050)