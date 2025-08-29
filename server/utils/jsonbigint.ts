import type { Response } from "express";

export function sendJsonBigInt(res: Response, payload: unknown) {
  res.set('Content-Type', 'application/json');
  res.send(JSON.stringify(payload, (_k, v) =>
    typeof v === 'bigint' ? v.toString() : v
  ));
}