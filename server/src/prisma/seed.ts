import { prisma } from "../db";
import { hashPassword } from "../lib/password";

const PLACEHOLDER_IMAGE = "uploads/placeholder.png";

const categories = [
  { name: "Necklaces", symbol: "📿" },
  { name: "Rings", symbol: "💍" },
  { name: "Bracelets", symbol: "🔗" },
  { name: "Earrings", symbol: "✨" },
  { name: "Bars & Coins", symbol: "🪙" },
];

// Thai jewelry weights: 1 salueng = 3.81 g, 1 baht = 15.244 g (bars: 15.16 g).
type SeedItem = {
  title: string;
  category: string;
  weight: number;
  purity: number;
  laborFee: number;
  stock: number;
  description?: string;
};

const items: SeedItem[] = [
  { title: "Classic Chain Necklace 1 Baht", category: "Necklaces", weight: 15.244, purity: 0.965, laborFee: 800, stock: 5 },
  { title: "Rope Chain Necklace 2 Baht", category: "Necklaces", weight: 30.488, purity: 0.965, laborFee: 1200, stock: 3 },
  { title: "Box Chain Necklace 2 Salueng", category: "Necklaces", weight: 7.62, purity: 0.965, laborFee: 500, stock: 8 },
  { title: "Plain Band Ring 1 Salueng", category: "Rings", weight: 3.81, purity: 0.965, laborFee: 300, stock: 12 },
  { title: "Signet Ring 2 Salueng", category: "Rings", weight: 7.62, purity: 0.965, laborFee: 450, stock: 6 },
  { title: "18K Solitaire Ring", category: "Rings", weight: 4.2, purity: 0.75, laborFee: 1500, stock: 4, description: "18K white gold, 0.3 ct stone." },
  { title: "Link Bracelet 1 Baht", category: "Bracelets", weight: 15.244, purity: 0.965, laborFee: 700, stock: 5 },
  { title: "Bangle 2 Baht", category: "Bracelets", weight: 30.488, purity: 0.965, laborFee: 900, stock: 2 },
  { title: "Hoop Earrings 1 Salueng", category: "Earrings", weight: 3.81, purity: 0.965, laborFee: 350, stock: 10 },
  { title: "Stud Earrings 18K", category: "Earrings", weight: 2.1, purity: 0.75, laborFee: 600, stock: 7 },
  { title: "Gold Bar 1 Baht 96.5%", category: "Bars & Coins", weight: 15.16, purity: 0.965, laborFee: 100, stock: 10 },
  { title: "Gold Bar 10 g 99.99%", category: "Bars & Coins", weight: 10, purity: 0.9999, laborFee: 150, stock: 10 },
  { title: "Gold Bar 1 oz 99.99%", category: "Bars & Coins", weight: 31.1035, purity: 0.9999, laborFee: 200, stock: 4 },
];

async function main() {
  const categoryMap = new Map<string, string>();
  for (const c of categories) {
    const row = await prisma.category.upsert({ where: { name: c.name }, update: { symbol: c.symbol }, create: c });
    categoryMap.set(c.name, row.id);
  }

  await prisma.item.deleteMany({ where: { title: { in: items.map((i) => i.title) } } });
  for (const { category, ...i } of items) {
    await prisma.item.create({ data: { ...i, image: PLACEHOLDER_IMAGE, categoryId: categoryMap.get(category)! } });
  }

  if (process.env.DEMO_STAFF_EMAIL && process.env.DEMO_STAFF_PASSWORD) {
    await prisma.user.upsert({
      where: { email: process.env.DEMO_STAFF_EMAIL },
      update: {},
      create: {
        email: process.env.DEMO_STAFF_EMAIL,
        password: await hashPassword(process.env.DEMO_STAFF_PASSWORD),
        name: "Demo Staff",
        role: "Manager",
      },
    });
  }

  console.log("Seeded", { categories: await prisma.category.count(), items: await prisma.item.count() });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
