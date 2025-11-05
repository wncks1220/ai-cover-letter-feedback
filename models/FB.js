const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  feedback: String,
  preview: String,
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Feedback", feedbackSchema);