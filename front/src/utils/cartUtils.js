
import { doc, getDoc, setDoc, updateDoc, increment, collection, onSnapshot, deleteDoc, getDocs } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export const addToCart = async (product, selections = {}) => {
    try {
        let user = auth.currentUser;
        let userId = user?.uid;

        if (!userId) {
            const localUser = JSON.parse(localStorage.getItem('user') || 'null');
            if (localUser && localUser.uid) {
                userId = localUser.uid;
            }
        }

        const variantKey = Object.values(selections).filter(Boolean).join('_');
        const cartItemId = variantKey ? `${product.id}_${variantKey.replace(/\s+/g, '')}` : product.id;

        const cartItemData = {
            productId: product.id,
            id: product.id,
            sellerId: product.sellerId || null,
            name: product.name || product.title,
            price: product.price + (selections.storage?.priceOffset || 0) + (selections.memory?.priceOffset || 0),
            imageUrl: product.imageUrl || product.image,
            quantity: 1,
            category: product.category,
            selections: {
                color: selections.color || null,
                size: selections.size || null,
                storage: selections.storage?.label || selections.storage || null,
                memory: selections.memory?.label || selections.memory || null
            }
        };

        // If still no userId, use localStorage (Guest Cart)
        if (!userId) {
            const localCart = JSON.parse(localStorage.getItem('tempCart') || '[]');
            const existingItemIndex = localCart.findIndex(item => item.cartItemId === cartItemId || item.id === cartItemId);

            if (existingItemIndex > -1) {
                localCart[existingItemIndex].quantity += 1;
            } else {
                localCart.push({ ...cartItemData, cartItemId });
            }
            localStorage.setItem('tempCart', JSON.stringify(localCart));
            window.dispatchEvent(new Event('cartUpdate'));
            return { success: true, message: "Added to guest cart" };
        }

        const cartItemRef = doc(db, "users", userId, "cart", cartItemId);
        const cartItemSnap = await getDoc(cartItemRef);

        if (cartItemSnap.exists()) {
            await updateDoc(cartItemRef, {
                quantity: increment(1)
            });
        } else {
            await setDoc(cartItemRef, { ...cartItemData, id: cartItemId });
        }

        return { success: true, message: "Added to cart successfully" };
    } catch (error) {
        console.error("Error adding to cart:", error);
        return { success: false, message: "Failed to add to cart" };
    }
};

export const listenToCart = (callback) => {
    let unsubscribeSnap = null;

    const setupListener = () => {
        // Cleanup previous snapshot listener if it exists
        if (unsubscribeSnap) {
            unsubscribeSnap();
            unsubscribeSnap = null;
        }

        let user = auth.currentUser;
        let userId = user?.uid;

        if (!userId) {
            const localUser = JSON.parse(localStorage.getItem('user') || 'null');
            if (localUser && localUser.uid) userId = localUser.uid;
        }

        if (!userId) {
            const localCart = JSON.parse(localStorage.getItem('tempCart') || '[]');
            callback(localCart);
            return;
        }

        const q = collection(db, "users", userId, "cart");
        unsubscribeSnap = onSnapshot(q, (querySnapshot) => {
            const items = [];
            querySnapshot.forEach((doc) => {
                items.push({ id: doc.id, ...doc.data() });
            });
            callback(items);
        }, (error) => {
            console.error("Error listening to cart:", error);
        });
    };

    window.addEventListener('cartUpdate', setupListener);
    setupListener(); // Initial call

    return () => {
        window.removeEventListener('cartUpdate', setupListener);
        if (unsubscribeSnap) unsubscribeSnap();
    };
};

export const removeFromCart = async (productId) => {
    let user = auth.currentUser;
    let userId = user?.uid;

    if (!userId) {
        const localUser = JSON.parse(localStorage.getItem('user') || 'null');
        if (localUser && localUser.uid) {
            userId = localUser.uid;
        }
    }

    if (!userId) {
        // Remove from local storage
        const localCart = JSON.parse(localStorage.getItem('tempCart') || '[]');
        const updatedCart = localCart.filter(item => item.productId !== productId);
        localStorage.setItem('tempCart', JSON.stringify(updatedCart));
        return { success: true };
    }

    try {
        await deleteDoc(doc(db, "users", userId, "cart", productId));
        return { success: true };
    } catch (error) {
        console.error("Error removing from cart:", error);
        return { success: false, message: error.message };
    }
};

export const clearCart = async () => {
    let user = auth.currentUser;
    let userId = user?.uid;

    if (!userId) {
        const localUser = JSON.parse(localStorage.getItem('user') || 'null');
        if (localUser?.uid) userId = localUser.uid;
    }

    if (!userId) {
        localStorage.setItem('tempCart', '[]');
        return { success: true };
    }

    try {
        // Firestore doesn't provide a direct way to delete a collection.
        // We'll just clear local state if we want, but usually we'd delete each doc.
        const q = collection(db, "users", userId, "cart");
        const snap = await getDocs(q);
        const batch = [];
        snap.forEach(doc => {
            batch.push(deleteDoc(doc.ref));
        });
        await Promise.all(batch);
        return { success: true };
    } catch (error) {
        console.error("Error clearing cart:", error);
        return { success: false };
    }
};
