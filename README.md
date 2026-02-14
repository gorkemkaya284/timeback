# Timeback

A clean, long-term reward platform MVP.

## Tech Stack

- Next.js 14+ with App Router
- TypeScript
- Tailwind CSS
- Supabase (Auth + Postgres)

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env.local
```

Fill in your Supabase credentials:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (for admin operations)
- `ADMIN_EMAILS` (comma-separated list of admin emails)

3. Run the database migrations:
   - Copy the SQL from `supabase/schema.sql`
   - Run it in your Supabase SQL editor

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

- `/src/app` - Next.js App Router pages
- `/src/components` - Reusable React components
- `/src/lib` - Utilities and Supabase client
- `/src/types` - TypeScript type definitions
- `/supabase` - Database schema and migrations
