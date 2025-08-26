import  { config } from "@options-trading/backend-common"

export const PORT = config.server.port
export const NODE_ENV = config.server.nodeenv
export const JWT_SECRET = config.server.jwtSecret