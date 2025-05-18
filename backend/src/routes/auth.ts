import { Router, Request, Response, NextFunction } from 'express';
import { PassportStatic } from 'passport';
import { User, IUser } from '../models/User';
import { Post, IPost } from '../models/Post';
import { Comment } from '../models/Comment';
import { Follower } from '../models/Follower';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

// Middleware to check if the user is an admin
const isAdmin = (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as IUser;
    if (user && user.role === 'admin') {
        next();
    } else {
        res.status(403).send('Forbidden: Only admins can perform this action.');
    }
};

// Function to configure authentication and user routes
export const configureAuthRoutes = (passport: PassportStatic, router: Router): Router => {

    // POST /api/auth/register - Register a new user
    router.post('/register', (req: Request, res: Response) => {
        const { email, password, role } = req.body;

        if (!email || !password) {
            return res.status(400).send('Email and password are required.');
        }

        // Prevent direct registration as admin or influencer unless allowed by specific logic
        const userRole: IUser['role'] = (role === 'influencer' || role === 'admin') ? role : 'user';

        const newUser = new User({
            email: email,
            password: password,
            role: userRole
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
                if (error.code === 11000) {
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
                return res.status(500).send('Internal server error.');
            }
            if (!user) {
                return res.status(401).send(info.message);
            }
            req.login(user, (err) => {
                if (err) {
                    return res.status(500).send('Error logging in.');
                }

                // Explicitly save the session after login
                req.session.save((saveErr) => {
                    if (saveErr) {
                        return res.status(500).send('Error saving session.');
                    }
                    res.status(200).send({
                        _id: user._id,
                        email: user.email,
                        role: user.role
                    });
                });
            });
        })(req, res, next);
    });

    // POST /api/auth/logout - Log out the current user
    router.post('/logout', (req: Request, res: Response) => {
        if (req.isAuthenticated()) {
            req.logout((error) => {
                if (error) {
                    console.error('Error during logout:', error);
                    return res.status(500).send('Error logging out.');
                }
                res.status(200).send('Successfully logged out.');
            });
        } else {
            res.status(401).send('User is not logged in.');
        }
    });

    // GET /api/auth/profile - Get the profile of the currently logged-in user
    router.get('/profile', passport.authenticate('session'), (req: Request, res: Response) => {
        const user = req.user as IUser;
        res.status(200).send({
            _id: user._id,
            email: user.email,
            role: user.role
        });
    });

    // PUT /api/auth/profile - Update the profile of the currently logged-in user
    router.put('/profile', passport.authenticate('session'), (req: Request, res: Response) => {
        const user = req.user as IUser;
        const updates = req.body;

        delete updates.role;
        delete updates.password;
        delete updates._id;

        User.findByIdAndUpdate(user._id, { $set: updates }, { new: true, runValidators: true })
            .then(updatedUser => {
                if (!updatedUser) {
                    return res.status(404).send('User not found.');
                }
                 res.status(200).send({
                    _id: updatedUser._id,
                    email: updatedUser.email,
                    role: updatedUser.role
                });
            })
            .catch(error => {
                console.error('Error updating user profile:', error);
                if (error.name === 'ValidationError') {
                    return res.status(400).send(error.message);
                }
                res.status(500).send('Error updating user profile.');
            });
    });

    // --- Admin User Management Routes ---
    // These routes require the user to be authenticated AND have the 'admin' role

    // GET /api/auth/admin/users - Get a list of all users (Admin only)
    router.get('/admin/users', passport.authenticate('session'), isAdmin, (req: Request, res: Response) => {
        User.find({})
            .select('-password') // Exclude passwords from the result
            .then((users: IUser[]) => {
                res.status(200).send(users);
            })
            .catch(error => {
                console.error('Error fetching all users (admin):', error);
                res.status(500).send('Error fetching users.');
            });
    });

    // GET /api/auth/admin/users/:userId - Get a specific user by ID (Admin only)
    router.get('/admin/users/:userId', passport.authenticate('session'), isAdmin, (req: Request, res: Response) => {
        const userId = req.params.userId;

        User.findById(userId)
            .select('-password') // Exclude password
            .then((user: IUser | null) => {
                if (!user) {
                    return res.status(404).send('User not found.');
                }
                res.status(200).send(user);
            })
            .catch(error => {
                console.error('Error fetching user by ID (admin):', error);
                 if (error.kind === 'ObjectId') {
                    return res.status(400).send('Invalid User ID format.');
                }
                res.status(500).send('Error fetching user.');
            });
    });

    // PUT /api/auth/admin/users/:userId - Update a user's role (Admin only)
    router.put('/admin/users/:userId', passport.authenticate('session'), isAdmin, (req: Request, res: Response) => {
        const userId = req.params.userId;
        const { role } = req.body;

        if (!role || !['user', 'influencer', 'admin'].includes(role)) {
             return res.status(400).send('Invalid role provided. Must be "user", "influencer", or "admin".');
        }

        User.findByIdAndUpdate(userId, { $set: { role: role } }, { new: true, runValidators: true })
            .select('-password') // Exclude password from the result
            .then((updatedUser: IUser | null) => {
                if (!updatedUser) {
                    return res.status(404).send('User not found.');
                }
                res.status(200).send(updatedUser);
            })
            .catch(error => {
                console.error('Error updating user role (admin):', error);
                 if (error.kind === 'ObjectId') {
                    return res.status(400).send('Invalid User ID format.');
                }
                res.status(500).send('Error updating user role.');
            });
    });

    // DELETE /api/auth/admin/users/:userId - Delete a user account (Admin only)
    router.delete('/admin/users/:userId', passport.authenticate('session'), isAdmin, (req: Request, res: Response) => {
        const userIdToDelete = req.params.userId;
        const adminUser = req.user as IUser;

        if (userIdToDelete === (adminUser._id as mongoose.Types.ObjectId).toString()) {
             return res.status(400).send('Admins cannot delete their own account through this endpoint.');
        }

        User.findByIdAndDelete(userIdToDelete)
            .then((deletedUser: IUser | null) => {
                if (!deletedUser) {
                    return Promise.reject({ status: 404, message: 'User not found.' });
                }

                console.log(`User deleted: ${deletedUser.email}`);

                return Post.find({ user: userIdToDelete })
                    .then((posts: IPost[]) => {
                        const deletePostPromises = posts.map(post => {
                            if (post.mediaUrl) {
                                fs.unlink(post.mediaUrl, (err) => {
                                    if (err) {
                                        console.error(`Error deleting media file for post ${post._id}:`, err);
                                    } else {
                                        console.log(`Deleted media file: ${post.mediaUrl}`);
                                    }
                                });
                            }
                            return Comment.deleteMany({ post: post._id });
                        });
                        return Promise.all(deletePostPromises);
                    })
                    .then(() => {
                        return Post.deleteMany({ user: userIdToDelete });
                    })
                    .then(() => {
                        console.log(`Deleted posts for user: ${userIdToDelete}`);
                        return Comment.deleteMany({ user: userIdToDelete });
                    })
                    .then(() => {
                         console.log(`Deleted comments made by user: ${userIdToDelete}`);
                        return Follower.deleteMany({
                            $or: [
                                { follower: userIdToDelete },
                                { following: userIdToDelete }
                            ]
                        });
                    })
                     .then(() => {
                         console.log(`Deleted follower relationships for user: ${userIdToDelete}`);
                         res.status(200).send('User and associated content deleted successfully.');
                     });
            })
            .catch(error => {
                console.error('Error deleting user (admin):', error);
                // Handle custom rejected promises
                 if (error.status && error.message) {
                    return res.status(error.status).send(error.message);
                 }
                 if (error.kind === 'ObjectId') {
                    return res.status(400).send('Invalid User ID format.');
                 }
                res.status(500).send('Error deleting user.');
            });
    });


    return router;
};
