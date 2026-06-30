-- Milestone 4: typo-tolerant search via pg_trgm
-- Enables fuzzy matching on product titles, descriptions, and taxonomy names
-- so that "abaya", "abbaya", "abaaya" all return the same results.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram indexes on the columns we search most.
-- GIN is faster for LIKE/ILIKE and similarity searches than GIST for read-heavy workloads.
CREATE INDEX IF NOT EXISTS products_title_trgm_idx
  ON products USING GIN (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS products_description_trgm_idx
  ON products USING GIN (description gin_trgm_ops);

CREATE INDEX IF NOT EXISTS root_categories_name_trgm_idx
  ON root_categories USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS root_categories_slug_trgm_idx
  ON root_categories USING GIN (slug gin_trgm_ops);

CREATE INDEX IF NOT EXISTS sub_styles_name_trgm_idx
  ON sub_styles USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS sub_styles_slug_trgm_idx
  ON sub_styles USING GIN (slug gin_trgm_ops);
