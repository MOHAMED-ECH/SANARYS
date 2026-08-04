#!/usr/bin/env bash
set -euo pipefail

STATUS=$(pg_lsclusters --no-header | awk '$1=="16" && $2=="main" {print $4}')

if [ "$STATUS" = "online" ]; then
  echo "PostgreSQL 16/main deja demarre."
else
  echo "Demarrage de PostgreSQL 16/main..."
  pg_ctlcluster 16 main start
fi
