import Database from 'better-sqlite3'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Exercise upgrading an existing database, not just creating the current schema.
describe('product markup migration', () => {
  it('preserves legacy product prices and adds nullable markup', () => {
    const db = new Database(':memory:')
    try {
      const folder = join(process.cwd(), 'drizzle')
      const journal = JSON.parse(readFileSync(join(folder, 'meta/_journal.json'), 'utf8'))
      const entries: { tag: string }[] = journal.entries
      const markupIndex = entries.findIndex(({ tag }) => tag.startsWith('0008_'))
      expect(markupIndex).toBeGreaterThan(0)
      for (const { tag } of entries.slice(0, markupIndex)) {
        db.exec(readFileSync(join(folder, `${tag}.sql`), 'utf8'))
      }
      db.prepare('INSERT INTO products (name, internal_code, cost_price_in_cents, sale_price_in_cents) VALUES (?, ?, ?, ?)')
        .run('Legado', '1', 300, 400)
      db.exec(readFileSync(join(folder, `${entries[markupIndex].tag}.sql`), 'utf8'))
      expect(db.prepare('SELECT cost_price_in_cents, sale_price_in_cents, markup_percentage FROM products').get())
        .toEqual({ cost_price_in_cents: 300, sale_price_in_cents: 400, markup_percentage: null })
    } finally {
      db.close()
    }
  })
})
