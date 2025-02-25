const { io } = require("../socket");
const nodemailer = require("nodemailer");
const cron = require("node-cron"); // Use cron jobs for scheduled tasks

// Configure Nodemailer Email Transport
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "your-email@gmail.com",
        pass: "your-email-password"
    }
});

// Function to Send Email
const sendEmail = (to, subject, text) => {
    const mailOptions = {
        from: "your-email@gmail.com",
        to,
        subject,
        text
    };

    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            console.error("Error sending email:", err);
        } else {
            console.log("Email sent:", info.response);
        }
    });
};

exports.checkAvailableTables = (req, res) => {
    const { date, id: restId, numGuests, slot } = req.params;
    if (!slot) {
        return res.status(400).json({ message: "Missing slot parameter" });
    }

    const tableQuery = `SELECT * FROM tables WHERE restaurant_id = ? ORDER BY capacity ASC;`;
    global.db.all(tableQuery, [restId], (err, tables) => {
        if (err) return res.status(500).json({ message: "Database error", error: err.message });

        const bookedQuery = `SELECT table_id FROM reservations WHERE rest_id = ? AND reservation_date = ? AND slot = ?;`;
        global.db.all(bookedQuery, [restId, date, slot], (err, bookedTables) => {
            if (err) return res.status(500).json({ message: "Database error", error: err.message });
            
            const bookedTableIds = bookedTables.map(res => res.table_id);
            let totalSeats = 0;
            const availableTables = [];
            
            // Combine tables if needed
            for (let table of tables) {
                if (!bookedTableIds.includes(table.table_id)) {
                    availableTables.push(table);
                    totalSeats += table.capacity;
                    if (totalSeats >= numGuests) break;
                }
            }

            if (totalSeats >= numGuests) {
                res.status(200).json(availableTables);
            } else {
                res.status(400).json({ message: "No available tables for this time slot" });
            }
        });
    });
};

exports.createReservation = (req, res) => {
    const { rest, date, slot, num_guests, special_request, booking_time, user_email } = req.body;
    const userId = req.session.customer_id;
    
    // Prevent duplicate bookings for the same time slot
    const duplicateCheckQuery = `SELECT * FROM reservations WHERE customer_id = ? AND reservation_date = ? AND slot = ?;`;
    global.db.get(duplicateCheckQuery, [userId, date, slot], (err, existingRes) => {
        if (existingRes) {
            return res.status(400).json({ message: "You already have a reservation at this time." });
        }
    
        const tableQuery = `SELECT table_id FROM tables WHERE restaurant_id = ? AND capacity >= ? AND table_id NOT IN (SELECT table_id FROM reservations WHERE rest_id = ? AND reservation_date = ? AND slot = ?) ORDER BY capacity ASC LIMIT 1;`;
        global.db.get(tableQuery, [rest, num_guests, rest, date, slot], (err, availableTable) => {
            if (err || !availableTable) return res.status(400).json({ message: "No available tables for this reservation" });
    
            const tableId = availableTable.table_id;
            const insertQuery = `INSERT INTO reservations (customer_id, rest_id, reservation_date, slot, booking_time, num_guests, special_request, table_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending');`;
    
            global.db.run(insertQuery, [userId, rest, date, slot, booking_time, num_guests, special_request, tableId], function (err) {
                if (err) return res.status(500).json({ message: "Error creating reservation", error: err.message });
    
                const reservationId = this.lastID;
                io.emit("newReservation", { restaurantId: rest, slot, date });
                sendEmail(user_email, "Reservation Confirmed!", `Your reservation at restaurant ID ${rest} on ${date} at ${booking_time} is confirmed.`);
                scheduleReminder(user_email, rest, date, booking_time, reservationId);
                res.status(200).json({ message: "Reservation created successfully", reservationId, tableId });
            });
        });
    });
};

const scheduleReminder = (email, restaurantId, date, booking_time, reservationId) => {
    const reservationTime = new Date(`${date} ${booking_time}`);
    const reminderTime = new Date(reservationTime.getTime() - 60 * 60 * 1000); // 1 hour before
    
    const cronTime = `${reminderTime.getMinutes()} ${reminderTime.getHours()} ${reminderTime.getDate()} ${reminderTime.getMonth() + 1} *`;
    
    cron.schedule(cronTime, () => {
        sendEmail(email, "Upcoming Reservation Reminder!", `Reminder: You have a reservation at restaurant ID ${restaurantId} on ${date} at ${booking_time}.`);
    }, { scheduled: true, timezone: "UTC" });
};

