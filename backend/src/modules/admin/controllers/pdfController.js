'use strict';
const { admin, db } = require('../../../config/firebase');
const PDFDocument = require('pdfkit');

/**
 * Generate Analytics PDF for a seller
 */
const generateAnalyticsPDF = async (req, res) => {
    try {
        const { uid } = req.params;
        const { fromDate, toDate } = req.query;
        
        const sellerSnap = await db.collection("sellers").doc(uid).get();
        if (!sellerSnap.exists) return res.status(404).send("Seller not found");
        const sellerData = sellerSnap.data();

        // Get user data for contact and bank details
        const userSnap = await db.collection("users").doc(uid).get();
        const userData = userSnap.exists ? userSnap.data() : {};
        const sellerContact = userData.phone || userData.email || "N/A";
        
        // Extract bank details from seller data
        const bankDetails = {
            bankName: sellerData.bankName || 'Not provided',
            accountHolderName: sellerData.accountHolderName || 'Not provided',
            accountNumber: sellerData.accountNumber || 'Not provided',
            ifscCode: sellerData.ifscCode || 'Not provided',
            upiId: sellerData.upiId || 'Not provided'
        };

        // Get Products 
        const productsSnap = await db.collection("products").where("sellerId", "==", uid).get();
        let totalProducts = 0;
        let totalStockLeft = 0;
        let totalInventoryValue = 0;
        let productStats = {};

        productsSnap.forEach(p => {
            const prod = p.data();
            totalProducts++;
            const stock = prod.stock || 0;
            const price = prod.price || 0;
            const discountedPrice = prod.discountedPrice || price;
            totalStockLeft += stock;
            totalInventoryValue += (discountedPrice * stock);
            productStats[p.id] = {
                name: prod.title,
                price: price,
                discountedPrice: prod.discountedPrice || null,
                stock: stock,
                sold: 0,
                revenue: 0,
                worth: discountedPrice * stock
            };
        });

        // Get Orders with optional date filtering
        let unitsSold = 0;
        let grossRevenue = 0;
        const ordersSnap = await db.collection("orders").get();
        ordersSnap.forEach(o => {
            const order = o.data();
            const orderDate = order.createdAt?.toDate();

            // Apply date filtering if provided
            let inDateRange = true;
            if (fromDate || toDate) {
                if (orderDate) {
                    if (fromDate && new Date(fromDate) > orderDate) inDateRange = false;
                    if (toDate) {
                        const to = new Date(toDate);
                        to.setHours(23, 59, 59, 999);
                        if (to < orderDate) inDateRange = false;
                    }
                } else {
                    inDateRange = false;
                }
            }

            if (inDateRange && order.items && Array.isArray(order.items)) {
                order.items.forEach(item => {
                    if (item.sellerId === uid) {
                        unitsSold += (item.quantity || 1);
                        const rev = (item.price || 0) * (item.quantity || 1);
                        grossRevenue += rev;
                        if (item.productId && productStats[item.productId]) {
                            productStats[item.productId].sold += (item.quantity || 1);
                            productStats[item.productId].revenue += rev;
                        }
                    }
                });
            }
        });

        const avgRevenuePerProduct = totalProducts > 0 ? (grossRevenue / totalProducts) : 0;

        // Generate PDF filename with date range if provided
        let filename = `analytics_${sellerData.shopName?.replace(/\s+/g, '_') || 'seller'}`;
        if (fromDate && toDate) {
            filename += `_${fromDate}_to_${toDate}`;
        }
        filename += '.pdf';

        // Generate PDF
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        doc.pipe(res);

        // Header
        doc.fontSize(24).fillColor('#6366f1').text('SELLSATHI', 50, 50);
        doc.fontSize(9).fillColor('#666666')
            .text('Your Trusted E-Commerce Platform', 50, 78);

        const reportDate = new Date().toLocaleDateString('en-GB');
        doc.fontSize(9).fillColor('#666666').text('Report Date:', 450, 50);
        doc.fontSize(10).fillColor('#000000').text(reportDate, 450, 62);

        doc.moveTo(50, 125).lineTo(545, 125).strokeColor('#6366f1').lineWidth(2).stroke();

        // Title
        doc.fontSize(18).fillColor('#000000').font('Helvetica-Bold')
            .text('SELLER ANALYTICS REPORT', 50, 145, { align: 'center' });

        // Date Range (if provided)
        if (fromDate && toDate) {
            doc.fontSize(10).fillColor('#666666').font('Helvetica')
                .text(`Date Range: ${new Date(fromDate).toLocaleDateString('en-GB')} to ${new Date(toDate).toLocaleDateString('en-GB')}`, 50, 170, { align: 'center' });
        }

        // Seller Info
        const sellerInfoY = fromDate && toDate ? 195 : 180;
        doc.rect(50, sellerInfoY, 495, 15).fillAndStroke('#f3f4f6', '#e5e7eb');
        doc.fontSize(11).fillColor('#000000').font('Helvetica-Bold').text('SELLER INFORMATION', 55, sellerInfoY + 5);

        doc.fontSize(10).font('Helvetica').fillColor('#000000');
        doc.text('Shop Name:', 55, sellerInfoY + 30);
        doc.text(sellerData.shopName || 'N/A', 150, sellerInfoY + 30);
        doc.text('Category:', 320, sellerInfoY + 30);
        doc.text(sellerData.category || 'N/A', 390, sellerInfoY + 30);

        // Bank Details Section
        const bankDetailsY = sellerInfoY + 60;
        doc.rect(50, bankDetailsY, 495, 15).fillAndStroke('#f3f4f6', '#e5e7eb');
        doc.fontSize(11).fillColor('#000000').font('Helvetica-Bold').text('BANK DETAILS', 55, bankDetailsY + 5);

        doc.fontSize(9).font('Helvetica').fillColor('#000000');
        doc.text('Bank Name:', 55, bankDetailsY + 30);
        doc.text(bankDetails.bankName, 150, bankDetailsY + 30);
        doc.text('Account Holder:', 320, bankDetailsY + 30);
        doc.text(bankDetails.accountHolderName, 420, bankDetailsY + 30);

        doc.text('Account Number:', 55, bankDetailsY + 50);
        doc.text(bankDetails.accountNumber, 150, bankDetailsY + 50);
        doc.text('IFSC Code:', 320, bankDetailsY + 50);
        doc.text(bankDetails.ifscCode, 420, bankDetailsY + 50);

        doc.text('UPI ID:', 55, bankDetailsY + 70);
        doc.text(bankDetails.upiId, 150, bankDetailsY + 70);

        // Performance Summary
        const perfSummaryY = bankDetailsY + 100;
        doc.rect(50, perfSummaryY, 495, 15).fillAndStroke('#f3f4f6', '#e5e7eb');
        doc.fontSize(11).fillColor('#000000').font('Helvetica-Bold').text('PERFORMANCE SUMMARY', 55, perfSummaryY + 5);

        const boxY = perfSummaryY + 35;
        const boxWidth = 115;
        const boxHeight = 60;
        const boxGap = 10;

        // Boxes
        doc.rect(50, boxY, boxWidth, boxHeight).fillAndStroke('#e0e7ff', '#c7d2fe');
        doc.fontSize(9).fillColor('#6366f1').font('Helvetica')
            .text('Total Products', 55, boxY + 10, { width: boxWidth - 10, align: 'center' });
        doc.fontSize(24).fillColor('#4f46e5').font('Helvetica-Bold')
            .text(totalProducts.toString(), 55, boxY + 28, { width: boxWidth - 10, align: 'center' });

        doc.rect(50 + boxWidth + boxGap, boxY, boxWidth, boxHeight).fillAndStroke('#e0e7ff', '#c7d2fe');
        doc.fontSize(9).fillColor('#6366f1').font('Helvetica')
            .text('Units Sold', 50 + boxWidth + boxGap + 5, boxY + 10, { width: boxWidth - 10, align: 'center' });
        doc.fontSize(24).fillColor('#4f46e5').font('Helvetica-Bold')
            .text(unitsSold.toString(), 50 + boxWidth + boxGap + 5, boxY + 28, { width: boxWidth - 10, align: 'center' });

        doc.rect(50 + (boxWidth + boxGap) * 2, boxY, boxWidth, boxHeight).fillAndStroke('#e0e7ff', '#c7d2fe');
        doc.fontSize(9).fillColor('#6366f1').font('Helvetica')
            .text('Stock Left', 50 + (boxWidth + boxGap) * 2 + 5, boxY + 10, { width: boxWidth - 10, align: 'center' });
        doc.fontSize(24).fillColor('#4f46e5').font('Helvetica-Bold')
            .text(totalStockLeft.toString(), 50 + (boxWidth + boxGap) * 2 + 5, boxY + 28, { width: boxWidth - 10, align: 'center' });

        doc.rect(50 + (boxWidth + boxGap) * 3, boxY, boxWidth, boxHeight).fillAndStroke('#e0e7ff', '#c7d2fe');
        doc.fontSize(9).fillColor('#6366f1').font('Helvetica')
            .text('Total Revenue', 50 + (boxWidth + boxGap) * 3 + 5, boxY + 10, { width: boxWidth - 10, align: 'center' });
        doc.fontSize(20).fillColor('#4f46e5').font('Helvetica-Bold')
            .text(`Rs.${grossRevenue}`, 50 + (boxWidth + boxGap) * 3 + 5, boxY + 28, { width: boxWidth - 10, align: 'center' });

        // Product Table
        doc.rect(50, boxY + boxHeight + 50, 495, 15).fillAndStroke('#f3f4f6', '#e5e7eb');
        doc.fontSize(11).fillColor('#000000').font('Helvetica-Bold')
            .text('PRODUCT DETAILS', 55, boxY + boxHeight + 55);

        const tableTop = boxY + boxHeight + 85;
        doc.rect(50, tableTop, 495, 20).fillAndStroke('#6366f1', '#6366f1');
        doc.fontSize(9).fillColor('#ffffff').font('Helvetica-Bold');
        doc.text('Product', 55, tableTop + 6);
        doc.text('Price', 200, tableTop + 6);
        doc.text('Stock', 295, tableTop + 6);
        doc.text('Sold', 340, tableTop + 6);
        doc.text('Revenue', 385, tableTop + 6);

        let y = tableTop + 25;
        doc.font('Helvetica').fillColor('#000000');
        const sortedProducts = Object.values(productStats).sort((a, b) => b.revenue - a.revenue);

        sortedProducts.forEach((p) => {
            if (y > 720) {
                doc.addPage();
                y = 50;
            }
            doc.fontSize(8).fillColor('#000000').font('Helvetica');
            doc.text(p.name.substring(0, 30), 55, y);
            doc.text(`Rs.${p.price}`, 200, y);
            doc.text(p.stock.toString(), 295, y);
            doc.text(p.sold.toString(), 340, y);
            doc.text(`Rs.${p.revenue}`, 385, y);
            y += 18;
        });

        // Footer
        doc.fontSize(8).fillColor('#999999').font('Helvetica')
            .text(`Generated by SellSathi | ${reportDate}`, 50, 770, { align: 'center' });

        doc.end();
    } catch (err) {
        console.error("ANALYTICS PDF ERROR:", err);
        if (!res.headersSent) res.status(500).send("Error generating PDF");
    }
};

