export type Product = {
  id: string;
  name: string;
  sku: string;
  price: number;
  resellerPrice: number;
  stock: number;
  category: string;
  description: string;
  specs: string;
  shippingInfo: string;
  imageUrl: string;
  aiHint: string;
};

export const products: Product[] = [
  {
    id: "prod-001",
    name: "AcousticPro Guitar",
    sku: "AC-GT-001",
    price: 350,
    resellerPrice: 300,
    stock: 25,
    category: "Musical Instruments",
    description: "A beautifully crafted acoustic guitar with a rich, resonant tone. Perfect for both beginners and experienced players. Features a solid spruce top and mahogany back and sides.",
    specs: "Top: Solid Spruce, Back & Sides: Mahogany, Neck: Maple, Fretboard: Rosewood, 20 Frets",
    shippingInfo: "Ships within 2-3 business days. Free shipping on orders over $100.",
    imageUrl: "https://placehold.co/600x400.png",
    aiHint: "acoustic guitar",
  },
  {
    id: "prod-002",
    name: "StudioMax Headphones",
    sku: "AU-HP-002",
    price: 180,
    resellerPrice: 150,
    stock: 60,
    category: "Audio Equipment",
    description: "Experience immersive sound with our StudioMax headphones. Featuring noise-cancellation technology and high-fidelity audio drivers, they are ideal for music production and casual listening.",
    specs: "Driver Size: 50mm, Impedance: 32 Ohms, Frequency Response: 15Hz-25kHz, Connection: Bluetooth 5.0 & 3.5mm Jack",
    shippingInfo: "Ships worldwide. Express shipping available.",
    imageUrl: "https://placehold.co/600x400.png",
    aiHint: "studio headphones",
  },
  {
    id: "prod-003",
    name: "ErgoFlow Office Chair",
    sku: "OF-CH-003",
    price: 250,
    resellerPrice: 220,
    stock: 40,
    category: "Office Furniture",
    description: "Stay comfortable and productive with the ErgoFlow office chair. Its ergonomic design provides excellent lumbar support, and multiple adjustment points ensure a perfect fit.",
    specs: "Material: Breathable Mesh, Base: Polished Aluminum, Adjustments: Height, Tilt, Armrests, Lumbar Support",
    shippingInfo: "Ships in 1-2 business days. Assembly required.",
    imageUrl: "https://placehold.co/600x400.png",
    aiHint: "office chair",
  },
  {
    id: "prod-004",
    name: "GamerPro Mechanical Keyboard",
    sku: "PC-KB-004",
    price: 120,
    resellerPrice: 100,
    stock: 75,
    category: "PC Accessories",
    description: "Gain a competitive edge with the GamerPro Mechanical Keyboard. Featuring customizable RGB lighting and responsive mechanical switches for a superior typing and gaming experience.",
    specs: "Switches: Cherry MX Red, Layout: Full-size 104-key, Backlighting: Per-key RGB, Material: Aircraft-grade aluminum frame",
    shippingInfo: "Next-day shipping available.",
    imageUrl: "https://placehold.co/600x400.png",
    aiHint: "gaming keyboard",
  },
  {
    id: "prod-005",
    name: "TrailBlazer Hiking Backpack",
    sku: "OD-BP-005",
    price: 90,
    resellerPrice: 75,
    stock: 110,
    category: "Outdoor Gear",
    description: "The TrailBlazer backpack is your perfect companion for any adventure. With a 40L capacity, multiple compartments, and a durable, water-resistant fabric, it's built for the great outdoors.",
    specs: "Capacity: 40 Liters, Material: Ripstop Nylon, Weight: 1.2kg, Features: Hydration bladder compatible, integrated rain cover",
    shippingInfo: "Ships within 24 hours.",
    imageUrl: "https://placehold.co/600x400.png",
    aiHint: "hiking backpack",
  },
  {
    id: "prod-006",
    name: "RoboChef Smart Blender",
    sku: "KT-BL-006",
    price: 150,
    resellerPrice: 130,
    stock: 50,
    category: "Kitchen Appliances",
    description: "Effortlessly create smoothies, soups, and more with the RoboChef Smart Blender. Its powerful motor and pre-programmed settings make blending simple and consistent.",
    specs: "Motor: 1200W, Capacity: 1.5L Glass Jar, Speeds: 5 + Pulse, Programs: Smoothie, Ice Crush, Soup",
    shippingInfo: "Free standard shipping.",
    imageUrl: "https://placehold.co/600x400.png",
    aiHint: "smart blender",
  },
];

export type OrderItem = {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
};

export type Order = {
  id: string;
  customer: {
    name: string;
    address: string;
    whatsapp: string;
  };
  items: OrderItem[];
  total: number;
  status: "New" | "Processing" | "Shipped" | "Completed";
  timestamp: string;
};

export const orders: Order[] = [
  {
    id: "ORD-001",
    customer: {
      name: "Budi Santoso",
      address: "Jl. Merdeka 1, Jakarta",
      whatsapp: "081234567890",
    },
    items: [
      { productId: "prod-001", productName: "AcousticPro Guitar", quantity: 1, price: 300 },
      { productId: "prod-002", productName: "StudioMax Headphones", quantity: 1, price: 150 },
    ],
    total: 450,
    status: "New",
    timestamp: "2023-10-27T10:00:00Z",
  },
  {
    id: "ORD-002",
    customer: {
      name: "Citra Lestari",
      address: "Jl. Pahlawan 2, Surabaya",
      whatsapp: "082345678901",
    },
    items: [{ productId: "prod-003", productName: "ErgoFlow Office Chair", quantity: 2, price: 220 }],
    total: 440,
    status: "Processing",
    timestamp: "2023-10-27T11:30:00Z",
  },
  {
    id: "ORD-003",
    customer: {
      name: "Dewi Anggraini",
      address: "Jl. Asia Afrika 3, Bandung",
      whatsapp: "083456789012",
    },
    items: [{ productId: "prod-004", productName: "GamerPro Mechanical Keyboard", quantity: 1, price: 100 }],
    total: 100,
    status: "Shipped",
    timestamp: "2023-10-26T14:00:00Z",
  },
  {
    id: "ORD-004",
    customer: {
      name: "Eko Prasetyo",
      address: "Jl. Sudirman 4, Medan",
      whatsapp: "084567890123",
    },
    items: [
      { productId: "prod-005", productName: "TrailBlazer Hiking Backpack", quantity: 1, price: 75 },
      { productId: "prod-006", productName: "RoboChef Smart Blender", quantity: 1, price: 130 },
    ],
    total: 205,
    status: "Completed",
    timestamp: "2023-10-25T09:15:00Z",
  },
  {
    id: "ORD-005",
    customer: {
      name: "Budi Santoso",
      address: "Jl. Merdeka 1, Jakarta",
      whatsapp: "081234567890",
    },
    items: [{ productId: "prod-005", productName: "TrailBlazer Hiking Backpack", quantity: 1, price: 75 }],
    total: 75,
    status: "Processing",
    timestamp: "2023-10-28T12:00:00Z",
  },
];
