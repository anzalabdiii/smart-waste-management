const Report = require('../models/Report');
const Collection = require('../models/Collection');
const User = require('../models/user.js');
const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');

// @desc    Get all reports
// @route   GET /api/reports
// @access  Private
exports.getAllReports = async (req, res) => {
  try {
    const { status, type, priority, zone } = req.query;

    // Build query
    let query = {};

    // Filter by role
    if (req.user.role === 'resident') {
      query.reportedBy = req.user.id;
    } else if (req.user.role === 'collector') {
      query.$or = [
        { reportedBy: req.user.id },
        { zone: req.user.zone },
      ];
    }

    // Apply additional filters
    if (status) query.status = status;
    if (type) query.type = type;
    if (priority) query.priority = priority;
    if (zone && req.user.role === 'admin') query.zone = zone;

    const reports = await Report.find(query)
      .populate('reportedBy', 'name email phone')
      .populate('resolvedBy', 'name email')
      .populate('collection')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: reports.length,
      reports,
    });
  } catch (error) {
    console.error('Get all reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get single report
// @route   GET /api/reports/:id
// @access  Private
exports.getReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('reportedBy', 'name email phone')
      .populate('resolvedBy', 'name email')
      .populate('collection');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    // Check authorization
    if (
      req.user.role === 'resident' &&
      report.reportedBy._id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this report',
      });
    }

    res.status(200).json({
      success: true,
      report,
    });
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Create new report
// @route   POST /api/reports
// @access  Private
exports.createReport = async (req, res) => {
  try {
    const {
      type,
      title,
      description,
      location,
      zone,
      priority,
      collectionId,
    } = req.body;

    // Validate required fields
    if (!type || !title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Please provide type, title, and description',
      });
    }

    const reportData = {
      reportedBy: req.user.id,
      type,
      title,
      description,
      location,
      zone: zone || req.user.zone,
      priority: priority || 'medium',
      status: 'open',
    };

    if (collectionId) {
      reportData.collection = collectionId;
    }

    const report = await Report.create(reportData);

    const populatedReport = await Report.findById(report._id)
      .populate('reportedBy', 'name email phone')
      .populate('collection');

    res.status(201).json({
      success: true,
      message: 'Report created successfully',
      report: populatedReport,
    });
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Update report
// @route   PUT /api/reports/:id
// @access  Private
exports.updateReport = async (req, res) => {
  try {
    let report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    // Authorization checks
    if (
      req.user.role === 'resident' &&
      report.reportedBy.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this report',
      });
    }

    const { status, priority, resolution } = req.body;

    const updateFields = {};

    // Admin and collectors can update status and priority
    if (req.user.role === 'admin' || req.user.role === 'collector') {
      if (status !== undefined) {
        updateFields.status = status;
        if (status === 'resolved' || status === 'closed') {
          updateFields.resolvedBy = req.user.id;
          updateFields.resolvedDate = new Date();
        }
      }
      if (priority !== undefined) updateFields.priority = priority;
      if (resolution !== undefined) updateFields.resolution = resolution;
    }

    report = await Report.findByIdAndUpdate(req.params.id, updateFields, {
      new: true,
      runValidators: true,
    })
      .populate('reportedBy', 'name email phone')
      .populate('resolvedBy', 'name email')
      .populate('collection');

    res.status(200).json({
      success: true,
      message: 'Report updated successfully',
      report,
    });
  } catch (error) {
    console.error('Update report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Delete report
// @route   DELETE /api/reports/:id
// @access  Private/Admin
exports.deleteReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    await report.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Report deleted successfully',
    });
  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get system statistics
