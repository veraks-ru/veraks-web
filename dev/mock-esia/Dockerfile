FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /srv
# PyJWT+cryptography — подпись id_token (RS256) и выдача JWKS, см. app.py.
RUN pip install "fastapi>=0.111" "uvicorn[standard]>=0.30" "python-multipart>=0.0.9" \
    "PyJWT>=2.8" "cryptography>=42.0"
COPY app.py ./
EXPOSE 9000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "9000"]
