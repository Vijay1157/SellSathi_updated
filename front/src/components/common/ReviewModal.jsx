import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Shield, ArrowRight } from 'lucide-react';
// import { db } from '../../config/firebase';
// import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function ReviewModal({ isOpen, onClose, productId, productName }) {
    const [rating, setRating] = useState(5);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title || !body) return;
        if (!productId) {
            alert('Error: Product ID is missing. Please try again.');
            console.error("Missing productId for review submission");
            return;
        }
        setSubmitting(true);
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const newReviewData = {
                id: Date.now().toString(),
                productId: productId,
                rating: rating,
                title: title,
                body: body,
                author: user.fullName || 'Anonymous',
                createdAt: { seconds: Math.floor(Date.now() / 1000) },
                verified: true
            };

            // Get existing reviews from localStorage
            const allReviews = JSON.parse(localStorage.getItem('sellsathi_reviews') || '[]');
            allReviews.push(newReviewData);

            // Save back to localStorage
            localStorage.setItem('sellsathi_reviews', JSON.stringify(allReviews));

            // Small delay to simulate async network
            await new Promise(resolve => setTimeout(resolve, 500));

            alert('Review submitted successfully (Saved Locally)!');
            onClose();
            setTitle('');
            setBody('');
            setRating(5);
            // Dispatch event for real-time update in ProductDetail
            window.dispatchEvent(new Event('reviewsUpdate'));
        } catch (err) {
            console.error("Error saving review:", err);
            alert('Failed to save review locally: ' + err.message);
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
