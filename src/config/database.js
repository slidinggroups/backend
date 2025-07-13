import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  throw new Error('Missing required Supabase environment variables');
}

// Public client for read operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Service role client for admin operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Database helper functions
export const db = {
  // Export supabase clients for direct access
  supabase,
  supabaseAdmin,
  
  // Get all gallery images with optional filtering
  async getGalleryImages(filters = {}) {
    let query = supabase
      .from('gallery_images')
      .select(`
        *,
        category:gallery_categories(*)
      `)
      .eq('status', 'active')
      .order('sort_order', { ascending: true });

    // Apply category filter if provided
    if (filters.category && filters.category !== 'all') {
      query = query.eq('category_id', filters.categoryId);
    }

    // Apply featured filter if provided
    if (filters.featured !== undefined) {
      query = query.eq('is_featured', filters.featured);
    }

    // Apply limit if provided
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Failed to fetch gallery images: ${error.message}`);
    }

    // Transform data to match frontend expectations
    return data.map(image => ({
      ...image,
      category: image.category ? {
        id: image.category.id,
        name: image.category.name,
        display_name: image.category.display_name
      } : null
    }));
  },

  // Get gallery categories with image counts
  async getGalleryCategories() {
    const { data, error } = await supabase
      .from('gallery_categories')
      .select(`
        *,
        images:gallery_images(count)
      `)
      .order('id', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch gallery categories: ${error.message}`);
    }

    return data;
  },

  // Get a single gallery image by ID
  async getGalleryImageById(id) {
    const { data, error } = await supabase
      .from('gallery_images')
      .select(`
        *,
        category:gallery_categories(*)
      `)
      .eq('id', id)
      .eq('status', 'active')
      .single();

    if (error) {
      throw new Error(`Failed to fetch gallery image: ${error.message}`);
    }

    return data;
  },

  // Get gallery statistics
  async getGalleryStats() {
    // Get total images count
    const { count: totalImages, error: imagesError } = await supabase
      .from('gallery_images')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    if (imagesError) {
      throw new Error(`Failed to fetch images count: ${imagesError.message}`);
    }

    // Get categories count
    const { count: totalCategories, error: categoriesError } = await supabase
      .from('gallery_categories')
      .select('*', { count: 'exact', head: true });

    if (categoriesError) {
      throw new Error(`Failed to fetch categories count: ${categoriesError.message}`);
    }

    // Get featured images count
    const { count: featuredImages, error: featuredError } = await supabase
      .from('gallery_images')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('is_featured', true);

    if (featuredError) {
      throw new Error(`Failed to fetch featured images count: ${featuredError.message}`);
    }

    return {
      totalImages: totalImages || 0,
      totalCategories: totalCategories || 0,
      featuredImages: featuredImages || 0,
      qualityAssurance: 100 // Static value as per the original design
    };
  },

  // Admin functions (using service role)
  async createGalleryImage(imageData) {
    const { data, error } = await supabaseAdmin
      .from('gallery_images')
      .insert(imageData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create gallery image: ${error.message}`);
    }

    return data;
  },

  async updateGalleryImage(id, updates) {
    const { data, error } = await supabaseAdmin
      .from('gallery_images')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update gallery image: ${error.message}`);
    }

    return data;
  },

  async deleteGalleryImage(id) {
    const { error } = await supabaseAdmin
      .from('gallery_images')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete gallery image: ${error.message}`);
    }

    return { success: true };
  }
};
