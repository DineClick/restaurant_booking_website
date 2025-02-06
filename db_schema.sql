
-- This makes sure that foreign_key constraints are observed and that errors will be thrown for violations
PRAGMA foreign_keys=ON;

BEGIN TRANSACTION;

-- Create tables with SQL commands 
-- Tables, attributes and insertion of entries are added

CREATE TABLE IF NOT EXISTS customer (
    customer_id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL UNIQUE,
    customer_phone_number TEXT NOT NULL, -- Singaporean Phone Numbers - ex: 12345678
    customer_password TEXT NOT NULL,
    customer_image TEXT -- Store pathing, example: "/customer-images/example.jpg"
);

CREATE TABLE IF NOT EXISTS restaurant (
    restaurant_id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_name TEXT NOT NULL,
    restaurant_email TEXT NOT NULL UNIQUE,
    restaurant_phone_number TEXT NOT NULL, -- Singaporean Phone Numbers - ex: 12345678
    restaurant_address TEXT NOT NULL,
    restaurant_password TEXT NOT NULL,
    restaurant_description TEXT,
    restaurant_image TEXT, -- Store pathing, example: "/restaurant-images/example.jpg"
    restaurant_floorplan_image TEXT -- -- Store pathing, example: "/restaurant-images/example.jpg"
);

CREATE TABLE IF NOT EXISTS seating_list (
    table_id INTEGER PRIMARY KEY AUTOINCREMENT, -- unique for a specific table in a specific restaurant at a specific time
    restaurant_id INT NOT NULL,
    available_date DATE NOT NULL, -- YYYY-MM-DD
    available_time TIME NOT NULL, -- HH:MM:SS 
    table_status TEXT NOT NULL DEFAULT "UNBOOKED", -- "UNBOOKED" or "BOOKED" 
    FOREIGN KEY (restaurant_id) REFERENCES restaurant(restaurant_id)
);

CREATE TABLE IF NOT EXISTS reservations (
    reservation_id INTEGER PRIMARY KEY AUTOINCREMENT, -- Unique reservation ID
    customer_id INT NOT NULL,
    rest_id INT NOT NULL,
    reservation_date TEXT NOT NULL,
    booking_time TEXT NOT NULL,
    slot TEXT NOT NULL,
    num_guests INTEGER DEFAULT 1,
    special_request TEXT, -- Any customer special request
    table_id INT NOT NULL, -- Table assigned for the reservation
    status TEXT DEFAULT 'pending', -- Status of the reservation
    FOREIGN KEY (customer_id) REFERENCES customer(customer_id),
    FOREIGN KEY (rest_id) REFERENCES restaurant(restaurant_id)
);

CREATE TABLE IF NOT EXISTS menu_list (
    menu_id INTEGER PRIMARY KEY AUTOINCREMENT, -- unique for a specific menu item in a specific restaurant
    menu_name TEXT NOT NULL,
    restaurant_id INT NOT NULL,
    menu_image TEXT, -- Store pathing, example: "/restaurant-images/example.jpg"
    FOREIGN KEY (restaurant_id) REFERENCES restaurant(restaurant_id)
);

CREATE TABLE IF NOT EXISTS pre_order_menu (
    booking_id INT NOT NULL,
    menu_id INT NOT NULL,
    menu_quantity INT NOT NULL,
    PRIMARY KEY (booking_id, menu_id)
);

COMMIT;

