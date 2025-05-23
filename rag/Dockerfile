FROM python:3.11-slim
WORKDIR /rag

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PORT=6050
EXPOSE 6050

CMD ["python", "app.py"]
