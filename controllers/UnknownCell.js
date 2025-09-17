const adminAccess = require("../utils/admin-access");
const UnknownCell = require("../models/UnknownCell");
const { formatMessageSendTime } = require("../utils/time");

module.exports.getUnknownCells = async (req, res, next) => {
  try {
    const { page = 1, limit = process.env.LIMIT } = req.query;
    const hasAccess = adminAccess(req.headers.authorization);
    if (!hasAccess) return res.status(401).json({});

    const pageNumber = parseInt(page, 10);
    const pageLimit = parseInt(limit, 10);
    const skip = (pageNumber - 1) * pageLimit;

    const data = await UnknownCell.find()
      .limit(pageLimit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await UnknownCell.countDocuments();
    return res.status(200).json({
      message: {
        title: "",
        message: "",
      },
      pagination: {
        total,
        page: pageNumber,
        totalPages: Math.ceil(total / pageLimit),
        limit: pageLimit,
      },
      data,
    });
  } catch (error) {}
};
module.exports.downloadUnknownCells = async (req, res, next) => {
  try {
    const data = await UnknownCell.find().lean();
    const newData = data.map((d) => {
      const newD = {
        "تلفن همراه": d.cellphone ?? "-",
        "متن پیامک": d.text ?? "-",
        "زمان ارسال": formatMessageSendTime(d.createdAt) ?? "-",
      };

      return newD;
    });

    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(newData);

    xlsx.utils.book_append_sheet(workbook, worksheet, "UnknownCells");

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
      'attachment; filename="UnknownCells.xlsx"'
    );
    res.send(excelBuffer);
  } catch (error) {
    return res.status(400).json({ message: {} });
  }
};
