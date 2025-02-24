const { io } = require("../socket");
const nodemailer = require("nodemailer"); // npm install nodemailer

// Configure Nodemailer Email Transport
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "your-email@gmail.com",  // Replace with your email
        pass: "your-email-password"   // Use an App Password for security
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

// Check available slots
exports.checkAvailableSlots = (req, res) => {
    const { date, id: restId } = req.params;

    const query = `
        SELECT slot FROM reservations 
        WHERE rest_id = ? AND reservation_date = ?;
    `;

    global.db.all(query, [restId, date], (err, reservations) => {
        if (err) {
            return res.status(500).json({ message: "Database error", error: err.message });
        }

        const reservedSlots = reservations.map(reservation => reservation.slot);
        const availableSlots = slots.filter(slot => !reservedSlots.includes(slot));

        res.status(200).json(availableSlots);
    });
};

// Create a reservation and schedule a reminder
exports.createReservation = (req, res) => {
    const { rest, date, slot, num_guests, special_request, table_id, booking_time, user_email } = req.body;
    const userId = req.session.customer_id;

    const checkQuery = `
        SELECT * FROM reservations 
        WHERE rest_id = ? AND reservation_date = ? AND slot = ?;
    `;

    global.db.get(checkQuery, [rest, date, slot], (err, existingReservation) => {
        if (err) {
            return res.status(500).json({ message: "Database error", error: err.message });
        }

        if (existingReservation) {
            return res.status(400).json({ message: "This time slot is already booked" });
        }

        const insertQuery = `
            INSERT INTO reservations (customer_id, rest_id, reservation_date, slot, booking_time, num_of_adult, num_of_child, special_request, table_id, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending');
        `;

        global.db.run(insertQuery, [userId, rest, date, slot, booking_time, num_guests, special_request, table_id], function (err) {
            if (err) {
                return res.status(500).json({ message: "Error creating reservation", error: err.message });
            }

            const reservationId = this.lastID;
            io.emit("newReservation", { restaurantId: rest, slot, date });

            // 📧 Send confirmation email
            sendEmail(user_email, "Reservation Confirmed!", `Your reservation at restaurant ID ${rest} on ${date} at ${booking_time} is confirmed.`);

            // ⏰ Schedule a reminder 1 hour before reservation time
            scheduleReminder(user_email, rest, date, booking_time, reservationId);

            res.status(200).json({ message: "Reservation created successfully", reservationId });
        });
    });
};

// Schedule a Reminder Email
const scheduleReminder = (email, restaurantId, date, booking_time, reservationId) => {
    const reservationTime = new Date(`${date} ${booking_time}`);
    const reminderTime = new Date(reservationTime.getTime() - 60 * 60 * 1000); // 1 hour before

    const timeUntilReminder = reminderTime - new Date();
    if (timeUntilReminder > 0) {
        setTimeout(() => {
            sendEmail(email, "Upcoming Reservation Reminder!", 
                `Reminder: You have a reservation at restaurant ID ${restaurantId} on ${date} at ${booking_time}.`);
        }, timeUntilReminder);
    }
};


const getReservations = (filter, value, status = null) => {
    return new Promise((resolve, reject) => {
        let query = `
            SELECT 
                r.reservation_id, 
                r.reservation_date, 
                r.slot, 
                r.status, 
                r.num_of_adult, 
                r.num_of_child, 
                r.special_request, 
                r.table_id, 
                c.customer_name, 
                t.restaurant_name, 
                p.menu_id, 
                m.menu_name, 
                p.menu_quantity
            FROM reservations r
            LEFT JOIN customer c ON r.customer_id = c.customer_id
            LEFT JOIN restaurant t ON r.rest_id = t.restaurant_id
            LEFT JOIN pre_order_menu p ON r.reservation_id = p.booking_id
            LEFT JOIN menu_list m ON p.menu_id = m.menu_id
            WHERE r.${filter} = ?`;

        // Add status condition if provided
        if (status) {
            query += ` AND r.status = ?`;
        }

        const params = status ? [value, status] : [value];

        global.db.all(query, params, (err, rows) => {
            if (err) {
                return reject(err);
            }

            // Group pre-order items by reservation
            const groupedReservations = {};
            rows.forEach(row => {
                if (!groupedReservations[row.reservation_id]) {
                    groupedReservations[row.reservation_id] = {
                        reservation_id: row.reservation_id,
                        reservation_date: row.reservation_date,
                        slot: row.slot,
                        status: row.status,
                        num_of_adult: row.num_of_adult,
                        num_of_child: row.num_of_child,
                        special_request: row.special_request,
                        table_id: row.table_id,
                        customer_name: row.customer_name,
                        restaurant_name: row.restaurant_name,
                        pre_order_items: []
                    };
                }
                if (row.menu_id) {
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


// Delete a reservation
exports.deleteReservation = async (req, res) => {
    try {
        const { id: resId } = req.params;

        const deleteQuery = `DELETE FROM reservations WHERE reservation_id = ?;`;

        db.run(deleteQuery, [resId], function (err) {
            if (err) {
                return res.status(500).json({ message: "Database error", error: err.message });
            }

            if (this.changes === 0) {
                return res.status(404).json({ message: "Reservation not found" });
            }

            res.status(200).json({ message: "Deleted Successfully" });
        });
    } catch (error) {
        console.error("Error deleting reservation:", error);
        res.status(500).send("Internal Server Error");
    }
};

// Update reservation status (confirm, complete, cancel)
exports.updateReservationStatus = (req, res) => {
    const { id: resId } = req.params;
    const { status } = req.body;

    const validStatuses = ["pending", "confirmed", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
    }

    const updateQuery = `UPDATE reservations SET status = ? WHERE reservation_id = ?;`;

    global.db.run(updateQuery, [status, resId], function (err) {
        if (err) {
            return res.status(500).json({ message: "Database error", error: err.message });
        }

        if (this.changes === 0) {
            return res.status(404).json({ message: "Reservation not found" });
        }

        res.status(200).json({ message: `Reservation updated to ${status} successfully` });
    });
};
