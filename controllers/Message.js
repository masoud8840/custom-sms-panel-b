const Member = require("../models/Member");
const xlsx = require("xlsx");
const fs = require("fs");
const { default: axios } = require("axios");
const Message = require("../models/Messages");
const { formatMessageSendTime } = require("../utils/time");

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

module.exports.getAllMessages = async (req, res, next) => {
  const {
    cellphone = "",
    text = "",
    from = "",
    to = "",
    page = 1,
    limit = process.env.LIMIT,
  } = req.query;

  const filters = {};
  if (cellphone) filters.from = { $regex: cellphone, $options: "i" };
  if (text) {
    filters.text = text;
  }
  if (from || to) {
    filters.createdAt = {};
    if (from) filters.createdAt.$gte = from;
    if (to) filters.createdAt.$lte = to;
  }

  const pageNumber = parseInt(page, 10);
  const pageLimit = parseInt(limit, 10);
  const skip = (pageNumber - 1) * pageLimit;

  const data = await Message.find(filters).lean().limit(pageLimit).skip(skip);
  const total = await Message.countDocuments(filters);
  return res.status(200).json({
    message: {},
    data,
    pagination: {
      total,
      page: pageNumber,
      totalPages: Math.ceil(total / pageLimit),
      limit: pageLimit,
    },
  });
};

module.exports.downloadAllMessages = async (req, res, next) => {
  const {
    cellphone = "",
    text = "",
    from = "",
    to = "",
    page = 1,
    limit = process.env.LIMIT,
  } = req.query;

  const filters = {};
  if (cellphone) filters.from = { $regex: cellphone, $options: "i" };
  if (text) {
    filters.text = text;
  }
  if (from || to) {
    filters.createdAt = {};
    if (from) filters.createdAt.$gte = from;
    if (to) filters.createdAt.$lte = to;
  }
  const pageNumber = parseInt(page, 10);
  const pageLimit = parseInt(limit, 10);
  const skip = (pageNumber - 1) * pageLimit;

  const data = await Message.find(filters).lean().limit(pageLimit).skip(skip);
  const newData = data.map((d) => {
    const newD = {
      _id: d._id,
      نام: d.from_id?.fname ?? "-",
      "نام خانوادگی": d.from_id?.lname ?? "-",
      "کد شناسایی": d.from_id?.personalCode ?? "-",
      "کد ملی": d.from_id?.nationalityCode ?? "-",
      "تلفن همراه": d.from ?? "-",
      "متن پیامک": d.text ?? "-",
      "تاریخ تولد": d.from_id?.birthdate ?? "-",
      جنسیت: d.from_id?.gender ?? "-",
      نسبت: d.from_id?.relationship ?? "-",
      "زمان ارسال": formatMessageSendTime(d.createdAt) ?? "-",
    };

    return newD;
  });

  const workbook = xlsx.utils.book_new();
  const worksheet = xlsx.utils.json_to_sheet(newData);

  xlsx.utils.book_append_sheet(workbook, worksheet, "Messages");

  const excelBuffer = xlsx.write(workbook, {
    bookType: "xlsx",
    type: "buffer",
  });
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="messages_export.xlsx"'
  );
  res.send(excelBuffer);
};
