import { Router, Request, Response, NextFunction } from 'express';
import { PassportStatic } from 'passport';
import { Post, IPost } from '../models/Post';
import { Comment, IComment } from '../models/Comment';
import { Follower, IFollower } from '../models/Follower';
import { IUser } from '../models/User';
import multer from 'multer';
import path from 'path';
import mongoose, { DeleteResult } from 'mongoose';
import fs from 'fs';

// Multer Configuration for File Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

const isAdmin = (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as IUser;
    if (user && user.role === 'admin') {
        next();
    } else {
        res.status(403).send('Forbidden: Only admins can perform this action.');
    }
};

// Content-Related Routes
export const configureContentRoutes = (passport: PassportStatic, router: Router): Router => {

    // --- Public Route for Shared Posts (DOES NOT REQUIRE AUTHENTICATION) ---

    // GET /api/content/shared/:postId - Get a specific approved post by ID (Public)
    router.get('/shared/:postId', (req: Request, res: Response) => {
        const postId = req.params.postId;

        Post.findById(postId)
            .populate('user', 'email role')
            .populate({
                path: 'comments',
                populate: {
                    path: 'user',
                    select: 'email role'
                }
            })
            .then((post: IPost | null) => {
                if (!post || post.status !== 'approved') {
                    return res.status(404).send('Post not found or not available for sharing.');
                }

                res.status(200).send(post);
            })
            .catch(error => {
                console.error('Error fetching shared post:', error);
                if (error.kind === 'ObjectId') {
                    return res.status(400).send('Invalid Post ID format.');
                }
                res.status(500).send('Error fetching shared post.');
            });
    });


    // --- Authenticated Routes (REQUIRE AUTHENTICATION) ---
    // All routes below this middleware require a valid session cookie
    router.use(passport.authenticate('session'));


    // POST /api/content/upload - Upload a new image or video (Create Post)
    router.post('/upload', upload.single('media'), (req: Request, res: Response) => {
        const user = req.user as IUser;
        if (!user || !user._id) {
             return res.status(401).send('User not authenticated.');
        }
        const userId: mongoose.Types.ObjectId = new mongoose.Types.ObjectId(user._id as any);
        const caption = req.body.caption;
        const file = req.file;

        if (!file) {
            return res.status(400).send('No file uploaded.');
        }

        let mediaType: 'image' | 'video';
        if (file.mimetype.startsWith('image/')) {
            mediaType = 'image';
        } else if (file.mimetype.startsWith('video/')) {
            mediaType = 'video';
        } else {
            fs.unlink(file.path, (err) => {
                if (err) {
                    console.error('Error deleting unsupported file:', err);
                }
            });
            return res.status(400).send('Unsupported file type.');
        }

        const newPost = new Post({
            user: userId,
            mediaUrl: file.path,
            mediaType: mediaType,
            caption: caption,
            likes: [],
            comments: [],
            shareCount: 0,
            status: 'pending'
        });

        newPost.save()
            .then(post => {
                res.status(201).send(post);
            })
            .catch(error => {
                console.error('Error uploading post:', error);
                if (file && file.path) {
                     fs.unlink(file.path, (err) => {
                        if (err) {
                            console.error('Error deleting file after DB save failure:', err);
                        }
                    });
                }
                res.status(500).send('Error uploading post.');
            });
    });

    // GET /api/content - Get all approved posts (Read Posts - all)
    router.get('/', (req: Request, res: Response) => {
        Post.find({ status: 'approved' })
            .populate('user', 'email role')
            .populate('comments')
            .sort({ createdAt: -1 })
            .then((posts: IPost[]) => {
                res.status(200).send(posts);
            })
            .catch(error => {
                console.error('Error fetching posts:', error);
                res.status(500).send('Error fetching posts.');
            });
    });

    // GET /api/content/pending-moderation - Get posts pending moderation (Admin only)
    router.get('/pending-moderation', isAdmin, (req: Request, res: Response) => {
        Post.find({ status: 'pending' })
            .populate('user', 'email role')
            .sort({ createdAt: 1 })
            .then((posts: IPost[]) => {
                res.status(200).send(posts);
            })
            .catch(error => {
                console.error('Error fetching pending moderation posts:', error);
                res.status(500).send('Error fetching pending moderation posts.');
            });
    });

     // GET /api/content/:postId - Get a specific post by ID (Read Post - single)
    router.get('/:postId', (req: Request, res: Response) => {
        const postId = req.params.postId;
        const user = req.user as IUser;
        if (!user || !user._id) {
             return res.status(401).send('User not authenticated.');
        }
        const userId: mongoose.Types.ObjectId = new mongoose.Types.ObjectId(user._id as any);

        Post.findById(postId)
            .populate('user', 'email role')
            .populate({
                path: 'comments',
                populate: {
                    path: 'user',
                    select: 'email role'
                }
            })
            .then((post: IPost | null) => {
                if (!post) {
                    return Promise.reject({ status: 404, message: 'Post not found.' });
                }

                if (post.status !== 'approved' && user.role !== 'admin' && post.user.toString() !== userId.toString()) {
                    return Promise.reject({ status: 403, message: 'Forbidden: You do not have access to this post.' });
                }

                return post;
            })
            .then((post: IPost) => {
                 res.status(200).send(post);
            })
            .catch(error => {
                console.error('Error fetching post:', error);
                if (error.status && error.message) {
                    return res.status(error.status).send(error.message);
                }
                if (error.kind === 'ObjectId') {
                    return res.status(400).send('Invalid Post ID format.');
                }
                res.status(500).send('Error fetching post.');
            });
    });

    // PUT /api/content/:postId - Update a post (Update Post)
    router.put('/:postId', (req: Request, res: Response) => {
        const postId = req.params.postId;
        const user = req.user as IUser;
        if (!user || !user._id) {
             return res.status(401).send('User not authenticated.');
        }
        const userId: mongoose.Types.ObjectId = new mongoose.Types.ObjectId(user._id as any);
        const updates = req.body;

        delete updates.user;
        delete updates.likes;
        delete updates.comments;
        delete updates.createdAt;
        delete updates.status;
        delete updates.shareCount;

        Post.findById(postId)
            .then((post: IPost | null) => {
                if (!post) {
                    return Promise.reject({ status: 404, message: 'Post not found.' });
                }

                if (post.user.toString() !== userId.toString() && user.role !== 'admin') {
                    return Promise.reject({ status: 403, message: 'Forbidden: You can only update your own posts.' });
                }

                Object.assign(post, updates);

                return post.save();
            })
            .then((updatedPost: IPost) => {
                 res.status(200).send(updatedPost);
            })
            .catch(error => {
                console.error('Error updating post:', error);
                 if (error.status && error.message) {
                    return res.status(error.status).send(error.message);
                }
                if (error.kind === 'ObjectId') {
                    return res.status(400).send('Invalid Post ID format.');
                }
                res.status(500).send('Error updating post.');
            });
    });

    // DELETE /api/content/:postId - Delete a post (Delete Post)
    router.delete('/:postId', (req: Request, res: Response) => {
        const postId = req.params.postId;
        const user = req.user as IUser;
        if (!user || !user._id) {
             return res.status(401).send('User not authenticated.');
        }
        const userId: mongoose.Types.ObjectId = new mongoose.Types.ObjectId(user._id as any);


        Post.findById(postId)
            .then((post: IPost | null) => {
                if (!post) {
                    return Promise.reject({ status: 404, message: 'Post not found.' });
                }

                if (post.user.toString() !== userId.toString() && user.role !== 'admin') {
                    return Promise.reject({ status: 403, message: 'Forbidden: You can only delete your own posts.' });
                }

                if (post.mediaUrl) {
                    fs.unlink(post.mediaUrl, (err) => {
                        if (err) {
                            console.error('Error deleting media file:', err);
                        } else {
                            console.log(`Deleted media file: ${post.mediaUrl}`);
                        }
                    });
                }
                return Comment.deleteMany({ post: postId })
                    .then(() => {
                        console.log(`Deleted comments for post: ${postId}`);
                        return post.deleteOne();
                    });
            })
            .then(() => {
                 res.status(200).send('Post and associated comments deleted successfully.');
            })
             .catch(error => {
                console.error('Error deleting post:', error);
                 if (error.status && error.message) {
                    return res.status(error.status).send(error.message);
                }
                if (error.kind === 'ObjectId') {
                    return res.status(400).send('Invalid Post ID format.');
                }
                res.status(500).send('Error deleting post.');
            });
    });

    // --- Comment Routes ---

    // Add a comment to a post (Create Comment)
    router.post('/:postId/comment', (req: Request, res: Response) => {
        const postId = req.params.postId;
        const user = req.user as IUser;
        if (!user || !user._id) {
             return res.status(401).send('User not authenticated.');
        }
        const userId: mongoose.Types.ObjectId = new mongoose.Types.ObjectId(user._id as any);
        const commentText = req.body.text;

        if (!commentText) {
            return res.status(400).send('Comment text is required.');
        }

        const newComment = new Comment({
            user: userId,
            post: postId,
            text: commentText
        });

        newComment.save()
            .then((comment: IComment) => {
                return Post.findByIdAndUpdate(
                    postId,
                    { $push: { comments: comment._id } },
                    { new: true }
                ).then(updatedPost => {
                     if (!updatedPost) {
                        console.error('Post not found after saving comment.');
                        return Promise.reject({ status: 404, message: 'Post not found after adding comment.' });
                    }
                    return comment;
                });
            })
             .then((comment: IComment) => {
                 return comment.populate('user', 'email role');
             })
             .then((populatedComment: IComment) => {
                 res.status(201).send(populatedComment);
             })
            .catch(error => {
                console.error('Error adding comment:', error);
                 if (error.status && error.message) {
                    return res.status(error.status).send(error.message);
                }
                if (error.kind === 'ObjectId') {
                    return res.status(400).send('Invalid Post ID format.');
                }
                res.status(500).send('Error adding comment.');
            });
    });

    // Update a comment (Update Comment)
    router.put('/comment/:commentId', (req: Request, res: Response) => {
        const commentId = req.params.commentId;
        const user = req.user as IUser;
        if (!user || !user._id) {
             return res.status(401).send('User not authenticated.');
        }
        const userId: mongoose.Types.ObjectId = new mongoose.Types.ObjectId(user._id as any);
        const newText = req.body.text;

        if (!newText) {
            return res.status(400).send('New comment text is required.');
        }

        Comment.findById(commentId)
            .then((comment: IComment | null) => {
                if (!comment) {
                    return Promise.reject({ status: 404, message: 'Comment not found.' });
                }

                if (comment.user.toString() !== userId.toString() && user.role !== 'admin') {
                    return Promise.reject({ status: 403, message: 'Forbidden: You can only update your own comments.' });
                }

                comment.text = newText;
                return comment.save();
            })
            .then((updatedComment: IComment) => {
                return updatedComment.populate('user', 'email role');
            })
            .then((populatedComment: IComment) => {
                 res.status(200).send(populatedComment);
            })
             .catch(error => {
                console.error('Error updating comment:', error);
                 if (error.status && error.message) {
                    return res.status(error.status).send(error.message);
                }
                if (error.kind === 'ObjectId') {
                    return res.status(400).send('Invalid Comment ID format.');
                }
                res.status(500).send('Error updating comment.');
            });
    });

    // DELETE /api/content/comment/:commentId - Delete a comment (Delete Comment)
    router.delete('/comment/:commentId', (req: Request, res: Response) => {
        const commentId = req.params.commentId;
        const user = req.user as IUser;
        if (!user || !user._id) {
             return res.status(401).send('User not authenticated.');
        }
        const userId: mongoose.Types.ObjectId = new mongoose.Types.ObjectId(user._id as any);

        let commentPostId: mongoose.Types.ObjectId | null = null;

        Comment.findById(commentId)
            .then((comment: IComment | null) => {
                if (!comment) {
                    return Promise.reject({ status: 404, message: 'Comment not found.' });
                }

                commentPostId = comment.post as mongoose.Types.ObjectId;

                return Post.findById(commentPostId).then((post: IPost | null) => {
                     if (!post) {
                         if (comment.user.toString() !== userId.toString() && user.role !== 'admin') {
                             return Promise.reject({ status: 403, message: 'Forbidden: You can only delete your own comments or comments on your posts (or as admin).' });
                         }
                     } else {
                         if (comment.user.toString() !== userId.toString() && post.user.toString() !== userId.toString() && user.role !== 'admin') {
                             return Promise.reject({ status: 403, message: 'Forbidden: You can only delete your own comments or comments on your posts (or as admin).' });
                         }
                     }
                     return comment.deleteOne();
                });
            })
            .then(() => {
                 if (commentPostId) {
                     return Post.findByIdAndUpdate(
                         commentPostId,
                         { $pull: { comments: commentId } },
                         { new: true }
                     ).exec().then(() => Promise.resolve());
                 }
                 return Promise.resolve();
            })
            .then(() => {
                 res.status(200).send('Comment deleted successfully.');
            })
            .catch(error => {
                console.error('Error deleting comment:', error);
                 if (error.status && error.message) {
                    return res.status(error.status).send(error.message);
                }
                 if (error.kind === 'ObjectId') {
                    return res.status(400).send('Invalid Comment ID format.');
                }
                res.status(500).send('Error deleting comment.');
            });
    });

    // --- Liking/Unliking Routes ---

    // Like a post
    router.post('/:postId/like', (req: Request, res: Response) => {
        const postId = req.params.postId;
        const user = req.user as IUser;
        if (!user || !user._id) {
             return res.status(401).send('User not authenticated.');
        }
        const userId: mongoose.Types.ObjectId = new mongoose.Types.ObjectId(user._id as any);


        Post.findByIdAndUpdate(
            postId,
            { $addToSet: { likes: userId } },
            { new: true }
        )
        .then((updatedPost: IPost | null) => {
            if (!updatedPost) {
                return Promise.reject({ status: 404, message: 'Post not found.' });
            }
            return updatedPost;
        })
        .then((updatedPost: IPost) => {
             res.status(200).send({
                _id: updatedPost._id,
                likes: updatedPost.likes.length
             });
        })
        .catch(error => {
            console.error('Error liking post:', error);
            if (error.status && error.message) {
                return res.status(error.status).send(error.message);
            }
            if (error.kind === 'ObjectId') {
                return res.status(400).send('Invalid Post ID format.');
            }
            res.status(500).send('Error liking post.');
        });
    });

    // Unlike a post
    router.delete('/:postId/unlike', (req: Request, res: Response) => {
        const postId = req.params.postId;
        const user = req.user as IUser;
        if (!user || !user._id) {
             return res.status(401).send('User not authenticated.');
        }
        const userId: mongoose.Types.ObjectId = new mongoose.Types.ObjectId(user._id as any);


        Post.findByIdAndUpdate(
            postId,
            { $pull: { likes: userId } },
            { new: true }
        )
        .then((updatedPost: IPost | null) => {
            if (!updatedPost) {
                return Promise.reject({ status: 404, message: 'Post not found.' });
            }
            return updatedPost;
        })
        .then((updatedPost: IPost) => {
             res.status(200).send({
                _id: updatedPost._id,
                likes: updatedPost.likes.length
             });
        })
        .catch(error => {
            console.error('Error unliking post:', error);
             if (error.status && error.message) {
                return res.status(error.status).send(error.message);
            }
            if (error.kind === 'ObjectId') {
                return res.status(400).send('Invalid Post ID format.');
            }
            res.status(500).send('Error unliking post.');
        });
    });

    // --- Following/Unfollowing Routes ---

    // Follow a user (Create Follower)
    router.post('/follow/:userIdToFollow', (req: Request, res: Response) => {
        const user = req.user as IUser;
        if (!user || !user._id) {
             return res.status(401).send('User not authenticated.');
        }
        const followerId: mongoose.Types.ObjectId = new mongoose.Types.ObjectId(user._id as any);
        const followingId = req.params.userIdToFollow;

        if (followerId.toString() === followingId) {
            return res.status(400).send('You cannot follow yourself.');
        }

        const newFollow = new Follower({
            follower: followerId,
            following: followingId
        });

        newFollow.save()
            .then((follow: IFollower) => {
                res.status(201).send(follow);
            })
            .catch(error => {
                console.error('Error following user:', error);
                if (error.code === 11000) {
                    return res.status(409).send('You are already following this user.');
                }
                if (error.kind === 'ObjectId') {
                    return res.status(400).send('Invalid User ID format.');
                }
                res.status(500).send('Error following user.');
            });
    });

    // Unfollow a user (Delete Follower)
     router.delete('/unfollow/:userIdToUnfollow', (req: Request, res: Response) => {
        const user = req.user as IUser;
        if (!user || !user._id) {
             return res.status(401).send('User not authenticated.');
        }
        const followerId: mongoose.Types.ObjectId = new mongoose.Types.ObjectId(user._id as any);
        const followingId = req.params.userIdToUnfollow;

        Follower.findOneAndDelete({ follower: followerId, following: followingId })
            .then((deletedFollow: IFollower | null) => {
                if (!deletedFollow) {
                    return res.status(404).send('You are not following this user.');
                }
                res.status(200).send('Successfully unfollowed user.');
            })
            .catch(error => {
                console.error('Error unfollowing user:', error);
                if (error.kind === 'ObjectId') {
                    return res.status(400).send('Invalid User ID format.');
                }
                res.status(500).send('Error unfollowing user.');
            });
    });

    // Get users who follow a specific user (Read Followers)
    router.get('/followers/:userId', (req: Request, res: Response) => {
        const userId = req.params.userId;

        Follower.find({ following: userId })
            .populate('follower', 'email role')
            .then((followers: IFollower[]) => {
                res.status(200).send(followers);
            })
            .catch(error => {
                console.error('Error fetching followers:', error);
                if (error.kind === 'ObjectId') {
                    return res.status(400).send('Invalid User ID format.');
                }
                res.status(500).send('Error fetching followers.');
            });
    });

    // Get users that a specific user is following (Read Following)
    router.get('/following/:userId', (req: Request, res: Response) => {
        const userId = req.params.userId;

        Follower.find({ follower: userId })
            .populate('following', 'email role')
            .then((following: IFollower[]) => {
                res.status(200).send(following);
            })
            .catch(error => {
                console.error('Error fetching following:', error);
                if (error.kind === 'ObjectId') {
                    return res.status(400).send('Invalid User ID format.');
                }
                res.status(500).send('Error fetching following.');
            });
    });

    // Moderate a post (Admin only)
    router.put('/:postId/moderate', isAdmin, (req: Request, res: Response) => {
        const postId = req.params.postId;
        const newStatus = req.body.status;

        if (!['approved', 'rejected'].includes(newStatus)) {
            return res.status(400).send('Invalid moderation status. Must be "approved" or "rejected".');
        }

        Post.findByIdAndUpdate(
            postId,
            { status: newStatus },
            { new: true }
        )
        .then((updatedPost: IPost | null) => {
            if (!updatedPost) {
                return res.status(404).send('Post not found.');
            }
            res.status(200).send(updatedPost);
        })
        .catch(error => {
            console.error('Error moderating post:', error);
            if (error.kind === 'ObjectId') {
                return res.status(400).send('Invalid Post ID format.');
            }
            res.status(500).send('Error moderating post.');
        });
    });

    // Get posts pending moderation (Admin only)
    router.get('/pending-moderation', isAdmin, (req: Request, res: Response) => {
        Post.find({ status: 'pending' })
            .populate('user', 'email role')
            .sort({ createdAt: 1 })
            .then((posts: IPost[]) => {
                res.status(200).send(posts);
            })
            .catch(error => {
                console.error('Error fetching pending moderation posts:', error);
                res.status(500).send('Error fetching pending moderation posts.');
            });
    });

    // GET /api/content/user/:userId - Get posts by a specific user (Read Posts - by user)
    router.get('/user/:userId', (req: Request, res: Response) => {
        const userId = req.params.userId;
        const loggedInUser = req.user as IUser;
        if (!loggedInUser || !loggedInUser._id) {
             return res.status(401).send('User not authenticated.');
        }


        Post.find({ user: userId })
             .populate('user', 'email role')
             .populate({
                path: 'comments',
                populate: {
                    path: 'user',
                    select: 'email role'
                }
            })
            .sort({ createdAt: -1 })
            .then((posts: IPost[]) => {
                const filteredPosts = posts.filter(post => {
                    if (loggedInUser.role === 'admin') {
                        return true;
                    }
                    return post.status === 'approved';
                });
                res.status(200).send(filteredPosts);
            })
            .catch(error => {
                console.error('Error fetching user posts:', error);
                if (error.kind === 'ObjectId') {
                    return res.status(400).send('Invalid User ID format.');
                }
                res.status(500).send('Error fetching user posts.');
            });
    });

    // POST /api/content/:postId/share - Increment share count for a post
    router.post('/:postId/share', (req: Request, res: Response) => {
        const postId = req.params.postId;
        const user = req.user as IUser; // Ensure user is authenticated
         if (!user || !user._id) {
             return res.status(401).send('User not authenticated.');
        }

        Post.findByIdAndUpdate(
            postId,
            { $inc: { shareCount: 1 } },
            { new: true }
        )
        .then((updatedPost: IPost | null) => {
            if (!updatedPost) {
                return res.status(404).send('Post not found.');
            }
            res.status(200).send({
                _id: updatedPost._id,
                shareCount: updatedPost.shareCount
            });
        })
        .catch(error => {
            console.error('Error sharing post:', error);
             if (error.kind === 'ObjectId') {
                return res.status(400).send('Invalid Post ID format.');
            }
            res.status(500).send('Error sharing post.');
        });
    });

    return router;
};
