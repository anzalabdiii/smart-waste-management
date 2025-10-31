const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema(
  {
    resident: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    collector: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    address: {
      street: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      state: String,
      zipCode: String,
    },
    zone: {
      type: String,
      required: true,
    },
    wasteType: {
      type: String,
      enum: ['general', 'recyclable', 'organic', 'hazardous'],
      default: 'general',
    },
    status: {
      type: String,
      enum: ['pending', 'assigned', 'in-progress', 'completed', 'cancelled'],
      default: 'pending',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    scheduledDate: {
      type: Date,
    },
    completedDate: {
      type: Date,
    },
    description: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    images: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
collectionSchema.index({ status: 1, zone: 1 });
collectionSchema.index({ resident: 1 });
collectionSchema.index({ collector: 1 });

module.exports = mongoose.model('Collection', collectionSchema);