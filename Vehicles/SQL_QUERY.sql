-- SQL Query to create vehicles table
-- Run this in your MySQL database (Goodloading)

CREATE TABLE vehicles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    length_cm FLOAT NOT NULL COMMENT 'Length in centimeters',
    width_cm FLOAT NOT NULL COMMENT 'Width in centimeters',
    height_cm FLOAT NOT NULL COMMENT 'Height in centimeters',
    max_weight_kg FLOAT NOT NULL COMMENT 'Maximum weight capacity in kilograms',
    quantity INT NOT NULL DEFAULT 1 COMMENT 'Number of identical vehicles',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional: Insert sample data
INSERT INTO vehicles (name, length_cm, width_cm, height_cm, max_weight_kg, quantity) VALUES
('Vehicle 1', 500, 250, 200, 2000, 1),
('Vehicle 2', 650, 280, 210, 3000, 1),
('Vehicle 3', 400, 200, 180, 1500, 1);
