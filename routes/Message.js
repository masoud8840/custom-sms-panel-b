const router = require("express").Router();
const multer = require("multer");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/messages");
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

const {
  postBulkSend,
  getAllMessages,
  downloadAllMessages,
  postResetMessages,
  postNewMessage,
  postSendSingleMessage,
} = require("../controllers/Message");

// especial get request due to 'ایده پردازان' API which sends get request for creating new SMS
router.get("/new", postNewMessage);

router.post("/sendfrom", postSendSingleMessage);
router.post("/send", upload.single("file"), postBulkSend);
router.get("/download", downloadAllMessages);
router.post("/reset", postResetMessages);
router.get("/", getAllMessages);

module.exports = router;
