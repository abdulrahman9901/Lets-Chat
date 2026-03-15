FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src /app/src
WORKDIR /app/src

EXPOSE 8000

RUN python manage.py collectstatic --noinput 2>/dev/null || true

CMD ["sh", "-c", "python manage.py migrate --noinput && exec daphne -b 0.0.0.0 -p ${PORT:-8000} Justchat.asgi:application"]
