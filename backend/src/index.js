import express from 'express';
import dotenv, { config } from 'dotenv';
import authRoutes from "../src/routes/auth.routes.js"
import messageRoutes from "../src/routes/message.route.js"
 import { connectDB } from './lib/db.js';
import cookieParser from "cookie-parser";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5001;

app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes); 
app.use('/api/message', messageRoutes);

app.get('/', 
    (req, res) => { 
    res.send('Auth API');
});
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveris running on PORT:  ${PORT}`);
    connectDB();
});