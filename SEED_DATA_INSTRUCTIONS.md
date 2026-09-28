# Adding Dummy Review Data to Bitebook

To test the app with restaurant reviews and images, follow these steps:

## Quick Start (Recommended)

### 1. Log In to Bitebook
Make sure you're logged in to the Bitebook app.

### 2. Open Supabase SQL Editor
- Go to your Supabase Dashboard: https://supabase.com/dashboard
- Navigate to your Bitebook project
- Click **SQL Editor** in the left sidebar
- Click **+ New query**

### 3. Run the Seed Script
Copy and paste the contents of `scripts/seed-full-data.sql` into the SQL Editor.

Then click **Run** (or press Ctrl+Enter).

⚠️ **Important**: Make sure you're logged in to the app first! The script creates reviews associated with your user account (`auth.uid()`).

### 4. Refresh the App
Refresh your browser at http://localhost:8082 to see the new reviews in your feed.

## What Gets Created

The seed script adds:

✅ **6 Real Restaurants**
- Balthazar (New York, French Seafood)
- Chez Panisse (Berkeley, Organic American)
- Eleven Madison Park (New York, French Modern)
- Atelier Crenn (San Francisco, Innovative French)
- Ko (Tokyo, Japanese Omakase)
- Per Se (New York, French Fine Dining)

✅ **6 Signature Dishes**
- Oysters Rockefeller
- Roasted Chicken
- Smoked Beet
- Langoustine with Caviar
- Uni and Scallop
- Pan-Roasted Halibut

✅ **6 Reviews** (rated 4-5 stars)
- Each with authentic, detailed review text
- Linked to storage photos (you'll see placeholders)

## Troubleshooting

### "Error: auth.uid() is null"
**Solution**: Make sure you're logged in to the Bitebook app before running the script. The script needs your user ID.

### Reviews don't appear in the feed
**Reason**: The Home feed only shows reviews from users you follow.

**Solution**: 
1. Go to your Profile
2. Find your own profile and follow yourself
3. Or, follow other test users' reviews

### Want to add more reviews?
Just modify the script and run it again! The `ON CONFLICT DO NOTHING` prevents duplicates.

## Advanced: Manual Data Entry

If you prefer to add reviews through the app UI:

1. Click the **Log** button (green + in center of nav bar)
2. Search for and select a restaurant
3. Select or create a new dish
4. Add your rating, review text, and photos
5. Click **Save**

This method is recommended for testing the full logging flow with image uploads.

---

**Questions?** Check the restaurant and dish data was created:
```sql
SELECT COUNT(*) FROM public.restaurants;
SELECT COUNT(*) FROM public.dishes;
SELECT COUNT(*) FROM public.reviews WHERE user_id = auth.uid();
```
