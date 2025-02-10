const express = require("express");
const router = express.Router();
const reservationController = require("../controllers/reservation");

// Middleware for authentication
const authenticateCustomer = (req, res, next) => {
    if (!req.session.customer_id) {
        return res.redirect("/customers/login"); // Redirect if not authenticated
    }
    next();
};

const authenticateRestaurant = (req, res, next) => {
    if (!req.session.restaurant_id) {
        return res.status(401).json({ message: "Restaurant not authenticated" });
    }
    next();
};

// Fetch and render reservations for the logged-in customer
router.get("/my-bookings", authenticateCustomer, async (req, res) => {
    try {
        const userId = req.session.customer_id;
        const reservations = await reservationController.getReservationsForEjs(userId);
        
        res.render("customers-booking", { 
            customer_data: { customer_name: req.session.customer_name }, 
            reservations 
        });
    } catch (error) {
        console.error("Error fetching reservations:", error);
        res.status(500).send("Internal Server Error");
    }
});

// API Routes for Frontend or AJAX Calls
router.get("/available/:date/:id", reservationController.checkAvailableSlots);
router.post("/create", authenticateCustomer, reservationController.createReservation);
router.delete("/:id", authenticateCustomer, reservationController.deleteReservation);
router.get("/user/:id/:status", authenticateCustomer, reservationController.getReservationsByUserId);
router.get("/restaurant/:id/:status", authenticateRestaurant, reservationController.getReservationsByRestId);
router.put("/update-status/:id", authenticateRestaurant, reservationController.updateReservationStatus);

// Form Submission Route for Deleting a Reservation
router.post("/:id/delete", authenticateCustomer, async (req, res) => {
    try {
        const reservationId = req.params.id;
        await reservationController.deleteReservationById(reservationId);
        res.redirect("/reservations/my-bookings"); // Refresh the bookings page
    } catch (error) {
        console.error("Error deleting reservation:", error);
        res.status(500).send("Error deleting reservation");
    }
});

module.exports = router;
