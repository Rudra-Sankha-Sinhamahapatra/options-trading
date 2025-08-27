export const config = {
  backend: {
    url: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'
  },
  ws: {
    url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080'
  }
};