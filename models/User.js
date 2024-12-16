const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  phone: {
    type: Number,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  images: {
    type: [String],
    validate: [
      (val) => val.length <= 10,
      "{PATH} exceeds the limit of 10 images",
    ],
  },
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
