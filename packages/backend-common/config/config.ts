export const config = {
    dbUrl: {
     timescale:{
        url: process.env.TIMESCALE_URL,
     },
     postgres: {
        url: process.env.DATABASE_URL
     }
    },
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
    },
    kafka: {
    brokerUrl: process.env.KAFKA_BROKER_URL || "localhost:9092"
  }
}
