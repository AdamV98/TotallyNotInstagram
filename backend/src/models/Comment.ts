import mongoose, { Document, Model, Schema } from 'mongoose';

interface IComment extends Document {
    user: mongoose.Types.ObjectId;
    post: mongoose.Types.ObjectId;
    text: string;
    createdAt: Date;
}

const CommentSchema: Schema<IComment> = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        required: true
    },
    text: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export const Comment: Model<IComment> = mongoose.model<IComment>('Comment', CommentSchema);
