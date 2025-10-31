const express = require('express');
const router = express.Router();
const {
  getAllCollections,
  getCollection,
  createCollection,
  updateCollection,
  deleteCollection,
  assignCollector,
} = require('../controllers/collectionController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router
  .route('/')
  .get(getAllCollections)
  .post(authorize('resident', 'admin'), createCollection);

router
  .route('/:id')
  .get(getCollection)
  .put(updateCollection)
  .delete(deleteCollection);

router
  .route('/:id/assign')
  .put(authorize('admin', 'collector'), assignCollector);

module.exports = router;