
from openai import OpenAI
import os

class Prompts:
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    @staticmethod
    def query_classification(user_query):
        return f'''
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
    {
    "query": "{{user_query}}",
    "type": "<global | entity>",
    "entities": ["<entity1>", "<entity2>", ...]
    }
    '''


class LLMService:
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model = "gpt-3.5-turbo"
    def normalize_request(self, request):
        "Use gpt-4o to normalize the request to a structured format"
        prompt = Prompts.query_classification(request)
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        return response.choices[0].message.content
    
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
        '''Select the relevant summaries from the community summaries'''
        # Get the user's query
        user_query = request.query
        
        # Get the community summaries
        # TODO: Get the community summaries from the database
        community_summaries = []
        # Neo4j query to get the community summaries
        query = """
        MATCH (n:Summary)
        WHERE n.entities CONTAINS "{user_query}"
        RETURN n.summary
        """
        results = self.client.query(query)
        community_summaries = [result["n.summary"] for result in results]
        
        # Select the relevant summaries
        # TODO: Select the relevant summaries from the community summaries
        return community_summaries

    def map_step(self, summaries, query):
        partial_answers = [self.generate_partial_answer(query, summary) for summary in summaries]
        return partial_answers
    
    def generate_partial_answer(self, query, summary):
        '''Generate a partial answer from the summary'''
        # Use gpt-4o-mini to generate a partial answer from the summary
        prompt = f'''
        You are a helpful assistant. Your task is to generate a partial answer from the following summary:

        **Summary**: "{summary}"

        **Query**: "{query}"
        '''
        response = self.client.chat.completions.create(
            model="gpt-4o-mini",
            prompt=prompt,
            max_tokens=200
        )
        return response.choices[0].text.strip()

    def rank_answers(self, partial_answers, threshold=50):
        scored_answers = [(answer, score) for answer, score in partial_answers if score > threshold]
        ranked_answers = sorted(scored_answers, key=lambda x: x[1], reverse=True)
        return ranked_answers
    
    def generate_global_answer(self, query, top_answers):
        # Combine the top N answers into a final global answer
        combined_answers = "\n".join([answer for answer, score in top_answers])
        response = self.client.chat.completions.create(
            model="gpt-4o-mini", 
            prompt=f"Summarize the following partial answers into a final global response:\n\n{combined_answers}",
            max_tokens=200
        )
        return response.choices[0].text.strip()
    
    def handle_query(self, query):
        # Step 1: Retrieve relevant summaries from the graph
        normalized_request = self.normalize_request(query)
        if normalized_request.get("global"):
            summaries = self.select_community_summaries(normalized_request)
        elif normalized_request.get("entity"):
            summaries = self.select_relevant_summaries(normalized_request)
        
        # Step 2: Generate partial answers from community summaries
        partial_answers = self.map_step(summaries, query)
        
        # Step 3: Rank and filter partial answers
        ranked_answers = self.rank_answers(partial_answers)
        
        # Step 4: Combine top-ranked answers into a global answer
        global_answer = self.generate_global_answer(query, ranked_answers[:5])  # Top 5 answers
        
        return global_answer

    def generate_report(self, document_ids):
        pass