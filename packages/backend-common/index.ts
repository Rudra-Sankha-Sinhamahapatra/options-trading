import dotenv from "dotenv"
dotenv.config()

export const config = {
    dbUrl: process.env.DATABASE_URL,
    server: {
        port: process.env.PORT || "3000",
        nodeenv: process.env.NODE_ENV || "dev",
        jwtSecret: process.env.JWT_SECRET || "secret"
    },
    redis:{
        url: process.env.REDIS_URL || "redis://localhost:6379"
    },
    ws:{
        port: process.env.WS_PORT || 8080
    }
}

export * from './zod/user'