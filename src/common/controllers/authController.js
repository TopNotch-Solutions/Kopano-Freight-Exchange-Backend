const OtpModel = require("../models/otp");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { isEmpty } = require("../services/isEmpty");
const userModel = require("../models/carrier");
const { Op } = require("sequelize");
const { isValidCellphoneNumber } = require("../services/numberValidation");
const sequelize = require("../../config/database");
const fs = require("fs");
const path = require("path");
const shipperModel = require("../models/shipper");
const NotificationModel = require("../models/notification");

exports.generateOtp = async (req, res) => {
  const { number } = req.body;

  if (!number || isEmpty(number)) {
    return res.status(400).json({
      status: "FAILED",
      messsage: "Oops! We need your cellphone number to proceed.",
    });
  }

  if (!isValidCellphoneNumber(number)) {
    return res.status(400).json({
      message:
        "Oops! That don't look like a valid cellphone number. Please check and try again.",
    });
  }

  const transaction = await sequelize.transaction();

  try {
    const existingOtp = await OtpModel.findOne({
      where: { number },
      transaction,
    });

    if (existingOtp) {
      await existingOtp.destroy({ transaction });
    }

    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    const hashedOtp = crypto.createHash("sha256").update(otpCode).digest("hex");

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await OtpModel.create(
      {
        number,
        otp: hashedOtp,
        expiresAt,
      },
      { transaction },
    );

    await transaction.commit();

    res.status(200).json({
      status: "SUCCESS",
      message: `OTP successfully generated and sent successfully to +${number}`,
      data: {
        otp: otpCode,
      },
    });
  } catch (error) {
    await transaction.rollback();

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
  if (!number || isEmpty(number)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Oops! We need your cellphone number to proceed.",
    });
  }
  if (!isValidCellphoneNumber(number)) {
    return res.status(400).json({
      message:
        "Oops! That don't look like a valid cellphone number. Please check and try again.",
    });
  }
  if (!otp || isEmpty(otp)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Oops! We need your OTP to proceed.",
    });
  }
  const transaction = await sequelize.transaction();

  try {
    const otpRecord = await OtpModel.findOne({
      where: { number },
      transaction,
    });

    if (!otpRecord) {
      await transaction.rollback();
      return res.status(400).json({
        status: "FAILED",
        message: "Invalid verification code. Please check and re-enter.",
      });
    }

    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

    if (otpRecord.otp !== hashedOtp) {
      await transaction.rollback();
      return res.status(400).json({
        status: "FAILED",
        message: "Invalid verification code. Please check and re-enter.",
      });
    }

    if (new Date() > new Date(otpRecord.expiresAt)) {
      await transaction.rollback();
      return res.status(400).json({
        status: "FAILED",
        message: "This one-time password has expired. Please resend.",
      });
    }

    await otpRecord.destroy({ transaction });

    const user = await userModel.findOne({
      where: {
        cellPhoneNumber: number,
        isCellphoneNumberVerified: true,
      },
      transaction,
    });

    await transaction.commit();

    if (user) {
      return res.status(200).json({
        status: "SUCCESS",
        existingUser: true,
        message: "OTP verified successfully. Welcome back!",
        data: {
          user: { ...user.toJSON(), password: undefined },
        },
      });
    }
    const shipper = await shipperModel.findOne({
      where: {
        cellPhoneNumber: number,
        isCellphoneNumberVerified: true,
      },
    });

    if (shipper) {
      return res.status(200).json({
        status: "SUCCESS",
        existingUser: true,
        message: "OTP verified successfully. Welcome back!",
        data: {
          user: { ...shipper.toJSON(), password: undefined },
        },
      });
    }
    return res.status(200).json({
      status: "SUCCESS",
      message: "OTP verified successfully",
      existingUser: false,
    });
  } catch (error) {
    await transaction.rollback();

    console.error("Error validating otp:", error);

    res.status(500).json({
      status: "FAILED",
      message:
        "We are unable to process your request at the moment. Please try again.",
      error: error.message,
    });
  }
};

