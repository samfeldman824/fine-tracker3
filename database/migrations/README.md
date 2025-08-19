# Database Migrations

This directory contains SQL migration files for the threaded comments feature.

## Migration Files

### 001_create_comments_table.sql
Creates the `comments` table with the following features:
- Threaded comment structure with self-referencing parent_comment_id
- Foreign key relationships to fines and users tables
- Proper indexes for efficient querying
- Row Level Security (RLS) policies for secure access
- Real-time subscription enabled for live updates

## Running Migrations

To apply this migration to your Supabase database:

1. **Using Supabase Dashboard:**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Copy and paste the contents of `001_create_comments_table.sql`
   - Execute the SQL

2. **Using Supabase CLI (if configured):**
   ```bash
   supabase db push
   ```

3. **Manual execution:**
   - Connect to your Supabase database using your preferred SQL client
   - Execute the migration file contents

## Post-Migration Steps

After running the migration:
1. Verify the `comments` table was created successfully
2. Check that all indexes are in place
3. Confirm RLS policies are active
4. Test that real-time subscriptions work for the comments table

## Schema Overview

The comments table structure:
- `id`: Primary key (UUID)
- `fine_id`: Reference to the fine being commented on
- `author_id`: Reference to the user who wrote the comment
- `parent_comment_id`: Reference to parent comment (null for top-level comments)
- `content`: The comment text
- `created_at`: Timestamp when comment was created
- `updated_at`: Timestamp when comment was last modified
- `is_deleted`: Soft delete flag to preserve reply threads