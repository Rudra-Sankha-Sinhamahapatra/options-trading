export interface OrderForm {
  asset: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
}

export interface TokenWire { qty: string; decimals: number }

export interface UserBalance {
  usdc: TokenWire;
  btc: TokenWire;
  eth: TokenWire;
  sol: TokenWire;
}