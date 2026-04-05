# ── Base: Python 3.12 sobre x86_64 (linux/amd64) ──
FROM --platform=linux/amd64 python:3.12-slim

# ── Dependencias del sistema ──
RUN apt-get update && apt-get install -y --no-install-recommends \
  curl \
  git \
  zip \
  unzip \
  && rm -rf /var/lib/apt/lists/*

# ── Node.js 20 LTS (necesario para Serverless Framework) ──
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
  && apt-get install -y --no-install-recommends nodejs \
  && rm -rf /var/lib/apt/lists/*

# ── Serverless Framework v4 ──
RUN npm install -g serverless@4

# ── Dependencias de Python del proyecto ──
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# ── Directorio de trabajo ──
WORKDIR /app
COPY . /app

# ── Verificación rápida ──
RUN python --version && node --version && serverless --version

ENTRYPOINT ["/bin/bash"]
