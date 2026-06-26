FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /srv
RUN pip install "fastapi>=0.111" "uvicorn[standard]>=0.30" "python-multipart>=0.0.9"
COPY app.py ./
EXPOSE 9000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "9000"]
