from openai import OpenAI
import os
import json
from rag.initialize_neo4j import Neo4jGraphInitializer
from supabase import create_client
from datetime import datetime


class Prompts:
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    @staticmethod
    def query_classification(user_query):
        return f"""
        You are a helpful assistant. Your task is to classify a user query into one of the following types:

    - **global**: The query asks for a broad, high-level summary across an entire dataset or a wide theme (e.g., "What are the key trends in sustainability in 2023?").
    - **entity**: The query focuses on one or more specific entities or items (e.g., "What were Tesla's labor practices like in 2023?").

    ---

        **Query**: "{user_query}"

        **Instructions**:
        1. Classify the query as either **global** or **entity**.
        2. If the query is **global**, leave the `entities` array empty.
    3. If the query is **entity**, extract the relevant entities (e.g., company names, risks, regions, or specific metrics) and list them in the `entities` array.

    **Output format** (JSON):
    ```json
    {{
    "query": "{user_query}",
    "type": "<global | entity>",
    "entities": ["<entity1>", "<entity2>", ...]
    }}
    """

    @staticmethod
    def generate_report(documents, report_type, custom_prompt):
        base_prompt = """You are an expert ESG reporting assistant specialized in generating comprehensive, structured reports compliant with {standard} standards ({year}). Your task is to synthesize information from the provided documents into clear, actionable, and reference-backed report sections.

        Use the following instructions:

        1. Adhere strictly to the {standard} {year} reporting framework relevant to the selected report type.
        2. Extract and summarize key findings, mitigation strategies, metrics, boundaries, and reporting periods as applicable.
        3. Include precise references to original data sources or community summaries using identifiers.
        4. Structure the report for readability and compliance, providing JSON-compatible output with fields for summary, mitigation, period, boundary, references, and scores.
        5. The scores field should be a JSON object containing numeric scores for the report’s overall Environmental, Social, and Governance performance, using keys: "environmental", "social", and "governance".
        6. Incorporate the user's custom prompt preferences, such as tone, depth, or focus areas, without deviating from ESG compliance.
        7. When data is missing or unclear, clearly state assumptions or limitations.

        Document Summaries to analyze to build the report:
        {documents}

        Custom user instructions for the report to decide the nature and style of the report:
        {custom_prompt}

        Begin your report synthesis below. Output your response strictly as a JSON object with the following keys: "summary", "mitigation", "period", "boundary", "references", and "scores" (which contains "environmental", "social", and "governance" numeric scores).
        """

        if report_type.lower() == "gri":
            standard = "Global Reporting Initiative (GRI)"
            year = "2021"
        elif report_type.lower() == "sasb":
            standard = "Sustainability Accounting Standards Board (SASB)"
            year = "latest"
        else:
            raise ValueError(f"Report type {report_type} not supported")

        return base_prompt.format(
            standard=standard,
            year=year,
            documents=documents,
            custom_prompt=custom_prompt,
        )


