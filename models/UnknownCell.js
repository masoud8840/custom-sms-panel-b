const { model, Schema } = require("mongoose");

const UnknownCell = new Schema(
  {
    cellphone: {
      type: String,
      required: true,
    },

    text: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = model("UnknownCell", UnknownCell);
