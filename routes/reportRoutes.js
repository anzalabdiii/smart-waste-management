const express = require('express');
const router = express.Router();
const {
  getAllReports,
  getReport,
  createReport,
  updateReport,
  deleteReport,
  getStats,
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/stats', authorize('admin'), getStats);

router
  .route('/')
  .get(getAllReports)
  .post(createReport);

router
  .route('/:id')
  .get(getReport)
  .put(updateReport)
  .delete(authorize('admin'), deleteReport);

module.exports = router;