exports.registerCarrier = async (req, res) => {
  const { fullName, email, password, cellPhoneNumber, diskExpiryDate } =
    req.body;
  const files = req.files;
  let profileImage = files.profileImage ? files.profileImage[0].filename : null;

  let drivingLicenseFront = files.drivingLicenseFront
    ? files.drivingLicenseFront[0].filename
    : null;

  let drivingLicenseBack = files.drivingLicenseBack
    ? files.drivingLicenseBack[0].filename
    : null;

  let diskImage = files.diskImage ? files.diskImage[0].filename : null;

  let vehicleFrontImage = files.vehicleFrontImage
    ? files.vehicleFrontImage[0].filename
    : null;

  let vehicleBackImage = files.vehicleBackImage
    ? files.vehicleBackImage[0].filename
    : null;

  let vehicleRearImage = files.vehicleRearImage
    ? files.vehicleRearImage[0].filename
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
  const filesToCleanup = [];
  [
    profileImage,
    drivingLicenseFront,
    drivingLicenseBack,
    diskImage,
    vehicleFrontImage,
    vehicleBackImage,
    vehicleRearImage,
  ].forEach(
    (f) => f && filesToCleanup.push(path.join("uploads/registration", f)),
  );

  const transaction = await sequelize.transaction();

  try {
    const existingUser = await userModel.findOne({
      where: {
        [Op.or]: [
          { email },
          { cellPhoneNumber },
          { VerifiedCellPhoneNumber: cellPhoneNumber },
        ],
      },
      transaction,
    });

    if (existingUser) {
      await transaction.rollback();

      filesToCleanup.forEach((filePath) => {
        fs.unlink(filePath, (err) => {
          if (err)
            console.warn("Failed to delete file:", filePath, err.message);
        });
      });

      return res.status(400).json({
        status: "FAILED",
        message:
          "An account associated with this details already exists. Please sign in or use different details to register.",
      });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await userModel.create(
      {
        fullName,
        email,
        password: hashedPassword,
        cellPhoneNumber,
        VerifiedCellPhoneNumber: cellPhoneNumber,
        profileImage,
        drivingLicenseFront,
        drivingLicenseBack,
        diskImage,
        vehicleFrontImage,
        vehicleBackImage,
        vehicleRearImage,
        isCellphoneNumberVerified: true,
        diskExpiryDate,
        role: "carrier",
      },
      { transaction },
    );

    await transaction.commit();
    await NotificationModel.create({
      userId: newUser.id,
      userType: "carrier",
      title: "Welcome to FreightConnect",
      message:
        "We're excited to have you on board. Begin connecting with transporters and managing your freight in one place.",
      type: "system",
    });

    const { password: _, ...userData } = newUser.toJSON();

    res.status(201).json({
      status: "SUCCESS",
      message: "Your account has been registered successfully. Welcome!",
      data: userData,
    });
  } catch (error) {
    await transaction.rollback();
    filesToCleanup.forEach((filePath) => {
      fs.unlink(filePath, (err) => {
        if (err) console.warn("Failed to delete file:", filePath, err.message);
      });
    });
    console.error("Error registering carrier:", error);

    res.status(500).json({
      status: "FAILED",
      message:
        "We are unable to process your request at the moment. Please try again.",
      error: error.message,
    });
  }
};

exports.updateCarrierDetails = async (req, res) => {
  const { id } = req.params;
  const { fullName, email, cellPhoneNumber, diskExpiryDate } = req.body;

  if (!fullName || isEmpty(fullName)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Full name cannot be empty.",
    });
  }

  if (!email || isEmpty(email)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Email cannot be empty.",
    });
  }

  if (!cellPhoneNumber || isEmpty(cellPhoneNumber)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Cellphone number cannot be empty.",
    });
  }

  const transaction = await sequelize.transaction();

  try {
    const user = await userModel.findByPk(id, { transaction });

    if (!user) {
      await transaction.rollback();
      return res.status(404).json({
        status: "FAILED",
        message: "Carrier account not found.",
      });
    }

    const existingUser = await userModel.findOne({
      where: {
        id: { [Op.ne]: id },
        [Op.or]: [
          { email },
          { cellPhoneNumber },
          { VerifiedCellPhoneNumber: cellPhoneNumber },
        ],
      },
      transaction,
    });

    if (existingUser) {
      await transaction.rollback();
      return res.status(400).json({
        status: "FAILED",
        message:
          "Another account is already registered with this email or cellphone number.",
      });
    }

    await userModel.update(
      {
        fullName,
        email,
        cellPhoneNumber,
        VerifiedCellPhoneNumber: cellPhoneNumber,
        diskExpiryDate,
      },
      {
        where: { id },
        transaction,
      },
    );

    await transaction.commit();

    const updatedUser = await userModel.findByPk(id, {
      attributes: { exclude: ["password"] },
    });

    res.status(200).json({
      status: "SUCCESS",
      message: "Carrier details updated successfully.",
      data: updatedUser,
    });
  } catch (error) {
    await transaction.rollback();

    console.error("Error updating carrier:", error);

    res.status(500).json({
      status: "FAILED",
      message:
        "We are unable to process your request at the moment. Please try again.",
      error: error.message,
    });
  }
};

