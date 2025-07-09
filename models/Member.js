const mongoose = require("mongoose");

const MemberSchema = new mongoose.Schema(
  {
    fname: {
      type: String,
      required: true,
    },
    lname: {
      type: String,
      required: true,
    },
    cellphone: {
      type: String,
      required: true,
    },
    personalCode: {
      type: String,
      required: true,
    },
    nationalityCode: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
      default: "404",
    },
    state: {
      type: String,
      required: true,
      default: "404",
    },
    relationship: {
      type: Number,
      required: true,
      default: 404,
    },
    birthdate: {
      type: Number,
      required: true,
      default: 404,
    },
    gender: {
      type: Number,
      required: true,
      default: 404,
    },
    messages_sent: [
      {
        type: mongoose.Schema.Types.ObjectId,
        rel: "Sms",
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Member", MemberSchema);
