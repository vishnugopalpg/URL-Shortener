# URL Shortener

![Java](https://img.shields.io/badge/Java-17-orange?logo=openjdk)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2-green?logo=spring)
![React](https://img.shields.io/badge/React-18-blue?logo=react)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue?logo=postgresql)
![Redis](https://img.shields.io/badge/Redis-7-red?logo=redis)

A production-ready, full-stack URL shortener built with Spring Boot, PostgreSQL, Redis, and React.

## Features

- Shorten any URL to a compact 6-character Base62 code
- Optional custom aliases (up to 20 characters)
- Optional expiry dates for links
- Click tracking: records IP address, User-Agent, and referrer per click
- Per-link statistics with a click-over-time chart
- Soft-delete (deactivation) of links
- Redis caching of resolved URLs (1-hour TTL, cache-evicted on delete)
- Swagger UI at `/swagger-ui.html`
- Spring Boot Actuator at `/actuator/health`

## Tech Stack

| Layer     | Technology                                    |
|-----------|-----------------------------------------------|
| Language  | Java 17                                       |
| Backend   | Spring Boot 3.2, Spring Web, Spring Data JPA  |
| Caching   | Redis 7 via Spring Cache (`@Cacheable`)       |
| Database  | PostgreSQL 15, Flyway migrations              |
| Frontend  | React 18, Vite, Axios, Recharts               |
| Build     | Maven (backend), npm (frontend)               |
| Infra     | Docker, Docker Compose                        |
| Tests     | JUnit 5, Mockito, Spring Boot Test            |

## Getting Started

### Prerequisites

- Docker and Docker Compose
- (Optional, for local dev) Java 17, Maven 3.9, Node 18+

### Run with Docker Compose

```bash
# Clone the repository
git clone <repo-url>
cd url-shortener

# Build and start all services (PostgreSQL, Redis, app)
docker-compose up --build

# The app is now available at http://localhost:8080
# Swagger UI: http://localhost:8080/swagger-ui.html
```

### Run locally (without Docker)

**Backend** — requires PostgreSQL and Redis running locally:

```bash
# Start dependencies only
docker-compose up postgres redis -d

# Build and run the Spring Boot app
./mvnw spring-boot:run
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
# Available at http://localhost:3000
```

## API Reference

### POST /api/urls — Create a short URL

**Request:**
```json
{
  "originalUrl": "https://www.example.com/very/long/path?q=123",
  "customAlias": "my-link",
  "expiresAt": "2025-12-31T23:59:59"
}
```

`customAlias` and `expiresAt` are optional.

**Response (201 Created):**
```json
{
  "shortCode": "my-link",
  "shortUrl": "http://localhost:8080/my-link",
  "originalUrl": "https://www.example.com/very/long/path?q=123",
  "clickCount": 0,
  "createdAt": "2024-04-13T10:00:00",
  "expiresAt": "2025-12-31T23:59:59",
  "isActive": true,
  "clickTimestamps": []
}
```

---

### GET /{code} — Redirect to original URL

**Response:** `302 Found` with `Location` header pointing to the original URL.

**Error (404):**
```json
{ "error": "Short code not found: abc123" }
```

---

### GET /api/urls/{code}/stats — Get click statistics

**Response (200 OK):**
```json
{
  "shortCode": "abc123",
  "shortUrl": "http://localhost:8080/abc123",
  "originalUrl": "https://www.example.com",
  "clickCount": 42,
  "createdAt": "2024-04-01T09:00:00",
  "expiresAt": null,
  "isActive": true,
  "clickTimestamps": [
    "2024-04-10T14:22:01",
    "2024-04-11T09:05:33"
  ]
}
```

---

### DELETE /api/urls/{code} — Deactivate a link

**Response:** `204 No Content`

Soft-deletes the link (`isActive = false`). Future redirects return 404. The record and click history are preserved.

---

## Database Schema

### `url` table

| Column       | Type        | Notes                          |
|--------------|-------------|--------------------------------|
| id           | BIGSERIAL   | Primary key                    |
| short_code   | VARCHAR(20) | Unique, indexed                |
| original_url | TEXT        | The destination URL            |
| user_id      | BIGINT      | Nullable (future auth support) |
| created_at   | TIMESTAMP   | Auto-set on insert             |
| expires_at   | TIMESTAMP   | Nullable                       |
| is_active    | BOOLEAN     | Default true, false = deleted  |

### `click` table

| Column     | Type         | Notes                         |
|------------|--------------|-------------------------------|
| id         | BIGSERIAL    | Primary key                   |
| url_id     | BIGINT       | FK → url(id), CASCADE delete  |
| clicked_at | TIMESTAMP    | Auto-set on insert            |
| ip_address | VARCHAR(45)  | IPv4 or IPv6                  |
| user_agent | VARCHAR(500) | Browser/client string         |
| referer    | VARCHAR(500) | Referring page                |

## What I Built and Why

### Layered Architecture

The project follows the classic Controller → Service → Repository pattern. Controllers are thin — they handle HTTP concerns (status codes, request parsing) and delegate all business logic to the service layer. Services are `@Transactional` and own the domain rules. Repositories are pure Spring Data JPA interfaces. This separation makes unit testing straightforward: service tests mock repositories, and controller tests mock the service.

### Redis Caching Strategy

The `resolve` method (the hot path — called on every redirect) is annotated with `@Cacheable(cacheNames="urls", key="#code")`. The first resolution hits PostgreSQL and saves a Click record; subsequent calls for the same code are served from Redis with zero DB round-trips. The `delete` method uses `@CacheEvict` to keep the cache consistent when a link is deactivated. TTL is set to 1 hour, balancing freshness with cache hit rate.

### Flyway over `ddl-auto`

Using Flyway (rather than Hibernate's `ddl-auto: create`) gives repeatable, version-controlled schema migrations that work identically in development, CI, and production. `ddl-auto: validate` ensures the app refuses to start if the schema drifts from what the entities expect.

### Soft Deletes

Links are never hard-deleted. Setting `isActive = false` preserves click history for analytics and allows future "restore" functionality. The cache is evicted immediately on deactivation so redirects return 404 without waiting for the TTL to expire.

### Global Exception Handling

A `@RestControllerAdvice` catches `UrlNotFoundException` (404), `MethodArgumentNotValidException` (400 with field-level messages), and any unhandled `Exception` (500). Controllers contain no try/catch blocks, and error responses are consistent across the entire API.
