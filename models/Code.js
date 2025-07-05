const { model, Schema } = require("mongoose");

const codeSchema = new Schema({
  code: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  response: {
    type: String,
    required: true,
  },
});

module.exports = model("Code", codeSchema);
