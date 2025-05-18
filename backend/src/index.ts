import express from 'express';
import { Request, Response } from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import expressSession from 'express-session';
import passport from 'passport';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

import { configurePassport } from './passport/passport';
import { configureAuthRoutes } from './routes/auth';
import { configureContentRoutes } from './routes/content';

const app = express();
const port = process.env.PORT || 5000;
const dbUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/instagram_db';

mongoose.connect(dbUrl)
    .then(() => {
        console.log('Successfully connected to MongoDB.');
    })
    .catch(error => {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    });

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

const sessionOptions: expressSession.SessionOptions = {
    secret: process.env.SESSION_SECRET as string,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' }
};

if (!sessionOptions.secret) {
    console.error('FATAL ERROR: SESSION_SECRET is not defined.');
    process.exit(1);
}

app.use(expressSession(sessionOptions));

app.use(passport.initialize());
app.use(passport.session());

configurePassport(passport);

app.get('/', (req: Request, res: Response) => {
    res.status(200).send('Instagram Backend API');
});

app.use('/api/auth', configureAuthRoutes(passport, express.Router()));

app.use('/api/content', configureContentRoutes(passport, express.Router()));

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});

console.log('Server setup complete.');
