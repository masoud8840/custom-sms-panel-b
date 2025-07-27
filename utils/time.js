module.exports.formatMessageSendTime = (isoDate) =>
  new Date(isoDate).toLocaleDateString("fa-IR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
 