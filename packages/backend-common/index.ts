export const config = {
    dbUrl: process.env.DATABASE_URL,
    server: {
        port: process.env.PORT || "3000",
        nodeenv: process.env.NODE_ENV || "dev",
        jwtSecret: process.env.JWT_SECRET || "secret"
    }
}

export * from './zod/user'