const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/evidence_validator')
    .then(() => console.log('Connected to MongoDB successfully'))
    .catch((err) => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    studentId: { type: String },
    dob: { type: String },
    gender: { type: String },
    fatherName: { type: String },
    motherName: { type: String },
    branch: { type: String },
    semester: { type: String },
    location: {
        lat: { type: String, default: '12.9716' },
        long: { type: String, default: '77.5946' }
    },
    registeredAt: { type: Date, default: Date.now }
});

// Evidence Schema
const evidenceSchema = new mongoose.Schema({
    evidenceId: { type: String, required: true, unique: true },
    evidenceCode: { type: String, required: true },
    uploaderEmail: { type: String, required: true },
    uploaderName: { type: String },
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    mimeType: { type: String },
    hash: { type: String, required: true },
    fileId: { type: mongoose.Schema.Types.ObjectId }, // GridFS file ID
    uploadedAt: { type: Date, default: Date.now },
});

// Activity Log Schema
const activityLogSchema = new mongoose.Schema({
    email: { type: String, required: true },
    type: { type: String, required: true },
    details: { type: String },
    timestamp: { type: Date, default: Date.now }
});

// Login Request Schema
const loginRequestSchema = new mongoose.Schema({
    requestId: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    timestamp: { type: Number, required: true },
    status: { type: String, default: 'pending' }
});


const User = mongoose.model('User', userSchema);
const Evidence = mongoose.model('Evidence', evidenceSchema);
const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
const LoginRequest = mongoose.model('LoginRequest', loginRequestSchema);

module.exports = {
    User,
    Evidence,
    ActivityLog,
    LoginRequest
};

