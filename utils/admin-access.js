const { verify } = require("jsonwebtoken");

module.exports = async (bearerToken) => {
  try {
    const token = bearerToken.split(" ")[1];
    const payload = await verify(token, process.env.HASH);

    if (payload.role === "1") return true;
    return false;
  } catch (error) {}
};
