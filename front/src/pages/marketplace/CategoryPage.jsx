import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

/**
 * CategoryPage — thin redirect-only component.
 *
 * All category browsing happens in ProductListing (/products?category=X).
 * This component previously ran a full unbounded Firestore query that was
 * immediately discarded on redirect — removed entirely.
 */
export default function CategoryPage() {
    const { categoryName } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        navigate(
            categoryName ? `/products?category=${encodeURIComponent(categoryName)}` : '/products',
            { replace: true }
        );
    }, [categoryName, navigate]);

    // Render nothing — redirect fires immediately
    return null;
}
