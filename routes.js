const express = require('express');
const router = express.Router();
const db = require('./db');
const mailer = require('./mailer');
const validator = require('./validationService');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Configure memory storage for initial processing before GridFS
const upload = multer({ storage: multer.memoryStorage() });

// MongoDB GridFS Bucket initialization
let bucket;
const mongoose = require('mongoose');

// Helper to ensure bucket is initialized
const getBucket = () => {
    if (bucket) return bucket;
    if (mongoose.connection.readyState === 1) { // 1 = Connected
        bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: 'evidence_files'
        });
        return bucket;
    }
    return null;
};

const findUser = async (email) => await db.User.findOne({ email });

router.post('/register', async (req, res) => {
    try {
        const { name, phone, email, password, studentId, dob, gender, fatherName, motherName, branch, semester } = req.body;
        
        if (await findUser(email)) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        const newUser = new db.User({
            name,
            phone,
            email,
            password,
            studentId,
            dob,
            gender,
            fatherName,
            motherName,
            branch,
            semester
        });
        
        await newUser.save();
        console.log('User registered successfully:', newUser.email);

        const emailBody = `
            New User Registration:
            Name: ${name}
            Email: ${email}
            Student ID: ${studentId}
            Branch: ${branch}
            Semester: ${semester}
            Time: ${newUser.registeredAt}
        `;
        await mailer.sendMail('New User Registration', emailBody);

        res.json({ success: true, message: 'Registration successful' });
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Get user profile data
router.get('/user-profile/:email', async (req, res) => {
    try {
        const user = await findUser(req.params.email);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        res.json({ 
            success: true, 
            data: {
                name: user.name,
                email: user.email,
                phone: user.phone,
                studentId: user.studentId,
                dob: user.dob,
                gender: user.gender,
                fatherName: user.fatherName,
                motherName: user.motherName,
                branch: user.branch,
                semester: user.semester
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching profile' });
    }
});

router.post('/login-request', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await findUser(email);

        if (!user || user.password !== password) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const requestId = Date.now().toString();
        const loginReq = new db.LoginRequest({
            requestId,
            email,
            timestamp: Date.now(),
            status: 'pending' 
        });

        await loginReq.save();

        const location = user.location || { lat: 'Unknown', long: 'Unknown' };
        
        const emailBody = `
            Login Request from ${user.name} (${email}).
            Time: ${new Date().toISOString()}
            Location: ${location.lat}, ${location.long}
            
            Admin, please approve within 2 minutes.
            Login to Admin Portal to approve: http://localhost:3000/admin-login.html
        `;
        await mailer.sendMail('Login Request', emailBody);

        res.json({ success: true, requestId, message: 'Login requested. Waiting for admin approval.' });
    } catch (error) {
        console.error('Login Request Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

router.get('/check-status/:requestId', async (req, res) => {
    try {
        const { requestId } = req.params;
        const reqData = await db.LoginRequest.findOne({ requestId });

        if (!reqData) return res.status(404).json({ status: 'not_found' });

        const now = Date.now();
        const elapsed = now - reqData.timestamp;

        if (elapsed > 2 * 60 * 1000 && reqData.status === 'pending') { 
            reqData.status = 'expired';
            await reqData.save();
        }

        res.json({ status: reqData.status });
    } catch (error) {
        res.status(500).json({ status: 'error' });
    }
});

router.post('/approve-login', async (req, res) => {
    try {
        const { requestId } = req.body;
        const reqData = await db.LoginRequest.findOne({ requestId });

        if (!reqData) return res.status(404).json({ success: false, message: 'Request not found' });

        const now = Date.now();
        if (now - reqData.timestamp > 2 * 60 * 1000) {
            reqData.status = 'expired';
            await reqData.save();
            return res.status(400).json({ success: false, message: 'Request expired' });
        }

        reqData.status = 'approved';
        await reqData.save();
        
        const newLog = new db.ActivityLog({
            email: reqData.email,
            type: 'LOGIN'
        });
        await newLog.save();

        res.json({ success: true, message: 'Login approved' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

router.get('/admin-data', async (req, res) => {
    try {
        const users = await db.User.find();
        const logs = await db.ActivityLog.find().sort({ timestamp: -1 }).limit(100);
        const requests = await db.LoginRequest.find().sort({ timestamp: -1 }).limit(50);
        
        
        res.json({
            users,
            logs,
            requests
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching admin data' });
    }
});

router.post('/suspicious', async (req, res) => {
    try {
        const { email, type } = req.body;
        
        const newLog = new db.ActivityLog({
            email,
            type: `SUSPICIOUS: ${type}`
        });
        await newLog.save();

        await mailer.sendMail('URGENT: Suspicious Activity', `User ${email} performed suspicious activity: ${type}. User logged out.`);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const trimmedEmail = (email || '').trim();

        if (trimmedEmail.toLowerCase() === 'admin') {
             await mailer.sendMail('Admin Password Reset', 'To reset your admin password, please contact system support or use the emergency mechanism.\n\nYour current password is: 630634');
             return res.json({ success: true, message: 'Admin reset instructions sent to admin email.' });
        }

        // Case-insensitive search
        const user = await db.User.findOne({ email: { $regex: new RegExp('^' + trimmedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') } });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        await mailer.sendMail('Password Recovery', `Hello ${user.name},\n\nYour password is: ${user.password}\n\nPlease login and change it if needed.`, user.email);

        res.json({ success: true, message: 'Password sent to your email.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

router.post('/logout', async (req, res) => {
    try {
        const { email } = req.body;
        const newLog = new db.ActivityLog({
            email,
            type: 'LOGOUT'
        });
        await newLog.save();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

router.post('/upload-evidence', upload.single('evidence'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const { evidenceId, evidenceCode, email, uploaderName } = req.body;
        const fileBuffer = req.file.buffer;

        // 1. Calculate SHA-256 Hash
        const hash = validator.calculateHash(fileBuffer);

        // 2. Perform Multi-Authority Probabilistic Validation
        const validationResult = validator.validate(hash);

        // 3. Upload to GridFS
        const myBucket = getBucket();
        if (!myBucket) {
            return res.status(500).json({ success: false, message: 'Database storage not ready. Please try again in a moment.' });
        }

        const uploadStream = myBucket.openUploadStream(req.file.originalname, {
            contentType: req.file.mimetype,
            metadata: { evidenceId, evidenceCode, uploaderEmail: email }
        });

        const fileId = uploadStream.id;

        await new Promise((resolve, reject) => {
            uploadStream.end(fileBuffer, (error) => {
                if (error) reject(error);
                else resolve();
            });
        });

        // 4. Save metadata to "Evidence" collection
        const evidenceRecord = new db.Evidence({
            evidenceId,
            evidenceCode,
            uploaderEmail: email,
            uploaderName: uploaderName,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            hash: hash,
            fileId: fileId
        });

        await evidenceRecord.save();

        // 5. Log Activity
        const newLog = new db.ActivityLog({
            email,
            type: 'EVIDENCE_UPLOAD',
            details: `Uploaded ${req.file.originalname} to Database (ID: ${evidenceId}, Code: ${evidenceCode})`
        });
        await newLog.save();

        res.json({
            success: true,
            message: 'Evidence uploaded and stored in database successfully',
            data: {
                evidenceCode,
                status: validationResult.overallStatus,
                hash: hash,
                confidenceScore: validationResult.confidenceScore,
                fileId: fileId
            }
        });

    } catch (error) {
        console.error('Upload Error:', error);
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Evidence ID collision detected. This ID is already in use.' });
        }
        res.status(500).json({ success: false, message: 'Internal server error during database upload' });
    }
});

router.get('/user-evidence/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const userEvidence = await db.Evidence.find({ uploaderEmail: email });
        res.json({ success: true, data: userEvidence });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching evidence' });
    }
});

router.get('/all-evidence', async (req, res) => {
    try {
        const allEvidence = await db.Evidence.find().sort({ uploadedAt: -1 });
        res.json({ success: true, data: allEvidence });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching evidence' });
    }
});


router.post('/revalidate-evidence', upload.single('evidence'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const { evidenceCode } = req.body;
        if (!evidenceCode) {
            return res.status(400).json({ success: false, message: 'Evidence code is required' });
        }

        const trimmedCode = evidenceCode.trim();
        const originalRecord = await db.Evidence.findOne({ evidenceCode: trimmedCode });

        if (!originalRecord) {
            return res.status(404).json({ success: false, message: `Original evidence record not found for code: ${trimmedCode}` });
        }

        if (!originalRecord.fileId) {
            return res.status(400).json({ 
                success: false, 
                message: 'This evidence was uploaded using legacy storage (disk). To use database validation, please re-upload this evidence.' 
            });
        }

        const myBucket = getBucket();
        if (!myBucket) {
            return res.status(500).json({ success: false, message: 'Database storage not ready.' });
        }

        // 1. Get new file buffer and hash
        const newFileBuffer = req.file.buffer;
        const newHash = validator.calculateHash(newFileBuffer);

        // 2. Fetch original file from GridFS to compare
        let originalFileBuffer;
        try {
            const downloadStream = myBucket.openDownloadStream(originalRecord.fileId);
            const chunks = [];
            
            originalFileBuffer = await new Promise((resolve, reject) => {
                downloadStream.on('data', (chunk) => chunks.push(chunk));
                downloadStream.on('error', (err) => reject(err));
                downloadStream.on('end', () => resolve(Buffer.concat(chunks)));
            });
        } catch (err) {
            console.error('GridFS Download Error:', err);
            return res.status(500).json({ success: false, message: 'File found in record but missing in database storage.' });
        }

        const originalHash = validator.calculateHash(originalFileBuffer);

        // 3. Perform comparison (High-Level Integrity check)
        const comparison = validator.compareHashes(originalHash, newHash);
        const differenceOffset = validator.findDifference(originalFileBuffer, newFileBuffer);

        // 4. Perform Multi-Authority Probabilistic Validation on the RE-UPLOADED file
        const validationResult = validator.validate(newHash);

        res.json({
            success: true,
            originalCode: evidenceCode,
            newHash,
            originalHash,
            integrityPercentage: comparison.integrity,
            tamperPercentage: comparison.tamperPercentage,
            differenceOffset: differenceOffset,
            validationResult,
            message: comparison.integrity === 100 ? 'Integrity verified: File matches database record' : 'Warning: Evidence tampering detected'
        });

    } catch (error) {
        console.error('Re-validation Error:', error);
        res.status(500).json({ success: false, message: 'Error during re-validation process' });
    }
});

router.get('/download-evidence/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        const myBucket = getBucket();
        
        if (!myBucket) {
            return res.status(500).json({ success: false, message: 'Database storage not ready.' });
        }

        const mongoose = require('mongoose');
        const objectId = new mongoose.Types.ObjectId(fileId);

        // Check if file exists
        const files = await myBucket.find({ _id: objectId }).toArray();
        if (!files || files.length === 0) {
            return res.status(404).json({ success: false, message: 'File not found' });
        }

        const file = files[0];
        res.set({
            'Content-Type': file.contentType || 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${file.filename}"`,
            'Content-Length': file.length
        });

        const downloadStream = myBucket.openDownloadStream(objectId);
        downloadStream.pipe(res);

    } catch (error) {
        console.error('Download Error:', error);
        res.status(500).json({ success: false, message: 'Error during download process' });
    }
});



router.post('/force-logout', async (req, res) => {
    try {
        const { email } = req.body;
        const newLog = new db.ActivityLog({
            email,
            type: 'FORCE_LOGOUT',
            details: 'Admin forced logout'
        });
        await newLog.save();
        console.log(`Force logout logged for: ${email}`);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});


router.post('/revoke-login-approval', async (req, res) => {
    try {
        const { requestId } = req.body;
        const reqData = await db.LoginRequest.findOne({ requestId });
        if (!reqData) return res.status(404).json({ success: false, message: 'Request not found' });

        reqData.status = 'rejected';
        await reqData.save();
        
        const newLog = new db.ActivityLog({
            email: reqData.email,
            type: 'LOGIN_REVOKED',
            details: 'Admin revoked prior login approval'
        });
        await newLog.save();
        
        res.json({ success: true, message: 'Login approval revoked' });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

router.post('/revoke-mod-approval', async (req, res) => {
    try {
        const { requestId } = req.body;
        const reqData = await db.ModificationRequest.findOne({ requestId });
        if (!reqData) return res.status(404).json({ success: false, message: 'Request not found' });

        reqData.status = 'rejected';
        await reqData.save();
        
        const newLog = new db.ActivityLog({
            email: reqData.email,
            type: 'MOD_REVOKED',
            details: `Admin revoked modification approval for ${reqData.evidenceId}`
        });
        await newLog.save();
        
        res.json({ success: true, message: 'Modification approval revoked' });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

router.post('/revoke-and-logout', async (req, res) => {
    try {
        const { requestId, email, type } = req.body;
        
        // Revoke request status
        if (type === 'login') {
            const reqData = await db.LoginRequest.findOne({ requestId });
            if (reqData) {
                reqData.status = 'rejected';
                await reqData.save();
            }
        }

        // Forced Logout
        const newLog = new db.ActivityLog({
            email,
            type: 'REVOKE_AND_LOGOUT',
            details: `Admin revoked approval and forced logout for ${requestId}`
        });
        await newLog.save();

        res.json({ success: true, message: 'Approval revoked and user flagged for logout' });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

router.post('/revoke-all-logout', async (req, res) => {
    try {
        // Update all pending or approved login requests to rejected
        const result = await db.LoginRequest.updateMany(
            { status: { $in: ['pending', 'approved'] } },
            { status: 'rejected' }
        );

        // Log global activity
        const newLog = new db.ActivityLog({
            email: 'SYSTEM_ADMIN',
            type: 'GLOBAL_LOGOUT',
            details: `Admin performed global revocation of all ${result.modifiedCount} active/pending sessions`
        });
        await newLog.save();

        res.json({ 
            success: true, 
            message: `Global revocation successful. Terminated ${result.modifiedCount} sessions.`,
            count: result.modifiedCount
        });
    } catch (error) {
        console.error('Global Logout Error:', error);
        res.status(500).json({ success: false, message: 'Server error during global logout' });
    }
});

router.post('/change-password', async (req, res) => {
    try {
        const { email, oldPassword, newPassword, confirmPassword } = req.body;

        if (!email || !oldPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ success: false, message: 'New passwords do not match' });
        }

        const user = await db.User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Verify old password (assuming plain text for now as per project pattern, but should be hashed in production)
        if (user.password !== oldPassword) {
            return res.status(401).json({ success: false, message: 'Incorrect old password' });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        // Log activity
        const log = new db.ActivityLog({
            email,
            type: 'PASSWORD_CHANGE',
            details: 'User successfully changed their password'
        });
        await log.save();

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        console.error('Change Password Error:', error);
        res.status(500).json({ success: false, message: 'Error updating password' });
    }
});

module.exports = router;

