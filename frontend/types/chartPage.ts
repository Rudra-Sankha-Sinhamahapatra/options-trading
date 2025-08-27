export interface OHLCData {
  time: number | string; 
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number; 
}

export interface ApiResponse {
  success: boolean;
  data: OHLCData[]; 
  meta: {
    asset: string;
    interval: string;
    count: number;
    source: string;
  };
}