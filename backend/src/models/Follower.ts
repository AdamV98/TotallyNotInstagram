import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IFollower extends Document {
    follower: mongoose.Types.ObjectId;
    following: mongoose.Types.ObjectId;
    createdAt: Date;
}

const FollowerSchema: Schema<IFollower> = new mongoose.Schema({
    follower: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    following: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// prevent duplicate follow relationships
FollowerSchema.index({ follower: 1, following: 1 }, { unique: true });

export const Follower: Model<IFollower> = mongoose.model<IFollower>('Follower', FollowerSchema);
