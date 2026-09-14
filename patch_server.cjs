const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

if (!content.includes('import { giftCodes }')) {
  content = content.replace('import { users }', 'import { users, giftCodes, usedGiftCodes }');
}

if (!content.includes('/api/gifts')) {
  const insertIndex = content.indexOf('app.get("/api/telegram/status"');
  const codeToInsert = `
  app.get("/api/gifts", async (req, res) => {
    try {
      const allGifts = await db.select().from(giftCodes).orderBy(desc(giftCodes.createdAt));
      res.json(allGifts);
    } catch (e) {
      res.status(500).json({ error: "Failed to load gifts" });
    }
  });

  app.post("/api/gifts", async (req, res) => {
    const { durationMonths, maxUsages } = req.body;
    if (!durationMonths || !maxUsages) return res.status(400).json({ error: "Missing fields" });
    try {
      const crypto = await import("crypto");
      const id = crypto.randomUUID().split("-")[0];
      await db.insert(giftCodes).values({
        id,
        durationMonths,
        maxUsages,
        usedCount: 0,
        createdAt: Date.now()
      });
      res.json({ success: true, id });
    } catch (e) {
      res.status(500).json({ error: "Failed to create gift" });
    }
  });

  app.delete("/api/gifts/:id", async (req, res) => {
    try {
      await db.delete(giftCodes).where(eq(giftCodes.id, req.params.id));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to delete gift" });
    }
  });
  
  `;
  content = content.slice(0, insertIndex) + codeToInsert + content.slice(insertIndex);
}

fs.writeFileSync('server.ts', content);
console.log('Fixed server.ts gifts APIs');
