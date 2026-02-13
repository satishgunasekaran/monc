# Astrology Website

Next.js application with Supabase backend for astrology bookings and products.

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS 4
- **Backend**: Supabase (Auth, Database, Storage)
- **Package Manager**: pnpm

## Getting Started

```bash
pnpm install
pnpm dev
```

## Supabase

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

### Local Development

```bash
# Start local Supabase
pnpm dlx supabase start

# Stop local Supabase
pnpm dlx supabase stop

# Check status
pnpm dlx supabase status
```

### Local URLs

| Service  | URL                                                          |
| -------- | ------------------------------------------------------------ |
| Studio   | http://127.0.0.1:54323                                       |
| API      | http://127.0.0.1:54321                                       |
| Mailpit  | http://127.0.0.1:54324                                       |
| Database | postgresql://postgres:postgres@127.0.0.1:54322/postgres      |

### Schema & Migrations

We use **declarative schemas** — define tables in `supabase/schemas/` and auto-generate migrations.

#### Schema Files (`supabase/schemas/`)

| File           | Description                        |
| -------------- | ---------------------------------- |
| `profiles.sql` | User profiles (extends auth.users) |
| `sessions.sql` | Booking appointments               |
| `products.sql` | Products catalog                   |
| `orders.sql`   | Orders and order items             |

#### Workflow

```bash
# 1. Edit schema files in supabase/schemas/

# 2. Reset local DB to apply schemas
pnpm dlx supabase db reset

# 3. Auto-generate migration from schema changes
pnpm dlx supabase db diff -f <migration_name>

# 4. Push migration to remote (production)
pnpm dlx supabase db push
```

#### Other Migration Commands

```bash
# Create a blank migration manually
pnpm dlx supabase migration new <migration_name>

# List migrations
pnpm dlx supabase migration list
```

### Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```
