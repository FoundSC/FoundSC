-- Ensure optional columns exist before inserting sample data
ALTER TABLE IF EXISTS posts
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS contact_info TEXT;

-- Insert some sample data for testing
INSERT INTO posts (title, description, type, category, location, contact_info) VALUES
('Lost iPhone 15', 'Black iPhone 15 Pro lost near McHenry Library around 2pm', 'lost', 'electronics', 'McHenry Library', 'contact@example.com'),
('Found Water Bottle', 'Blue Hydro Flask found in Cowell College dining hall', 'found', 'personal', 'Cowell Dining Hall', 'anonymous'),
('Lost Student ID', 'UCSC student ID card for John Doe, lost in parking lot', 'lost', 'ids', 'East Remote Parking', 'jdoe@ucsc.edu'),
('Found Laptop Charger', 'MacBook Pro charger found in Science Hill', 'found', 'electronics', 'Science Hill', 'finder123@gmail.com'),
('Lost Bike Keys', 'Set of keys with blue bike lock key', 'lost', 'keys', 'Quarry Plaza', 'student@ucsc.edu'),
('Found Textbook', 'Calculus textbook found in classroom', 'found', 'books', 'Baskin Engineering', 'helper@ucsc.edu'),
('Lost Backpack', 'Black Jansport backpack with laptop inside', 'lost', 'bags', 'Library', 'worried@student.com'),
('Found Sunglasses', 'Ray-Ban sunglasses found on campus shuttle', 'found', 'accessories', 'Campus Shuttle', 'anonymous');