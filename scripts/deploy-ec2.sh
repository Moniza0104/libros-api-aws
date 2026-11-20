#!/bin/bash
# Este script se copia a EC2 como /opt/libros-api/deploy.sh
set -Eeuo pipefail

NEW_IMAGE="${1:?Debe indicarse la imagen Docker nueva}"
APP_DIR="/opt/libros-api"
ENV_FILE="$APP_DIR/.env"
APP_NAME="libros-api"
PREVIOUS_NAME="libros-api-previous"
CANDIDATE_NAME="libros-api-candidate"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "No existe $ENV_FILE. Configure allí las variables de RDS."
  exit 1
fi

# Primero se prueba la imagen en un puerto local alternativo.
docker pull "$NEW_IMAGE"
docker rm -f "$CANDIDATE_NAME" >/dev/null 2>&1 || true
docker run -d --name "$CANDIDATE_NAME" --env-file "$ENV_FILE" \
  -e APP_VERSION="$NEW_IMAGE" -p 127.0.0.1:3001:3000 "$NEW_IMAGE" >/dev/null

healthy=0
for attempt in $(seq 1 20); do
  if curl --fail --silent http://127.0.0.1:3001/health >/dev/null && \
     curl --fail --silent http://127.0.0.1:3001/libros >/dev/null; then
    healthy=1
    break
  fi
  sleep 3
done

docker rm -f "$CANDIDATE_NAME" >/dev/null 2>&1 || true
if [[ "$healthy" -ne 1 ]]; then
  echo "La imagen nueva no superó la comprobación previa. No se modifica la versión activa."
  exit 1
fi

# Se conserva el contenedor anterior para poder volver atrás.
docker rm -f "$PREVIOUS_NAME" >/dev/null 2>&1 || true
if docker container inspect "$APP_NAME" >/dev/null 2>&1; then
  docker stop "$APP_NAME" >/dev/null
  docker rename "$APP_NAME" "$PREVIOUS_NAME"
fi

if docker run -d --restart unless-stopped --name "$APP_NAME" \
  --env-file "$ENV_FILE" -e APP_VERSION="$NEW_IMAGE" \
  -p 127.0.0.1:3000:3000 "$NEW_IMAGE" >/dev/null; then
  for attempt in $(seq 1 20); do
    if curl --fail --silent http://127.0.0.1:3000/health >/dev/null && \
       curl --fail --silent http://127.0.0.1:3000/libros >/dev/null; then
      docker rm -f "$PREVIOUS_NAME" >/dev/null 2>&1 || true
      echo "Despliegue correcto: $NEW_IMAGE"
      curl --fail --silent http://127.0.0.1:3000/health
      exit 0
    fi
    sleep 3
  done
fi

# Si la versión nueva falla, se restaura el contenedor anterior.
echo "Falló la comprobación posterior. Iniciando rollback..."
docker rm -f "$APP_NAME" >/dev/null 2>&1 || true
if docker container inspect "$PREVIOUS_NAME" >/dev/null 2>&1; then
  docker rename "$PREVIOUS_NAME" "$APP_NAME"
  docker start "$APP_NAME" >/dev/null
  echo "Se restauró la versión anterior."
else
  echo "No había una versión anterior disponible para restaurar."
fi
exit 1
