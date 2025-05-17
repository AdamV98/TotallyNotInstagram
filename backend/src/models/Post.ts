import mongoose, { Document, Model, Schema } from 'mongoose';

interface IPost extends Document {
    user: mongoose.Types.ObjectId;
    mediaUrl: string;
    mediaType: 'image' | 'video';
    caption?: string;
    likes: mongoose.Types.ObjectId[]; // Array of User IDs who liked the post
    comments: mongoose.Types.ObjectId[]; // Array of Comment IDs associated with the post
    createdAt: Date;
    status: 'pending' | 'approved' | 'rejected'; // Moderation status
}

// Define the Post schema
const PostSchema: Schema<IPost> = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    mediaUrl: {
        type: String,
        required: true
    },
    mediaType: {
        type: String,
        enum: ['image', 'video'],
        required: true
    },
    caption: {
        type: String,
        required: false
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    comments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    }
});

export const Post: Model<IPost> = mongoose.model<IPost>('Post', PostSchema);
