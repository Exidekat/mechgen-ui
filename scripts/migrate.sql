-- Heat Death Clock Database Schema

-- Drop existing tables if they exist
DROP TABLE IF EXISTS events CASCADE;

-- Events table to store cosmic events
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_date BIGINT NOT NULL,  -- Year (negative for BCE, positive for CE)
  end_date BIGINT NOT NULL,    -- Year (can be very large for cosmic events)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX idx_events_name ON events(name);

-- Insert the default Heat Death event
-- Start: Year 1 CE (Common Era)
-- End: 1.7 × 10^106 years from now
-- Note: We're storing the end as a string representation since it exceeds BIGINT range
-- For calculations, we'll handle this in the application layer
INSERT INTO events (name, description, start_date, end_date) VALUES
(
  'Heat Death of the Universe',
  'The theoretical point at which the universe reaches maximum entropy, all stars have died, and no thermodynamic free energy remains. Based on current cosmological models, this is estimated to occur around 1.7 × 10^106 years from now.',
  1,
  999999999999999999  -- Using max safe BIGINT as placeholder; actual value handled in app
);

-- We'll add more cosmic events as examples
INSERT INTO events (name, description, start_date, end_date) VALUES
(
  'The Stelliferous Era',
  'The current era of active star formation. Stars will continue to form until galaxies run out of gas, approximately 100 trillion years from now.',
  1,
  100000000000000
),
(
  'Last Star Burns Out',
  'The estimated time when the last red dwarf star will exhaust its fuel, marking the end of stellar activity in the universe.',
  1,
  100000000000000
);
