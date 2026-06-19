import mongoose from 'mongoose';

const posterGenerationSchema = new mongoose.Schema(
  {
    slug:           { type: String, required: true, index: true },
    bgRemoved:      { type: Boolean, default: false },
    downloaded:     { type: Boolean, default: false },
    userAgent:      { type: String, default: '' },
    // Cloudinary storage (set after poster is saved to cloud)
    cloudinaryUrl:  { type: String, default: null },
    cloudinaryId:   { type: String, default: null },
    thumbnailUrl:   { type: String, default: null },
    // Privacy-first: NO raw photo data is ever stored here
  },
  { timestamps: true } // createdAt = generation timestamp
);

// Compound index for fast stats queries
posterGenerationSchema.index({ slug: 1, createdAt: -1 });

export default mongoose.model('PosterGeneration', posterGenerationSchema);
