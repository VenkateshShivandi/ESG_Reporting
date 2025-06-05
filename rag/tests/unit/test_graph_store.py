import pytest
from unittest.mock import patch, MagicMock
from rag.graph_store import Neo4jGraphStore


@pytest.fixture
def store():
    return Neo4jGraphStore()


def test_connect_success(store):
    with patch("rag.graph_store.GraphDatabase.driver") as mock_driver:
        mock_session = MagicMock()
        mock_driver.return_value.session.return_value.__enter__.return_value = (
            mock_session
        )
        mock_session.run.return_value.single.return_value = {"test": 1}

        assert store.connect() is True


def test_connect_failure(store):
    with patch(
        "rag.graph_store.GraphDatabase.driver",
        side_effect=Exception("Connection error"),
    ):
        assert store.connect() is False


def test_import_entities(store):
    with patch.object(store, "driver", create=True):
        mock_session = MagicMock()
        store.driver.session.return_value.__enter__.return_value = mock_session
        mock_session.run.return_value.consume.return_value.counters.nodes_created = 1

        entities = [{"name": "Entity1", "type": "Type1"}]
        assert store.import_entities(entities) == 1


def test_import_relationships(store):
    with patch.object(store, "driver", create=True):
        mock_session = MagicMock()
        store.driver.session.return_value.__enter__.return_value = mock_session
        mock_session.run.return_value.consume.return_value.counters.relationships_created = (
            1
        )

        relationships = [
            {"source": "Entity1", "target": "Entity2", "description": "related"}
        ]
        assert store.import_relationships(relationships) == 1
