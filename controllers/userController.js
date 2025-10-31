const User = require('../models/user.js');
const Collection = require('../models/Collection.js');
const Report = require('../models/Report.js');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
  try {
    const { role, zone, isActive } = req.query;

    // Build query
    let query = {};
    if (role) query.role = role;
    if (zone) query.zone = zone;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const users = await User.find(query).sort('-createdAt');

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res) => {
  try {
    const { name, email, role, phone, address, zone, isActive } = req.body;

    let user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Prepare update fields
    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (email !== undefined) updateFields.email = email;
    if (role !== undefined) updateFields.role = role;
    if (phone !== undefined) updateFields.phone = phone;
    if (address !== undefined) updateFields.address = address;
    if (zone !== undefined) updateFields.zone = zone;
    if (isActive !== undefined) updateFields.isActive = isActive;

    user = await User.findByIdAndUpdate(req.params.id, updateFields, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user,
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Don't allow deleting yourself
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account',
      });
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get collectors
// @route   GET /api/users/collectors
// @access  Private
exports.getCollectors = async (req, res) => {
  try {
    const { zone } = req.query;

    let query = { role: 'collector', isActive: true };
    if (zone) query.zone = zone;

    const collectors = await User.find(query).select('name email phone zone');

    res.status(200).json({
      success: true,
      count: collectors.length,
      collectors,
    });
  } catch (error) {
    console.error('Get collectors error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get admin statistics
// @route   GET /api/users/admin/statistics
// @access  Private/Admin
exports.getAdminStatistics = async (req, res) => {
  try {
    // Get user statistics
    const totalUsers = await User.countDocuments();
    const adminUsers = await User.countDocuments({ role: 'admin' });
    const collectorUsers = await User.countDocuments({ role: 'collector' });
    const residentUsers = await User.countDocuments({ role: 'resident' });

    // Get collection statistics
    const totalCollections = await Collection.countDocuments();
    const pendingCollections = await Collection.countDocuments({ status: 'pending' });
    const assignedCollections = await Collection.countDocuments({ status: 'assigned' });
    const inProgressCollections = await Collection.countDocuments({ status: 'in-progress' });
    const completedCollections = await Collection.countDocuments({ status: 'completed' });

    // Get report statistics
    const totalReports = await Report.countDocuments();
    const openReports = await Report.countDocuments({ status: 'open' });
    const inProgressReports = await Report.countDocuments({ status: 'in-progress' });
    const resolvedReports = await Report.countDocuments({ status: 'resolved' });
    const closedReports = await Report.countDocuments({ status: 'closed' });

    res.status(200).json({
      success: true,
      stats: {
        // User stats
        totalUsers,
        adminUsers,
        collectorUsers,
        residentUsers,

        // Collection stats
        totalCollections,
        pendingCollections,
        assignedCollections,
        inProgressCollections,
        completedCollections,

        // Report stats
        totalReports,
        openReports,
        inProgressReports,
        resolvedReports,
        closedReports,
      },
    });
  } catch (error) {
    console.error('Get admin statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};