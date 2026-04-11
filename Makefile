up:
	docker compose -f infra/compose/docker-compose.dev.yml up --build

down:
	docker compose -f infra/compose/docker-compose.dev.yml down

logs:
	docker compose -f infra/compose/docker-compose.dev.yml logs -f

api-shell:
	docker compose -f infra/compose/docker-compose.dev.yml exec api bash

db-shell:
	docker compose -f infra/compose/docker-compose.dev.yml exec postgres psql -U tony -d learnex