-- Helper function to get restaurant rating statistics
CREATE OR REPLACE FUNCTION get_restaurant_rating_stats(p_restaurant_id UUID)
RETURNS TABLE (avg_rating NUMERIC, review_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROUND(AVG(rating)::NUMERIC, 1) as avg_rating,
    COUNT(*)::BIGINT as review_count
  FROM reviews
  WHERE restaurant_id = p_restaurant_id;
END;
$$ LANGUAGE plpgsql;
