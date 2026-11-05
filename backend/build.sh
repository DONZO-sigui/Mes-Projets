#!/usr/bin/env bash
set -e

pip install -r requirements.txt
python -m alembic upgrade head
