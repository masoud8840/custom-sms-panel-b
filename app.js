const express = require("express");
const dotenv = require("dotenv");
const _colors = require("colors");
const cors = require("cors");

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const initializeMongodb = require("./utils/mongodb.js");

const baseUrl = process.env.BASE_URL;

const userRoute = require("./routes/User");
app.use(`${baseUrl}/users`, userRoute);

const codeRoute = require("./routes/Code");
app.use(`${baseUrl}/codes`, codeRoute);

// const messageRoute = require("./routes/Message");
// app.use(`${baseUrl}/messages`, messageRoute);

const memberRoute = require("./routes/Member");
app.use(`${baseUrl}/members`, memberRoute);

initializeMongodb(() => {
  app.listen(3001, () => {
    console.log("Application is listening on port 3001".yellow.bold);
  });
});
