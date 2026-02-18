
import { collection, getDocs, setDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';

const products = [
    {
        "id": "IH001",
        "name": "Rajasthani Blue Pottery Vase",
        "category": "Home Decor",
        "price": 1450,
        "currency": "INR",
        "stock": 12,
        "imageUrl": "https://images.unsplash.com/photo-1603398938378-7d5c3b4c5c7c",
        "description": "Handcrafted blue pottery vase from Jaipur with traditional floral motifs."
    },
    {
        "id": "IH002",
        "name": "Madhubani Hand-Painted Artwork",
        "category": "Wall Art",
        "price": 3200,
        "currency": "INR",
        "stock": 8,
        "imageUrl": "https://images.unsplash.com/photo-1581091215367-59ab6b4d8f7d",
        "description": "Authentic Madhubani painting depicting mythological themes from Bihar."
    },
    {
        "id": "IH003",
        "name": "Kashmiri Walnut Wood Jewelry Box",
        "category": "Woodcraft",
        "price": 1850,
        "currency": "INR",
        "stock": 15,
        "imageUrl": "https://images.unsplash.com/photo-1590080876284-65a83d7f52b3",
        "description": "Intricately carved walnut wood jewelry box from Kashmir."
    },
    {
        "id": "IH004",
        "name": "Dhokra Tribal Brass Figurine",
        "category": "Metal Craft",
        "price": 950,
        "currency": "INR",
        "stock": 20,
        "imageUrl": "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1",
        "description": "Traditional Dhokra art figurine crafted using the lost-wax casting technique."
    },
    {
        "id": "IH005",
        "name": "Banarasi Silk Cushion Cover",
        "category": "Textiles",
        "price": 650,
        "currency": "INR",
        "stock": 25,
        "imageUrl": "https://images.unsplash.com/photo-1586105251261-72a756497a11",
        "description": "Elegant handwoven Banarasi silk cushion cover with zari detailing."
    },
    {
        "id": "IH006",
        "name": "Bankura Terracotta Horse",
        "category": "Clay Art",
        "price": 1100,
        "currency": "INR",
        "stock": 10,
        "imageUrl": "https://images.unsplash.com/photo-1616627989117-44e6e6f9b6db",
        "description": "Iconic terracotta horse handcrafted by artisans from West Bengal."
    },
    {
        "id": "IH007",
        "name": "Phulkari Embroidered Dupatta",
        "category": "Fashion",
        "price": 2750,
        "currency": "INR",
        "stock": 18,
        "imageUrl": "https://images.unsplash.com/photo-1593032465171-8d89f3e99b0e",
        "description": "Traditional Punjabi Phulkari dupatta with vibrant hand embroidery."
    },
    {
        "id": "IH008",
        "name": "Pattachitra Scroll Painting",
        "category": "Art",
        "price": 4500,
        "currency": "INR",
        "stock": 5,
        "imageUrl": "https://images.unsplash.com/photo-1618220179428-22790b461013",
        "description": "Detailed Pattachitra painting from Odisha inspired by Jagannath mythology."
    },
    {
        "id": "IH009",
        "name": "Handcrafted Bamboo Table Lamp",
        "category": "Lighting",
        "price": 1750,
        "currency": "INR",
        "stock": 14,
        "imageUrl": "https://images.unsplash.com/photo-1505691938895-1758d7feb511",
        "description": "Eco-friendly bamboo table lamp handmade by rural artisans."
    },
    {
        "id": "IH010",
        "name": "Kolhapuri Leather Handbag",
        "category": "Accessories",
        "price": 3900,
        "currency": "INR",
        "stock": 9,
        "imageUrl": "https://images.unsplash.com/photo-1591561954557-26941169b49e",
        "description": "Authentic Kolhapuri leather handbag crafted using traditional tanning methods."
    }
];

export const seedProducts = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        if (querySnapshot.size === 0) {
            console.log("Seeding products...");
            const promises = products.map(product =>
                setDoc(doc(db, "products", product.id), product)
            );
            await Promise.all(promises);
            console.log("Products seeded successfully!");
            return true;
        } else {
            console.log("Products already exist, skipping seed.");
            return false;
        }
    } catch (error) {
        console.error("Error seeding products:", error);
        return false;
    }
};
