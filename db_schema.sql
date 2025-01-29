
-- This makes sure that foreign_key constraints are observed and that errors will be thrown for violations
PRAGMA foreign_keys=ON;

BEGIN TRANSACTION;

-- Create tables with SQL commands 
-- Tables, attributes and insertion of entries are added

CREATE TABLE IF NOT EXISTS customer (
    customer_id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone_number INTEGER NOT NULL,
    customer_password TEXT NOT NULL,
    customer_image TEXT
);

CREATE TABLE IF NOT EXISTS restaurant (
    restaurant_id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_name TEXT NOT NULL,
    restaurant_email TEXT NOT NULL,
    restaurant_phone_number INTEGER NOT NULL,
    restaurant_address TEXT NOT NULL,
    restaurant_password TEXT NOT NULL,
    restaurant_description TEXT,
    restaurant_image TEXT
);

CREATE TABLE IF NOT EXISTS seating_list (
    table_id INTEGER PRIMARY KEY AUTOINCREMENT, -- unique for a specific table in a specific restaurant at a specific time
    restaurant_id INT NOT NULL,
    available_time TIME NOT NULL, -- HH:MM:SS ////////////////
    table_status TEXT NOT NULL DEFAULT "UNBOOKED", -- "UNBOOKED" or "BOOKED" ////////////
    FOREIGN KEY (restaurant_id) REFERENCES restaurant(restaurant_id)
);

CREATE TABLE IF NOT EXISTS bookings (
    booking_id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_date DATE NOT NULL, -- YYYY-MM_DD
    booking_time TIME NOT NULL, -- HH:MM:SS
    num_of_adult INT NOT NULL,
    num_of_child INT NOT NULL,
    customer_id INT NOT NULL,
    table_id INT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customer(customer_id),
    FOREIGN KEY (table_id) REFERENCES seating_list(table_id)
);

CREATE TABLE IF NOT EXISTS menu_list (
    menu_id INTEGER PRIMARY KEY AUTOINCREMENT, -- unique for a specific menu item in a specific restaurant
    menu_name TEXT NOT NULL,
    restaurant_id INT NOT NULL,
    menu_image TEXT,
    FOREIGN KEY (restaurant_id) REFERENCES restaurant(restaurant_id)
);

CREATE TABLE IF NOT EXISTS pre_order_menu (
    booking_id INT NOT NULL,
    menu_id INT NOT NULL,
    menu_quantity INT NOT NULL,
    PRIMARY KEY (booking_id, menu_id)
);

COMMIT;

