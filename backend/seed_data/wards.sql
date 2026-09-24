-- SAVERA seed: ~30 BBMP (Bengaluru) wards with approximate centroids.
-- Inserted by name only (never explicit ids) and idempotent through the
-- UNIQUE (city, name) constraint, so this file can be applied any number of times.
-- Applied by: python -m seed_data.wards  (or seed_data.wards.seed_wards(pool)).

INSERT INTO wards (name, city, lat, lng) VALUES
  ('Koramangala',     'Bengaluru', 12.9352, 77.6245),
  ('Indiranagar',     'Bengaluru', 12.9784, 77.6408),
  ('Jayanagar',       'Bengaluru', 12.9299, 77.5826),
  ('Whitefield',      'Bengaluru', 12.9698, 77.7500),
  ('Malleshwaram',    'Bengaluru', 13.0035, 77.5647),
  ('HSR Layout',      'Bengaluru', 12.9116, 77.6389),
  ('BTM Layout',      'Bengaluru', 12.9166, 77.6101),
  ('Basavanagudi',    'Bengaluru', 12.9422, 77.5750),
  ('Rajajinagar',     'Bengaluru', 12.9915, 77.5551),
  ('Yelahanka',       'Bengaluru', 13.1005, 77.5963),
  ('Hebbal',          'Bengaluru', 13.0358, 77.5970),
  ('Banashankari',    'Bengaluru', 12.9255, 77.5468),
  ('JP Nagar',        'Bengaluru', 12.9063, 77.5857),
  ('Marathahalli',    'Bengaluru', 12.9591, 77.6974),
  ('Bellandur',       'Bengaluru', 12.9257, 77.6649),
  ('Sarjapur',        'Bengaluru', 12.9100, 77.6870),
  ('Vijayanagar',     'Bengaluru', 12.9719, 77.5304),
  ('Shivajinagar',    'Bengaluru', 12.9857, 77.6057),
  ('Ulsoor',          'Bengaluru', 12.9816, 77.6190),
  ('Domlur',          'Bengaluru', 12.9611, 77.6387),
  ('Sanjaynagar',     'Bengaluru', 13.0330, 77.5760),
  ('RT Nagar',        'Bengaluru', 13.0212, 77.5951),
  ('Kengeri',         'Bengaluru', 12.9081, 77.4823),
  ('Yeshwanthpur',    'Bengaluru', 13.0284, 77.5541),
  ('Peenya',          'Bengaluru', 13.0292, 77.5190),
  ('KR Puram',        'Bengaluru', 13.0057, 77.6960),
  ('Mahadevapura',    'Bengaluru', 12.9880, 77.6836),
  ('Electronic City', 'Bengaluru', 12.8452, 77.6602),
  ('Bommanahalli',    'Bengaluru', 12.9032, 77.6248),
  ('Hulimavu',        'Bengaluru', 12.8789, 77.6094)
ON CONFLICT (city, name) DO NOTHING;
