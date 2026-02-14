# Timeback Setup Guide

## Prerequisites

- Node.js 18+ installed
- A Supabase account and project

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API
3. Copy your Project URL and anon key
4. Go to Project Settings > API > Service Role (keep this secret!)

## Step 3: Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

2. Fill in your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Add your admin email(s) - comma-separated
ADMIN_EMAILS=admin@example.com

# Minimum points required to redeem (default: 100)
MIN_REDEMPTION_THRESHOLD=100
```

## Step 4: Set Up Database

1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Copy the entire contents of `supabase/schema.sql`
4. Paste and run it in the SQL Editor
5. Verify tables were created in the Table Editor

## Step 5: Configure Supabase Authentication

1. Go to Authentication > Providers in Supabase dashboard
2. Enable Email provider (magic link)
3. (Optional) Enable Google OAuth:
   - Add your Google OAuth credentials
   - Set redirect URL: `http://localhost:3000/auth/callback` (for development)
   - Add production URL when deploying

## Step 6: Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Step 7: Create Your First Admin User

1. Sign up with an email address that matches `ADMIN_EMAILS` in `.env.local`
2. You'll automatically have admin access
3. Go to `/app/admin` to manage users, rewards, and view the ledger

## Step 8: Add Test Rewards (Optional)

1. Log in as admin
2. Go to Admin > Rewards
3. Click "Create Reward"
4. Fill in the form and save

## Architecture Notes

### Points System
- Points are **never** stored directly in user profiles
- All points are calculated from the `points_ledger` table
- This ensures accuracy and full auditability

### Security
- Row Level Security (RLS) is enabled on all tables
- Admin operations use the service role key (server-side only)
- Rate limiting placeholders are included (implement proper solution for production)

### Fraud Prevention
- Device and IP hashing utilities are included (implement proper crypto)
- Unique event_id enforcement for offer completions
- Risk scoring system in place
- Ban functionality for flagged accounts

## Next Steps

1. **Implement Rate Limiting**: Replace placeholder in `src/lib/rate-limit.ts`
2. **Add Offerwall Providers**: Implement postback handlers in `src/app/api/offer/postback/[provider]/route.ts`
3. **Enhance Device Tracking**: Implement proper crypto hashing in `src/lib/utils.ts`
4. **Add Mobile Sidebar**: Implement mobile navigation menu
5. **Set Up Production**: Configure production Supabase URLs and OAuth redirects

## Troubleshooting

### "Unauthorized" errors
- Check that your Supabase keys are correct
- Verify RLS policies allow your operations
- For admin routes, ensure your email is in `ADMIN_EMAILS`

### Database errors
- Ensure schema.sql was run successfully
- Check that all tables exist in Supabase Table Editor
- Verify RLS policies are enabled

### Authentication issues
- Check Supabase Auth settings
- Verify redirect URLs are configured correctly
- Check browser console for errors
