const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const adminAccess = require("../utils/admin-access.js");

module.exports.postLogin = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const existingUser = await User.findOne({ username }).lean();
    if (existingUser) {
      const doesPasswordMatch = await bcrypt.compare(
        password,
        existingUser.password
      );

      if (doesPasswordMatch) {
        if (existingUser.verified) {
          const token = jwt.sign(existingUser, process.env.HASH, {
            expiresIn: "12h",
          });
          return res.status(200).json({
            message: {
              title: "درخواست ورود",
              message: "با موفقیت وارد حساب کاربری شدید.",
            },
            data: {
              token: `Bearer ${token}`,
              ...existingUser,
            },
          });
        }

        return res.status(400).json({
          message: {
            title: "درخواست ورود",
            message: "حساب کاربری شما تایید نشده است!",
          },
        });
      }
      return res.status(400).json({
        message: {
          title: "درخواست ورود",
          message: "نام کاربری یا رمز عبور صحیح نمیباشد!",
        },
      });
    }

    return res.status(400).json({
      message: {
        title: "درخواست ورود",
        message: "کاربری با این مشخصات وجود ندارد!",
      },
    });
  } catch (error) {
    console.log("Something went wrong with postLogin func!");
  }
};

module.exports.postSignup = async (req, res, next) => {
  try {
    const { fullname, username, password, role } = req.body;

    if (role === "1") {
      const hasAccess = adminAccess(req.headers.authorization);
      if (!hasAccess) return res.status(401).json({});
    }
    const existingUser = await User.findOne({ fullname, username });
    if (!existingUser) {
      const hashedPw = await bcrypt.hash(password, 16);
      const newUser = new User({
        fullname,
        username,
        password: hashedPw,
        role,
      });
      await newUser.save();

      return res.status(201).json({
        message: {
          title: "درخواست ثبت نام",
          message: "درخواست ثبت نام با موفقیت انجام شد.",
        },
      });
    }

    return res.status(400).json({
      message: {
        title: "درخواست ثبت نام",
        message: "شما قبلا ثبت نام کرده اید!",
      },
    });
  } catch (error) {}
};

module.exports.getValidate = async (req, res, next) => {
  try {
    const { authorization } = req.headers;
    if (authorization) {
      const token = authorization.split(" ")[1];
      const data = await jwt.verify(token, process.env.HASH);
      const existingUser = await User.findOne({ _id: data._id });
      if (data && existingUser) {
        return res.status(200).json({
          message: {
            title: "احراز هویت",
            message: "احراز هویت شما با موفقیت انجام شد ، خوش آمدید.",
          },
          data,
        });
      }

      return res.status(400).json({
        message: {
          title: "احراز هویت",
          message: "لطفا وارد حساب کاربری خود شوید!",
        },
      });
    }
    return res.status(400).json({
      message: {
        title: "احراز هویت",
        message: "لطفا وارد حساب کاربری خود شوید!",
      },
    });
  } catch (error) {}
};
module.exports.getUsers = async (req, res, next) => {
  // TODO: check for administration
  try {
    const hasAccess = adminAccess(req.headers.authorization);
    if (hasAccess) {
      const data = await User.find().lean();
      return res
        .status(200)
        .json({ data, message: { title: "", message: "" } });
    }
    return res.status(401).json({});
  } catch (error) {}
};

module.exports.getVerifyUser = async (req, res, next) => {
  const { id } = req.params;

  // TODO: check for administration
  const hasAccess = adminAccess(req.headers.authorization);
  if (!hasAccess) return res.status(401).json({});

  const existingUser = await User.findById(id);
  if (existingUser) {
    existingUser.verified = !existingUser.verified;
    await existingUser.save();
    return res.status(200).json({
      message: { title: "", message: "" },
    });
  }

  return res.status(400).json({
    message: {
      title: "",
      message: "",
    },
  });
};

module.exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    // TODO: check for administration
    const hasAccess = adminAccess(req.headers.authorization);
    if (!hasAccess) return res.status(401).json({});

    const existingUser = await User.findById(id);
    if (existingUser) {
      console.log("User found!");
      await existingUser.deleteOne();
      return res.status(200).json({
        message: {
          title: "!عملیات موفق",
          message: "کاربر مورد نظر با موفقیت حذف شد.",
        },
      });
    }
    return res.status(400).json({
      message: {
        title: "عملیات ناموفق!",
        message: "عملیات مورد نظر با خطا مواجه شد!",
      },
    });
  } catch (error) {}
};
