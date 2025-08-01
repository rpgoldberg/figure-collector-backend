import mongoose, { Document, Schema } from 'mongoose';

export interface IFigure extends Document {
  manufacturer: string;
  name: string;
  scale: string;
  mfcLink: string;
  location: string;
  boxNumber: string;
  imageUrl?: string;
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FigureSchema = new Schema<IFigure>(
  {
    manufacturer: { type: String, required: true, index: true },
    name: { type: String, required: true, index: true },
    scale: { type: String, required: true },
    mfcLink: { type: String, required: true },
    location: { type: String, required: false },
    boxNumber: { type: String, required: false },
    imageUrl: { type: String },
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
      index: true
    }
  },
  { timestamps: true }
);

// Create compound indexes for better query performance
FigureSchema.index({ manufacturer: 1, name: 1 });
FigureSchema.index({ location: 1, boxNumber: 1 });

export default mongoose.model<IFigure>('Figure', FigureSchema);
