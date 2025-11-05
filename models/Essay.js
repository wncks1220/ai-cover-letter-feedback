// models/Essay.js
const mongoose = require("mongoose");

const essaySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  username: { type: String, required: true },
  input: String,
  output: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Essay", essaySchema);
