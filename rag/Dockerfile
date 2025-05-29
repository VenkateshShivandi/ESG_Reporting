FROM python:3.11-slim

# Set working directory
WORKDIR /rag

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Set environment and port

EXPOSE 8000

# Start the Flask app
CMD ["python", "app.py"]
