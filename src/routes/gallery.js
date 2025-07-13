import express from 'express';
import multer from 'multer';
import { db } from '../config/database.js';
import { storageHelpers, imageUtils } from '../utils/storage.js';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    try {
      storageHelpers.validateImageFile(file);
      cb(null, true);
    } catch (error) {
      cb(error, false);
    }
  },
});

// GET /api/v1/gallery/images - Get all gallery images with optional filtering
router.get('/images', async (req, res) => {
  try {
    const { category, featured, limit } = req.query;
    
    const filters = {};
    if (category) filters.category = category;
    if (featured !== undefined) filters.featured = featured === 'true';
    if (limit) filters.limit = parseInt(limit, 10);

    // If category is provided and not 'all', get the category ID
    if (category && category !== 'all') {
      const { data: categoryData } = await db.supabase
        .from('gallery_categories')
        .select('id')
        .eq('name', category)
        .single();
      
      if (categoryData) {
        filters.categoryId = categoryData.id;
      }
    }

    const images = await db.getGalleryImages(filters);
    
    res.json({
      success: true,
      data: images,
      count: images.length
    });
  } catch (error) {
    console.error('Error fetching gallery images:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/v1/gallery/images/:id - Get a specific gallery image
router.get('/images/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const image = await db.getGalleryImageById(parseInt(id, 10));
    
    res.json({
      success: true,
      data: image
    });
  } catch (error) {
    console.error('Error fetching gallery image:', error);
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/v1/gallery/categories - Get all gallery categories with image counts
router.get('/categories', async (req, res) => {
  try {
    const categories = await db.getGalleryCategories();
    
    // Transform the data to match frontend expectations
    const transformedCategories = [
      {
        id: 'all',
        name: 'All Projects',
        count: categories.reduce((total, cat) => total + (cat.images[0]?.count || 0), 0)
      },
      ...categories.map(category => ({
        id: category.name,
        name: category.display_name,
        count: category.images[0]?.count || 0
      }))
    ];
    
    res.json({
      success: true,
      data: transformedCategories
    });
  } catch (error) {
    console.error('Error fetching gallery categories:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/v1/gallery/stats - Get gallery statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await db.getGalleryStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching gallery stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Middleware for admin authentication
const adminAuth = (req, res, next) => {
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_KEY && process.env.NODE_ENV === 'production') {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Admin access required'
    });
  }
  next();
};

// POST /api/v1/gallery/images - Create a new gallery image (admin only)
router.post('/images', adminAuth, upload.single('image'), async (req, res) => {
  try {
    const { title, description, category_id, tags, is_featured, sort_order } = req.body;
    const imageFile = req.file;

    console.log('🚀 Upload request received:', {
      title,
      category_id,
      fileInfo: imageFile ? {
        originalname: imageFile.originalname,
        mimetype: imageFile.mimetype,
        size: imageFile.size,
        fieldname: imageFile.fieldname,
        encoding: imageFile.encoding,
        bufferLength: imageFile.buffer ? imageFile.buffer.length : 0
      } : 'No file',
      bodyKeys: Object.keys(req.body),
      headers: {
        'content-type': req.headers['content-type'],
        'content-length': req.headers['content-length'],
        'user-agent': req.headers['user-agent']
      }
    });

    // Validate required fields
    if (!title || !imageFile) {
      console.error('❌ Missing required fields:', { hasTitle: !!title, hasFile: !!imageFile });
      return res.status(400).json({
        success: false,
        error: 'Title and image file are required'
      });
    }

    // Fix MIME type if it's incorrectly detected
    if (imageFile.mimetype === 'text/plain' || imageFile.mimetype.startsWith('text/')) {
      const extension = imageFile.originalname.toLowerCase().split('.').pop();
      const mimeTypeMap = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'webp': 'image/webp',
        'gif': 'image/gif',
        'bmp': 'image/bmp',
        'tiff': 'image/tiff',
        'svg': 'image/svg+xml'
      };
      
      if (mimeTypeMap[extension]) {
        console.log(`🔧 Fixing MIME type from "${imageFile.mimetype}" to "${mimeTypeMap[extension]}" based on extension`);
        imageFile.mimetype = mimeTypeMap[extension];
      }
    }

    // Validate image file with enhanced validation
    try {
      storageHelpers.validateImageFile(imageFile);
      console.log('✅ File validation passed');
    } catch (validationError) {
      console.error('❌ File validation failed:', validationError.message);
      return res.status(400).json({
        success: false,
        error: validationError.message
      });
    }

    // Upload image to storage
    const fileName = imageUtils.generateFileName(imageFile.originalname);
    console.log('📁 Uploading to storage with filename:', fileName);
    
    // Get the corrected MIME type from our validation
    const correctedMimeType = storageHelpers.getMimeTypeFromFileName(fileName);
    console.log('🎯 Using MIME type for upload:', {
      original: imageFile.mimetype,
      corrected: correctedMimeType,
      fileName
    });
    
    const uploadResult = await storageHelpers.uploadImage(
      imageFile.buffer, 
      fileName, 
      'gallery-images', 
      correctedMimeType
    );
    console.log('Upload successful:', uploadResult.publicUrl);
    
    // Generate thumbnail URL (for now, use the same URL)
    const thumbnailUrl = uploadResult.publicUrl;
    
    // Extract metadata
    const metadata = await imageUtils.extractMetadata(imageFile);

    // Prepare image data
    const imageData = {
      title,
      description: description || '',
      image_url: uploadResult.publicUrl,
      thumbnail_url: thumbnailUrl,
      category_id: category_id ? parseInt(category_id, 10) : null,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)) : [],
      is_featured: is_featured === 'true' || is_featured === true,
      sort_order: sort_order ? parseInt(sort_order, 10) : 0,
      metadata,
      status: 'active'
    };

    console.log('Creating database record with data:', imageData);
    const newImage = await db.createGalleryImage(imageData);
    
    res.status(201).json({
      success: true,
      data: newImage,
      message: 'Gallery image uploaded and created successfully'
    });
  } catch (error) {
    console.error('Error creating gallery image:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT /api/v1/gallery/images/:id - Update a gallery image (admin only)
router.put('/images/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updatedImage = await db.updateGalleryImage(parseInt(id, 10), updates);
    
    res.json({
      success: true,
      data: updatedImage
    });
  } catch (error) {
    console.error('Error updating gallery image:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/v1/gallery/images/:id - Delete a gallery image (admin only)
router.delete('/images/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.deleteGalleryImage(parseInt(id, 10));
    
    res.json({
      success: true,
      message: 'Gallery image deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting gallery image:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