exports.updateCarrierFiles = async (req, res) => {
  const { id } = req.params;
  const files = req.files;

  if (!files || Object.keys(files).length === 0) {
    return res.status(400).json({
      status: "FAILED",
      message: "No files provided to update.",
    });
  }

  const transaction = await sequelize.transaction();

  try {
    const user = await userModel.findByPk(id, { transaction });

    if (!user) {
      await transaction.rollback();
      return res.status(404).json({
        status: "FAILED",
        message: "Carrier account not found.",
      });
    }

    const fileFields = [
      'profileImage',
      'drivingLicenseFront',
      'drivingLicenseBack',
      'diskImage',
      'vehicleFrontImage',
      'vehicleBackImage',
      'vehicleRearImage'
    ];

    const updateData = {};

    for (const field of fileFields) {
      if (files[field] && files[field][0]) {
        const newFile = files[field][0].filename;

        if (user[field]) {
          const oldFilePath = path.join('uploads/registration', user[field]);
          fs.unlink(oldFilePath, (err) => {
            if (err) console.warn("Failed to delete old file:", oldFilePath, err.message);
          });
        }
        updateData[field] = newFile;
      }
    }

    if (Object.keys(updateData).length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        status: "FAILED",
        message: "No valid files provided for update.",
      });
    }

    await userModel.update(updateData, {
      where: { id },
      transaction,
    });

    await transaction.commit();

    const updatedUser = await userModel.findByPk(id, {
      attributes: { exclude: ['password'] },
    });

    res.status(200).json({
      status: "SUCCESS",
      message: "Carrier files updated successfully.",
      data: updatedUser,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error updating carrier files:", error);

    res.status(500).json({
      status: "FAILED",
      message: "We are unable to process your request at the moment. Please try again.",
      error: error.message,
    });
  }
};

