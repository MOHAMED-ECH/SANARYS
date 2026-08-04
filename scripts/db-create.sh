#!/usr/bin/env bash
set -euo pipefail

sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname = 'sanarys'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE ROLE sanarys WITH LOGIN PASSWORD 'sanarys' CREATEDB;"

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = 'sanarys_dev'" | grep -q 1 \
  || sudo -u postgres createdb -O sanarys sanarys_dev

echo "Base sanarys_dev prete (role sanarys)."
