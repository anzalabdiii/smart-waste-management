const Collection = require('../models/Collection');

// @desc    Get all collections
// @route   GET /api/collections
// @access  Private
exports.getAllCollections = async (req, res) => {
  try {
    const { status, zone, wasteType, priority } = req.query;

    // Build query based on user role
    let query = {};

    // Filter by role
    if (req.user.role === 'resident') {
      query.resident = req.user.id;
    } else if (req.user.role === 'collector') {
      // Show collector their assigned collections OR pending collections in their zone OR all pending if no zone
      const conditions = [
        { collector: req.user.id },
      ];

      if (req.user.zone) {
        // If collector has a zone, show pending collections in that zone
        conditions.push({ zone: req.user.zone, status: 'pending' });
      } else {
        // If collector has no zone, show all pending collections
        conditions.push({ status: 'pending' });
      }

      query.$or = conditions;
    }

    // Apply additional filters
    if (status) query.status = status;
    if (zone && req.user.role === 'admin') query.zone = zone;
    if (wasteType) query.wasteType = wasteType;
    if (priority) query.priority = priority;

    const collections = await Collection.find(query)
      .populate('resident', 'name email phone address')
      .populate('collector', 'name email phone')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: collections.length,
      collections,
    });
  } catch (error) {
    console.error('Get all collections error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get single collection
// @route   GET /api/collections/:id
// @access  Private
exports.getCollection = async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id)
      .populate('resident', 'name email phone address')
      .populate('collector', 'name email phone');

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found',
      });
    }

    // Check authorization
    if (
      req.user.role === 'resident' &&
      collection.resident._id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this collection',
      });
    }

    if (
      req.user.role === 'collector' &&
      collection.collector &&
      collection.collector._id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this collection',
      });
    }

    res.status(200).json({
      success: true,
      collection,
    });
  } catch (error) {
    console.error('Get collection error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Create new collection request
// @route   POST /api/collections
// @access  Private/Resident
exports.createCollection = async (req, res) => {
  try {
    const {
      address,
      zone,
      wasteType,
      priority,
      scheduledDate,
      description,
    } = req.body;

    // Validate required fields
    if (!address || !address.street || !address.city) {
      return res.status(400).json({
        success: false,
        message: 'Please provide complete address',
      });
    }

    if (!zone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide zone',
      });
    }

    const collection = await Collection.create({
      resident: req.user.id,
      address,
      zone,
      wasteType: wasteType || 'general',
      priority: priority || 'medium',
      scheduledDate,
      description,
      status: 'pending',
    });

    const populatedCollection = await Collection.findById(collection._id)
      .populate('resident', 'name email phone address');

    res.status(201).json({
      success: true,
      message: 'Collection request created successfully',
      collection: populatedCollection,
    });
  } catch (error) {
    console.error('Create collection error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Update collection
// @route   PUT /api/collections/:id
// @access  Private
exports.updateCollection = async (req, res) => {
  try {
    let collection = await Collection.findById(req.params.id);

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found',
      });
    }

    // Authorization checks
    if (req.user.role === 'resident') {
      if (collection.resident.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this collection',
        });
      }
      // Residents can only update if status is pending
      if (collection.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Cannot update collection once it has been assigned',
        });
      }
    }

    const {
      collector,
      status,
      scheduledDate,
      completedDate,
      description,
      notes,
    } = req.body;

    // Prepare update fields
    const updateFields = {};
    
    if (req.user.role === 'admin' || req.user.role === 'collector') {
      if (collector !== undefined) updateFields.collector = collector;
      if (status !== undefined) {
        updateFields.status = status;
        if (status === 'completed') {
          updateFields.completedDate = completedDate || new Date();
        }
      }
      if (scheduledDate !== undefined) updateFields.scheduledDate = scheduledDate;
      if (notes !== undefined) updateFields.notes = notes;
    }

    if (description !== undefined) updateFields.description = description;

    collection = await Collection.findByIdAndUpdate(
      req.params.id,
      updateFields,
      {
        new: true,
        runValidators: true,
      }
    )
      .populate('resident', 'name email phone address')
      .populate('collector', 'name email phone');

    res.status(200).json({
      success: true,
      message: 'Collection updated successfully',
      collection,
    });
  } catch (error) {
    console.error('Update collection error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Delete collection
// @route   DELETE /api/collections/:id
// @access  Private
exports.deleteCollection = async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found',
      });
    }

    // Only admin or the resident who created can delete
    if (
      req.user.role !== 'admin' &&
      collection.resident.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this collection',
      });
    }

    await collection.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Collection deleted successfully',
    });
  } catch (error) {
    console.error('Delete collection error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Assign collector to collection
// @route   PUT /api/collections/:id/assign
// @access  Private/Admin, Collector
exports.assignCollector = async (req, res) => {
  try {
    const { collectorId } = req.body;

    let collection = await Collection.findById(req.params.id);

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found',
      });
    }

    const assignedCollectorId = req.user.role === 'collector' 
      ? req.user.id 
      : collectorId;

    if (!assignedCollectorId) {
      return res.status(400).json({
        success: false,
        message: 'Collector ID is required',
      });
    }

    collection = await Collection.findByIdAndUpdate(
      req.params.id,
      {
        collector: assignedCollectorId,
        status: 'assigned',
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate('resident', 'name email phone address')
      .populate('collector', 'name email phone');

    res.status(200).json({
      success: true,
      message: 'Collector assigned successfully',
      collection,
    });
  } catch (error) {
    console.error('Assign collector error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};