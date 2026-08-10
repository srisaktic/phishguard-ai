FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ git git-lfs && \
    git lfs install && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN python -c "import nltk; nltk.download('stopwords'); nltk.download('punkt_tab'); nltk.download('wordnet')"

# Clone repo with git-lfs to get actual model files (not pointer files)
RUN git clone https://github.com/srisaktic/phishguard-ai.git /tmp/repo && \
    mv /tmp/repo/models ./models && \
    rm -rf /tmp/repo

COPY run_backend.py models.py ./

EXPOSE 7860

CMD ["python", "run_backend.py"]
