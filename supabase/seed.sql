-- Seed data for posts table
-- This runs after migrations during db reset

-- Insert sample data for testing
INSERT INTO posts (
    title, 
    description, 
    type, 
    category, 
    image_url,
    location, 
    contact_info
)

VALUES
(
    'Lost iPhone 15', 
    'Black iPhone 15 Pro lost near McHenry Library around 2pm', 
    'lost', 
    'electronics', 
    'http://127.0.0.1:8000/storage/v1/object/public/post-images/iPhone17.webp',
    'McHenry Library', 
    'contact@example.com'
),
(
    'Found Water Bottle', 
    'Blue Hydro Flask found in Cowell College dining hall', 
    'found', 
    'personal', 
    'http://127.0.0.1:8000/storage/v1/object/public/post-images/water-bottle.webp',
    'Cowell Dining Hall', 
    'anonymous'
),
(
    'Lost Student ID', 
    'UCSC student ID card for John Doe, lost in parking lot', 
    'lost', 
    'ids', 
    'http://127.0.0.1:8000/storage/v1/object/public/post-images/student-id.webp',
    'East Remote Parking', 
    'jdoe@ucsc.edu'
),
(
    'Found Laptop Charger', 
    'MacBook Pro charger found in Science Hill', 
    'found', 
    'electronics', 
    'http://127.0.0.1:8000/storage/v1/object/public/post-images/laptop-charger.webp',
    'Science Hill', 
    'finder123@gmail.com'
),
(
    'Lost Bike Keys', 
    'Set of keys with blue bike lock key', 
    'lost', 
    'keys', 
    'http://127.0.0.1:8000/storage/v1/object/public/post-images/bike-keys.webp',
    'Quarry Plaza', 
    'student@ucsc.edu'
),
(
    'Found Textbook', 
    'Calculus textbook found in classroom', 
    'found', 
    'books', 
    'http://127.0.0.1:8000/storage/v1/object/public/post-images/textbook.webp',
    'Baskin Engineering', 
    'helper@ucsc.edu'
),
(
    'Lost Backpack', 
    'Black Jansport backpack with laptop inside', 
    'lost', 
    'bags', 
    'http://127.0.0.1:8000/storage/v1/object/public/post-images/backpack.webp',
    'Library', 
    'worried@student.com'
),
(
    'Found Sunglasses', 
    'Ray-Ban sunglasses found on campus shuttle', 
    'found', 
    'accessories', 
    'http://127.0.0.1:8000/storage/v1/object/public/post-images/sunglasses.webp',
    'Campus Shuttle', 
    'anonymous'
);