/**
 * Generate Invoice PDF for a seller
 */
const generateInvoicePDF = async (req, res) => {
    try {
        const { uid } = req.params;
        const { fromDate, toDate } = req.query;

        const sellerSnap = await db.collection("sellers").doc(uid).get();
        if (!sellerSnap.exists) return res.status(404).send("Seller not found");
        const sellerData = sellerSnap.data();

        const userSnap = await db.collection("users").doc(uid).get();
        const userData = userSnap.exists ? userSnap.data() : {};
        const sellerContact = userData.phone || userData.email || "N/A";
        
        // Extract bank details from seller data
        const bankDetails = {
            bankName: sellerData.bankName || 'Not provided',
            accountHolderName: sellerData.accountHolderName || 'Not provided',
            accountNumber: sellerData.accountNumber || 'Not provided',
            ifscCode: sellerData.ifscCode || 'Not provided',
            upiId: sellerData.upiId || 'Not provided'
        };

        const productsSnap = await db.collection("products").where("sellerId", "==", uid).get();
        const totalProducts = productsSnap.size;

        const ordersSnap = await db.collection("orders").where("status", "==", "Delivered").get();

        let totalRevenue = 0;
        let deliveredCount = 0;
        const orderDetails = [];

        ordersSnap.forEach(o => {
            const order = o.data();
            const orderDate = order.createdAt?.toDate();

            let inDateRange = true;
            if (orderDate) {
                if (fromDate && new Date(fromDate) > orderDate) inDateRange = false;
                if (toDate) {
                    const to = new Date(toDate);
                    to.setHours(23, 59, 59, 999);
                    if (to < orderDate) inDateRange = false;
                }
            }

            if (inDateRange && order.items && Array.isArray(order.items)) {
                order.items.forEach(item => {
                    if (item.sellerId === uid) {
                        const rev = (item.price || 0) * (item.quantity || 1);
                        totalRevenue += rev;
                        deliveredCount++;
                        orderDetails.push({
                            orderId: o.id,
                            orderDate: orderDate ? orderDate.toLocaleDateString('en-GB') : 'N/A',
                            productName: item.name || 'N/A',
                            quantity: item.quantity || 1,
                            price: item.price || 0,
                            total: rev
                        });
                    }
                });
            }
        });

        const platformCharges = totalRevenue * 0.10;
        const amountToReceive = totalRevenue - platformCharges;

        // Generate PDF
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice_${sellerData.shopName?.replace(/\s+/g, '_') || 'seller'}.pdf`);
        doc.pipe(res);

        // Header
        doc.fontSize(28).fillColor('#6366f1').font('Helvetica-Bold').text('SELLSATHI', 50, 50);
        doc.fontSize(10).fillColor('#999999').font('Helvetica')
            .text('Your Trusted E-Commerce Platform', 50, 82);

        const reportDate = new Date().toLocaleDateString('en-GB');
        doc.fontSize(10).fillColor('#666666').font('Helvetica').text('Report Date:', 450, 50);
        doc.fontSize(11).fillColor('#000000').font('Helvetica-Bold').text(reportDate, 450, 65);

        doc.moveTo(50, 135).lineTo(545, 135).strokeColor('#6366f1').lineWidth(2).stroke();

        // Title
        doc.fontSize(20).fillColor('#000000').font('Helvetica-Bold')
            .text('SELLER INVOICE REPORT', 50, 155, { align: 'center' });

        // Seller Info
        doc.rect(50, 210, 495, 18).fillAndStroke('#f3f4f6', '#e5e7eb');
        doc.fontSize(12).fillColor('#000000').font('Helvetica-Bold').text('SELLER INFORMATION', 55, 216);

        doc.fontSize(11).font('Helvetica').fillColor('#000000');
        doc.text('Shop Name:', 55, 245);
        doc.text(sellerData.shopName || 'N/A', 180, 245);
        doc.text('Category:', 320, 245);
        doc.text(sellerData.category || 'N/A', 420, 245);

        // Bank Details Section
        doc.rect(50, 275, 495, 18).fillAndStroke('#f3f4f6', '#e5e7eb');
        doc.fontSize(12).fillColor('#000000').font('Helvetica-Bold').text('BANK DETAILS', 55, 281);

        doc.fontSize(10).font('Helvetica').fillColor('#000000');
        doc.text('Bank Name:', 55, 310);
        doc.text(bankDetails.bankName, 180, 310);
        doc.text('Account Holder:', 320, 310);
        doc.text(bankDetails.accountHolderName, 440, 310);

        doc.text('Account Number:', 55, 330);
        doc.text(bankDetails.accountNumber, 180, 330);
        doc.text('IFSC Code:', 320, 330);
        doc.text(bankDetails.ifscCode, 440, 330);

        doc.text('UPI ID:', 55, 350);
        doc.text(bankDetails.upiId, 180, 350);

        // Summary
        const summaryY = 380;
        doc.rect(50, summaryY, 495, 18).fillAndStroke('#f3f4f6', '#e5e7eb');
        doc.fontSize(12).fillColor('#000000').font('Helvetica-Bold').text('INVOICE SUMMARY', 55, summaryY + 6);

        const boxY = summaryY + 40;
        const boxWidth = 115;
        const boxHeight = 70;
        const boxGap = 10;

        doc.rect(50, boxY, boxWidth, boxHeight).fillAndStroke('#e0e7ff', '#6366f1');
        doc.fontSize(10).fillColor('#6366f1').font('Helvetica')
            .text('Total Products', 55, boxY + 12, { width: boxWidth - 10, align: 'center' });
        doc.fontSize(28).fillColor('#4f46e5').font('Helvetica-Bold')
            .text(totalProducts.toString(), 55, boxY + 38, { width: boxWidth - 10, align: 'center' });

        doc.rect(50 + boxWidth + boxGap, boxY, boxWidth, boxHeight).fillAndStroke('#e0e7ff', '#6366f1');
        doc.fontSize(10).fillColor('#6366f1').font('Helvetica')
            .text('Total Revenue', 50 + boxWidth + boxGap + 5, boxY + 12, { width: boxWidth - 10, align: 'center' });
        doc.fontSize(22).fillColor('#4f46e5').font('Helvetica-Bold')
            .text(`Rs.${totalRevenue}`, 50 + boxWidth + boxGap + 5, boxY + 38, { width: boxWidth - 10, align: 'center' });

        doc.rect(50 + (boxWidth + boxGap) * 2, boxY, boxWidth, boxHeight).fillAndStroke('#e0e7ff', '#6366f1');
        doc.fontSize(10).fillColor('#6366f1').font('Helvetica')
            .text('Platform Charges', 50 + (boxWidth + boxGap) * 2 + 5, boxY + 12, { width: boxWidth - 10, align: 'center' });
        doc.fontSize(22).fillColor('#4f46e5').font('Helvetica-Bold')
            .text(`Rs.${platformCharges.toFixed(2)}`, 50 + (boxWidth + boxGap) * 2 + 5, boxY + 38, { width: boxWidth - 10, align: 'center' });

        doc.rect(50 + (boxWidth + boxGap) * 3, boxY, boxWidth, boxHeight).fillAndStroke('#e0e7ff', '#6366f1');
        doc.fontSize(10).fillColor('#6366f1').font('Helvetica')
            .text('Amount to Receive', 50 + (boxWidth + boxGap) * 3 + 5, boxY + 12, { width: boxWidth - 10, align: 'center' });
        doc.fontSize(22).fillColor('#4f46e5').font('Helvetica-Bold')
            .text(`Rs.${amountToReceive.toFixed(2)}`, 50 + (boxWidth + boxGap) * 3 + 5, boxY + 38, { width: boxWidth - 10, align: 'center' });

        // Footer
        doc.fontSize(9).fillColor('#cccccc').font('Helvetica')
            .text(`Generated by SellSathi | ${reportDate}`, 50, 750, { align: 'center' });

        doc.end();
    } catch (err) {
        console.error("INVOICE PDF ERROR:", err);
        if (!res.headersSent) res.status(500).send("Error generating PDF");
    }
};

module.exports = { generateAnalyticsPDF, generateInvoicePDF };
