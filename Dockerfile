FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download NLTK data so startup doesn't hit SSL issues
RUN python -c "import nltk; nltk.download('stopwords'); nltk.download('punkt_tab'); nltk.download('wordnet')"

COPY run_backend.py models.py ./
COPY models/ models/

EXPOSE 7860

CMD ["python", "run_backend.py"]
