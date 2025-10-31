const Collection = require('../models/Collection');
const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');

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

// @desc    Export collections to PDF
// @route   GET /api/collections/export/pdf
// @access  Private/Admin
exports.exportCollectionsPDF = async (req, res) => {
  try {
    const collections = await Collection.find()
      .populate('resident', 'name email phone')
      .populate('collector', 'name email')
      .sort('-createdAt');

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=collections-report.pdf');

    doc.pipe(res);

    // Title
    doc.fontSize(20).text('Waste Collections Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(2);

    // Summary
    doc.fontSize(14).text('Summary', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    doc.text(`Total Collections: ${collections.length}`);
    doc.text(`Pending: ${collections.filter(c => c.status === 'pending').length}`);
    doc.text(`Assigned: ${collections.filter(c => c.status === 'assigned').length}`);
    doc.text(`In Progress: ${collections.filter(c => c.status === 'in-progress').length}`);
    doc.text(`Completed: ${collections.filter(c => c.status === 'completed').length}`);
    doc.moveDown(2);

    // Collections Table
    doc.fontSize(14).text('Collections Details', { underline: true });
    doc.moveDown();

    collections.forEach((collection, index) => {
      if (doc.y > 700) {
        doc.addPage();
      }

      doc.fontSize(12).text(`${index + 1}. Collection #${collection._id.toString().slice(-6)}`, { bold: true });
      doc.fontSize(10);
      doc.text(`Type: ${collection.wasteType || 'General'}`);
      doc.text(`Status: ${collection.status}`);
      doc.text(`Resident: ${collection.resident?.name || 'N/A'} (${collection.resident?.email || 'N/A'})`);
      doc.text(`Collector: ${collection.collector?.name || 'Not Assigned'}`);
      doc.text(`Address: ${collection.address.street}, ${collection.address.city}`);
      doc.text(`Zone: ${collection.zone || 'N/A'}`);
      doc.text(`Scheduled Date: ${collection.scheduledDate ? new Date(collection.scheduledDate).toLocaleDateString() : 'Not Set'}`);
      doc.text(`Created: ${new Date(collection.createdAt).toLocaleDateString()}`);
      doc.moveDown();
    });

    doc.end();
  } catch (error) {
    console.error('Export PDF error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export PDF',
      error: error.message,
    });
  }
};

// @desc    Export collections to Excel
// @route   GET /api/collections/export/excel
// @access  Private/Admin
exports.exportCollectionsExcel = async (req, res) => {
  try {
    const collections = await Collection.find()
      .populate('resident', 'name email phone')
      .populate('collector', 'name email')
      .sort('-createdAt');

    // Prepare data for Excel
    const excelData = collections.map((collection, index) => ({
      'No.': index + 1,
      'Collection ID': collection._id.toString().slice(-8),
      'Waste Type': collection.wasteType || 'General',
      'Status': collection.status,
      'Resident Name': collection.resident?.name || 'N/A',
      'Resident Email': collection.resident?.email || 'N/A',
      'Resident Phone': collection.resident?.phone || 'N/A',
      'Collector': collection.collector?.name || 'Not Assigned',
      'Collector Email': collection.collector?.email || 'N/A',
      'Street': collection.address.street,
      'City': collection.address.city,
      'County': collection.address.state,
      'Zone': collection.zone || 'N/A',
      'Description': collection.description || 'N/A',
      'Scheduled Date': collection.scheduledDate ? new Date(collection.scheduledDate).toLocaleDateString() : 'Not Set',
      'Completed Date': collection.completedDate ? new Date(collection.completedDate).toLocaleDateString() : 'Not Completed',
      'Created Date': new Date(collection.createdAt).toLocaleDateString(),
      'Last Updated': new Date(collection.updatedAt).toLocaleDateString(),
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    ws['!cols'] = [
      { wch: 5 },  // No
      { wch: 15 }, // Collection ID
      { wch: 12 }, // Type
      { wch: 12 }, // Status
      { wch: 20 }, // Resident Name
      { wch: 25 }, // Resident Email
      { wch: 15 }, // Resident Phone
      { wch: 20 }, // Collector
      { wch: 25 }, // Collector Email
      { wch: 30 }, // Street
      { wch: 15 }, // City
      { wch: 15 }, // County
      { wch: 15 }, // Zone
      { wch: 30 }, // Waste Description
      { wch: 15 }, // Preferred Date
      { wch: 15 }, // Created Date
      { wch: 15 }, // Last Updated
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Collections');

    // Generate buffer
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=collections-report.xlsx');
    res.send(excelBuffer);
  } catch (error) {
    console.error('Export Excel error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export Excel',
      error: error.message,
    });
  }
};