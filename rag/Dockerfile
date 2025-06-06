FROM python:3.11-slim

# Set working directory
WORKDIR /rag

# Install system dependencies including curl for health checks
RUN apt-get update && apt-get install -y \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Set environment and port

EXPOSE 8000

# Start the Flask app
CMD ["python", "app.py"]
