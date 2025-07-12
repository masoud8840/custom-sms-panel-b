const xlsx = require("xlsx");
const fs = require("fs").promises;
const Member = require("../models/Member");

// متغیر سراسری داخل این ماژول برای نگهداری کنترلر جاری
let currentAbortController = null;

module.exports.updateMembers = async (req, res, next) => {
  try {
    // اگر عملیات قبلی هنوز در حال اجراست، لغوش کن یا اجازه نده عملیات جدید شروع شه
    if (currentAbortController && !currentAbortController.signal.aborted) {
      return res
        .status(409)
        .json({ message: "Another update operation is already running." });
    }

    const abortController = new AbortController();
    currentAbortController = abortController;
    const { signal } = abortController;

    const filePath = req.file.path;
    const file = xlsx.readFile(filePath);
    const sheetName = file.SheetNames[0];
    const sheet = file.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);
    await fs.unlink(filePath);

    const BATCH_SIZE = 2000;
    const results = {
      insertedCount: 0,
      matchedCount: 0,
      modifiedCount: 0,
      deletedCount: 0,
      upsertedCount: 0,
      upsertedIds: {},
      insertedIds: {},
    };

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      if (signal.aborted) {
        currentAbortController = null;
        return res.status(499).json({ message: "Operation aborted by user" });
      }

      const batch = data.slice(i, i + BATCH_SIZE);
      const operations = batch.map((d) => ({
        updateOne: {
          filter: { personalCode: d.personalCode ?? "404" },
          update: {
            $set: {
              fname: d.fname ?? "404",
              lname: d.lname ?? "404",
              cellphone: d.cellphone ?? "404",
              personalCode: d.personalCode ?? "404",
              nationalityCode: d.nationalityCode ?? "404",
              birthdate: d.birthdate ?? "404",
              relationship: d.relationship ?? "404",
              gender: d.gender ?? "404",
              city: d.city ?? "404",
              state: d.state ?? "404",
            },
          },
          upsert: true,
        },
      }));

      const result = await Member.bulkWrite(operations);
      results.deletedCount += result.deletedCount;
      results.insertedCount += result.insertedCount;
      results.matchedCount += result.matchedCount;
      results.modifiedCount += result.modifiedCount;
      results.upsertedCount += result.upsertedCount;
    }

    currentAbortController = null;

    return res.status(200).json({
      message: {
        title: "بروزرسانی اعضاء",
        message: "فرآیند بروزرسانی اعضاء با موفقیت انجام شد.",
      },
      results,
    });
  } catch (err) {
    return res.status(200).json({
      message: {
        title: "بروزرسانی اعضاء",
        message: "فرآیند بروزرسانی اعضاء با خطا مواجه شد!",
      },
    });
  }
};

module.exports.abortUpdate = (req, res) => {
  if (!currentAbortController) {
    return res
      .status(404)
      .json({ message: "No active update operation to abort" });
  }
  currentAbortController.abort();
  currentAbortController = null;
  res.status(200).json({ message: "Update operation aborted" });
};
