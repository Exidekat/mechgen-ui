# NRVV Stack Template Information

This is a production-ready full-stack web application template.

## Stack Components

- **N**eon - Serverless PostgreSQL database
- **R**eact - Frontend framework (v18 with TypeScript)
- **V**ercel - Serverless deployment platform
- **V**ite - Build tool and dev server

## Quick Start

```bash
# 1. Copy this template to your new project
cp -r submodules/NRVV/ ../my-new-project

# 2. Install dependencies
cd ../my-new-project
bun install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your database URL

# 4. Run migrations
bun run migrate

# 5. Start dev server
bun run dev
```

## What's Included

### Frontend
- React 18 with TypeScript strict mode
- Vite 4 for fast HMR
- Tailwind CSS 3.4 with animations
- Radix UI for accessible components
- Lucide React for icons
- Example components (Clock, AnimatedHeaders, EventSelector)

### Backend
- Vercel serverless functions
- File-based API routing
- CORS configured
- TypeScript support

### Database
- Neon PostgreSQL client
- Migration system
- Example schema (events table)
- Database utility functions

### Configuration
- TypeScript with strict mode
- Path aliases (@/ for src/)
- Tailwind custom config
- PostCSS with autoprefixer
- Vercel deployment config

## Example Structure

The template includes a working example app (Heat Death Clock) that demonstrates:
- API integration with fetch
- Database queries
- Component composition
- State management with hooks
- Responsive design
- Animated transitions

You can keep these as examples or replace them with your own implementation.

## Customization Tips

1. **Update package.json**: Change name, version, description
2. **Replace components**: The example components in `/frontend/src/components/` can be replaced
3. **Modify database schema**: Edit `scripts/migrate.sql` for your data model
4. **Add API routes**: Create new files in `/api/` following the pattern
5. **Style customization**: Update `tailwind.config.js` and `frontend/src/index.css`

## Technology Choices

### Why Bun?
- 3-10x faster than Node.js
- Built-in TypeScript support
- Drop-in npm replacement

### Why Neon?
- Serverless (pay per use)
- Instant provisioning
- Built-in connection pooling
- Great free tier

### Why Vercel?
- Optimized for Next.js/React
- Serverless functions
- Automatic HTTPS
- Edge network
- Great DX

### Why Vite?
- Instant HMR
- Fast builds
- Modern ESM-based
- Great plugin ecosystem

## Production Checklist

Before deploying:
- [ ] Set environment variables in Vercel
- [ ] Run database migrations
- [ ] Test build locally (`bun run build`)
- [ ] Configure custom domain (optional)
- [ ] Set up monitoring/logging
- [ ] Review security headers in `vercel.json`

## License

MIT - Feel free to use this template for any project.
