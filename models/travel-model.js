const mongoose = require("mongoose");

const travelSchema = new mongoose.Schema({
  people: {
    type: Number,
    required: true,
  },
  departDate: { type: Date, required: true },
  comebackDate: { type: Date, required: true },
  airline: { type: String, required: true },
  destination: { type: String, required: true },
  location: { type: String },
  phoneNumber: { type: String, required: true },
  budget: { type: String, required: true },
  check: { type: String, required: true },
  pickup: { type: String, required: true },
  tips: { type: String, required: true },
  date: { type: Date, default: Date.now },
  author: { type: String },
});

module.exports = mongoose.model("Travel", travelSchema);
