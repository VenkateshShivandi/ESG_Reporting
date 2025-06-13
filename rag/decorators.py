from functools import wraps
import os
import flask
from rag.initialize_neo4j import Neo4jGraphInitializer


def require_neo4j(f):
    """
    Decorator to ensure Neo4j is available before running the endpoint logic.
    Returns 503 if Neo4j is unavailable.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            neo4j_uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
            neo4j_username = os.getenv("NEO4J_USERNAME", None)
            neo4j_password = os.getenv("NEO4J_PASSWORD", None)
            initializer = Neo4jGraphInitializer(
                uri=neo4j_uri,
                user=neo4j_username or None,
                password=neo4j_password or None,
            )
            if not Neo4jGraphInitializer.wait_for_neo4j(uri=neo4j_uri):
                raise Exception("Neo4j not ready")
            driver = initializer.getNeo4jDriver()
            with driver.session() as session:
                session.run("RETURN 1 AS check")
        except Exception as e:
            return flask.jsonify({
                "error": "Neo4j service unavailable",
                "details": str(e)
            }), 503
        return f(*args, **kwargs)
    return decorated_function 