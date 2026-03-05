'use strict';

/**
 * Formats a Firestore Timestamp, JS Date, or timestamp object as DD/MM/YYYY.
 */
const formatDateDDMMYYYY = (date) => {
    if (!date) return new Date().toLocaleDateString('en-GB');
    
    let d;
    try {
        if (typeof date.toDate === 'function') {
            d = date.toDate();
        } else if (date._seconds) {
            d = new Date(date._seconds * 1000);
        } else if (date instanceof Date) {
            d = date;
        } else {
            d = new Date(date);
        }
        
        // Check if date is valid
        if (isNaN(d.getTime())) {
            return new Date().toLocaleDateString('en-GB');
        }
        
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        
        return `${day}/${month}/${year}`;
    } catch (error) {
        console.error('Date formatting error:', error);
        return new Date().toLocaleDateString('en-GB');
    }
};

module.exports = { formatDateDDMMYYYY };
