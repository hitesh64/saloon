const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors()); // Allows your frontend to talk to your backend
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Multer storage configuration
const storage = multer.memoryStorage();

// Max image size 5MB set kar rahe hain taaki database overload na ho
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }
});

// ==========================================
// 1. MongoDB Connection
// ==========================================
// Connects to a local MongoDB database named 'elegance_salon'
mongoose.connect('mongodb+srv://kunal:KdVygwFo0Anau8uX@hitesh.cqczgkd.mongodb.net/salon')
    .then(() => console.log('✅ Connected to MongoDB successfully!'))
    .catch(err => console.error('❌ MongoDB connection error:', err));


// ==========================================
// 2. Database Models (Schemas)
// ==========================================

// Regular User Model (For index.html)
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', UserSchema);

// Admin Model (For admin.html)
const AdminSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const Admin = mongoose.model('Admin', AdminSchema);

// Service Model (Updated with imageUrl for dynamic admin management)
const ServiceSchema = new mongoose.Schema({
    name: String,
    price: Number,
    duration: Number,
    mood: String,
    popular: Boolean,
    imageUrl: String
});
const Service = mongoose.model('Service', ServiceSchema);

// Booking Model
const BookingSchema = new mongoose.Schema({
    name: String,
    phone: String,
    address: String,
    service: String,
    date: String,
    time: String,
    blockedSlots: [String],
    payment: String,
    status: { type: String, default: 'Pending' }
});
const Booking = mongoose.model('Booking', BookingSchema);


// ==========================================
// 3. Auto-Seed Database (Adds services if empty)
// ==========================================
async function seedServices() {
    const count = await Service.countDocuments();
    if (count === 0) {
        console.log('Seeding initial services to database...');
        const initialServices = [
            { name: 'Glow Facial', price: 800, duration: 60, mood: 'Daily care', popular: true, imageUrl: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=800&q=80' },
            { name: 'Bridal Makeup', price: 5000, duration: 180, mood: 'Wedding', popular: true, imageUrl: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=600&q=80' },
            { name: 'Party Hair Styling', price: 1200, duration: 45, mood: 'Party', popular: false, imageUrl: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=600&q=80' },
            { name: 'Basic Haircut', price: 400, duration: 30, mood: 'Daily care', popular: false, imageUrl: 'https://images.unsplash.com/photo-1599305090598-fe179d501227?w=600&q=80' },
            { name: 'Luxury Manicure', price: 600, duration: 45, mood: 'Party', popular: true, imageUrl: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=600&q=80' }
        ];
        await Service.insertMany(initialServices);
        console.log('✅ Services seeded!');
    }
}
seedServices();


// ==========================================
// 4. API Routes
// ==========================================

// --- REGULAR USER AUTHENTICATION (For index.html) ---

// User Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, phone, email, password } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "Email already registered." });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({ name, phone, email, password: hashedPassword });
        await newUser.save();

        res.status(201).json({
            message: "User created",
            user: { _id: newUser._id, name, phone, email }
        });
    } catch (err) {
        res.status(500).json({ message: "Server Error", error: err.message });
    }
});

// User Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "Invalid email or password." });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid email or password." });

        res.status(200).json({
            message: "Login successful",
            user: { _id: user._id, name: user.name, phone: user.phone, email: user.email }
        });
    } catch (err) {
        res.status(500).json({ message: "Server Error", error: err.message });
    }
});
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: "Image is too large! Maximum allowed size is 10MB." });
        }
    } else if (err) {
        return res.status(500).json({ message: "Server error occurred", error: err.message });
    }
    next();
});

// --- ADMIN AUTHENTICATION (For admin.html) ---

// Admin Register
app.post('/api/admin/auth/register', async (req, res) => {
    try {
        const { name, phone, email, password } = req.body;

        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) return res.status(400).json({ message: "Admin email already registered." });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newAdmin = new Admin({ name, phone, email, password: hashedPassword });
        await newAdmin.save();

        res.status(201).json({
            message: "Admin created",
            user: { _id: newAdmin._id, name, phone, email }
        });
    } catch (err) {
        res.status(500).json({ message: "Server Error", error: err.message });
    }
});

// Admin Login
app.post('/api/admin/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const admin = await Admin.findOne({ email });
        if (!admin) return res.status(400).json({ message: "Invalid admin credentials." });

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid admin credentials." });

        res.status(200).json({
            message: "Admin login successful",
            user: { _id: admin._id, name: admin.name, phone: admin.phone, email: admin.email }
        });
    } catch (err) {
        res.status(500).json({ message: "Server Error", error: err.message });
    }
});


// --- SERVICES (Admin Menu Management) ---

