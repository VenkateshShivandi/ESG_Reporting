from main import Neo4jConnector
import json

def run_sample_queries():
    with Neo4jConnector() as connector:
        # Query 1: Find all entities of type "Organization"
        print("\n=== Organizations ===")
        orgs = connector.executeQuery("""
        MATCH (e:Entity)
        WHERE e.type CONTAINS 'Organization'
        RETURN e.name, e.description
        ORDER BY e.name
        """)
        for org in orgs:
            print(f"- {org['e.name']}: {org['e.description']}")
        
        # Query 2: Find connections to Driscoll
        print("\n=== Connections to Driscoll ===")
        driscoll = connector.executeQuery("""
        MATCH (e:Entity {name: '4. Driscoll'})-[r]->(target)
        RETURN e.name, type(r), r.description, target.name, target.type
        UNION
        MATCH (source)-[r]->(e:Entity {name: '4. Driscoll'})
        RETURN source.name, type(r), r.description, e.name, e.type
        """)
        for rel in driscoll:
            print(f"- {rel[0]} -[{rel[1]}]-> {rel[3]} ({rel[2]})")
        
        # Query 3: Find paths between two entities
        print("\n=== Paths between Locations and Infrastructure ===")
        paths = connector.executeQuery("""
        MATCH path = (a:Entity)-[*1..3]->(b:Entity)
        WHERE a.type CONTAINS 'Location' AND b.type CONTAINS 'Infrastructure'
        RETURN [node in nodes(path) | node.name] AS entity_names,
               [rel in relationships(path) | type(rel)] AS relationship_types
        LIMIT 5
        """)
        for path in paths:
            entities = path['entity_names']
            relations = path['relationship_types']
            path_str = entities[0]
            for i in range(len(relations)):
                path_str += f" -[{relations[i]}]-> {entities[i+1]}"
            print(f"- {path_str}")

if __name__ == "__main__":
    run_sample_queries() 