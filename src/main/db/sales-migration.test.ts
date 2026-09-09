import { afterEach, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const connections: Database.Database[] = []
const folders: string[] = []
afterEach(() => {
  connections.splice(0).forEach((db) => db.close())
  folders.splice(0).forEach((folder) => rmSync(folder, { recursive: true, force: true }))
})
const database = () => {
  const sqlite = new Database(':memory:')
  sqlite.pragma('foreign_keys = ON')
  connections.push(sqlite)
  return sqlite
}
const legacyDatabase = (missingRegister = false) => {
  const sqlite = database()
  const folder = mkdtempSync(join(tmpdir(), 'sales-migration-'))
  folders.push(folder)
  mkdirSync(join(folder, 'meta'))
  const journal = JSON.parse(readFileSync('drizzle/meta/_journal.json', 'utf8'))
  journal.entries = journal.entries.slice(0, 5)
  writeFileSync(join(folder, 'meta/_journal.json'), JSON.stringify(journal))
  for (const entry of journal.entries) copyFileSync(`drizzle/${entry.tag}.sql`, join(folder, `${entry.tag}.sql`))
  migrate(drizzle(sqlite), { migrationsFolder: folder })
  sqlite.exec(`INSERT INTO cash_registers (id) VALUES (1);
    INSERT INTO products (id, name, internal_code, sale_price_in_cents) VALUES (1, 'Nome atual', 'MIG', 100);`)
  if (missingRegister) sqlite.exec('DROP TRIGGER sales_require_open_cash_register_insert;')
  sqlite.prepare('INSERT INTO sales (id, cash_register_id, subtotal_in_cents, total_in_cents) VALUES (1, ?, 100, 100)').run(missingRegister ? null : 1)
  if (!missingRegister) {
    sqlite.exec(`INSERT INTO sale_items (sale_id, product_id, quantity, unit_price_in_cents, total_in_cents) VALUES (1, 1, 1, 100, 100);
      INSERT INTO payments (sale_id, method, amount_in_cents) VALUES (1, 'cash', 100);
      UPDATE sales SET status = 'paid' WHERE id = 1;
      UPDATE cash_registers SET status = 'closed' WHERE id = 1;`)
  }
  return sqlite
}

describe('sales migration and database protections', () => {
  it('migrates an empty database', () => {
    const sqlite = database()
    migrate(drizzle(sqlite), { migrationsFolder: 'drizzle' })
    expect(sqlite.prepare("SELECT name FROM pragma_table_info('sale_items')").all()).toContainEqual({ name: 'product_name' })
    expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([])
  })
  it('preserves legacy records and makes paid sales immutable', () => {
    const sqlite = legacyDatabase()
    migrate(drizzle(sqlite), { migrationsFolder: 'drizzle' })
    expect(sqlite.prepare('SELECT product_name, discount_in_cents, total_in_cents FROM sale_items').get()).toEqual({ product_name: 'Nome atual', discount_in_cents: 0, total_in_cents: 100 })
    expect(sqlite.prepare('SELECT amount_in_cents, received_amount_in_cents FROM payments').get()).toEqual({ amount_in_cents: 100, received_amount_in_cents: null })
    expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([])
    sqlite.exec("INSERT INTO cash_registers (id) VALUES (2); INSERT INTO sales (id, cash_register_id, subtotal_in_cents, total_in_cents) VALUES (2, 2, 100, 100); INSERT INTO payments (sale_id, method, amount_in_cents) VALUES (2, 'pix', 100); INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price_in_cents, total_in_cents) VALUES (2, 1, 'Nome', 1, 100, 100);")
    // Also enforce immutability while the parent register is still open.
    sqlite.exec("UPDATE sales SET status = 'paid' WHERE id = 2; INSERT INTO sales (id, cash_register_id, subtotal_in_cents, total_in_cents) VALUES (3, 2, 100, 100);")
    for (const statement of [
      "UPDATE sales SET status = 'open' WHERE id = 2", 'DELETE FROM sales WHERE id = 2',
      'UPDATE payments SET amount_in_cents = 200 WHERE sale_id = 2', 'DELETE FROM payments WHERE sale_id = 2',
      "INSERT INTO payments (sale_id, method, amount_in_cents) VALUES (2, 'pix', 1)",
      'UPDATE sale_items SET quantity = 2 WHERE sale_id = 2', 'DELETE FROM sale_items WHERE sale_id = 2',
      "INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price_in_cents, total_in_cents) VALUES (2, 1, 'Nome', 1, 100, 100)",
      'UPDATE payments SET sale_id = 3 WHERE sale_id = 2', 'UPDATE sale_items SET sale_id = 3 WHERE sale_id = 2'
    ]) expect(() => sqlite.exec(statement)).toThrow(/PAID_SALE_IMMUTABLE/)
    sqlite.exec("INSERT INTO payments (sale_id, method, amount_in_cents) VALUES (3, 'pix', 1); INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price_in_cents, total_in_cents) VALUES (3, 1, 'Nome', 1, 100, 100);")
    for (const table of ['payments', 'sale_items']) expect(() => sqlite.exec(`UPDATE ${table} SET sale_id = 2 WHERE sale_id = 3`)).toThrow(/PAID_SALE_IMMUTABLE/)
    expect(() => sqlite.exec("UPDATE cash_registers SET status = 'open' WHERE id = 1")).toThrow(/CLOSED_CASH_REGISTER_IMMUTABLE/)
  })
  it('rolls back migration when a legacy sale has no register', () => {
    const sqlite = legacyDatabase(true)
    expect(() => migrate(drizzle(sqlite), { migrationsFolder: 'drizzle' })).toThrow()
    expect(sqlite.prepare('SELECT cash_register_id FROM sales').get()).toEqual({ cash_register_id: null })
    expect(sqlite.prepare("SELECT name FROM pragma_table_info('sale_items')").all()).not.toContainEqual({ name: 'product_name' })
    expect(sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'trigger' AND name = 'cash_registers_closed_immutable_update'").get()).toBeDefined()
    expect(sqlite.prepare('SELECT count(*) AS count FROM __drizzle_migrations').get()).toEqual({ count: 5 })
  })
})
