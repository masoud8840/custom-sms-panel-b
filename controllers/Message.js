const Member = require("../models/Member");
const Code = require("../models/Code");
const xlsx = require("xlsx");
const fs = require("fs");
const { default: axios } = require("axios");
const Message = require("../models/Message");
const { formatMessageSendTime } = require("../utils/time");
const { replaceTextWithUserFields } = require("../utils/messages");
const validateRequiredFields = require("../utils/validateRequiredFields");
const adminAccess = require("../utils/admin-access");

const NO_CODE_MESSAGE = ``;
// const NO_USER_FOUND_MESSAGE = ``;
// const INVALID_CODE_SENT_MESSAGE = ``;

module.exports.postNewMessage = async (req, res, next) => {
  try {
    const MESSAGE_BODY = {
      message: "",
      cellphone: "",
    };
    const { text, from, to } = req.query;
    const numericText = Number(text);
    const existingUser = await Member.findOne({ cellphone: from });
    if (existingUser) {
      // اگه کاربر وجود داشت

      if (!!numericText) {
        // اگه عدد بود
        const currentCode = await Code.findOne({ code: text });
        if (currentCode) {
          // اگه کد بود

          const isMessageDuplicated = await Message.findOne({
            from_id: existingUser._id,
            text,
            from,
          });

          if (!!!isMessageDuplicated) {
            const isMatched = validateRequiredFields(
              existingUser,
              currentCode.code
            );

            if (isMatched) {
              // اگه کد با شرایط متقاضی مطابقت داشت
              const { responseText, cellphone } = replaceTextWithUserFields(
                existingUser,
                currentCode.response
              );
              MESSAGE_BODY.message = responseText;
              MESSAGE_BODY.cellphone = cellphone;
              const newMessage = new Message({
                from,
                text,
                to,
                from_id: existingUser._id,
              });
              await newMessage.save();
              existingUser.messages_sent.push(newMessage._id);
              await existingUser.save();
            } else {
              // اگه کد با شرایط متقاضی مطابقت نداشت
              const { responseText, cellphone } = replaceTextWithUserFields(
                existingUser,
                currentCode.deniedResponse
              );
              MESSAGE_BODY.message = responseText;
              MESSAGE_BODY.cellphone = cellphone;
            }
          } else {
            // اگر کد ارسال شده تکراری بود
          }
        } else {
          // اگه کد نبود
          MESSAGE_BODY.message = NO_CODE_MESSAGE;
          MESSAGE_BODY.cellphone = existingUser.cellphone;
        }
      } else {
        // اگه پیامک ارسال شده عدد نبود
      }
    } else {
      // اگه شماره تلفن (عضو) وحود نداشت
    }

    const sendBody = JSON.stringify({
      lineNumber: process.env.LINE_NUMBER,
      messageTexts: [MESSAGE_BODY.message],
      mobiles: [MESSAGE_BODY.cellphone],
    });

    await axios.post("https://api.sms.ir/v1/send/likeToLike", sendBody, {
      headers: {
        "Content-Type": "application/json",
        Accept: "text/plain",
        "X-API-KEY": process.env.API_KEY,
      },
    });
    return res.status(201).json({ message: {} });
  } catch (error) {
    console.log(error);
  }
};

module.exports.postBulkSend = async (req, res, next) => {
  try {
    const hasAccess = adminAccess(req.headers.authorization);
    if (!hasAccess) return res.status(401).json({});

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

    const text = String(req.body.text);

    const responses = {
      messages: [],
      cellphones: [],
    };

    const promise = data.map(async (d) => {
      const cellphone = Object.values(d)[0];
      const existingUser = await Member.findOne({ cellphone });

      if (existingUser) {
        const { responseText, cellphone } = replaceTextWithUserFields(
          existingUser,
          text
        );
        responses.cellphones.push(cellphone);
        responses.messages.push(responseText);
      }
    });

    await Promise.all(promise);
    const sendBody = JSON.stringify({
      lineNumber: process.env.LINE_NUMBER,
      messageTexts: responses.messages,
      mobiles: responses.cellphones,
    });
    await axios.post("https://api.sms.ir/v1/send/likeToLike", sendBody, {
      headers: {
        "Content-Type": "application/json",
        Accept: "text/plain",
        "X-API-KEY": process.env.API_KEY,
      },
    });
  } catch (error) {
    console.log(error);
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
  try {
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

    // TODO:
    const data = await Message.find(filters)
      .populate({
        path: "from_id",
        model: "Member",
      })
      .lean()
      .limit(pageLimit)
      .skip(skip)
      .sort({ createdAt: -1 });

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
  } catch (error) {}
};

module.exports.downloadAllMessages = async (req, res, next) => {
  try {
    const { cellphone = "", text = "", from = "", to = "" } = req.query;

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

    const data = await Message.find(filters).lean().populate({
      path: "from_id",
      model: "Member",
    });
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
  } catch (error) {
    return res.status(400).json({ message: {} });
  }
};

module.exports.postResetMessages = async (req, res, next) => {
  try {
    const hasAccess = adminAccess(req.headers.authorization);
    if (!hasAccess) return res.status(401).json({});

    const { ids } = req.body;

    const currentCode = await Code.findOne({ code: "3" });
    if (!currentCode)
      return res.status(400).json({
        message: {},
      });

    const users = {
      messages: [],
      cellphones: [],
    };
    ids.map(async (id) => {
      const existingUser = await Member.findOne({ _id: id });
      if (existingUser) {
        const { responseText, cellphone } = replaceTextWithUserFields(
          existingUser,
          currentCode.response
        );
        users.cellphones.push(cellphone);
        users.messages.push(responseText);
      }
    });

    const bodyData = JSON.stringify({
      lineNumber: process.env.LINE_NUMBER,
      messageTexts: users.messages,
      mobiles: users.cellphones,
    });
    const response = await axios.post(
      "https://api.sms.ir/v1/send/likeToLike",
      bodyData,
      {
        headers: {
          "X-API-KEY": process.env.API_KEY,
          "Content-Type": "application/json",
          Accept: "text/plain",
        },
      }
    );
  } catch (error) {
    console.log(error);
  }

  return res.status(200).json({ message: {} });
};