// Get all services
app.get('/api/services', async (req, res) => {
    try {
        const services = await Service.find();
        res.json(services);
    } catch (err) {
        res.status(500).json({ message: "Error fetching services" });
    }
});
// Create new service with Image saved DIRECTLY to Database
app.post('/api/services', upload.single('image'), async (req, res) => {
    try {
        const serviceData = { ...req.body };
        serviceData.popular = req.body.popular === 'true';

        // Agar image aayi hai, toh use Base64 string mein convert karke database mein dal do
        if (req.file) {
            const b64 = Buffer.from(req.file.buffer).toString('base64');
            let mimeType = req.file.mimetype;
            serviceData.imageUrl = `data:${mimeType};base64,${b64}`;
        }

        const newService = new Service(serviceData);
        await newService.save();
        res.status(201).json({ message: "Service added", service: newService });
    } catch (err) {
        res.status(500).json({ message: "Error adding service", error: err.message });
    }
});

// Update existing service with Image saved DIRECTLY to Database
app.put('/api/services/:id', upload.single('image'), async (req, res) => {
    try {
        const serviceData = { ...req.body };
        serviceData.popular = req.body.popular === 'true';

        // Agar user ne nayi image di hai, toh purani replace kar do
        if (req.file) {
            const b64 = Buffer.from(req.file.buffer).toString('base64');
            let mimeType = req.file.mimetype;
            serviceData.imageUrl = `data:${mimeType};base64,${b64}`;
        }

        const updatedService = await Service.findByIdAndUpdate(req.params.id, serviceData, { new: true });
        res.status(200).json({ message: "Service updated", service: updatedService });
    } catch (err) {
        res.status(500).json({ message: "Error updating service", error: err.message });
    }
});

// Delete service (Admin)
app.delete('/api/services/:id', async (req, res) => {
    try {
        await Service.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Service deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: "Error deleting service", error: err.message });
    }
});


// --- BOOKINGS ---

// Create a booking
app.post('/api/bookings', async (req, res) => {
    try {
        const newBooking = new Booking(req.body);
        await newBooking.save();
        res.status(201).json({ message: "Booking confirmed", booking: newBooking });
    } catch (err) {
        res.status(500).json({ message: "Error creating booking", error: err.message });
    }
});

// Get all bookings (Admin)
app.get('/api/bookings/all', async (req, res) => {
    try {
        const bookings = await Booking.find().sort({ date: 1, time: 1 });
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ message: "Error fetching bookings" });
    }
});

// Get bookings by user phone number
app.get('/api/bookings/user/:phone', async (req, res) => {
    try {
        const bookings = await Booking.find({ phone: req.params.phone }).sort({ date: 1 });
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ message: "Error fetching user bookings" });
    }
});

// Get bookings by date (To check slot availability)
app.get('/api/bookings/date/:date', async (req, res) => {
    try {
        const bookings = await Booking.find({ date: req.params.date });
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ message: "Error fetching bookings by date" });
    }
});

// Update Booking Status (Accept/Reject)
app.patch('/api/bookings/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        let updateData = { status };

        // Agar booking reject ho gayi, toh blocked slots khali kar do taaki dusra koi book kar sake
        if (status === 'Rejected') {
            updateData.blockedSlots = [];
        }

        const updatedBooking = await Booking.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        if (!updatedBooking) {
            return res.status(404).json({ message: "Booking not found in database." });
        }

        res.status(200).json({ message: "Status updated successfully", booking: updatedBooking });
    } catch (err) {
        console.error("Status Update Error:", err);
        res.status(500).json({ message: "Server error updating status", error: err.message });
    }
});
// Add this at the top of your file with the other requires
const { OAuth2Client } = require('google-auth-library');

// Initialize the client with your specific Key
const googleClient = new OAuth2Client('322997860332-p6g82li62crt2b7nmpe5sf1k2cd11e0v.apps.googleusercontent.com');

app.post('/api/auth/google', async (req, res) => {
    try {
        const { token } = req.body;
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: '322997860332-p6g82li62crt2b7nmpe5sf1k2cd11e0v.apps.googleusercontent.com',
        });

        const payload = ticket.getPayload();
        const { email, name } = payload;

        let user = await User.findOne({ email });

        if (!user) {
            // Create user if they don't exist
            user = new User({
                name: name,
                email: email,
                phone: "Google User", // Placeholder
                password: await bcrypt.hash(Math.random().toString(36), 10) // Random pass
            });
            await user.save();
        }

        res.status(200).json({
            message: "Success",
            user: { _id: user._id, name: user.name, phone: user.phone, email: user.email }
        });
    } catch (err) {
        console.error("Google Auth Error:", err);
        res.status(500).json({ message: "Auth failed", error: err.message });
    }
});
// Delete a booking
app.delete('/api/bookings/:id', async (req, res) => {
    try {
        const deletedBooking = await Booking.findByIdAndDelete(req.params.id);

        if (!deletedBooking) {
            return res.status(404).json({ message: "Booking not found." });
        }

        res.status(200).json({ message: "Booking deleted successfully" });
    } catch (err) {
        console.error("Delete Error:", err);
        res.status(500).json({ message: "Server error deleting booking", error: err.message });
    }
});

// ==========================================
// 5. Start the Server
// ==========================================
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });
}
module.exports = app;