// routes/AadharRoutes.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');
const db = require('../config/db');
const admin = require('firebase-admin');
const cloudinary = require('../config/cloudinary');
const { requireOwner } = require('../middleware/authMiddleware');

const router = express.Router();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only image files and PDFs are allowed!'));
        }
    }
});

function bufferToGenerativePart(buffer, mimeType) {
    return {
        inlineData: {
            data: Buffer.from(buffer).toString("base64"),
            mimeType,
        },
    };
}

// ALL routes protected by requireOwner

// POST /api/aadhar - Upload and extract Aadhaar
router.post('/', requireOwner, upload.single('aadharImage'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }

    try {
        const hasCloudinaryUrl = !!process.env.CLOUDINARY_URL;
        const hasCloudinaryKeys = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
        if (!hasCloudinaryUrl && !hasCloudinaryKeys) {
            return res.status(503).json({ message: 'Image upload not configured. Set CLOUDINARY_URL or cloud_name/api_key/api_secret and restart server.' });
        }
        const driverId = (req.body && req.body.driverId) ? String(req.body.driverId).trim() : '';
        const driverName = (req.body && req.body.driverName) ? String(req.body.driverName).trim() : '';
        if (!driverId) {
            return res.status(400).json({ message: 'driverId (driver phone number) is required.' });
        }

        const mimeType = req.file.mimetype;
        const timestamp = Date.now();
        const publicId = `cabOwners/${req.ownerId}/aadhar/${driverId}-${timestamp}`;

        const uploadResult = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream({ public_id: publicId }, (err, result) => {
                if (err) return reject(err);
                resolve(result);
            }).end(req.file.buffer);
        });
        const imageUrl = uploadResult.secure_url;
        const cloudinaryPublicId = uploadResult.public_id;

        let extractedJson = {};
        try {
            const imagePart = bufferToGenerativePart(req.file.buffer, mimeType);
            const prompt = `Extract the following information from this Indian Aadhaar card image:
- name: The full name of the person
- aadhaar_no: The complete 12-digit Aadhaar number (do not mask or abbreviate it)
- dob: Date of birth in DD/MM/YYYY format
- gender: Gender (MALE, FEMALE, or OTHER)
- address: The complete address
- pincode: The 6-digit PIN code
Return the result as a valid JSON object with these exact keys: name, aadhaar_no, dob, gender, address, pincode.`;

            console.log('Sending request to Gemini...');
            const result = await ai.models.generateContent({
                model: "gemini-1.5-flash",
                contents: [imagePart, prompt],
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: "object",
                        properties: {
                            name: { type: "string" },
                            aadhaar_no: { type: "string" },
                            dob: { type: "string" },
                            gender: { type: "string" },
                            address: { type: "string" },
                            pincode: { type: "string" },
                        },
                        required: ["name", "aadhaar_no"],
                    }
                }
            });

            let text = '';
            if (result && typeof result.text === 'function') text = result.text();
            else if (result && result.text) text = result.text;
            else if (result && result.response && typeof result.response.text === 'function') text = result.response.text();

            if (text) {
                // Sanitize JSON markdown if present (sometimes flash models include it)
                const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
                extractedJson = JSON.parse(jsonStr);
            }

        } catch (gemErr) {
            console.warn('Gemini extraction skipped:', gemErr && gemErr.message ? gemErr.message : String(gemErr));
        }

        // Save under cabOwners/{ownerId}/drivers/{driverId}
        const driverRef = db.collection('cabOwners').doc(req.ownerId).collection('drivers').doc(driverId);

        const updateData = {
            phone: driverId,
            aadhaar: {
                imageUrl: imageUrl,
                cloudinaryPublicId: cloudinaryPublicId,
                extractedData: extractedJson,
                extractedAt: new Date()
            }
        };
        if (driverName || extractedJson.name) {
            updateData.name = driverName || extractedJson.name;
        }

        await driverRef.set(updateData, { merge: true });

        const doc = await driverRef.get();
        const driver = doc.data() || {};
        const savedAadhaar = driver.aadhaar || {};

        res.status(201).json({
            message: 'Aadhaar extracted and saved to driver successfully!',
            data: savedAadhaar.extractedData,
            imageUrl: savedAadhaar.imageUrl,
            id: doc.id
        });

    } catch (error) {
        console.error('Extraction/Saving Error:', error);
        res.status(500).json({ message: `Failed to extract or save Aadhaar data: ${error.message}` });
    }
});

// GET /api/aadhar - List all drivers with Aadhaar data
router.get('/', requireOwner, async (req, res) => {
    try {
        const ref = db.collection('cabOwners').doc(req.ownerId).collection('drivers');
        const snapshot = await ref.get();
        const aadhars = [];
        snapshot.forEach(doc => {
            const d = doc.data();
            if (d && d.aadhaar) {
                aadhars.push({
                    id: doc.id,
                    imageUrl: d.aadhaar.imageUrl,
                    extractedData: d.aadhaar.extractedData,
                    extractedAt: d.aadhaar.extractedAt
                });
            }
        });
        res.status(200).json(aadhars);
    } catch (error) {
        console.error('Retrieval Error:', error);
        res.status(500).json({ message: 'Failed to retrieve Aadhaar data.' });
    }
});

// PUT /api/aadhar/:id - Update Aadhaar data
router.put('/:id', requireOwner, async (req, res) => {
    try {
        const { id } = req.params;
        const { extractedData } = req.body;

        if (!extractedData || typeof extractedData !== 'object') {
            return res.status(400).json({ message: 'Invalid update data.' });
        }

        const driverRef = db.collection('cabOwners').doc(req.ownerId).collection('drivers').doc(id);
        const snap = await driverRef.get();
        if (!snap.exists || !snap.data().aadhaar) {
            return res.status(404).json({ message: 'Driver or Aadhaar not found' });
        }
        await driverRef.update({ 'aadhaar.extractedData': extractedData });

        const updatedDoc = await driverRef.get();
        const d = updatedDoc.data();
        const updatedAadhaar = d ? d.aadhaar : null;
        res.status(200).json({ id: updatedDoc.id, imageUrl: updatedAadhaar?.imageUrl, extractedData: updatedAadhaar?.extractedData });

    } catch (error) {
        console.error('Update Error:', error);
        res.status(500).json({ message: 'Failed to update Aadhaar record', error: error.message });
    }
});

// DELETE /api/aadhar/:id - Remove Aadhaar
router.delete('/:id', requireOwner, async (req, res) => {
    try {
        const { id } = req.params;
        const driverRef = db.collection('cabOwners').doc(req.ownerId).collection('drivers').doc(id);
        const driverDoc = await driverRef.get();

        if (!driverDoc.exists || !driverDoc.data().aadhaar) {
            return res.status(404).json({ message: 'Driver or Aadhaar not found' });
        }

        const aadhaarData = driverDoc.data().aadhaar;

        await driverRef.update({ aadhaar: admin.firestore.FieldValue.delete() });

        if (aadhaarData.cloudinaryPublicId) {
            try { await cloudinary.uploader.destroy(aadhaarData.cloudinaryPublicId); } catch (e) { }
        }

        return res.status(200).json({ message: 'Aadhaar deleted for driver' });
    } catch (error) {
        console.error('Delete Error:', error);
        return res.status(500).json({ message: 'Failed to delete Aadhaar', error: error.message });
    }
});

module.exports = router;
router.use((err, req, res, next) => {
    if (!err) return next();
    if (err && err.name === 'MulterError') {
        return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message || 'Unexpected server error' });
}); 