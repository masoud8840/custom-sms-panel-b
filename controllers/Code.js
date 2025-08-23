const Code = require("../models/Code.js");
const adminAccess = require("../utils/admin-access");

module.exports.getCodes = async (req, res, next) => {
  try {
    const hasAccess = adminAccess(req.headers.authorization);
    if (!hasAccess) return res.status(401).json({});

    const codes = await Code.find().lean();

    res.status(200).json({
      data: codes.sort((a, b) => Number(a.code) - Number(b.code)),
      message: {},
    });
  } catch (error) {}
};

module.exports.getSingleCodes = async (req, res, next) => {
  try {
    const hasAccess = adminAccess(req.headers.authorization);
    if (!hasAccess) return res.status(401).json({});

    const currentCode = await Code.findById(req.params.id);
    if (!currentCode) {
      return res.status(404).json({
        message: {
          title: "کد های عملیاتی",
          message: "کد عملیاتی مورد نظر پیدا نشد!",
        },
      });
    }
    return res.status(200).json({
      data: currentCode,
      message: {
        title: "کد های عملیاتی",
        message: "کد عملیاتی مورد نظر با موفقیت دریافت شد!",
      },
    });
  } catch (error) {}
};

module.exports.updateSingleCodes = async (req, res, next) => {
  try {
    const hasAccess = adminAccess(req.headers.authorization);
    if (!hasAccess) return res.status(401).json({});

    const { code, name, response, _id } = req.body;
    const existingCode = await Code.findById(_id);
    if (!existingCode) {
      return res.status(404).json({
        message: {
          title: "کد های عملیاتی",
          message: "کد عملیاتی مورد نظر پیدا نشد!",
        },
      });
    }
    await existingCode.updateOne({
      code,
      name,
      response,
    });
    await existingCode.save();

    return res.status(200).json({
      message: {
        title: "کد های عملیاتی",
        message: "ویرایش کد عملیاتی با موفقیت انجام شد.",
      },
    });
  } catch (error) {}
};

module.exports.postNewCodes = async (req, res, next) => {
  const hasAccess = adminAccess(req.headers.authorization);
  if (!hasAccess) return res.status(401).json({});

  const { code, name, response, deniedResponse } = req.body;

  const existingCode = await Code.findOne({ code });
  if (!existingCode) {
    const newCode = new Code({ code, name, response, deniedResponse });
    await newCode.save();

    return res.status(201).json({
      message: {
        title: "کد های عملیاتی",
        message: `کد کد عملیاتی جدید ایجاد شد.`,
      },
    });
  }

  return res.status(400).json({
    message: {
      title: "کد های عملیاتی",
      message: `کد عملیاتی ${code} تکراری است!`,
    },
  });
};

module.exports.deleteCodes = async (req, res, next) => {
  const hasAccess = adminAccess(req.headers.authorization);
  if (!hasAccess) return res.status(401).json({});

  const id = req.params.id;

  const existingCode = await Code.findById(id);
  if (existingCode) {
    await existingCode.deleteOne();
    return res.status(200).json({
      message: {
        title: "کد های عملیاتی",
        message: "کد مورد نظر با موفقیت حذف شد.",
      },
    });
  }
  return res.status(404).json({
    message: {
      title: "کد های عملیاتی",
      message: "کد مورد نظر پیدا نشد!",
    },
  });
};
