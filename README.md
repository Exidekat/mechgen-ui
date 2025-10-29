# NRVV Stack Template

**N**eon + **R**eact + **V**ercel + **V**ite

A modern, full-stack web application template with serverless architecture.

## Tech Stack

- **Frontend**: React 18 + TypeScript 5 + Vite 4
- **Styling**: Tailwind CSS 3.4 + PostCSS
- **UI Components**: Radix UI (headless components)
- **Icons**: Lucide React
- **Backend**: Vercel Serverless Functions
- **Database**: PostgreSQL via Neon (serverless)
- **Runtime**: Bun (preferred) or Node.js 18+
- **Deployment**: Vercel

## Features

- Fast development with Vite HMR
- TypeScript strict mode for type safety
- Tailwind CSS with custom animations
- Serverless API routes with Vercel Functions
- PostgreSQL database with migrations
- Responsive design out of the box
- Production-ready build system

## Getting Started

### Prerequisites

- Bun (recommended) or Node.js 18+
- PostgreSQL database (local or Neon)

### Installation

1. Install dependencies:
```bash
bun install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your database connection string:
```env
DATABASE_URL=postgresql://user:password@host:5432/database
# Or use Neon:
POSTGRES_URL=your-neon-connection-string
```

3. Run database migrations:
```bash
bun run migrate
```

4. Start the development server:
```bash
bun run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
bun run build
```

Output will be in `backend/public/`

## Project Structure

```
/frontend          - React SPA
  /src
    /components    - React components
    /lib          - Utilities and helpers
    /types        - TypeScript interfaces
    index.html    - HTML entry point
/api              - Vercel serverless functions
  /[resource]     - API endpoints (file-based routing)
/lib              - Shared code (database client, etc.)
/scripts          - Database migrations and utility scripts
```

## API Routes

API routes are located in `/api` and follow Vercel's file-based routing:

- `/api/events/index.ts` → `GET /api/events`, `POST /api/events`
- `/api/events/[id].ts` → `GET /api/events/123`

Each route exports a default function:
```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Your logic here
}
```

## Database

Database client is in `/lib/db.ts` using Neon's serverless PostgreSQL client.

Migration files are in `/scripts/`:
- `migrate.sql` - SQL schema definitions
- `migrate.js` - Migration runner

Run migrations:
```bash
bun run migrate
```

## Deployment

### Deploy to Vercel

1. Install Vercel CLI:
```bash
bun add -g vercel
```

2. Deploy:
```bash
vercel deploy
```

3. Set environment variables in Vercel dashboard:
   - `DATABASE_URL` or `POSTGRES_URL` - Your database connection string

### Configuration

Deployment is configured in `vercel.json`:
- Build command: `bun run build`
- Output directory: `backend/public`
- SPA rewrites for client-side routing
- CORS headers for API routes

## Development Scripts

```bash
bun run dev      # Start dev server (Vite)
bun run build    # Build for production (TypeScript + Vite)
bun run preview  # Preview production build
bun run migrate  # Run database migrations
```

## Customization

### Styling

Tailwind configuration is in `tailwind.config.js`. Customize:
- Colors and theme
- Custom animations
- Breakpoints
- Plugins

Global styles are in `frontend/src/index.css`.

### TypeScript

TypeScript configuration is in `tsconfig.json`. Strict mode is enabled by default.

Path aliases are configured:
```typescript
import { Component } from '@/components/Component';
```

### Vite

Vite configuration is in `vite.config.ts`. Includes:
- React plugin
- Path aliases
- Build output to `backend/public`
- API proxy for development

## Best Practices

1. **Use Bun**: Faster installation and execution
2. **Type Safety**: Leverage TypeScript strict mode
3. **Component Organization**: Keep components small and focused
4. **API Structure**: Follow REST conventions
5. **Database Migrations**: Always use migrations for schema changes
6. **Environment Variables**: Never commit `.env` files

## Example Use Cases

This template is perfect for:
- SaaS applications
- Data visualization tools
- Interactive web apps
- API-driven frontends
- Serverless full-stack projects

## License

MIT
