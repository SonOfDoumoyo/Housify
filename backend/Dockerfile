FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# ffmpeg is needed server-side for video probing; curl for the healthcheck;
# postgresql-client for pg_isready in the entrypoint wait loop.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg curl postgresql-client \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY alembic.ini ./
COPY migrations ./migrations
COPY app ./app
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 8000

# The entrypoint waits for Postgres/Redis, runs `alembic upgrade head`
# BEFORE the app starts (the app creates tables on startup, so the
# migrations must run first), then starts the server.
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
