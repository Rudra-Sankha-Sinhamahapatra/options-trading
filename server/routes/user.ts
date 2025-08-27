import express from "express"
import { signin, signup, verify } from "../controllers/user";
import { authMiddleware } from "../middleware/auth";

const router = express.Router();

router.post("/signin",signin);
router.post("/signup",signup);
router.get("/verify",authMiddleware,verify);


export default router ;