const getReservations = (filter, value, status = null) => {
    return new Promise((resolve, reject) => {
        let query = `
            SELECT 
                r.reservation_id, 
                r.reservation_date, 
                r.slot, 
                r.status, 
                r.num_guests, 
                r.special_request, 
                r.table_id, 
                t.table_number, 
                t.capacity AS table_capacity, 
                c.customer_name, 
                rest.restaurant_name, 
                rest.allows_pre_order, -- Added field to check pre-order availability
                p.menu_id, 
                m.menu_name, 
                p.menu_quantity
            FROM reservations r
            LEFT JOIN customer c ON r.customer_id = c.customer_id
            LEFT JOIN restaurant rest ON r.rest_id = rest.restaurant_id
            LEFT JOIN tables t ON r.table_id = t.table_id
            LEFT JOIN pre_order_menu p ON r.reservation_id = p.booking_id
            LEFT JOIN menu_list m ON p.menu_id = m.menu_id
            WHERE r.${filter} = ?`;

        if (status) {
            query += ` AND r.status = ?`;
        }

        const params = status ? [value, status] : [value];

        global.db.all(query, params, (err, rows) => {
            if (err) return reject(err);

            // Group reservations by reservation_id
            const groupedReservations = {};
            rows.forEach(row => {
                if (!groupedReservations[row.reservation_id]) {
                    groupedReservations[row.reservation_id] = {
                        reservation_id: row.reservation_id,
                        reservation_date: row.reservation_date,
                        slot: row.slot,
                        status: row.status,
                        num_guests: row.num_guests,
                        special_request: row.special_request,
                        table_id: row.table_id,
                        table_number: row.table_number,
                        table_capacity: row.table_capacity,
                        customer_name: row.customer_name,
                        restaurant_name: row.restaurant_name,
                        pre_order_items: []
                    };
                }

                // Add pre-orders only if the restaurant allows them
                if (row.menu_id && row.allows_pre_order) {
                    groupedReservations[row.reservation_id].pre_order_items.push({
                        menu_name: row.menu_name,
                        menu_quantity: row.menu_quantity
                    });
                }
            });

            resolve(Object.values(groupedReservations));
        });
    });
};


// Customers view
exports.getReservationsForEjs = (userId) => getReservations("customer_id", userId);

// Restaurants view
exports.getReservationsForRestaurant = (restaurantId) => getReservations("rest_id", restaurantId);

// Customer API
exports.getReservationsByUserId = (req, res) => {
    const { id: userId, status } = req.params;
    getReservations("customer_id", userId, status)
        .then(reservations => res.status(200).json(reservations))
        .catch(err => res.status(500).json({ message: "Database error", error: err.message }));
};

// Restaurant API
exports.getReservationsByRestId = (req, res) => {
    const { id: restId, status } = req.params;
    getReservations("rest_id", restId, status)
        .then(reservations => res.status(200).json(reservations))
        .catch(err => res.status(500).json({ message: "Database error", error: err.message }));
};


exports.deleteReservation = async (req, res) => {
    try {
        const { id: resId } = req.params;

        // Get reservation details before deleting
        const reservationQuery = `SELECT customer_id, rest_id, reservation_date, slot FROM reservations WHERE reservation_id = ?;`;
        global.db.get(reservationQuery, [resId], (err, reservation) => {
            if (err || !reservation) {
                return res.status(404).json({ message: "Reservation not found" });
            }

            // Delete pre-orders first
            const deletePreOrdersQuery = `DELETE FROM pre_order_menu WHERE booking_id = ?;`;
            global.db.run(deletePreOrdersQuery, [resId], function (err) {
                if (err) return res.status(500).json({ message: "Error deleting pre-orders", error: err.message });

                // Now delete the reservation
                const deleteQuery = `DELETE FROM reservations WHERE reservation_id = ?;`;
                global.db.run(deleteQuery, [resId], function (err) {
                    if (err) return res.status(500).json({ message: "Database error", error: err.message });

                    io.emit("reservationDeleted", { reservationId: resId });

                    // Send cancellation emails
                    sendEmail(
                        reservation.customer_email,
                        "Reservation Cancelled",
                        `Your reservation at restaurant ID ${reservation.rest_id} on ${reservation.reservation_date} at ${reservation.slot} has been cancelled.`
                    );

                    res.status(200).json({ message: "Deleted Successfully" });
                });
            });
        });
    } catch (error) {
        console.error("Error deleting reservation:", error);
        res.status(500).send("Internal Server Error");
    }
};

exports.updateReservationStatus = (req, res) => {
    const { id: resId } = req.params;
    const { status } = req.body;
    const validStatuses = ["pending", "confirmed", "completed", "cancelled"];
    if (!validStatuses.includes(status)) return res.status(400).json({ message: "Invalid status value" });
    
    const updateQuery = `UPDATE reservations SET status = ?, status_updated_at = CURRENT_TIMESTAMP WHERE reservation_id = ?;`;
    global.db.run(updateQuery, [status, resId], function (err) {
        if (err) return res.status(500).json({ message: "Database error", error: err.message });
        if (this.changes === 0) return res.status(404).json({ message: "Reservation not found" });
    
        res.status(200).json({ message: `Reservation updated to ${status} successfully` });
    });
};

