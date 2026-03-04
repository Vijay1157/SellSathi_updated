// Shared Categories Configuration
// Used across: Landing Page, Mega Menu, Seller Product Page

export const MAIN_CATEGORIES = [
  'Electronics',
  "Men's Fashion",
  "Women's Fashion",
  'Home & Living',
  'Beauty',
  'Sports',
  'Accessories',
  'Books & Stationery',
  'Food & Beverages',
  'Handicrafts'
];

// Special categories (shown in second row)
export const SPECIAL_CATEGORIES = [
  "Today's Deals",
  'New Arrivals',
  'Trending'
];

// All categories combined
export const ALL_CATEGORIES = [...MAIN_CATEGORIES, ...SPECIAL_CATEGORIES];

// Subcategories for each main category (first 4 shown by default in mega menu)
export const SUBCATEGORIES = {
  'Electronics': ['Mobiles', 'Laptops', 'Headphones', 'Smart Watches'],
  "Men's Fashion": ['Shirts', 'T-Shirts', 'Jeans', 'Shoes'],
  "Women's Fashion": ['Tops', 'Kurtis', 'Sarees', 'Dresses'],
  'Home & Living': ['Furniture', 'Kitchen', 'Decor', 'Bedding'],
  'Beauty': ['Skincare', 'Makeup', 'Haircare', 'Fragrances'],
  'Sports': ['Sports Shoes', 'Gym Equipment', 'Activewear', 'Fitness Accessories'],
  'Accessories': ['Watches', 'Bags', 'Jewelry', 'Sunglasses'],
  'Books & Stationery': ['Fiction', 'Non-Fiction', 'Notebooks', 'Pens'],
  'Food & Beverages': ['Snacks', 'Beverages', 'Organic', 'Gourmet'],
  'Handicrafts': ['Pottery', 'Textiles', 'Paintings', 'Sculptures'],
  "Today's Deals": ['Under ₹499', 'Under ₹999', 'Best Sellers', 'Limited Offers'],
  'New Arrivals': ['Latest Fashion', 'Latest Electronics', 'Trending Now', 'New Brands'],
  'Trending': ['Most Viewed', 'Most Purchased', "Editor's Picks", 'Hot Deals']
};

// All subcategories including "Other" items
export const ALL_SUBCATEGORIES = {
  'Electronics': ['Mobiles', 'Laptops', 'Headphones', 'Smart Watches', 'Cameras', 'Tablets', 'Gaming', 'Accessories'],
  "Men's Fashion": ['Shirts', 'T-Shirts', 'Jeans', 'Shoes', 'Pants', 'Jackets', 'Ethnic Wear', 'Sportswear'],
  "Women's Fashion": ['Tops', 'Kurtis', 'Sarees', 'Dresses', 'Jeans', 'Handbags', 'Sandals', 'Jewelry'],
  'Home & Living': ['Furniture', 'Kitchen', 'Decor', 'Bedding', 'Lighting', 'Storage', 'Bath', 'Garden'],
  'Beauty': ['Skincare', 'Makeup', 'Haircare', 'Fragrances', 'Grooming', 'Bath & Body', 'Tools', 'Wellness'],
  'Sports': ['Sports Shoes', 'Gym Equipment', 'Activewear', 'Fitness Accessories', 'Outdoor Gear', 'Yoga', 'Cycling', 'Swimming'],
  'Accessories': ['Watches', 'Bags', 'Jewelry', 'Sunglasses', 'Wallets', 'Belts', 'Hats', 'Scarves'],
  'Books & Stationery': ['Fiction', 'Non-Fiction', 'Notebooks', 'Pens', 'Educational', 'Comics', 'Art Supplies', 'Office Supplies'],
  'Food & Beverages': ['Snacks', 'Beverages', 'Organic', 'Gourmet', 'Spices', 'Sweets', 'Health Foods', 'Packaged Foods'],
  'Handicrafts': ['Pottery', 'Textiles', 'Paintings', 'Sculptures', 'Woodwork', 'Metalwork', 'Jewelry', 'Home Decor'],
  "Today's Deals": ['Under ₹499', 'Under ₹999', 'Best Sellers', 'Limited Offers', 'Flash Sale', 'Clearance', 'Bundle Deals', 'Daily Deals'],
  'New Arrivals': ['Latest Fashion', 'Latest Electronics', 'Trending Now', 'New Brands', 'Just In', 'Pre-Orders', 'Coming Soon', 'Exclusives'],
  'Trending': ['Most Viewed', 'Most Purchased', "Editor's Picks", 'Hot Deals', 'Viral Products', 'Bestsellers', 'Top Rated', 'Staff Picks']
};

// Seller-specific categories (for product publishing)
export const SELLER_CATEGORIES = [
  'Electronics',
  "Men's Fashion",
  "Women's Fashion",
  'Home & Living',
  'Beauty',
  'Sports',
  'Accessories',
  'Books & Stationery',
  'Food & Beverages',
  'Handicrafts',
  'Others'
];

// Get subcategories for a specific category
export const getSubcategories = (category) => {
  return ALL_SUBCATEGORIES[category] || [];
};

// Check if category exists
export const isCategoryValid = (category) => {
  return SELLER_CATEGORIES.includes(category);
};
