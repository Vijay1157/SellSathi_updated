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
                <div className="share-modal-overlay" onClick={onClose} style={{ zIndex: 3000 }}>
                    <motion.div
                        className="share-modal glass-card review-modal"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="share-header">
                            <div className="flex flex-col">
                                <h3 style={{ margin: 0 }}>Write a Review</h3>
                                <p style={{ fontSize: '0.8rem', color: '#666', margin: '4px 0 0 0' }}>{productName}</p>
                            </div>
                            <button className="close-btn" onClick={onClose}>
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
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
