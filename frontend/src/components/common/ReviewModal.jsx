import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Shield, ArrowRight } from 'lucide-react';
import { auth } from '../../config/firebase';
import { authFetch } from '../../utils/api';

export default function ReviewModal({ isOpen, onClose, productId, productName, orderId }) {
    const [rating, setRating] = useState(5);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title || !body) {
            alert('Please fill in all fields');
            return;
        }
        if (!productId) {
            alert('Error: Product ID is missing. Please try again.');
            console.error("Missing productId for review submission");
            return;
        }

        const user = auth.currentUser;
        if (!user) {
            alert('Please login to submit a review');
            return;
        }

        setSubmitting(true);
        try {
            const response = await authFetch('/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId,
                    orderId: orderId || null,
                    rating,
                    title,
                    body
                })
            });

            const data = await response.json();

            if (data.success) {
                alert('Review submitted successfully!');
                onClose();
                setTitle('');
                setBody('');
                setRating(5);
                // Dispatch event for real-time update
                window.dispatchEvent(new Event('reviewsUpdate'));
            } else {
                alert('Failed to submit review: ' + (data.message || 'Unknown error'));
            }
        } catch (err) {
            console.error("Error submitting review:", err);
            alert('Failed to submit review. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="review-modal-overlay" onClick={onClose}>
                    <motion.div
                        className="review-modal-content glass-card"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="review-modal-header">
                            <div className="flex flex-col">
                                <h3 style={{ margin: 0 }}>Write a Review</h3>
                                <p style={{ fontSize: '0.8rem', color: '#666', margin: '4px 0 0 0' }}>{productName}</p>
                            </div>
                            <button className="review-close-btn" onClick={onClose}>
                                <div style={{ transform: 'rotate(180deg)', display: 'flex', alignItems: 'center' }}>
                                    <ArrowRight size={20} />
                                </div>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="review-form">
                            <div className="form-group">
                                <label>Overall Rating</label>
                                <div className="rating-selector">
                                    {[1, 2, 3, 4, 5].map(num => (
                                        <button
                                            key={num}
                                            type="button"
                                            className={rating >= num ? 'active' : ''}
                                            onClick={() => setRating(num)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}
                                        >
                                            <Star size={32} fill={rating >= num ? "#FFB800" : "none"} color="#FFB800" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Review Title</label>
                                <input
                                    type="text"
                                    placeholder="Summarize your review in a few words"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    required
                                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ddd' }}
                                />
                            </div>
                            <div className="form-group">
                                <label>Detailed Review</label>
                                <textarea
                                    placeholder="What did you like or dislike? What was your experience like?"
                                    rows="4"
                                    value={body}
                                    onChange={e => setBody(e.target.value)}
                                    required
                                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ddd', resize: 'none' }}
                                ></textarea>
                            </div>
                            <button
                                type="submit"
                                className="submit-review-btn"
                                disabled={submitting}
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    background: 'var(--primary)',
                                    color: 'white',
                                    fontWeight: '800',
                                    border: 'none',
                                    cursor: 'pointer',
                                    marginTop: '1rem'
                                }}
                            >
                                {submitting ? 'Submitting...' : 'Submit Review'}
                            </button>
                        </form>

                        <style>{`
                            .review-modal-overlay {
                                position: fixed;
                                inset: 0;
                                background: rgba(0, 0, 0, 0.5);
                                backdrop-filter: blur(8px);
                                z-index: 3000;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                padding: 20px;
                            }

                            .review-modal-content {
                                width: 100%;
                                max-width: 500px;
                                background: #FFFFFF;
                                border-radius: 16px;
                                padding: 2rem;
                                box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
                                border: 1px solid rgba(229, 231, 235, 0.8);
                                max-height: 90vh;
                                overflow-y: auto;
                            }

                            .review-modal-header {
                                display: flex;
                                justify-content: space-between;
                                align-items: flex-start;
                                margin-bottom: 1.5rem;
                                padding-bottom: 1rem;
                                border-bottom: 1px solid #E5E7EB;
                            }

                            .review-modal-header h3 {
                                font-size: 1.5rem;
                                font-weight: 800;
                                color: #111827;
                            }

                            .review-close-btn {
                                background: #F3F4F6;
                                border: none;
                                cursor: pointer;
                                color: #6B7280;
                                width: 36px;
                                height: 36px;
                                border-radius: 8px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                transition: all 200ms;
                            }

                            .review-close-btn:hover {
                                background: #E5E7EB;
                                color: #111827;
                            }

                            .review-form {
                                display: flex;
                                flex-direction: column;
                                gap: 1.5rem;
                            }

                            .form-group {
                                display: flex;
                                flex-direction: column;
                                gap: 0.5rem;
                            }

                            .form-group label {
                                font-size: 0.95rem;
                                font-weight: 700;
                                color: #111827;
                            }

                            .rating-selector {
                                display: flex;
                                gap: 0.5rem;
                                align-items: center;
                            }

                            .submit-review-btn:hover:not(:disabled) {
                                background: #1D4ED8;
                                transform: translateY(-2px);
                                box-shadow: 0 8px 16px rgba(37, 99, 235, 0.25);
                            }

                            .submit-review-btn:disabled {
                                opacity: 0.6;
                                cursor: not-allowed;
                            }

                            @media (max-width: 768px) {
                                .review-modal-content {
                                    max-width: 100%;
                                    padding: 1.5rem;
                                }
                            }
                        `}</style>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
