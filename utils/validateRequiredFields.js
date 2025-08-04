module.exports = (user, code) => {
  if (code === "20") {
    return checkFor20(user);
  } else return true;
};

const checkFor20 = (user) => {
  if (user.relationship >= 41 && user.relationship <= 49) {
    return false;
  }
  return true;
};
