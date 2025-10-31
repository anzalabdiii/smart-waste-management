const express = require('express');
const router = express.Router();
const {
  getAllReports,
  getReport,
  createReport,
  updateReport,
  deleteReport,
  getStats,
  exportReportsPDF,
  exportReportsExcel,
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// Export routes (must be before /:id routes)
router.get('/export/pdf', authorize('admin'), exportReportsPDF);
router.get('/export/excel', authorize('admin'), exportReportsExcel);

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