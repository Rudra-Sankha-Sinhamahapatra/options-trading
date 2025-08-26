import express from "express";
import type { Request, Response, Application } from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import { PORT,NODE_ENV } from "./config";
import userRouter from "./routes/user";


dotenv.config();


const app: Application = express();


app.use(express.json());

const corsOptions={
  origin: NODE_ENV === 'dev'?'http://localhost:3000':'https://otrading.rudrasankha.com',
  method:['GET','POST','PUT','DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-VERIFY', 'X-MERCHANT-ID'],
  credentials:true
}

app.use(cors(corsOptions));

app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());


app.get("/", (req: Request, res: Response) => {
  res.json({});
});

app.use("/api/v1/user",userRouter);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});