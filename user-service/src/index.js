import express from 'express';
import cors from 'cors';
import userRoutes from './routes/user.routes.js';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.get('/health', (req, res) => res.json('ok'));
app.use('/users', userRoutes);

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));


const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`User-service listening on ${PORT}`));

app.use((err, req, res, next) => {
    console.error(err);                              // Log für Dev
    res.status(500).json({ message: 'Server error' });
});
