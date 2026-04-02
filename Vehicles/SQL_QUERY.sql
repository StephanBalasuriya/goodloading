-- SQL Query to create vehicles table
-- Run this in your MySQL database (Goodloading)

CREATE TABLE vehicles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    length_m FLOAT NOT NULL COMMENT 'Length in meters',
    width_cm FLOAT NOT NULL COMMENT 'Width in centimeters',
    height_cm FLOAT NOT NULL COMMENT 'Height in centimeters',
    weight_kg FLOAT NOT NULL COMMENT 'Weight in kilograms',
    max_weight_kg FLOAT NOT NULL COMMENT 'Maximum weight capacity in kilograms',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional: Insert sample data
INSERT INTO vehicles (name, length_m, width_cm, height_cm, weight_kg, max_weight_kg) VALUES
('Vehicle 1', 5.0, 250, 200, 500, 2000),
('Vehicle 2', 6.5, 280, 210, 750, 3000),
('Vehicle 3', 4.0, 200, 180, 300, 1500);
