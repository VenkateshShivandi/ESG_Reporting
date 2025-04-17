# Use a lightweight Python base image suitable for production
FROM python:3.9-slim

# Set the working directory inside the container
WORKDIR /app

# Copy only the requirements file first to leverage Docker cache
COPY requirements.txt ./
# Install Python dependencies
# --no-cache-dir: Disables the cache to keep the image size smaller
# -r: Install from the given requirements file
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code into the container
COPY . .

# Inform Docker that the container listens on the specified network port at runtime
EXPOSE 6050

# Set environment variables for running the Flask app
ENV FLASK_APP=rag_app.py    # Points Flask to the main application file
ENV FLASK_RUN_HOST=0.0.0.0 # Makes the server publicly available (within the container network)
ENV FLASK_RUN_PORT=6050    # Port Flask development server will listen on
# PYTHONUNBUFFERED=1: Prevents Python from buffering stdout/stderr,
# ensuring logs appear immediately in Docker logs.
ENV PYTHONUNBUFFERED=1

# Define the command to run the Flask application using the development server
# Use the array form for CMD to avoid shell processing issues
CMD ["flask", "run"] 