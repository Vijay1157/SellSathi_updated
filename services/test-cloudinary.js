const cloudinary = require('cloudinary').v2;
cloudinary.config({
    cloud_name: 'dhevauth5',
    api_key: '511255263888482',
    api_secret: 'Lct_38d4lRzzsaY78EyB0KyWLDk'
});
console.log('Testing Cloudinary...');
cloudinary.api.ping((err, res) => {
    if (err) console.error('Cloudinary ping failed:', err);
    else console.log('Cloudinary ping success:', res);
});
