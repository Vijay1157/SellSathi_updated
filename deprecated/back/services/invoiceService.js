const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const invoicesDir = path.join(__dirname, '..', 'invoices');
if (!fs.existsSync(invoicesDir)) {
    fs.mkdirSync(invoicesDir);
}

exports.generateInvoice = (order) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50 });
            const invoiceName = `Invoice-${order.orderId}.pdf`;
            const invoicePath = path.join(invoicesDir, invoiceName);
            const stream = fs.createWriteStream(invoicePath);

            doc.pipe(stream);

            // Header Section
            doc.fillColor('#000000')
                .fontSize(25)
                .font('Helvetica-Bold')
                .text('INVOICE', 50, 50)
                .fontSize(10)
                .font('Helvetica')
                .text('Sellsathi Marketplace', 200, 50, { align: 'right' })
                .text('123 Commerce Lane', 200, 65, { align: 'right' })
                .text('Bangalore, KA 560001', 200, 80, { align: 'right' })
                .text('contact@sellsathi.com | +91 80 4567 8901', 200, 95, { align: 'right' });

            doc.moveTo(50, 115).lineTo(550, 115).strokeColor('#eeeeee').stroke();

            // Info Section (Bill To / Ship To / Invoice Details)
            const infoTop = 140;

            // Bill To
            doc.fontSize(10).font('Helvetica-Bold').text('Bill To:', 50, infoTop);
            doc.font('Helvetica').text(order.customerName || 'Valued Customer', 50, infoTop + 15);
            doc.text(order.email || '', 50, infoTop + 30);
            doc.text(order.address || 'Online Purchase', 50, infoTop + 45);

            // Ship To (Mirroring for now, usually same unless specified)
            doc.font('Helvetica-Bold').text('Ship To:', 225, infoTop);
            doc.font('Helvetica').text(order.customerName || 'Valued Customer', 225, infoTop + 15);
            doc.text(order.address || 'Online Purchase', 225, infoTop + 30);

            // Invoice Details
            doc.font('Helvetica-Bold').text('Invoice Details:', 400, infoTop);
            doc.font('Helvetica')
                .text(`Invoice #: ${order.orderId}`, 400, infoTop + 15)
                .text(`Date: ${new Date().toLocaleDateString()}`, 400, infoTop + 30)
                .text('Terms: Paid via Online', 400, infoTop + 45);

            // Table Header
            const tableTop = 230;
            doc.rect(50, tableTop, 500, 25).fill('#f9f9f9');
            doc.fillColor('#000000').font('Helvetica-Bold');
            doc.text('Product / Service', 60, tableTop + 7)
                .text('Qty', 300, tableTop + 7)
                .text('Rate', 380, tableTop + 7)
                .text('Amount', 480, tableTop + 7);

            // Table Body
            let currentY = tableTop + 25;
            const items = order.items || [];
            doc.font('Helvetica');

            items.forEach((item, index) => {
                const itemY = currentY + (index * 30);

                // Row background for alternance
                if (index % 2 === 1) {
                    doc.rect(50, itemY, 500, 30).fill('#fafafa');
                }

                doc.fillColor('#444444')
                    .text(item.name || item.title || 'Product', 60, itemY + 10)
                    .text(item.quantity || 1, 300, itemY + 10)
                    .text(`₹${item.price?.toLocaleString()}`, 380, itemY + 10)
                    .text(`₹${((item.price || 0) * (item.quantity || 1)).toLocaleString()}`, 480, itemY + 10);

                doc.moveTo(50, itemY + 30).lineTo(550, itemY + 30).strokeColor('#f0f0f0').stroke();
            });

            // Summary Section
            const summaryTop = currentY + (items.length * 30) + 20;
            const subtotal = order.total || 0;

            doc.fillColor('#000000').font('Helvetica-Bold');
            doc.text('Subtotal:', 380, summaryTop);
            doc.font('Helvetica').text(`₹${subtotal.toLocaleString()}`, 480, summaryTop);

            doc.font('Helvetica-Bold').text('Tax (0%):', 380, summaryTop + 20);
            doc.font('Helvetica').text('₹0', 480, summaryTop + 20);

            doc.font('Helvetica-Bold').text('Shipping:', 380, summaryTop + 40);
            doc.font('Helvetica').text('₹0', 480, summaryTop + 40);

            doc.rect(370, summaryTop + 65, 180, 40).fill('#2563eb');
            doc.fillColor('#ffffff').fontSize(14).text('Total:', 380, summaryTop + 77);
            doc.text(`₹${subtotal.toLocaleString()}`, 480, summaryTop + 77);

            // Footer
            doc.fillColor('#999999').fontSize(10).font('Helvetica')
                .text('Customer Message: Thank you for your purchase! Please retain this invoice for your records.', 50, 700, { width: 300 })
                .text('Questions? Contact us at support@sellsathi.com', 50, 730, { align: 'center', width: 500 });

            doc.end();

            stream.on('finish', () => resolve(invoicePath));
            stream.on('error', (err) => reject(err));

        } catch (error) {
            reject(error);
        }
    });
};
