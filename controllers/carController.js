// Create a new car with images upload
const Car = require("../models/Car");
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

exports.createCar = async (req, res) => {
  try {
    const { title, description, tags } = req.body;
    let images = [];

    // Helper function to upload buffer data to Cloudinary
    // const uploadBuffer = async (buffer) => {
    //   return new Promise((resolve, reject) => {
    //     const uploadStream = cloudinary.uploader.upload_stream(
    //       { resource_type: 'auto' },
    //       (error, result) => {
    //         if (error) reject(error);
    //         else resolve(result.secure_url);
    //       }
    //     );

    //     uploadStream.end(buffer);
    //   });
    // };

    // Handle image uploads
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
    const car = new Car({
      title,
      description,
      tags: tags ? tags.split(",").map((tag) => tag.trim()) : [],
      images,
      user: req.user.userId,
    });

    // Save car to database
    await car.save();

    // Return success response
    res.status(201).json({
      success: true,
      data: car,
      message: "Car created successfully",
    });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({
      error: "Error creating car",
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

// Get all cars of the logged-in user
exports.getCars = async (req, res) => {
  try {
    const cars = await Car.find({ user: req.user.userId });
    res.json(cars);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get a specific car by ID
exports.getCarById = async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car || car.user.toString() !== req.user.userId) {
      return res.status(404).json({ error: "Car not found" });
    }
    res.json(car);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a car's details and its images
exports.updateCar = async (req, res) => {
  try {
    const carId = req.params.id;
    const { title, description, tags, keepImages } = req.body;
    let images = [];

    // Find existing car
    const existingCar = await Car.findById(carId);

    if (!existingCar) {
      return res.status(404).json({
        error: "Car not found",
      });
    }

    // Check ownership
    if (existingCar.user.toString() !== req.user.userId) {
      return res.status(403).json({
        error: "Not authorized to update this car",
      });
    }

    // Handle keeping existing images
    const keepImagesList = keepImages ? keepImages.split(",") : [];
    if (keepImagesList.length > 0) {
      images = existingCar.images.filter((img) => keepImagesList.includes(img));
    }

    // Delete removed images from Cloudinary
    const imagesToDelete = existingCar.images.filter(
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
      title: title || existingCar.title,
      description: description || existingCar.description,
      tags: tags ? tags.split(",").map((tag) => tag.trim()) : existingCar.tags,
      images: images.length > 0 ? images : existingCar.images,
      updatedAt: Date.now(),
    };

    // Update car in database
    const updatedCar = await Car.findByIdAndUpdate(carId, updateData, {
      new: true,
      runValidators: true,
    });

    // Return success response
    res.json({
      success: true,
      data: updatedCar,
      message: "Car updated successfully",
    });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({
      error: "Error updating car",
      details: err.message,
    });
  }
};

// Delete a car by ID
exports.deleteCar = async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);

    if (!car) {
      return res.status(404).json({
        error: "Car not found",
      });
    }

    if (car.user.toString() !== req.user.userId) {
      return res.status(403).json({
        error: "Not authorized to delete this car",
      });
    }

    for (const imageUrl of car.images) {
      await deleteCloudinaryImage(imageUrl);
    }

    await Car.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Car and associated images deleted successfully",
    });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({
      error: "Error deleting car",
      details: err.message,
    });
  }
};
