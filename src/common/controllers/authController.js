const OtpModel = require("../models/otp");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { isEmpty } = require("../services/isEmpty");
const userModel = require("../models/user");
const { Op } = require("sequelize");

exports.generateOtp = async (req, res) => {
  const { number } = req.body;

  if (!number || isEmpty(number)) {
    return res.status(400).json({
      status: "FAILED",
      messsage: "Oops! We need your cellphone number to proceed.",
    });
  }

  try {
    const existingOtp = await OtpModel.findOne({ where: { number } });

    if (existingOtp) {
      await OtpModel.destroy({ where: { number } });
    }

    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    const hashedOtp = crypto.createHash("sha256").update(otpCode).digest("hex");

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await OtpModel.create({
      number,
      otp: hashedOtp,
      expiresAt,
    });

    res.status(200).json({
      status: "SUCCESS",
      message: `OTP successfully generated and sent successfully to ${number}`,
      data: {
        otp: otpCode,
      },
    });
  } catch (error) {
    console.error("Error generating OTP:", error);
    res.status(500).json({
      status: "FAILED",
      message:
        "We are unable to process your request at the moment. Please try again.",
    });
  }
};

exports.validateOtp = async (req, res) => {
  const { number, otp } = req.body;

  try {
    if (!number || isEmpty(number)) {
      return res.status(400).json({
        status: "FAILED",
        message: "Oops! We need your cellphone number to proceed.",
      });
    }

    if (!otp || isEmpty(otp)) {
      return res.status(400).json({
        status: "FAILED",
        message: "Oops! We need your OTP to proceed.",
      });
    }

    const otpRecord = await OtpModel.findOne({
      where: { number },
    });

    if (!otpRecord) {
      return res.status(400).json({
        status: "FAILED",
        message: "Invalid verification code. Please check and re-enter.",
      });
    }

    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

    if (otpRecord.otp !== hashedOtp) {
      return res.status(400).json({
        status: "FAILED",
        message: "Invalid verification code. Please check and re-enter.",
      });
    }

    if (new Date() > new Date(otpRecord.expiresAt)) {
      return res.status(400).json({
        status: "FAILED",
        message: "This one-time password has expired. Please resend.",
      });
    }

    await otpRecord.destroy({ where: { identifier } });

    res.status(200).json({
      status: "SUCCESS",
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.error("Error validating otp:", error);
    res.status(500).json({
      status: "FAILED",
      message:
        "We are unable to process your request at the moment. Please try again.",
      error: error.message,
    });
  }
};

exports.register = async (req, res) => {
  const { fullName, email, password, cellPhoneNumber, diskExpiryDate, role } =
    req.body;
     let profileImagePath = files.profileImage
    ? files.profileImage[0].filename
    : null;

  let idDocumentFront = files.idDocumentFront
    ? files.idDocumentFront[0].filename
    : null;

  let idDocumentBack = files.idDocumentBack
    ? files.idDocumentBack[0].filename
    : null;
  if (!fullName || isEmpty(fullName)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Oops! We need your full name to proceed.",
    });
  }
  if (!cellPhoneNumber || isEmpty(cellPhoneNumber)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Oops! We need your cellphone number to proceed.",
    });
  }
  if (!email || isEmpty(email)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Oops! We need your email to proceed.",
    });
  }
  if (!password || isEmpty(password)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Oops! We need your password to proceed.",
    });
  }
  if (!role || isEmpty(role)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Oops! We need your role to proceed.",
    });
  }

  try {
    const existingUser = await userModel.findOne({
      where: {
        [Op.or]: [
          { email },
          { cellPhoneNumber: identifier },
          { VerifiedCellPhoneNumber: cellPhoneNumber },
        ],
      },
    });

    if (existingUser) {
      return res.status(400).json({
        status: "FAILED",
        message:
          "A user with this email already exists. Please use a different email.",
      });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = await userModel.create({
      fullName,
      email,
      password: hashedPassword,
      cellPhoneNumber,
      VerifiedCellPhoneNumber: cellPhoneNumber,
      role,
    });

    const { password: _, ...userData } = newUser.toJSON();

    res.status(201).json({
      status: "SUCCESS",
      message: "User registered successfully",
      data: userData,
    });
  } catch (error) {
    console.error("Error validating otp:", error);
    res.status(500).json({
      status: "FAILED",
      message:
        "We are unable to process your request at the moment. Please try again.",
      error: error.message,
    });
  }
};