// @route   GET /api/reports/stats
// @access  Private/Admin
exports.getStats = async (req, res) => {
  try {
    // Get total counts
    const totalUsers = await User.countDocuments();
    const totalCollectors = await User.countDocuments({ role: 'collector' });
    const totalResidents = await User.countDocuments({ role: 'resident' });

    const totalCollections = await Collection.countDocuments();
    const pendingCollections = await Collection.countDocuments({ status: 'pending' });
    const completedCollections = await Collection.countDocuments({ status: 'completed' });
    const inProgressCollections = await Collection.countDocuments({ status: 'in-progress' });

    const totalReports = await Report.countDocuments();
    const openReports = await Report.countDocuments({ status: 'open' });
    const resolvedReports = await Report.countDocuments({ status: 'resolved' });

    // Get collections by waste type
    const collectionsByType = await Collection.aggregate([
      {
        $group: {
          _id: '$wasteType',
          count: { $sum: 1 },
        },
      },
    ]);

    // Get collections by zone
    const collectionsByZone = await Collection.aggregate([
      {
        $group: {
          _id: '$zone',
          count: { $sum: 1 },
        },
      },
    ]);

    // Get reports by type
    const reportsByType = await Report.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
        },
      },
    ]);

    // Get recent collections
    const recentCollections = await Collection.find()
      .limit(5)
      .sort('-createdAt')
      .populate('resident', 'name')
      .populate('collector', 'name');

    res.status(200).json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          collectors: totalCollectors,
          residents: totalResidents,
        },
        collections: {
          total: totalCollections,
          pending: pendingCollections,
          inProgress: inProgressCollections,
          completed: completedCollections,
          byType: collectionsByType,
          byZone: collectionsByZone,
        },
        reports: {
          total: totalReports,
          open: openReports,
          resolved: resolvedReports,
          byType: reportsByType,
        },
        recentCollections,
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Export reports to PDF
// @route   GET /api/reports/export/pdf
// @access  Private/Admin
exports.exportReportsPDF = async (req, res) => {
  try {
    const reports = await Report.find()
      .populate('reportedBy', 'name email phone')
      .sort('-createdAt');

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=reports-report.pdf');

    doc.pipe(res);

    // Title
    doc.fontSize(20).text('Waste Management Reports', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(2);

    // Summary
    doc.fontSize(14).text('Summary', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    doc.text(`Total Reports: ${reports.length}`);
    doc.text(`Open: ${reports.filter(r => r.status === 'open').length}`);
    doc.text(`In Progress: ${reports.filter(r => r.status === 'in-progress').length}`);
    doc.text(`Resolved: ${reports.filter(r => r.status === 'resolved').length}`);
    doc.text(`Closed: ${reports.filter(r => r.status === 'closed').length}`);
    doc.moveDown(2);

    // Reports Details
    doc.fontSize(14).text('Reports Details', { underline: true });
    doc.moveDown();

    reports.forEach((report, index) => {
      if (doc.y > 700) {
        doc.addPage();
      }

      doc.fontSize(12).text(`${index + 1}. Report #${report._id.toString().slice(-6)}`, { bold: true });
      doc.fontSize(10);
      doc.text(`Type: ${report.type}`);
      doc.text(`Title: ${report.title}`);
      doc.text(`Status: ${report.status}`);
      doc.text(`Priority: ${report.priority}`);
      doc.text(`Reporter: ${report.reportedBy?.name || 'N/A'} (${report.reportedBy?.email || 'N/A'})`);
      doc.text(`Location: ${report.location.street}, ${report.location.city}`);
      doc.text(`Zone: ${report.zone || 'N/A'}`);
      doc.text(`Description: ${report.description || 'N/A'}`);
      doc.text(`Created: ${new Date(report.createdAt).toLocaleDateString()}`);
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

// @desc    Export reports to Excel
// @route   GET /api/reports/export/excel
// @access  Private/Admin
exports.exportReportsExcel = async (req, res) => {
  try {
    const reports = await Report.find()
      .populate('reportedBy', 'name email phone')
      .sort('-createdAt');

    // Prepare data for Excel
    const excelData = reports.map((report, index) => ({
      'No.': index + 1,
      'Report ID': report._id.toString().slice(-8),
      'Type': report.type,
      'Title': report.title,
      'Status': report.status,
      'Priority': report.priority,
      'Reporter Name': report.reportedBy?.name || 'N/A',
      'Reporter Email': report.reportedBy?.email || 'N/A',
      'Reporter Phone': report.reportedBy?.phone || 'N/A',
      'Street': report.location.street,
      'City': report.location.city,
      'Zone': report.zone || 'N/A',
      'Description': report.description || 'N/A',
      'Created Date': new Date(report.createdAt).toLocaleDateString(),
      'Last Updated': new Date(report.updatedAt).toLocaleDateString(),
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    ws['!cols'] = [
      { wch: 5 },  // No
      { wch: 15 }, // Report ID
      { wch: 20 }, // Type
      { wch: 30 }, // Title
      { wch: 12 }, // Status
      { wch: 10 }, // Priority
      { wch: 20 }, // Reporter Name
      { wch: 25 }, // Reporter Email
      { wch: 15 }, // Reporter Phone
      { wch: 30 }, // Street
      { wch: 15 }, // City
      { wch: 15 }, // Zone
      { wch: 40 }, // Description
      { wch: 15 }, // Created Date
      { wch: 15 }, // Last Updated
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Reports');

    // Generate buffer
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=reports-report.xlsx');
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