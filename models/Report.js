const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    collection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Collection',
    },
    type: {
      type: String,
      enum: ['full-bin', 'missed-collection', 'damaged-bin', 'illegal-dumping', 'other'],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      street: String,
      city: String,
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
    },
    zone: {
      type: String,
    },
    status: {
      type: String,
      enum: ['open', 'in-progress', 'resolved', 'closed'],
      default: 'open',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    images: [
      {
        type: String,
      },
    ],
    resolution: {
      type: String,
      trim: true,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    resolvedDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
reportSchema.index({ status: 1, priority: 1 });
reportSchema.index({ reportedBy: 1 });
reportSchema.index({ zone: 1 });

module.exports = mongoose.model('Report', reportSchema);