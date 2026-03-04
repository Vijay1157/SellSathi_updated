export const CATEGORIES = ['Electronics', 'Fashion', 'Home & Living', 'Beauty', 'Sports'];

export const PRODUCTS = [
    {
        id: 1,
        title: 'Aero-X Wireless Earbuds',
        price: 129,
        category: 'Electronics',
        image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800',
        description: 'Active noise cancelling with 40h battery life.',
        seller: 'TechWorld',
        stock: 45
    },
    {
        id: 2,
        title: 'Minimalist Leather Watch',
        price: 89,
        category: 'Fashion',
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
        description: 'Italian leather strap with sapphire glass.',
        seller: 'StyleHub',
        stock: 20
    },
    {
        id: 3,
        title: 'Ergo-Comfort Chair',
        price: 299,
        category: 'Home & Living',
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
        description: 'Full Lumbar support with breathable mesh.',
        seller: 'OfficePro',
        stock: 12
    }
];

export const SELLERS = [
    {
        id: 's1',
        name: 'TechWorld',
        email: 'contact@techworld.com',
        status: 'Approved',
        type: 'Small Business',
        joined: '2026-01-15'
    }
];

export const ORDERS = [
    {
        id: 'ORD-5521',
        customer: 'John Doe',
        product: 'Aero-X Wireless Earbuds',
        amount: 129,
        status: 'Delivered',
        date: '2026-02-08'
    }
];
