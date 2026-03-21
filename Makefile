# Makefile — developer shortcuts
# Run any target with: make <target>

.PHONY: up down logs test lint seed e2e clean

# Start all services (builds images if needed)
up:
	docker compose up --build

# Start in background (detached mode)
up-d:
	docker compose up --build -d

# Stop all services and remove containers
down:
	docker compose down

# Follow logs for all services
logs:
	docker compose logs -f

# Follow logs for a specific service: make logs-user
logs-%:
	docker compose logs -f $*

# Run all unit tests across all services
test:
	cd user-service && npm test
	cd order-service && npm test
	cd menu-service && python -m pytest tests/ -v
	cd notify-service && python -m pytest tests/ -v
	cd frontend && npm test -- --watchAll=false

# Run linters across all services
lint:
	cd user-service && npm run lint
	cd order-service && npm run lint
	cd menu-service && ruff check .
	cd notify-service && ruff check .
	cd frontend && npm run lint

# Seed all databases with test data
seed:
	node scripts/seed-users.js
	node scripts/seed-menu.js

# Run end-to-end smoke test
e2e:
	node scripts/e2e-smoke.js

# Remove all build artifacts and node_modules
clean:
	rm -rf user-service/node_modules user-service/coverage
	rm -rf order-service/node_modules order-service/coverage
	rm -rf frontend/node_modules frontend/dist
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type d -name .pytest_cache -exec rm -rf {} +
