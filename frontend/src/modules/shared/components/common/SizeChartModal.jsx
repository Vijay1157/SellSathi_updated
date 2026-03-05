import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Ruler } from 'lucide-react';

const SIZE_CHARTS = {
    "Fashion": {
        title: "Clothing Size Guide",
        subtitle: "Standard measurements for a perfect fit",
        headers: ["Size", "Chest (in)", "Waist (in)", "Shoulder (in)", "Length (in)"],
        rows: [
            ["S", "36-38", "30-32", "16.5", "27"],
            ["M", "38-40", "32-34", "17.5", "28"],
            ["L", "40-42", "34-36", "18.5", "29"],
            ["XL", "42-44", "36-38", "19.5", "30"],
            ["XXL", "44-46", "38-40", "20.5", "31"]
        ],
        tips: [
            "Measure around the fullest part of your chest.",
            "Measure around your natural waistline.",
            "If you are between sizes, we recommend sizing up."
        ]
    },
    "Electronics": {
        title: "Dimensions & Compatibility",
        subtitle: "Checking physical fit and space",
        headers: ["Component", "Width", "Height", "Depth", "Weight"],
        rows: [
            ["Product Body", "31.26 cm", "1.55 cm", "22.12 cm", "1.24 kg"],
            ["Screen Diagonal", "34.5 cm", "-", "-", "-"],
            ["Package Box", "40 cm", "28 cm", "8 cm", "2.1 kg"]
        ],
        tips: [
            "Dimensions refer to the closed device.",
            "Weights may vary by configuration and manufacturing process."
        ]
    }
};

export default function SizeChartModal({ isOpen, onClose, category = "Fashion" }) {
    const chart = SIZE_CHARTS[category.includes("Fashion") ? "Fashion" : "Electronics"];

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="share-modal-overlay" onClick={onClose} style={{ zIndex: 3000 }}>
                <motion.div
                    className="share-modal size-chart-modal"
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    onClick={e => e.stopPropagation()}
                    style={{ width: '600px', maxWidth: '95vw' }}
                >
                    <div className="modal-header">
                        <div className="title-with-icon">
                            <Ruler size={24} className="text-primary" style={{ color: 'var(--primary)' }} />
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{chart.title}</h2>
                                <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>{chart.subtitle}</p>
                            </div>
                        </div>
                        <button className="close-btn" onClick={onClose}><X size={20} /></button>
                    </div>

                    <div className="modal-body" style={{ marginTop: '1.5rem' }}>
                        <div className="table-responsive" style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            <table className="size-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead style={{ background: 'var(--surface)' }}>
                                    <tr>
                                        {chart.headers.map((h, i) => (
                                            <th key={i} style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', fontWeight: 600 }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {chart.rows.map((row, rowIndex) => (
                                        <tr key={rowIndex} style={{ borderTop: '1px solid var(--border)' }}>
                                            {row.map((cell, cellIndex) => (
                                                <td key={cellIndex} style={{ padding: '0.75rem 1rem', fontSize: '0.9rem' }}>{cell}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="measuring-tips" style={{ marginTop: '1.5rem', background: 'var(--surface)', padding: '1rem', borderRadius: '12px' }}>
                            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>Measuring Tips</h4>
                            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                {chart.tips.map((tip, i) => <li key={i} style={{ marginBottom: '0.25rem' }}>{tip}</li>)}
                            </ul>
                        </div>
                    </div>

                    <div className="modal-footer" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                        <button className="btn btn-primary" onClick={onClose} style={{ padding: '0.6rem 2rem' }}>Got it</button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
