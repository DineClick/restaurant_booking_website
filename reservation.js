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
            INSERT INTO reservations (customer_id, rest_id, reservation_date, slot, booking_time, num_guests, special_request, table_id, status) 
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

// Function to get reservations formatted for EJS rendering
exports.getReservationsForEjs = (userId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT r.reservation_id, r.reservation_date, r.slot, r.status, 
                   r.num_guests, r.special_request, t.restaurant_name
            FROM reservations r
            JOIN restaurant t ON r.rest_id = t.restaurant_id
            WHERE r.customer_id = ?;
        `;

        global.db.all(query, [userId], (err, reservations) => {
            if (err) reject(err);
            else resolve(reservations);
        });
    });
};

// Delete a reservation
exports.deleteReservation = (req, res) => {
    const { id: resId } = req.params;

    const deleteQuery = `DELETE FROM reservations WHERE reservation_id = ?;`;

    global.db.run(deleteQuery, [resId], function (err) {
        if (err) {
            return res.status(500).json({ message: "Database error", error: err.message });
        }

        if (this.changes === 0) {
            return res.status(404).json({ message: "Reservation not found" });
        }

        io.emit("reservationDeleted", { reservationId: resId });

        res.status(200).json({ message: "Deleted Successfully" });
    });
};

// Get reservations by user ID & status
exports.getReservationsByUserId = (req, res) => {
    const { id: userId, status } = req.params;

    const query = `
        SELECT r.reservation_id, r.reservation_date, r.slot, r.status, r.num_guests, r.special_request, r.table_id, t.restaurant_name 
        FROM reservations r
        JOIN restaurant t ON r.rest_id = t.restaurant_id
        WHERE r.customer_id = ? AND r.status = ?;
    `;

    global.db.all(query, [userId, status], (err, reservations) => {
        if (err) {
            return res.status(500).json({ message: "Database error", error: err.message });
        }
        res.status(200).json(reservations);
    });
};

// Get reservations by restaurant ID & status
exports.getReservationsByRestId = (req, res) => {
    const { id: restId, status } = req.params;

    const query = `
        SELECT r.reservation_id, r.reservation_date, r.slot, r.status, r.num_guests, r.special_request, r.table_id, c.customer_name 
        FROM reservations r
        JOIN customer c ON r.customer_id = c.customer_id
        WHERE r.rest_id = ? AND r.status = ?;
    `;

    global.db.all(query, [restId, status], (err, reservations) => {
        if (err) {
            return res.status(500).json({ message: "Database error", error: err.message });
        }
        res.status(200).json(reservations);
    });
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