exports.registerShipper = async (req, res) => {
  const {
    businessName,
    registrationNumber,
    dateOfIncorporation,
    entity,
    password,
    cellPhoneNumber,
    industry,
  } = req.body;
  const files = req.files || {};

  let companyLogo =
    files.companyLogo && files.companyLogo[0]
      ? files.companyLogo[0].filename
      : null;

  let taxRegistrationPDF =
    files.taxRegistrationPDF && files.taxRegistrationPDF[0]
      ? files.taxRegistrationPDF[0].filename
      : null;
  if (!businessName || isEmpty(businessName)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Oops! We need your business name to proceed.",
    });
  }
  if (!registrationNumber || isEmpty(registrationNumber)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Oops! We need your registration number to proceed.",
    });
  }
  if (!dateOfIncorporation || isEmpty(dateOfIncorporation)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Oops! We need your date of incorporation to proceed.",
    });
  }
  if (!entity || isEmpty(entity)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Oops! We need your entity to proceed.",
    });
  }
  if (!password || isEmpty(password)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Oops! We need your password to proceed.",
    });
  }
  if (!industry || isEmpty(industry)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Oops! We need your industry to proceed.",
    });
  }
  const filesToCleanup = [];
  [companyLogo, taxRegistrationPDF].forEach(
    (f) => f && filesToCleanup.push(path.join("uploads/registration", f)),
  );

  const transaction = await sequelize.transaction();
  try {
    const existingUser = await shipperModel.findOne({
      where: {
        [Op.or]: [
          { registrationNumber },
          { cellPhoneNumber },
          { VerifiedCellPhoneNumber: cellPhoneNumber },
        ],
      },
      transaction,
    });

    if (existingUser) {
      await transaction.rollback();

      filesToCleanup.forEach((filePath) => {
        fs.unlink(filePath, (err) => {
          if (err)
            console.warn("Failed to delete file:", filePath, err.message);
        });
      });

      return res.status(400).json({
        status: "FAILED",
        message:
          "An account associated with this details already exists. Please sign in or use different details to register.",
      });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = await shipperModel.create(
      {
        businessName,
        registrationNumber,
        dateOfIncorporation,
        entity,
        password: hashedPassword,
        cellPhoneNumber,
        VerifiedCellPhoneNumber: cellPhoneNumber,
        companyLogo,
        industry,
        taxRegistrationPDF,
        isCellphoneNumberVerified: true,
        role: "shipper",
      },
      { transaction },
    );
    await transaction.commit();
    await NotificationModel.create({
      userId: newUser.id,
      userType: "shipper",
      title: "Welcome to FreightConnect",
      message:
        "We're excited to have you on board. Begin connecting with transporters and managing your freight in one place.",
      type: "system",
    });

    const { password: _, ...userData } = newUser.toJSON();
    res.status(201).json({
      status: "SUCCESS",
      message: "Your account has been registered successfully. Welcome!",
      data: userData,
    });
  } catch (error) {
    await transaction.rollback();
    filesToCleanup.forEach((filePath) => {
      fs.unlink(filePath, (err) => {
        if (err) console.warn("Failed to delete file:", filePath, err.message);
      });
    });
    console.error("Error registering carrier:", error);

    res.status(500).json({
      status: "FAILED",
      message:
        "We are unable to process your request at the moment. Please try again.",
      error: error.message,
    });
  }
};

