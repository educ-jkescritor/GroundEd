FROM python:3.12-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY data ./data
COPY registry ./registry
COPY rules ./rules
COPY library ./library

# Run as an unprivileged user. /app/state is the database volume (deploy/docker-compose.yml); creating it here with
# the right owner lets Docker initialise the named volume with that ownership.
RUN useradd --system --uid 10001 --no-create-home groundEd \
    && mkdir -p /app/state /app/data/cache /app/data/uploads \
    && chown -R groundEd /app/state /app/data
USER groundEd

EXPOSE 8000
# Docker marks the container unhealthy (and restart policies can act) if the API stops answering.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=4)"

# --proxy-headers: behind Caddy, read the visitor's address from X-Forwarded-For (needed for per-client draft
# limits). Trusting any proxy is safe here because the backend has no published port; only Caddy can reach it.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*"]
