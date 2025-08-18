# Authentication Setup Guide

This guide explains how to set up and use the authentication system in the Fine Tracker application.

## Features

- **Login Page**: Users are redirected to `/login` when not authenticated
- **Protected Routes**: All main application pages require authentication
- **User Session Management**: User data is stored in localStorage (for demo purposes)
- **Logout Functionality**: Users can logout from the header

## Setup Instructions

### 1. Database Setup

Run the following SQL migration to create the users table:

```sql
-- Run this in your Supabase SQL editor or database
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'User',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample users
INSERT INTO users (name, password, role) VALUES
    ('admin', 'admin123', 'Admin'),
    ('user1', 'password123', 'User'),
    ('user2', 'password123', 'User')
ON CONFLICT (name) DO NOTHING;

-- Create index
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);
```

### 2. Test Users

The system comes with these default test users:

- **Username**: `admin`, **Password**: `admin123`, **Role**: Admin
- **Username**: `user1`, **Password**: `password123`, **Role**: User
- **Username**: `user2`, **Password**: `password123`, **Role**: User

### 3. How It Works

1. **Initial Access**: When users visit the site, they're redirected to `/login`
2. **Authentication**: Users enter username and password
3. **Session Storage**: User data is stored in localStorage
4. **Protected Routes**: The main application is wrapped in `ProtectedRoute`
5. **Logout**: Users can logout using the button in the header

## Security Notes

⚠️ **Important**: This is a demo implementation with basic security. For production use:

1. **Password Hashing**: Use bcrypt or similar for password hashing
2. **JWT Tokens**: Implement proper JWT token-based authentication
3. **HTTPS**: Ensure all communication is over HTTPS
4. **Session Management**: Use secure session management instead of localStorage
5. **Rate Limiting**: Implement rate limiting for login attempts
6. **Input Validation**: Add proper input validation and sanitization

## File Structure

```
src/
├── app/
│   ├── login/
│   │   └── page.tsx          # Login page
│   └── page.tsx              # Protected main page
├── components/
│   └── features/
│       └── auth/
│           ├── login-form.tsx    # Login form component
│           ├── protected-route.tsx # Route protection
│           └── index.ts          # Exports
├── contexts/
│   └── auth-context.tsx      # Authentication context
└── lib/
    └── supabase/
        └── client.ts         # Supabase client
```

## Usage

1. Start the development server: `npm run dev`
2. Visit `http://localhost:3000`
3. You'll be redirected to the login page
4. Use one of the test credentials above
5. After successful login, you'll be redirected to the main application

## Customization

To add more users, insert them into the `users` table:

```sql
INSERT INTO users (name, password, role) VALUES
    ('newuser', 'newpassword', 'User');
```

To modify the authentication logic, edit:
- `src/components/features/auth/login-form.tsx` - Login form logic
- `src/contexts/auth-context.tsx` - Authentication state management
- `src/components/features/auth/protected-route.tsx` - Route protection logic
