import { Router, Request, Response, NextFunction } from 'express';
import { PassportStatic } from 'passport';
import { User } from '../models/User';

export const configureAuthRoutes = (passport: PassportStatic, router: Router): Router => {

    router.post('/register', (req: Request, res: Response) => {
        const { email, password, role } = req.body;

        if (!email || !password) {
            return res.status(400).send('Email and password are required.');
        }
        const newUser = new User({
            email: email,
            password: password,
            role: (role === 'influencer' || role === 'admin') ? role : 'user'
        });

        newUser.save()
            .then(user => {
                res.status(201).send({
                    _id: user._id,
                    email: user.email,
                    role: user.role
                });
            })
            .catch(error => {
                console.error('Error during registration:', error);
                if (error.code === 11000) { // MongoDB duplicate key error code
                    res.status(409).send('Email address already registered.');
                } else {
                    res.status(500).send('Error registering user.');
                }
            });
    });

    // POST /api/auth/login - Log in an existing user
    router.post('/login', (req: Request, res: Response, next: NextFunction) => {
        passport.authenticate('local', (error: any, user: any, info: any) => {
            if (error) {
                console.error('Error during authentication:', error);
                return res.status(500).send('Internal server error.');
            }
            if (!user) {
                // Authentication failed (incorrect credentials)
                return res.status(401).send(info.message);
            }

            // Log in the user using Passport's req.login()
            req.login(user, (err) => {
                if (err) {
                    console.error('Error during login:', err);
                    return res.status(500).send('Error logging in.');
                }
                // Successful login, send back user info (excluding password)
                res.status(200).send({
                    _id: user._id,
                    email: user.email,
                    role: user.role
                });
            });
        })(req, res, next);
    });

    // POST /api/auth/logout - Log out the current user
    router.post('/logout', (req: Request, res: Response) => {
        // Check if the user is authenticated
        if (req.isAuthenticated()) {
            req.logout((error) => {
                if (error) {
                    console.error('Error during logout:', error);
                    return res.status(500).send('Error logging out.');
                }
                // Session is destroyed on logout
                res.status(200).send('Successfully logged out.');
            });
        } else {
            // User is not logged in
            res.status(401).send('User is not logged in.');
        }
    });

    return router;
};
