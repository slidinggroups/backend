# Sliding Group Visual Voyage - Backend API

## Overview

This backend provides a REST API for the Sliding Group Visual Voyage gallery application, built with Node.js, Express, and Supabase for data storage.

## Features

- **Gallery Management**: CRUD operations for gallery images and categories
- **Real-time Data**: Integration with Supabase for real-time data updates
- **Security**: Row Level Security (RLS) policies and rate limiting
- **Performance**: Optimized queries and response caching
- **Error Handling**: Comprehensive error handling and logging

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **Security**: Helmet, CORS, Express Rate Limit

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.js          # Supabase configuration and DB helpers
│   ├── routes/
│   │   └── gallery.js           # Gallery API routes
│   ├── middleware/
│   │   ├── errorHandler.js      # Error handling middleware
│   │   └── rateLimiter.js       # Rate limiting configuration
│   └── index.js                 # Main application entry point
├── .env                         # Environment variables
├── .gitignore                   # Git ignore file
└── package.json                 # Dependencies and scripts
```

## Environment Variables

```env
# Supabase Configuration
SUPABASE_URL=https://zefqbtihovkzulzdbmtg.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Server Configuration
PORT=3001
NODE_ENV=development

# API Configuration
API_BASE_URL=/api/v1
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Database Schema

### Tables

#### `gallery_categories`
```sql
- id (SERIAL PRIMARY KEY)
- name (VARCHAR(100) UNIQUE) - URL-friendly name
- display_name (VARCHAR(100)) - Human-readable name
- description (TEXT)
- created_at (TIMESTAMP WITH TIME ZONE)
- updated_at (TIMESTAMP WITH TIME ZONE)
```

#### `gallery_images`
```sql
- id (SERIAL PRIMARY KEY)
- title (VARCHAR(255))
- description (TEXT)
- image_url (TEXT)
- thumbnail_url (TEXT)
- category_id (INTEGER REFERENCES gallery_categories(id))
- tags (TEXT[])
- metadata (JSONB)
- is_featured (BOOLEAN)
- sort_order (INTEGER)
- status (VARCHAR(20)) - 'active', 'inactive', 'draft'
- created_at (TIMESTAMP WITH TIME ZONE)
- updated_at (TIMESTAMP WITH TIME ZONE)
```

## API Endpoints

### Gallery Images

#### GET `/api/v1/gallery/images`
Get all gallery images with optional filtering.

**Query Parameters:**
- `category` (string): Filter by category name
- `featured` (boolean): Filter by featured status
- `limit` (number): Limit number of results

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Modern UPVC Sliding Windows",
      "description": "Contemporary sliding windows...",
      "image_url": "https://...",
      "thumbnail_url": "https://...",
      "category": {
        "id": 1,
        "name": "windows",
        "display_name": "Windows"
      },
      "tags": ["sliding", "modern", "residential"],
      "is_featured": true,
      "created_at": "2025-01-12T...",
      "updated_at": "2025-01-12T..."
    }
  ],
  "count": 12
}
```

#### GET `/api/v1/gallery/images/:id`
Get a specific gallery image by ID.

#### POST `/api/v1/gallery/images` (Admin)
Create a new gallery image.

#### PUT `/api/v1/gallery/images/:id` (Admin)
Update an existing gallery image.

#### DELETE `/api/v1/gallery/images/:id` (Admin)
Delete a gallery image.

### Gallery Categories

#### GET `/api/v1/gallery/categories`
Get all gallery categories with image counts.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "all",
      "name": "All Projects",
      "count": 12
    },
    {
      "id": "windows",
      "name": "Windows",
      "count": 4
    }
  ]
}
```

### Gallery Statistics

#### GET `/api/v1/gallery/stats`
Get gallery statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalImages": 12,
    "totalCategories": 4,
    "featuredImages": 3,
    "qualityAssurance": 100
  }
}
```

## Security

### Row Level Security (RLS)

- **Public Access**: Read access to active gallery images and categories
- **Authenticated Access**: Full CRUD operations for admin users

### Rate Limiting

- **General API**: 100 requests per 15 minutes per IP
- **Admin Operations**: 20 requests per 15 minutes per IP

### CORS

Configured to allow requests from:
- Development: `http://localhost:5173`, `http://localhost:3000`
- Production: Your frontend domain

## Installation & Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   - Copy `.env.example` to `.env`
   - Update Supabase credentials

3. **Database Setup**
   - Tables and policies are automatically created via Supabase migrations
   - Sample data is pre-populated

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Health Check**
   ```bash
   curl http://localhost:3001/health
   ```

## Deployment

### Production Considerations

1. **Environment Variables**
   - Set `NODE_ENV=production`
   - Update CORS origins for production domains
   - Use production Supabase instance

2. **Security**
   - Ensure HTTPS in production
   - Review and tighten rate limiting
   - Monitor API usage and errors

3. **Performance**
   - Consider implementing response caching
   - Monitor database query performance
   - Set up proper logging and monitoring

## Error Handling

The API includes comprehensive error handling:

- **400 Bad Request**: Invalid request parameters
- **404 Not Found**: Resource not found
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server errors

All errors return a consistent format:
```json
{
  "success": false,
  "error": "Error message"
}
```

## Development

### Scripts

- `npm run dev`: Start development server with auto-reload
- `npm start`: Start production server
- `npm run build`: No build step required

### Adding New Features

1. Create new route files in `src/routes/`
2. Add database helpers in `src/config/database.js`
3. Update middleware as needed
4. Test thoroughly with frontend integration

## API Testing

Use tools like Postman, curl, or Thunder Client to test the API:

```bash
# Get all images
curl http://localhost:3001/api/v1/gallery/images

# Get categories
curl http://localhost:3001/api/v1/gallery/categories

# Get statistics
curl http://localhost:3001/api/v1/gallery/stats
```

## Support

For issues or questions, please refer to the project documentation or create an issue in the repository.
