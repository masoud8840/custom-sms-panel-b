const { connect } = require("mongoose");

module.exports = (resolve) => {
  connect(process.env.URI, {
    serverSelectionTimeoutMS: 180000,
    socketTimeoutMS: 180000,
  })
    .then((res) => {
      console.log("Mongodb Connected!".yellow.bold);
      resolve();
    })
    .catch((e) => {
      console.log("Mongodb Error!".red.bold, e);
    });
};
