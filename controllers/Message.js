const Member = require("../models/Member");
const Code = require("../models/Code");
const UnknownCell = require("../models/UnknownCell");
const xlsx = require("xlsx");
const fs = require("fs");
const { default: axios } = require("axios");
const Message = require("../models/Message");
const { formatMessageSendTime } = require("../utils/time");
const { replaceTextWithUserFields } = require("../utils/messages");
const validateRequiredFields = require("../utils/validateRequiredFields");
const adminAccess = require("../utils/admin-access");

// const NO_CODE_MESSAGE = ``;
const NO_USER_FOUND_MESSAGE = `عضو محترم ، شماره همراهی که با آن پیام ارسال کرده اید در سامانه صندوق وجود ندارد. لطفا با شماره همراهی که در فیش حقوقی تان ثبت شده است پیام ارسال کنید و اگر در فیش حقوقی تان شماره همراهی ثبت نشده در اولین فرصت به دفاتر ساتای شهر خود مراجعه نمائید و شماره همراه مربوط به خود را ثبت کنید. پس از درج شماره همراه در فیش حقوقی تان کد دستوری مورد نظرتان را به سرشماره 30002126 پیامک کنید`;
const INVALID_CODE_SENT_MESSAGE = `عضو محترم ، این سامانه فقط و فقط کد های دستوری تعریف شده و اعلام شده را ثبت میکند لذا تاکید میگردد از ارسال متن خودداری نمائید و فقط کد دستوری مورد نظر را پیامک کنید.`;
const DUPLICATED_CODE_MESSAGE = `عضو محترم ، شما یکبار کد دستوری مورد نظر را ارسال کرده اید لطفا ار ازسال مجدد کد دستوری اکیدا خودداری نمائید.`;
const ALLOWED_DUPLICATES = ["1", "2"];

module.exports.postNewMessage = async (req, res, next) => {
  const error = new Error();
  try {
    const MESSAGE_BODY = {
      message: "",
      cellphone: "",
    };
    const { text, from, to } = req.query;
    const numericText = Number(text);
    const existingUser = await Member.findOne({ cellphone: from });
    if (!["11", "12"].includes(text)) {
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

            if (!!!isMessageDuplicated || ALLOWED_DUPLICATES.includes(text)) {
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
              error.message = "این شخص قبلا این کد را ارسال کرده است!";
              error.name = "خطا در ارسال";
              MESSAGE_BODY.message = DUPLICATED_CODE_MESSAGE;
              MESSAGE_BODY.cellphone = existingUser.cellphone;
            }
          } else {
            // اگه کد نبود
            MESSAGE_BODY.message = INVALID_CODE_SENT_MESSAGE;
            MESSAGE_BODY.cellphone = existingUser.cellphone;
          }
        } else {
          // اگه پیامک ارسال شده عدد نبود
          MESSAGE_BODY.message = INVALID_CODE_SENT_MESSAGE;
          MESSAGE_BODY.cellphone = existingUser.cellphone;
        }
      } else {
        const newUnknownCell = new UnknownCell({ cellphone: from, text });
        await newUnknownCell.save();
        // should be added here
        MESSAGE_BODY.message = NO_USER_FOUND_MESSAGE;
        MESSAGE_BODY.cellphone = from;
        error.message = "شماره تلفن عضو در سامانه موجود نمیباشد!";
        error.name = "خطا در ارسال";
        // اگه شماره تلفن (عضو) وحود نداشت
      }
    }
    if (
      !(MESSAGE_BODY.cellphone.length > 0 && MESSAGE_BODY.message.length > 0)
    ) {
      throw error;
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
    return res.status(201).json({
      message: {
        title: "ارسال پیامکی",
        message: "پیام مورد نظر با موفقیت ارسال شد.",
      },
    });
  } catch (error) {
    return res
      .status(400)
      .json({ message: { title: error.name, message: error.message } });
    // .json({ message: { title: error.name, message: error.cause } });
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
    const response = await axios.post(
      "https://api.sms.ir/v1/send/likeToLike",
      sendBody,
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "text/plain",
          "X-API-KEY": process.env.API_KEY,
        },
      }
    );
    return res.status(200).json({
      message: {
        title: "ارسال گروهی",
        message: "ارسال پیامکها با موفقیت انجام شد.",
      },
    });
  } catch (error) {
    return res.status(400).json({
      message: {
        title: "ارسال گروهی",
        message: "خطا در خواندن فایل ارسالی!",
      },
    });
  }
};

module.exports.postSendSingleMessage = async (req, res, next) => {
  try {
    const { cellphone, codeId } = req.body;
    const codeResponse = await Code.findById(codeId).lean();

    res.redirect(
      `http://81.12.41.178:81/api/v1/messages/new?to=30002126&from=${cellphone}&text=${codeResponse.code}`
    );
  } catch (error) {
    console.log("ERROR");
  }
  //   const sendingMsg = await fetch(
  //     `http://localhost:3001/api/v1/messages/new?to=30002126&from=${cellphone}&text=${codeResponse.code}`
  //   );
  //   const sendingRes = await sendingMsg.json();
  //   console.log(sendingMsg);
  //   return res
  //     .status(200)
  //     .json({ message: { title: sendingRes, message: "" } });
  // } catch (error) {
  //   return res.status(400).json({ message: { title: "", message: "" } });
  // }
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
    const promise = ids.map(async (id) => {
      // const existingUser = await Member.findOne({ _id: id });
      // console.log(existingUser);
      const existingMsg = await Message.findById(id).populate({
        path: "from_id",
        model: "Member",
      });

      if (existingMsg) {
        const resetPasswordMessage = existingMsg.from_id.messages_sent.find(
          (m) => m._id.toString() === id
        );
        await Message.deleteOne(resetPasswordMessage);
        await existingMsg.deleteOne();

        const { responseText, cellphone } = replaceTextWithUserFields(
          existingMsg.from_id,
          currentCode.response
        );
        users.cellphones.push(cellphone);
        users.messages.push(responseText);
      }
    });

    await Promise.all(promise);

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
    return res.status(200).json({
      message: {
        title: "ارسال پیامکی",
        message: "پاسخ بازیابی رمز عبور پیامک شد.",
      },
    });
  } catch (error) {
    return res.status(400).json({ message: {} });
  }
};
