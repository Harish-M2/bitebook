/**
 * Supabase database types for Bitebook.
 *
 * IMPORTANT: This file was HAND-AUTHORED to exactly match the SQL in
 * `supabase/migrations/*.sql`, because this development environment has no Docker/local
 * Postgres and is not yet linked to a real Supabase project — so `supabase gen types
 * typescript` could not be run against a live database.
 *
 * Once a real Supabase project exists, replace this entire file by running:
 *
 *   npx supabase gen types typescript --project-id <project-id> > src/types/database.ts
 *
 * (or `--linked` / `--local` if using the CLI's local dev stack). Do this before Phase 3
 * relies on any schema not covered here, and re-run it after every future migration.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type ReviewVisibility = 'public' | 'followers' | 'private';
export type SavedDishStatus = 'want_to_eat' | 'saved';
export type RestaurantSourceProvider = 'manual' | 'user_submitted' | 'seed';
export type NotificationType = 'follow' | 'like' | 'comment' | 'mention';
export type ReportTargetType = 'review' | 'comment' | 'profile' | 'restaurant' | 'dish';

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          display_name: string;
          avatar_url: string | null;
          bio: string | null;
          dishes_logged_count: number;
          restaurants_visited_count: number;
          cuisines_explored_count: number;
          average_rating: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          display_name: string;
          avatar_url?: string | null;
          bio?: string | null;
        };
        Update: Partial<{
          username: string | null;
          display_name: string;
          avatar_url: string | null;
          bio: string | null;
        }>;
        Relationships: [];
      };
      restaurants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          price_level: number | null;
          address: string | null;
          city: string | null;
          latitude: number | null;
          longitude: number | null;
          phone: string | null;
          website_url: string | null;
          image_url: string | null;
          created_by_profile_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          slug: string;
          description?: string | null;
          price_level?: number | null;
          address?: string | null;
          city?: string | null;
          phone?: string | null;
          website_url?: string | null;
          image_url?: string | null;
          created_by_profile_id?: string | null;
        };
        Update: Partial<Database['public']['Tables']['restaurants']['Insert']>;
        Relationships: [];
      };
      restaurant_sources: {
        Row: {
          id: string;
          restaurant_id: string;
          source: RestaurantSourceProvider;
          external_place_id: string | null;
          normalized_source_fields: Json | null;
          last_synced_at: string | null;
          created_at: string;
        };
        Insert: {
          restaurant_id: string;
          source: RestaurantSourceProvider;
          external_place_id?: string | null;
          normalized_source_fields?: Json | null;
          last_synced_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['restaurant_sources']['Insert']>;
        Relationships: [];
      };
      restaurant_photos: {
        Row: {
          id: string;
          restaurant_id: string;
          storage_path: string;
          uploaded_by_profile_id: string | null;
          position: number;
          created_at: string;
        };
        Insert: {
          restaurant_id: string;
          storage_path: string;
          uploaded_by_profile_id?: string | null;
          position?: number;
        };
        Update: Partial<Database['public']['Tables']['restaurant_photos']['Insert']>;
        Relationships: [];
      };
      cuisines: {
        Row: { id: string; name: string; slug: string };
        Insert: { name: string; slug: string };
        Update: Partial<{ name: string; slug: string }>;
        Relationships: [];
      };
      restaurant_cuisines: {
        Row: { restaurant_id: string; cuisine_id: string };
        Insert: { restaurant_id: string; cuisine_id: string };
        Update: Partial<{ restaurant_id: string; cuisine_id: string }>;
        Relationships: [];
      };
      dish_cuisines: {
        Row: { dish_id: string; cuisine_id: string };
        Insert: { dish_id: string; cuisine_id: string };
        Update: Partial<{ dish_id: string; cuisine_id: string }>;
        Relationships: [];
      };
      dishes: {
        Row: {
          id: string;
          restaurant_id: string;
          name: string;
          normalized_name: string;
          description: string | null;
          category: string | null;
          image_url: string | null;
          created_by_profile_id: string | null;
          aggregate_rating: number | null;
          rating_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          restaurant_id: string;
          name: string;
          description?: string | null;
          category?: string | null;
          image_url?: string | null;
          created_by_profile_id?: string | null;
        };
        Update: Partial<Database['public']['Tables']['dishes']['Insert']>;
        Relationships: [];
      };
      dish_photos: {
        Row: {
          id: string;
          dish_id: string;
          storage_path: string;
          uploaded_by_profile_id: string | null;
          position: number;
          created_at: string;
        };
        Insert: {
          dish_id: string;
          storage_path: string;
          uploaded_by_profile_id?: string | null;
          position?: number;
        };
        Update: Partial<Database['public']['Tables']['dish_photos']['Insert']>;
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          user_id: string;
          restaurant_id: string;
          dish_id: string;
          rating: number;
          review_text: string | null;
          visibility: ReviewVisibility;
          like_count: number;
          comment_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          restaurant_id: string;
          dish_id: string;
          rating: number;
          review_text?: string | null;
          visibility?: ReviewVisibility;
        };
        Update: Partial<{
          rating: number;
          review_text: string | null;
          visibility: ReviewVisibility;
        }>;
        Relationships: [];
      };
      review_photos: {
        Row: {
          id: string;
          review_id: string;
          storage_path: string;
          position: number;
          created_at: string;
        };
        Insert: { review_id: string; storage_path: string; position?: number };
        Update: Partial<Database['public']['Tables']['review_photos']['Insert']>;
        Relationships: [];
      };
      diary_entries: {
        Row: {
          id: string;
          user_id: string;
          restaurant_id: string;
          dish_id: string;
          review_id: string | null;
          review_user_id: string | null;
          review_dish_id: string | null;
          eaten_at: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          restaurant_id: string;
          dish_id: string;
          review_id?: string | null;
          eaten_at?: string;
        };
        Update: Partial<Database['public']['Tables']['diary_entries']['Insert']>;
        Relationships: [];
      };
      saved_dishes: {
        Row: {
          id: string;
          user_id: string;
          restaurant_id: string | null;
          dish_id: string | null;
          status: SavedDishStatus;
          created_at: string;
        };
        Insert: {
          user_id: string;
          restaurant_id?: string | null;
          dish_id?: string | null;
          status: SavedDishStatus;
        };
        Update: Partial<{ status: SavedDishStatus }>;
        Relationships: [];
      };
      follows: {
        Row: { follower_id: string; following_id: string; created_at: string };
        Insert: { follower_id: string; following_id: string };
        Update: never;
        Relationships: [];
      };
      likes: {
        Row: { id: string; user_id: string; review_id: string; created_at: string };
        Insert: { user_id: string; review_id: string };
        Update: never;
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          user_id: string;
          review_id: string;
          body: string;
          created_at: string;
          updated_at: string;
        };
        Insert: { user_id: string; review_id: string; body: string };
        Update: Partial<{ body: string }>;
        Relationships: [];
      };
      lists: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          cover_image_url: string | null;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          title: string;
          description?: string | null;
          cover_image_url?: string | null;
          is_public?: boolean;
        };
        Update: Partial<Database['public']['Tables']['lists']['Insert']>;
        Relationships: [];
      };
      list_items: {
        Row: {
          id: string;
          list_id: string;
          restaurant_id: string | null;
          dish_id: string | null;
          position: number;
          created_at: string;
        };
        Insert: {
          list_id: string;
          restaurant_id?: string | null;
          dish_id?: string | null;
          position?: number;
        };
        Update: Partial<Database['public']['Tables']['list_items']['Insert']>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: NotificationType;
          actor_id: string | null;
          target_id: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: never;
        Update: Partial<{ read_at: string | null }>;
        Relationships: [];
      };
      taste_preferences: {
        Row: { user_id: string; summary: Json; updated_at: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      user_cuisine_preferences: {
        Row: { user_id: string; cuisine_id: string; created_at: string };
        Insert: { user_id: string; cuisine_id: string };
        Update: never;
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          target_type: ReportTargetType;
          target_id: string;
          reason: string;
          created_at: string;
        };
        Insert: {
          reporter_id: string;
          target_type: ReportTargetType;
          target_id: string;
          reason: string;
        };
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      nearby_restaurants: {
        Args: {
          lat: number;
          lng: number;
          radius_meters?: number;
          max_results?: number;
        };
        Returns: {
          id: string;
          name: string;
          slug: string;
          address: string | null;
          city: string | null;
          latitude: number | null;
          longitude: number | null;
          price_level: number | null;
          image_url: string | null;
          distance_meters: number;
        }[];
      };
    };
    Enums: {
      review_visibility: ReviewVisibility;
      saved_dish_status: SavedDishStatus;
      restaurant_source_provider: RestaurantSourceProvider;
      notification_type: NotificationType;
      report_target_type: ReportTargetType;
    };
  };
};

