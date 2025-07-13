import { db, supabaseAdmin } from '../config/database.js';

// Storage helper functions for gallery images
export const storageHelpers = {
  // Upload image to Supabase Storage
  async uploadImage(fileBuffer, fileName, bucketName = 'gallery-images', mimeType = null) {
    try {
      // Determine content type from file extension if mimeType not provided
      const contentType = mimeType || this.getMimeTypeFromFileName(fileName);
      
      console.log('🎯 Uploading to Supabase with:', {
        fileName,
        bucketName,
        contentType,
        bufferSize: fileBuffer?.length || 'unknown'
      });

      const { data, error } = await supabaseAdmin.storage
        .from(bucketName)
        .upload(fileName, fileBuffer, {
          cacheControl: '3600',
          upsert: false,
          contentType: contentType
        });

      if (error) {
        console.error('❌ Supabase storage error:', error);
        throw new Error(`Failed to upload image: ${error.message}`);
      }

      console.log('✅ Supabase upload successful:', data);

      // Get public URL
      const { data: publicUrl } = supabaseAdmin.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      console.log('🔗 Generated public URL:', publicUrl.publicUrl);

      return {
        path: data.path,
        publicUrl: publicUrl.publicUrl
      };
    } catch (error) {
      console.error('Storage upload error:', error);
      throw error;
    }
  },

  // Helper function to get MIME type from file extension
  getMimeTypeFromFileName(fileName) {
    const extension = fileName.toLowerCase().split('.').pop();
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp',
      'gif': 'image/gif',
      'bmp': 'image/bmp',
      'tiff': 'image/tiff',
      'tif': 'image/tiff',
      'svg': 'image/svg+xml'
    };
    return mimeTypes[extension] || 'image/jpeg'; // Default to JPEG
  },

  // Delete image from Supabase Storage
  async deleteImage(fileName, bucketName = 'gallery-images') {
    try {
      const { data, error } = await supabaseAdmin.storage
        .from(bucketName)
        .remove([fileName]);

      if (error) {
        throw new Error(`Failed to delete image: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Storage delete error:', error);
      throw error;
    }
  },

  // Generate thumbnail URL from full image URL
  generateThumbnailUrl(imageUrl, width = 400, height = 300) {
    // For Unsplash images, add thumbnail parameters
    if (imageUrl.includes('unsplash.com')) {
      return `${imageUrl}?w=${width}&h=${height}&fit=crop`;
    }
    
    // For Supabase storage images, we might implement image transformation
    // For now, return the original URL
    return imageUrl;
  },

  // Validate image file
  validateImageFile(file) {
    console.log('🔍 Validating file:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      fieldname: file.fieldname
    });

    // Enhanced MIME type detection - support all common image formats
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp',
      'image/gif',
      'image/bmp',
      'image/tiff',
      'image/svg+xml'
    ];

    // Fallback: detect by file extension if MIME type is incorrect
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff', '.svg'];
    const fileExtension = file.originalname.toLowerCase().split('.').pop();
    const hasValidExtension = allowedExtensions.some(ext => ext.includes(fileExtension));

    console.log('📋 File validation details:', {
      detectedMimeType: file.mimetype,
      fileExtension: fileExtension,
      hasValidMimeType: allowedMimeTypes.includes(file.mimetype),
      hasValidExtension: hasValidExtension
    });

    // Accept file if either MIME type OR extension is valid (handles browser inconsistencies)
    const isValidType = allowedMimeTypes.includes(file.mimetype) || hasValidExtension;
    
    if (!isValidType) {
      const error = `Invalid file type. Detected: "${file.mimetype}" with extension ".${fileExtension}". Only JPEG, PNG, WebP, GIF, BMP, TIFF, and SVG images are allowed.`;
      console.error('❌ File validation failed:', error);
      throw new Error(error);
    }

    // File size validation - Supabase free tier has generous limits but let's be reasonable
    const maxSize = 10 * 1024 * 1024; // 10MB limit for free tier compatibility
    if (file.size > maxSize) {
      const error = `File size too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum 10MB allowed for Supabase free tier.`;
      console.error('❌ File size validation failed:', error);
      throw new Error(error);
    }

    console.log('✅ File validation passed');
    return true;
  }
};

// Image processing utilities
export const imageUtils = {
  // Generate unique filename
  generateFileName(originalName, prefix = 'gallery') {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = originalName.split('.').pop();
    return `${prefix}_${timestamp}_${randomString}.${extension}`;
  },

  // Extract metadata from image
  async extractMetadata(file) {
    return {
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      uploadedAt: new Date().toISOString()
    };
  }
};

export default {
  storageHelpers,
  imageUtils
};
