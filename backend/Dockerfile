FROM python:3.13-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PORT=8080

WORKDIR /app

RUN apt-get update \
    && apt-get install --no-install-recommends -y libmagic1 libpq5 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements/runtime.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

COPY . /app
RUN chmod +x /app/cloudflare-entrypoint.sh \
    && addgroup --system django \
    && adduser --system --ingroup django django \
    && chown -R django:django /app

USER django
EXPOSE 8080

ENTRYPOINT ["/app/cloudflare-entrypoint.sh"]
