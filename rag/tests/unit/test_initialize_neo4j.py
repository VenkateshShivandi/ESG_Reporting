import pytest
from unittest.mock import patch, MagicMock
from rag.initialize_neo4j import Neo4jGraphInitializer
import subprocess


@pytest.fixture
def initializer():
    return Neo4jGraphInitializer()


@patch.object(Neo4jGraphInitializer, "wait_for_neo4j", return_value=True)
def test_start_neo4j_docker_container_success(mock_wait):
    with patch("subprocess.run") as mock_run:
        mock_run.return_value.stdout = ""
        mock_run.return_value.returncode = 0
        assert Neo4jGraphInitializer.startNeo4jDockerContainer() is True


@patch("subprocess.run", side_effect=subprocess.CalledProcessError(1, "docker"))
@patch.object(Neo4jGraphInitializer, "wait_for_neo4j", return_value=False)
def test_start_neo4j_docker_container_failure(mock_wait, mock_run):
    try:
        result = Neo4jGraphInitializer.startNeo4jDockerContainer()
    except subprocess.CalledProcessError:
        result = False
    assert result is False


def test_create_org_node(initializer):
    with patch.object(initializer, "driver", create=True):
        mock_session = MagicMock()
        initializer.driver.session.return_value.__enter__.return_value = mock_session
        initializer.createOrgNode("org1")
        mock_session.run.assert_called_once_with(
            """
                MATCH (r:Root {name: 'root'})
                MERGE (o:Org {org_id: $orgId})
                MERGE (r)-[:HAS_ORG]->(o)
            """,
            {"orgId": "org1"},
        )


def test_create_user_node(initializer):
    with patch.object(initializer, "driver", create=True):
        mock_session = MagicMock()
        initializer.driver.session.return_value.__enter__.return_value = mock_session
        initializer.createUserNode("user1", "user1@example.com", orgId="org1")
        mock_session.run.assert_called_once_with(
            """
                    MATCH (o:Org {org_id: $orgId})
                    MERGE (u:User {user_id: $userId, email: $email})
                    MERGE (o)-[:HAS_USER]->(u)
                """,
            {"orgId": "org1", "userId": "user1", "email": "user1@example.com"},
        )
