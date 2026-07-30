#!/bin/bash
# Levantar MedFlow Pro en desarrollo
# Uso: ./dev.sh

set -e

echo "==> Levantando backend (Docker)..."
docker compose up -d --build backend
echo "   ✅ Backend en http://localhost:8000"

echo ""
echo "==> Levantando frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
  echo "   Instalando dependencias..."
  npm install
fi
npx vite --host 0.0.0.0 &
VITE_PID=$!
cd ..

echo "   ✅ Frontend en http://localhost:5173"
echo ""
echo "Presiona Ctrl+C para detener todo"
trap "kill $VITE_PID 2>/dev/null; docker compose stop frontend 2>/dev/null; exit 0" INT TERM

wait
