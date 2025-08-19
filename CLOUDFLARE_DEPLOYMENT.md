# Cloudflare Pages Deployment Guide

## Overview
This guide helps you deploy your Next.js application to Cloudflare Pages while avoiding the 25MB file size limit.

## Key Changes Made

### 1. `.wranglerignore` File
Created to exclude large files and directories from deployment:
- `node_modules/` - Dependencies are installed during build
- `.next/cache/` - Build cache (contains large webpack files)
- Platform-specific binaries (SWC binaries for macOS ARM64)
- Test files and documentation

### 2. `wrangler.toml` Configuration
Configured for optimal Cloudflare Pages deployment:
- Build command: `pnpm build`
- Output directory: `out`
- Node.js version: 18

### 3. `next.config.ts` Optimizations
- Disabled SWC minification (`swcMinify: false`)
- Disabled experimental ESM externals
- Maintained static export configuration

## Deployment Steps

### Option 1: Using Cloudflare Dashboard
1. Go to [Cloudflare Pages](https://pages.cloudflare.com/)
2. Click "Create a project"
3. Connect your GitHub repository
4. Configure build settings:
   - **Build command**: `pnpm build`
   - **Build output directory**: `out`
   - **Node.js version**: 18
5. Deploy!

### Option 2: Using Wrangler CLI
1. Install Wrangler: `npm install -g wrangler`
2. Login: `wrangler login`
3. Deploy: `wrangler pages deploy out`

## Troubleshooting

### If you still get file size errors:
1. **Check for large files**: Run `find . -type f -size +20M` before deployment
2. **Clear build cache**: Delete `.next/cache/` and rebuild
3. **Verify .wranglerignore**: Ensure all large files are excluded

### Common issues:
- **SWC binaries**: These are platform-specific and shouldn't be deployed
- **Webpack cache**: Large cache files in `.next/cache/`
- **Node modules**: Should be installed during build, not deployed

## Build Process
The deployment process:
1. Cloudflare Pages clones your repository
2. Installs dependencies (`pnpm install`)
3. Runs build command (`pnpm build`)
4. Deploys only the `out` directory (static files)
5. Excludes files listed in `.wranglerignore`

## Environment Variables
If you need environment variables:
1. Add them in the Cloudflare Pages dashboard
2. They'll be available during build and runtime
3. For Supabase, ensure your environment variables are set

## Performance Tips
- The static export is optimized for Cloudflare Pages
- Images are unoptimized (handled by Cloudflare)
- Bundle splitting is configured for optimal loading
