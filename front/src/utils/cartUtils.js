
import { doc, getDoc, setDoc, updateDoc, increment, collection, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export const addToCart = async (product) => {
    try {
        let user = auth.currentUser;
        let userId = user?.uid;

        if (!userId) {
            const localUser = JSON.parse(localStorage.getItem('user') || 'null');
            if (localUser && localUser.uid) {
                userId = localUser.uid;
            }
        }

        if (!userId) {
            console.log("User not logged in");
            return { success: false, message: "Please login to add items to cart" };
        }

        const cartItemRef = doc(db, "users", userId, "cart", product.id);
        const cartItemSnap = await getDoc(cartItemRef);

        if (cartItemSnap.exists()) {
            await updateDoc(cartItemRef, {
                quantity: increment(1)
            });
        } else {
            await setDoc(cartItemRef, {
                productId: product.id,
                name: product.name,
                price: product.price,
                imageUrl: product.imageUrl,
                quantity: 1,
                category: product.category
            });
        }

        return { success: true, message: "Added to cart successfully" };
    } catch (error) {
        console.error("Error adding to cart:", error);

        // Fallback for permission errors or network issues - Store in LocalStorage so the user sees it vanish into a cart
        if (error.code === 'permission-denied' || error.message.includes('Missing or insufficient permissions')) {
            console.warn("Falling back to LocalStorage cart due to permissions.");
            try {
                // Get existing cart
                const localCart = JSON.parse(localStorage.getItem('tempCart') || '[]');
                const existingItemIndex = localCart.findIndex(item => item.productId === product.id);

                if (existingItemIndex > -1) {
                    localCart[existingItemIndex].quantity += 1;
                } else {
                    localCart.push({
                        productId: product.id,
                        name: product.name,
                        price: product.price,
                        imageUrl: product.imageUrl,
                        quantity: 1,
                        category: product.category
                    });
                }
                localStorage.setItem('tempCart', JSON.stringify(localCart));
                return { success: true, message: "Added to cart (Local Mode)" };
            } catch (localError) {
                console.error("Local cart fallback failed:", localError);
                return { success: false, message: "Failed to add to cart: " + error.message };
            }
        }

        return { success: false, message: "Failed to add to cart: " + error.message };
    }
};



export const listenToCart = (callback) => {
    let user = auth.currentUser;
    let userId = user?.uid;

    if (!userId) {
        const localUser = JSON.parse(localStorage.getItem('user') || 'null');
        if (localUser && localUser.uid) {
            userId = localUser.uid;
        }
    }

    if (!userId) {
        // Fallback to local storage if not logged in
        const localCart = JSON.parse(localStorage.getItem('tempCart') || '[]');
        callback(localCart);
        return () => { };
    }

    const q = collection(db, "users", userId, "cart");
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const items = [];
        querySnapshot.forEach((doc) => {
            items.push({ id: doc.id, ...doc.data() });
        });
        callback(items);
    }, (error) => {
        console.error("Error listening to cart:", error);
        // If permission error, maybe fallback to local?
        if (error.code === 'permission-denied') {
            const localCart = JSON.parse(localStorage.getItem('tempCart') || '[]');
            callback(localCart);
        }
    });

    return unsubscribe;
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
