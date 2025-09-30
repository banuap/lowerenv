import { Schema, model, Document } from 'mongoose';

// Interface to represent a user document
export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
}

// Schema corresponding to the document interface.
const userSchema = new Schema<IUser>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    select: false // Do not return password by default
  }
}, {
  timestamps: true // Adds createdAt and updatedAt timestamps
});

// Model.
export const UserModel = model<IUser>('User', userSchema);
