const express = require("express");
const router = express.Router();
const reservationController = require("../controllers/reservation");

// Middleware for authentication
const authenticateCustomer = (req, res, next) => {
    if (!req.session.customer_id) {
        return res.status(401).json({ message: "User not authenticated" });
    }
    next();
};

const authenticateRestaurant = (req, res, next) => {
    if (!req.session.restaurant_id) {
        return res.status(401).json({ message: "Restaurant not authenticated" });
    }
    next();
};

// Routes
router.get("/available/:date/:id", reservationController.checkAvailableSlots);
router.post("/create", authenticateCustomer, reservationController.createReservation);
router.delete("/:id", authenticateCustomer, reservationController.deleteReservation);
router.get("/user/:id/:status", authenticateCustomer, reservationController.getReservationsByUserId);
router.get("/restaurant/:id/:status", authenticateRestaurant, reservationController.getReservationsByRestId);
router.put("/update-status/:id", authenticateRestaurant, reservationController.updateReservationStatus);

module.exports = router;
