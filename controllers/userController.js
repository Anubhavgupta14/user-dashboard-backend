const { body, validationResult } = require('express-validator');
// Create a new user with images upload
const User = require("../models/User");
const cloudinary = require("cloudinary").v2;

const uploadBuffer = async (buffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: "auto" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );

    uploadStream.end(buffer);
  });
};

// Helper function to delete image from Cloudinary
const deleteCloudinaryImage = async (imageUrl) => {
  try {
    // Extract public_id from the URL
    const publicId = imageUrl.split("/").slice(-1)[0].split(".")[0];
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Error deleting image from Cloudinary:", error);
  }
};

//For Validation
exports.validateUserCreation = [
  // Name validation: Only alphabets and spaces, minimum 2 characters
  body('name')
    .trim()
    .matches(/^[A-Za-z\s]+$/)
    .withMessage('Name must contain only alphabets and spaces')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),

  // Phone validation: Only digits, exactly 10 digits
  body('phone')
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage('Phone number must be exactly 10 digits'),

  // Email validation: Must be a valid email format
  body('email')
    .trim()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
];

exports.createUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  try {
    const { name, phone, email } = req.body;
    let images = [];
    if (req.files) {
      try {
        if (Array.isArray(req.files)) {
          // Handle multiple files
          for (const file of req.files) {
            const imageUrl = await uploadBuffer(file.buffer);
            images.push(imageUrl);
          }
        } else if (req.files.images) {
          // Handle single file
          const files = Array.isArray(req.files.images)
            ? req.files.images
            : [req.files.images];

          for (const file of files) {
            const imageUrl = await uploadBuffer(file.buffer);
            images.push(imageUrl);
          }
        }
      } catch (uploadError) {
        console.error("Cloudinary upload error:", uploadError);
        return res.status(400).json({
          error: "Error uploading images to Cloudinary",
          details: uploadError.message,
        });
      }
    }

    // Create new car object with processed tags
    const user = new User({
      name,
      phone,
      email,
      images,
    });

    // Save user to database
    await user.save();

    // Return success response
    res.status(201).json({
      success: true,
      data: user,
      message: "User created successfully",
    });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({
      error: "Error creating user",
      details: err.message,
    });
  }
};

// Helper middleware for handling image uploads
exports.validateImages = (req, res, next) => {
  if (!req.files && !req.files?.images) {
    return next();
  }

  const files = Array.isArray(req.files.images)
    ? req.files.images
    : [req.files.images];

  // Validate each file
  for (const file of files) {
    // Check file size (e.g., 5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return res.status(400).json({
        error: "File too large",
        details: `${file.originalname} exceeds 5MB limit`,
      });
    }

    // Check file type
    if (!file.mimetype.startsWith("image/")) {
      return res.status(400).json({
        error: "Invalid file type",
        details: `${file.originalname} is not an image`,
      });
    }
  }

  next();
};

// Get all users
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get a specific car by ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    res.json({success:true, data:user});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a car's details and its images
exports.updateUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const userId = req.params.id;
    const { name, phone, email, keepImages } = req.body;
    let images = [];

    // Find existing car
    const existingUser = await User.findById(userId);

    if (!existingUser) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    // Handle keeping existing images
    const keepImagesList = keepImages ? keepImages.split(",") : [];
    if (keepImagesList.length > 0) {
      images = existingUser.images.filter((img) => keepImagesList.includes(img));
    }

    // Delete removed images from Cloudinary
    const imagesToDelete = existingUser.images.filter(
      (img) => !keepImagesList.includes(img)
    );
    for (const imageUrl of imagesToDelete) {
      await deleteCloudinaryImage(imageUrl);
    }

    // Handle new image uploads
    if (req.files) {
      try {
        if (Array.isArray(req.files)) {
          // Handle multiple files
          for (const file of req.files) {
            const imageUrl = await uploadBuffer(file.buffer);
            images.push(imageUrl);
          }
        } else if (req.files.images) {
          // Handle single file
          const files = Array.isArray(req.files.images)
            ? req.files.images
            : [req.files.images];

          for (const file of files) {
            const imageUrl = await uploadBuffer(file.buffer);
            images.push(imageUrl);
          }
        }
      } catch (uploadError) {
        console.error("Cloudinary upload error:", uploadError);
        return res.status(400).json({
          error: "Error uploading images to Cloudinary",
          details: uploadError.message,
        });
      }
    }

    // Prepare update data
    const updateData = {
      name: name || existingUser.name,
      phone: phone || existingUser.phone,
      email: email || existingUser.email,
      images: images.length > 0 ? images : existingUser.images,
      updatedAt: Date.now(),
    };

    // Update car in database
    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    });

    // Return success response
    res.json({
      success: true,
      data: updatedUser,
      message: "User updated successfully",
    });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({
      error: "Error updating user",
      details: err.message,
    });
  }
};

// Delete a car by ID
exports.deleteUser = async (req, res) => {
  try {
    const car = await User.findById(req.params.id);

    if (!car) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    for (const imageUrl of car.images) {
      await deleteCloudinaryImage(imageUrl);
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "User and associated images deleted successfully",
    });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({
      error: "Error deleting user",
      details: err.message,
    });
  }
};
