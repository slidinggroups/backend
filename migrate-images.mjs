#!/usr/bin/env node

/**
 * Data Migration Script - Replace External URLs with Supabase Storage
 * This script downloads existing images from external URLs and uploads them to Supabase storage
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Download image from URL
async function downloadImage(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.buffer();
  } catch (error) {
    console.error(`Failed to download ${url}:`, error.message);
    return null;
  }
}

// Upload image to Supabase Storage
async function uploadImageToStorage(imageBuffer, fileName) {
  try {
    const { data, error } = await supabase.storage
      .from('gallery-images')
      .upload(fileName, imageBuffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'image/jpeg'
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: publicUrl } = supabase.storage
      .from('gallery-images')
      .getPublicUrl(fileName);

    return publicUrl.publicUrl;
  } catch (error) {
    console.error(`Failed to upload ${fileName}:`, error.message);
    return null;
  }
}

// Generate filename from original URL
function generateFileName(originalUrl, id) {
  const urlParts = originalUrl.split('/');
  const originalFileName = urlParts[urlParts.length - 1] || 'image';
  const extension = originalFileName.includes('.') ? originalFileName.split('.').pop() : 'jpg';
  return `gallery_${id}_${Date.now()}.${extension}`;
}

// Main migration function
async function migrateImages() {
  console.log('🚀 Starting image migration to Supabase Storage');
  console.log('=' .repeat(60));

  try {
    // Get all images from database
    const { data: images, error } = await supabase
      .from('gallery_images')
      .select('*')
      .eq('status', 'active');

    if (error) {
      throw error;
    }

    console.log(`📋 Found ${images.length} images to migrate`);

    let successCount = 0;
    let errorCount = 0;

    for (const image of images) {
      console.log(`\n📸 Processing: ${image.title} (ID: ${image.id})`);
      console.log(`🔗 Original URL: ${image.image_url}`);

      // Skip if already using Supabase storage
      if (image.image_url.includes('supabase.co')) {
        console.log('✅ Already using Supabase storage, skipping...');
        successCount++;
        continue;
      }

      // Download image
      const imageBuffer = await downloadImage(image.image_url);
      if (!imageBuffer) {
        console.log('❌ Failed to download image');
        errorCount++;
        continue;
      }

      // Generate new filename
      const fileName = generateFileName(image.image_url, image.id);
      console.log(`📁 New filename: ${fileName}`);

      // Upload to Supabase Storage
      const newUrl = await uploadImageToStorage(imageBuffer, fileName);
      if (!newUrl) {
        console.log('❌ Failed to upload to storage');
        errorCount++;
        continue;
      }

      console.log(`🎯 New URL: ${newUrl}`);

      // Update database record
      const { error: updateError } = await supabase
        .from('gallery_images')
        .update({
          image_url: newUrl,
          thumbnail_url: newUrl, // Use same URL for thumbnail for now
          updated_at: new Date().toISOString()
        })
        .eq('id', image.id);

      if (updateError) {
        console.log('❌ Failed to update database:', updateError.message);
        errorCount++;
        continue;
      }

      console.log('✅ Migration successful');
      successCount++;

      // Small delay to avoid overwhelming the APIs
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n' + '=' .repeat(60));
    console.log('📊 Migration Summary');
    console.log('=' .repeat(60));
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log(`📊 Total: ${images.length}`);

    if (errorCount === 0) {
      console.log('\n🎉 All images migrated successfully!');
    } else {
      console.log('\n⚠️  Some images failed to migrate. Check the logs above.');
    }

  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    process.exit(1);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Migration interrupted by user');
  process.exit(1);
});

// Check if running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateImages();
}

export { migrateImages };
