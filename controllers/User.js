const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

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
  const { fullname, username, password } = req.body;

  const existingUser = await User.findOne({ fullname, username });
  if (!existingUser) {
    const hashedPw = await bcrypt.hash(password, 16);
    const newUser = new User({
      fullname,
      username,
      password: hashedPw,
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
};

module.exports.getValidate = async (req, res, next) => {
  try {
    const { authorization } = req.headers;
    if (authorization) {
      const token = authorization.split(" ")[1];
      const data = await jwt.verify(token, process.env.HASH);
      if (data) {
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
