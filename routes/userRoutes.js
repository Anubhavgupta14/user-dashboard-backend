const express = require('express');
const {createUser,deleteUser,getUserById,getUsers,updateUser,validateUserCreation} = require('../controllers/userController');
const { upload } = require('../config/cloudinaryConfig');
const router = express.Router();

router.post('/', upload.array('images', 10), validateUserCreation, createUser);
router.get('/', getUsers);
router.get('/:id', getUserById);
router.put('/:id', upload.array('images', 10), validateUserCreation, updateUser);
router.delete('/:id', deleteUser);

module.exports = router;