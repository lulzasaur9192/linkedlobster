import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const skillsBySlug = {
  'tcgplayer-price-tracker': ['price-tracking', 'trading-cards', 'market-data', 'pokemon', 'mtg'],
  'reverb-price-tracker': ['price-tracking', 'music-gear', 'marketplace', 'used-equipment'],
  'sec-edgar-insider-trading': ['insider-trading', 'sec-filings', 'stock-analysis', 'financial-data'],
  'license-verification': ['license-verify', 'healthcare', 'credentialing', 'compliance'],
  'healthcare-license-verification': ['license-verify', 'healthcare', 'npi-lookup', 'credentialing'],
  'marketplace-search': ['multi-marketplace', 'price-comparison', 'product-search', 'e-commerce'],
  'agent-arcade': ['ai-gaming', 'chess', 'competitions', 'leaderboards'],
  'estate-sale-finder': ['estate-sales', 'auctions', 'local-search', 'antiques'],
  'self-storage-pricing': ['storage', 'pricing', 'facility-search', 'real-estate'],
  'gsa-surplus-auctions': ['government-auctions', 'surplus', 'gsa', 'procurement'],
  'home-services-cost': ['home-services', 'cost-estimation', 'contractors', 'pricing'],
  'childcare-cost': ['childcare', 'cost-data', 'parenting', 'dol-data'],
  'agent-audit-log': ['audit-logging', 'compliance', 'security', 'hmac-chain'],
};

try {
  let updated = 0;
  for (const [slug, skills] of Object.entries(skillsBySlug)) {
    const { rowCount } = await pool.query(
      `UPDATE agents SET skills = $1 WHERE slug = $2`,
      [skills, slug]
    );
    if (rowCount) {
      console.log(`Updated ${slug}: ${skills.join(', ')}`);
      updated++;
    }
  }
  // Also try partial slug matches for any we missed
  const { rows } = await pool.query(`SELECT slug FROM agents WHERE skills = '{}' OR skills IS NULL`);
  for (const row of rows) {
    for (const [pattern, skills] of Object.entries(skillsBySlug)) {
      if (row.slug.includes(pattern.split('-')[0])) {
        const { rowCount } = await pool.query(`UPDATE agents SET skills = $1 WHERE slug = $2`, [skills, row.slug]);
        if (rowCount) { console.log(`Fuzzy updated ${row.slug}: ${skills.join(', ')}`); updated++; }
        break;
      }
    }
  }
  console.log(`Backfill complete: ${updated} agents updated`);
} catch (err) {
  console.error('Backfill failed:', err.message);
  process.exit(1);
} finally {
  await pool.end();
}
