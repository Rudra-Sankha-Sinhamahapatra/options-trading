import { pool } from "./db"

export interface TickRow {
  time: Date       
  asset: string
  price: number     
  qty: number       
  decimals: number
}

export async function batchInsertTicks(rows: TickRow[]) {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    const ph: string[] = []
    const vals: any[] = []
    rows.forEach((r, i) => {
      const b = i * 5
      ph.push(`($${b+1},$${b+2},$${b+3},$${b+4},$${b+5})`)
      vals.push(r.time, r.asset, r.price, r.qty, r.decimals)
    })

    const sql = `
      INSERT INTO trade_ticks (time, asset, price, qty, decimals)
      VALUES ${ph.join(",")}
    `
    const res = await client.query(sql, vals)
    await client.query("COMMIT")
    return res.rowCount
  } catch (e) {
    await client.query("ROLLBACK")
    throw e
  } finally {
    client.release()
  }
}
