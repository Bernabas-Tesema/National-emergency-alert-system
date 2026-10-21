PY := .venv/bin/python
PORT ?= 8088

.PHONY: install test lint run run-offline run-demo smoke eval eval-offline eval-holdout

install:            ## one-time setup
	python3 -m venv .venv
	.venv/bin/pip install -r requirements-dev.txt
	@test -f .env || (cp .env.example .env && echo "Created .env. Put your keys in it.")

test:               ## unit + API tests, no network, no keys needed
	$(PY) -m pytest -q

lint:
	.venv/bin/ruff check app tests evals

run:                ## normal development: live providers
	$(PY) -m uvicorn app.main:create_app --factory --port $(PORT)

run-demo:           ## showcase mode: cache first, providers as backup
	AI_MODE=demo $(PY) -m uvicorn app.main:create_app --factory --port $(PORT)

run-offline:        ## no network at all
	AI_MODE=offline $(PY) -m uvicorn app.main:create_app --factory --port $(PORT)

smoke:              ## hit every endpoint of a running server
	bash scripts/smoke.sh

eval:               ## live providers on the dev split (uses free quota)
	$(PY) -m evals.run_evals --mode live --split dev

eval-holdout:       ## run ONCE after tuning, never tune on it
	$(PY) -m evals.run_evals --mode live --split holdout

eval-offline:       ## rules baseline: the number your AI must beat
	$(PY) -m evals.run_evals --mode offline --split all
