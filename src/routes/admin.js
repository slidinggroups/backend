import express from 'express';
import { db } from '../config/database.js';
import { storageHelpers, imageUtils } from '../utils/storage.js';

const router = express.Router();

// Middleware for admin authentication (placeholder - implement proper auth)
const adminAuth = (req, res, next) => {
  // TODO: Implement proper JWT authentication
  // For now, just check for a simple admin header
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_KEY && process.env.NODE_ENV === 'production') {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Admin access required'
    });
  }
  next();
};

// GET /api/v1/admin/dashboard - Get admin dashboard data
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    const [stats, recentImages, categories] = await Promise.all([
      db.getGalleryStats(),
      db.getGalleryImages({ limit: 5 }),
      db.getGalleryCategories()
    ]);

    res.json({
      success: true,
      data: {
        stats,
        recentImages,
        categories,
        systemInfo: {
          nodeVersion: process.version,
          environment: process.env.NODE_ENV,
          uptime: process.uptime(),
          timestamp: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Error fetching admin dashboard:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/v1/admin/images - Get all images with admin details
router.get('/images', adminAuth, async (req, res) => {
  try {
    const { status = 'all', limit, offset } = req.query;
    
    // Build query based on status filter
    let query = db.supabase
      .from('gallery_images')
      .select(`
        *,
        category:gallery_categories(*)
      `)
      .order('created_at', { ascending: false });

    // Apply status filter
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    // Apply pagination
    if (limit) {
      query = query.limit(parseInt(limit, 10));
    }
    if (offset) {
      query = query.range(parseInt(offset, 10), parseInt(offset, 10) + parseInt(limit || 50, 10) - 1);
    }

    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Failed to fetch images: ${error.message}`);
    }

    res.json({
      success: true,
      data,
      count: data.length
    });
  } catch (error) {
    console.error('Error fetching admin images:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT /api/v1/admin/images/:id/status - Update image status
router.put('/images/:id/status', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive', 'draft'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be active, inactive, or draft'
      });
    }

    const updatedImage = await db.updateGalleryImage(parseInt(id, 10), { 
      status,
      updated_at: new Date().toISOString()
    });

    res.json({
      success: true,
      data: updatedImage,
      message: `Image status updated to ${status}`
    });
  } catch (error) {
    console.error('Error updating image status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT /api/v1/admin/images/:id/featured - Toggle featured status
router.put('/images/:id/featured', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_featured } = req.body;

    const updatedImage = await db.updateGalleryImage(parseInt(id, 10), { 
      is_featured: Boolean(is_featured),
      updated_at: new Date().toISOString()
    });

    res.json({
      success: true,
      data: updatedImage,
      message: `Image ${is_featured ? 'featured' : 'unfeatured'} successfully`
    });
  } catch (error) {
    console.error('Error updating featured status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/v1/admin/categories - Create new category
router.post('/categories', adminAuth, async (req, res) => {
  try {
    const { name, display_name, description, sort_order } = req.body;

    if (!name || !display_name) {
      return res.status(400).json({
        success: false,
        error: 'Name and display_name are required'
      });
    }

    const { data, error } = await db.supabaseAdmin
      .from('gallery_categories')
      .insert({
        name: name.toLowerCase().replace(/\s+/g, '-'),
        display_name,
        description: description || '',
        sort_order: sort_order || 0
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create category: ${error.message}`);
    }

    res.status(201).json({
      success: true,
      data,
      message: 'Category created successfully'
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT /api/v1/admin/categories/:id - Update category
router.put('/categories/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, display_name, description, sort_order } = req.body;

    const updateData = {};
    if (name) updateData.name = name.toLowerCase().replace(/\s+/g, '-');
    if (display_name) updateData.display_name = display_name;
    if (description !== undefined) updateData.description = description;
    if (sort_order !== undefined) updateData.sort_order = parseInt(sort_order, 10);
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await db.supabaseAdmin
      .from('gallery_categories')
      .update(updateData)
      .eq('id', parseInt(id, 10))
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update category: ${error.message}`);
    }

    res.json({
      success: true,
      data,
      message: 'Category updated successfully'
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/v1/admin/categories/:id - Delete category (if no images)
router.delete('/categories/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category has images
    const { count, error: countError } = await db.supabase
      .from('gallery_images')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', parseInt(id, 10));

    if (countError) {
      throw new Error(`Failed to check category usage: ${countError.message}`);
    }

    if (count > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete category with ${count} associated images`
      });
    }

    const { error } = await db.supabaseAdmin
      .from('gallery_categories')
      .delete()
      .eq('id', parseInt(id, 10));

    if (error) {
      throw new Error(`Failed to delete category: ${error.message}`);
    }

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/v1/admin/storage/usage - Get storage usage statistics
router.get('/storage/usage', adminAuth, async (req, res) => {
  try {
    // This is a placeholder - Supabase doesn't provide direct storage usage APIs
    // In a real implementation, you'd track this manually or use Supabase dashboard
    
    const { data: images } = await db.supabase
      .from('gallery_images')
      .select('metadata')
      .not('metadata', 'is', null);

    let totalSize = 0;
    let fileCount = 0;

    images?.forEach(image => {
      if (image.metadata && image.metadata.size) {
        totalSize += image.metadata.size;
        fileCount++;
      }
    });

    res.json({
      success: true,
      data: {
        totalFiles: fileCount,
        totalSize: totalSize,
        totalSizeFormatted: `${(totalSize / (1024 * 1024)).toFixed(2)} MB`,
        bucketName: 'gallery-images',
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: ['image/jpg', 'image/jpeg', 'image/png', 'image/webp']
      }
    });
  } catch (error) {
    console.error('Error fetching storage usage:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
