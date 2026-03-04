// Product Variants Configuration
// Defines which variant options are available for each category

export const VARIANT_CONFIGS = {
  "Electronics": {
    icon: "📱",
    hasColors: true,
    hasVariants: true,
    colorPresets: ["Black", "White", "Silver", "Space Gray", "Gold", "Blue", "Red", "Green"],
    variantTypes: [
      {
        key: "storage",
        label: "Storage",
        presets: ["64GB", "128GB", "256GB", "512GB", "1TB", "2TB"]
      },
      {
        key: "memory",
        label: "RAM / Memory",
        presets: ["4GB", "6GB", "8GB", "12GB", "16GB", "32GB", "64GB"]
      }
    ],
    hasSpecifications: true,
    specPresets: ["Processor", "Display", "Battery", "Camera", "Weight", "OS", "Warranty", "Connectivity"]
  },

  "Men's Fashion": {
    icon: "👔",
    hasSizes: true,
    hasColors: true,
    defaultSizes: ["XS", "S", "M", "L", "XL", "XXL", "XXXL"],
    colorPresets: ["Black", "White", "Blue", "Grey", "Navy", "Red", "Green", "Brown", "Beige"],
    hasVariants: true,
    variantTypes: [
      {
        key: "fit",
        label: "Fit Type",
        presets: ["Slim Fit", "Regular Fit", "Loose Fit", "Athletic Fit"]
      }
    ],
    hasSpecifications: true,
    specPresets: ["Material", "Pattern", "Sleeve", "Collar", "Occasion", "Wash Care", "Country of Origin"]
  },

  "Women's Fashion": {
    icon: "👗",
    hasSizes: true,
    hasColors: true,
    defaultSizes: ["XS", "S", "M", "L", "XL", "XXL", "Free Size"],
    colorPresets: ["Black", "White", "Red", "Pink", "Blue", "Green", "Yellow", "Purple", "Beige", "Multi-color"],
    hasVariants: true,
    variantTypes: [
      {
        key: "style",
        label: "Style",
        presets: ["Casual", "Formal", "Party Wear", "Ethnic", "Western"]
      }
    ],
    hasSpecifications: true,
    specPresets: ["Material", "Pattern", "Sleeve", "Neck", "Length", "Occasion", "Wash Care"]
  },

  "Home & Living": {
    icon: "🏠",
    hasColors: true,
    hasDimensions: true,
    colorPresets: ["White", "Black", "Brown", "Grey", "Beige", "Blue", "Green", "Natural Wood"],
    hasVariants: true,
    variantTypes: [
      {
        key: "size",
        label: "Size / Dimensions",
        presets: ["Small", "Medium", "Large", "Extra Large", "Custom"]
      },
      {
        key: "material",
        label: "Material",
        presets: ["Wood", "Metal", "Plastic", "Glass", "Fabric", "Ceramic"]
      }
    ],
    hasSpecifications: true,
    specPresets: ["Material", "Dimensions", "Weight", "Assembly Required", "Warranty", "Care Instructions"]
  },

  "Beauty": {
    icon: "💄",
    hasSizes: true,
    hasColors: true,
    defaultSizes: ["30ml", "50ml", "100ml", "150ml", "200ml", "250ml", "500ml"],
    colorPresets: ["Fair", "Medium", "Dark", "Universal", "Nude", "Pink", "Red", "Brown"],
    hasVariants: true,
    variantTypes: [
      {
        key: "skinType",
        label: "Skin Type",
        presets: ["Oily", "Dry", "Combination", "Sensitive", "All Skin Types"]
      }
    ],
    hasSpecifications: true,
    specPresets: ["Ingredients", "Skin Type", "Volume", "Usage", "Shelf Life", "Country of Origin", "Dermatologically Tested"]
  },

  "Sports": {
    icon: "🏋️",
    hasSizes: true,
    hasColors: true,
    defaultSizes: ["S", "M", "L", "XL", "XXL", "Free Size"],
    colorPresets: ["Black", "White", "Red", "Blue", "Grey", "Neon Green", "Orange", "Yellow"],
    hasVariants: true,
    variantTypes: [
      {
        key: "type",
        label: "Type",
        presets: ["Indoor", "Outdoor", "Professional", "Beginner", "Intermediate"]
      }
    ],
    hasSpecifications: true,
    specPresets: ["Material", "Weight Capacity", "Dimensions", "Warranty", "Usage", "Age Group"]
  },

  "Accessories": {
    icon: "👜",
    hasColors: true,
    hasSizes: true,
    defaultSizes: ["One Size", "Small", "Medium", "Large"],
    colorPresets: ["Black", "Brown", "Tan", "Blue", "Red", "Silver", "Gold"],
    hasVariants: true,
    variantTypes: [
      {
        key: "material",
        label: "Material",
        presets: ["Leather", "Synthetic", "Metal", "Fabric", "Plastic"]
      }
    ],
    hasSpecifications: true,
    specPresets: ["Material", "Dimensions", "Weight", "Warranty", "Water Resistant", "Care Instructions"]
  },

  "Books & Stationery": {
    icon: "📚",
    hasSpecifications: true,
    specPresets: ["Author", "Publisher", "Language", "Pages", "ISBN", "Edition", "Binding", "Publication Date"]
  },

  "Food & Beverages": {
    icon: "🍽️",
    hasVariants: true,
    variantTypes: [
      {
        key: "weight",
        label: "Pack Size / Weight",
        presets: ["100g", "250g", "500g", "1kg", "2kg", "5kg"]
      },
      {
        key: "flavor",
        label: "Flavor / Variant",
        presets: ["Original", "Spicy", "Sweet", "Salty", "Mixed"]
      }
    ],
    hasSpecifications: true,
    specPresets: ["Ingredients", "Shelf Life", "Storage", "Allergens", "Nutritional Info", "FSSAI License", "Country of Origin"]
  },

  "Handicrafts": {
    icon: "🎨",
    hasColors: true,
    hasCustomAttributes: true,
    colorPresets: ["Natural", "Brown", "Red", "Blue", "Gold", "Multi-color", "Hand-painted"],
    hasSpecifications: true,
    specPresets: ["Material", "Origin", "Technique", "Weight", "Dimensions", "Care", "Artisan Info"]
  },

  "Others": {
    icon: "📦",
    hasColors: true,
    hasSizes: true,
    hasCustomAttributes: true,
    defaultSizes: ["Small", "Medium", "Large"],
    colorPresets: ["Black", "White", "Red", "Blue", "Green"],
    hasSpecifications: true,
    specPresets: ["Material", "Dimensions", "Weight", "Usage", "Warranty"]
  }
};

// Get variant configuration for a category
export const getVariantConfig = (category) => {
  return VARIANT_CONFIGS[category] || VARIANT_CONFIGS["Others"];
};

// Check if category has specific variant type
export const hasVariantType = (category, variantType) => {
  const config = getVariantConfig(category);
  return config[variantType] === true;
};

// Get available sizes for a category
export const getSizesForCategory = (category) => {
  const config = getVariantConfig(category);
  return config.defaultSizes || [];
};

// Get available colors for a category
export const getColorsForCategory = (category) => {
  const config = getVariantConfig(category);
  return config.colorPresets || [];
};

// Get variant types for a category
export const getVariantTypesForCategory = (category) => {
  const config = getVariantConfig(category);
  return config.variantTypes || [];
};
