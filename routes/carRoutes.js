const express = require('express');
const {
  createCar, getCars, getCarById, updateCar, deleteCar,
} = require('../controllers/carController');
const { upload } = require('../config/cloudinaryConfig');
const { authMiddleware } = require('../middleware/authMiddleware');
const router = express.Router();

router.use(authMiddleware);
router.post('/', upload.array('images', 10), createCar);
router.get('/', getCars);
router.get('/:id', getCarById);
router.put('/:id', upload.array('images', 10), updateCar);
router.delete('/:id', deleteCar);

module.exports = router;