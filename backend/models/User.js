const mongoose = require("mongoose");

// ERD: users(id, name, email, password_hash, created_at)
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    // We store the bcrypt hash here, never the plain password (SRS 6 - Security)
    password_hash: {
      type: String,
      required: true,
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

module.exports = mongoose.model("User", userSchema);