class LLMService:
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model = "gpt-3.5-turbo"
        self.neo4j_client = Neo4jGraphInitializer()
        self.driver = self.neo4j_client.getNeo4jDriver()
        self.session = self.driver.session()

    def normalize_request(self, request):
        "Use gpt-4o to normalize the request to a structured format"
        prompt = Prompts.query_classification(request)
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )
        response_json = json.loads(response.choices[0].message.content)
        return response_json

    def select_community_summaries(self, request):
        # Get the user's query
        user_query = request.query

        # Get the community summaries
        # TODO: Get the community summaries from the database
        community_summaries = []
        # Neo4j query to get the community summaries
        query = """
        MATCH (n:Summary)
        RETURN n.summary
        """
        results = self.client.query(query)
        community_summaries = [result["n.summary"] for result in results]

        # Select the relevant summaries
        # TODO: Select the relevant summaries from the community summaries
        return community_summaries

    def select_relevant_summaries(self, request):
        """Select the relevant summaries from the community summaries"""
        # Get the user's query
        try:
            user_query = request.get("query")
            entities = request.get("entities")
            # Get the community summaries
            # TODO: Get the community summaries from the database
            community_summaries = []
            # Neo4j query to get the community summaries
            query = """
            MATCH (n:Summary)
            WHERE n.entities CONTAINS $entities
            RETURN n.summary
            """
            results = self.neo4j_client.query(query, {"entities": entities})
            community_summaries = [result["n.summary"] for result in results]

            # Select the relevant summaries
            # TODO: Select the relevant summaries from the community summaries
            return community_summaries
        except Exception as e:
            print(e)
            return []

    def map_step(self, summaries, query):
        partial_answers = [
            self.generate_partial_answer(query, summary) for summary in summaries
        ]
        return partial_answers

    def generate_partial_answer(self, query, summary):
        """Generate a partial answer from the summary"""
        # Use gpt-4o-mini to generate a partial answer from the summary
        prompt = f"""
        You are a helpful assistant. Your task is to generate a partial answer from the following summary:

        **Summary**: "{summary}"

        **Query**: "{query}"
        """
        response = self.client.chat.completions.create(
            model="gpt-4o-mini", prompt=prompt, max_tokens=200
        )
        return response.choices[0].text.strip()

    def rank_answers(self, partial_answers, threshold=50):
        scored_answers = [
            (answer, score) for answer, score in partial_answers if score > threshold
        ]
        ranked_answers = sorted(scored_answers, key=lambda x: x[1], reverse=True)
        return ranked_answers

    def generate_global_answer(self, query, top_answers):
        # Combine the top N answers into a final global answer
        combined_answers = "\n".join([answer for answer, score in top_answers])
        response = self.client.chat.completions.create(
            model="gpt-4o-mini",
            prompt=f"Summarize the following partial answers into a final global response:\n\n{combined_answers}",
            max_tokens=200,
        )
        return response.choices[0].text.strip()

    def handle_query(self, query):
        # Step 1: Retrieve relevant summaries from the graph
        normalized_request = self.normalize_request(query)
        if normalized_request.get("type") == "global":
            summaries = self.select_community_summaries(normalized_request)
        elif normalized_request.get("type") == "entity":
            summaries = self.select_relevant_summaries(normalized_request)

        # Step 2: Generate partial answers from community summaries
        partial_answers = self.map_step(summaries, query)

        # Step 3: Rank and filter partial answers
        ranked_answers = self.rank_answers(partial_answers)

        # Step 4: Combine top-ranked answers into a global answer
        global_answer = self.generate_global_answer(
            query, ranked_answers[:5]
        )  # Top 5 answers

        return global_answer

    def generate_report(self, document_ids, report_type, custom_prompt):
        try:
            # TODO: Fetch the descriptions of all the entities connected to the document ids
            extractor_query = """
            MATCH (n:Entity)
            WHERE n.document_id IN $document_ids
            RETURN n.description
            """
            # run the query
            results = self.session.run(extractor_query, {"document_ids": document_ids})
            results = [result["n.description"] for result in results]
            chunks = [results[i : i + 60] for i in range(0, len(results), 60)]
            final_content = ""
            for chunk in chunks:
                content = Prompts.generate_report(chunk, report_type, custom_prompt)

                # TODO: Use model string to generate the report using the community summaries
                message_response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {
                            "role": "system",
                            "content": (
                                "You are a helpful ESG reporting assistant. "
                                "When answering, respond only with a single valid JSON object matching this schema: "
                                "{'summary': string, 'mitigation': string, 'period': string, 'boundary': string, "
                                "'references': list of strings, 'scores': {'environmental': number, 'social': number, 'governance': number}}"
                            ),
                        },
                        {"role": "user", "content": content},
                    ],
                    max_tokens=4000,
                    temperature=0,  # optional: set low temperature for more deterministic output
                )
                final_content += message_response.choices[0].message.content
            # Save the report to the database
            # TODO: Save the report to the database
            supabase = create_client(
                os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY")
            )
            timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
            file_name = f"{report_type}_{timestamp}.txt"
            supabase.storage.from_("reports").upload(
                file_name,
                final_content.encode("utf-8"),
                {"content-type": "text/plain"},
            )
            public_url = supabase.storage.from_("reports").get_public_url(file_name)
            return file_name, public_url
        except Exception as e:
            print(e)
            return None
