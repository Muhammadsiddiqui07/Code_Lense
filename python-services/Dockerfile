# 1. Base image: Python 3.12 ka lightweight Linux version
FROM python:3.12-slim

# 2. Container ke andar working folder set karo
WORKDIR /app

# 3. Git install karo (GitPython ko repo clone karne ke liye git CLI chahiye)
RUN apt-get update && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*

# 4. Pehle sirf requirements.txt copy aur install karo (Docker layer caching ke liye)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt --default-timeout=120 --retries 10

# 5. Build ke waqt hi default embedding model download kar lo (taake runtime par wait na ho)
RUN python -c "import chromadb.utils.embedding_functions as ef; ef.DefaultEmbeddingFunction()(['warmup'])"

# 6. Ab baqi saara project code container mein copy karo
COPY . .

# 7. FastAPI server ko port 8000 par run karo
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]