exports.updateShipperDetails = async (req, res) => {
  const { id } = req.params;
  const {
    businessName,
    registrationNumber,
    dateOfIncorporation,
    entity,
    cellPhoneNumber,
    industry,
  } = req.body;

  // Basic validation
  if (!businessName || isEmpty(businessName)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Business name cannot be empty.",
    });
  }
  if (!registrationNumber || isEmpty(registrationNumber)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Registration number cannot be empty.",
    });
  }
  if (!dateOfIncorporation || isEmpty(dateOfIncorporation)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Date of incorporation cannot be empty.",
    });
  }
  if (!entity || isEmpty(entity)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Entity cannot be empty.",
    });
  }
  if (!cellPhoneNumber || isEmpty(cellPhoneNumber)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Cellphone number cannot be empty.",
    });
  }
  if (!industry || isEmpty(industry)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Industry cannot be empty.",
    });
  }

  const transaction = await sequelize.transaction();

  try {
    const shipper = await shipperModel.findByPk(id, { transaction });

    if (!shipper) {
      await transaction.rollback();
      return res.status(404).json({
        status: "FAILED",
        message: "Shipper account not found.",
      });
    }

    // Check for duplicate registrationNumber or phone (excluding current user)
    const existingUser = await shipperModel.findOne({
      where: {
        id: { [Op.ne]: id },
        [Op.or]: [
          { registrationNumber },
          { cellPhoneNumber },
          { VerifiedCellPhoneNumber: cellPhoneNumber },
        ],
      },
      transaction,
    });

    if (existingUser) {
      await transaction.rollback();
      return res.status(400).json({
        status: "FAILED",
        message:
          "Another account is already registered with this registration number or cellphone number.",
      });
    }

    // Update non-file fields, **without changing password**
    await shipperModel.update(
      {
        businessName,
        registrationNumber,
        dateOfIncorporation,
        entity,
        cellPhoneNumber,
        VerifiedCellPhoneNumber: cellPhoneNumber,
        industry,
      },
      { where: { id }, transaction }
    );

    await transaction.commit();

    const updatedShipper = await shipperModel.findByPk(id, {
      attributes: { exclude: ["password"] },
    });

    res.status(200).json({
      status: "SUCCESS",
      message: "Shipper details updated successfully.",
      data: updatedShipper,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error updating shipper details:", error);

    res.status(500).json({
      status: "FAILED",
      message:
        "We are unable to process your request at the moment. Please try again.",
      error: error.message,
    });
  }
};

exports.updateShipperFiles = async (req, res) => {
  const { id } = req.params;
  const files = req.files || {};

  if (!files.companyLogo && !files.taxRegistrationPDF) {
    return res.status(400).json({
      status: "FAILED",
      message: "No files provided to update.",
    });
  }

  const transaction = await sequelize.transaction();

  try {
    const shipper = await shipperModel.findByPk(id, { transaction });

    if (!shipper) {
      await transaction.rollback();
      return res.status(404).json({
        status: "FAILED",
        message: "Shipper account not found.",
      });
    }

    const updateData = {};

    // Update companyLogo if provided
    if (files.companyLogo && files.companyLogo[0]) {
      const newLogo = files.companyLogo[0].filename;

      if (shipper.companyLogo) {
        const oldLogoPath = path.join('uploads/registration', shipper.companyLogo);
        fs.unlink(oldLogoPath, (err) => {
          if (err) console.warn("Failed to delete old company logo:", oldLogoPath, err.message);
        });
      }

      updateData.companyLogo = newLogo;
    }

    // Update taxRegistrationPDF if provided
    if (files.taxRegistrationPDF && files.taxRegistrationPDF[0]) {
      const newPDF = files.taxRegistrationPDF[0].filename;

      if (shipper.taxRegistrationPDF) {
        const oldPDFPath = path.join('uploads/registration', shipper.taxRegistrationPDF);
        fs.unlink(oldPDFPath, (err) => {
          if (err) console.warn("Failed to delete old tax registration PDF:", oldPDFPath, err.message);
        });
      }

      updateData.taxRegistrationPDF = newPDF;
    }

    // Apply updates
    await shipperModel.update(updateData, {
      where: { id },
      transaction,
    });

    await transaction.commit();

    const updatedShipper = await shipperModel.findByPk(id, {
      attributes: { exclude: ['password'] },
    });

    res.status(200).json({
      status: "SUCCESS",
      message: "Shipper files updated successfully.",
      data: updatedShipper,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error updating shipper files:", error);

    res.status(500).json({
      status: "FAILED",
      message:
        "We are unable to process your request at the moment. Please try again.",
      error: error.message,
    });
  }
};

exports.userDetails = async (req, res) => {
  const { userId } = req.params;
  const { role } = req.query;

  try {
    let model;

    if (role === "carrier") {
      model = userModel;
    } else if (role === "shipper") {
      model = shipperModel;
    } else {
      return res.status(400).json({
        status: "FAILED",
        message: "Invalid role provided.",
      });
    }

    const user = await model.findByPk(userId, {
      attributes: { exclude: ["password"] },
    });

    if (!user) {
      return res.status(404).json({
        status: "FAILED",
        message: "User not found.",
      });
    }

    return res.status(200).json({
      status: "SUCCESS",
      data: user,
    });
  } catch (error) {
    console.error("Error fetching user details:", error);

    return res.status(500).json({
      status: "FAILED",
      message:
        "We are unable to process your request at the moment. Please try again.",
      error: error.message,
    });
  }
};
