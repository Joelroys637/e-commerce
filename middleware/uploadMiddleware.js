const multer = require('multer');

// Store files in memory so we can upload them directly (now encoding to base64)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        // Firestore has a 1 MiB hard limit per document. We must limit the image to be less (~700KB)
        // Base64 encoding adds about 33% overhead.
        fileSize: 700 * 1024
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/jpg') {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type! Only JPG, JPEG, and PNG are allowed.'), false);
        }
    }
});

module.exports = upload;
