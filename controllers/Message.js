const Member = require("../models/Member");
const xlsx = require("xlsx");
const fs = require("fs");
const { default: axios } = require("axios");

module.exports.postBulkSend = async (req, res, next) => {
  const filePath = req.file.path;
  const file = xlsx.readFile(filePath);
  const sheetName = file.SheetNames[0];
  const sheet = file.Sheets[sheetName];

  const data = xlsx.utils.sheet_to_json(sheet);
  fs.unlink(filePath, (err) => {
    if (err) {
      console.log("ERROR in Message.js line 15");
    }
  });

  const actualText = String(req.body.text);
  let text = actualText;

  const response = {
    messages: [],
    cellphones: [],
  };

  const promise = data.map(async (d) => {
    const cellphone = Object.values(d)[0];
    const existingUser = await Member.findOne({ cellphone });

    if (existingUser) {
      const regex = /\{\{(.*?)\}\}/g;

      const matches = actualText.match(regex);
      if (matches)
        matches.map((m, j) => {
          const propertyName = m.slice(2, -2);
          text = text.replace(m, existingUser[propertyName]);
        });

      response.messages.push(text);
      response.cellphones.push(existingUser.cellphone);

      text = actualText;
    }
  });

  await Promise.all(promise);

  try {
    const sendBody = JSON.stringify({
      lineNumber: "30002126",
      messageTexts: response.messages,
      mobiles: response.cellphones,
    });
    await axios.post("https://api.sms.ir/v1/send/likeToLike", sendBody, {
      headers: {
        "Content-Type": "application/json",
        Accept: "text/plain",
        "X-API-KEY": process.env.API_KEY,
      },
    });
  } catch (error) {
    return res.status(400).json({
      message: {
        title: "",
        message: error.message,
      },
    });
  }

  return res.status(200).json({
    data,
  });
};
