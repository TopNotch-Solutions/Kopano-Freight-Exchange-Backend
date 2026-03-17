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
const { da } = require("date-fns/locale");

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
    console.log(`Generated OTP for ${number}: ${otpCode}`);
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
          user,
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
          user,
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
  const {
    fullName,
    email,
    cellPhoneNumber,
    diskExpiryDate,
    nationalID,
    residentailAddress,
    licenseNumber,
    licenseExpiryDate,
    vehicleRegistrationNumber,
    VINNumber,
    truckType,
    dateOfBirth,
    trailerType,
    loadCapacity,
  } = req.body;
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

  let roadWorthinessCertificate = files.roadWorthinessCertificate
    ? files.roadWorthinessCertificate[0].filename
    : null;
  let operatingPermit = files.operatingPermit
    ? files.operatingPermit[0].filename
    : null;
  let vehicleRegistractionCertificate = files.vehicleRegistractionCertificate
    ? files.vehicleRegistractionCertificate[0].filename
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

  if (!isValidCellphoneNumber(cellPhoneNumber)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Invalid cellphone number. Please check and re-enter.",
    });
  }
  if (!diskExpiryDate || isEmpty(diskExpiryDate)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Oops! We need your disk expiry date to proceed.",
    });
  }

  if (profileImage && isEmpty(profileImage)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Provided profile image is invalid.",
    });
  }
  if (nationalID && isEmpty(nationalID)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Provided national ID is invalid.",
    });
  }
  if (dateOfBirth && isEmpty(dateOfBirth)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Provided date of birth is invalid.",
    });
  }
  if (residentailAddress && isEmpty(residentailAddress)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Provided residential address is invalid.",
    });
  }

  if (licenseNumber && isEmpty(licenseNumber)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Provided license number is invalid.",
    });
  }
  if (licenseExpiryDate && isEmpty(licenseExpiryDate)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Provided license expiry date is invalid.",
    });
  }
  if (vehicleRegistrationNumber && isEmpty(vehicleRegistrationNumber)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Provided vehicle registration number is invalid.",
    });
  }

  if (VINNumber && isEmpty(VINNumber)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Provided VIN number is invalid.",
    });
  }

  if (truckType && isEmpty(truckType)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Provided truck type is invalid.",
    });
  }

  if (trailerType && isEmpty(trailerType)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Provided trailer type is invalid.",
    });
  }

  if (loadCapacity && isEmpty(loadCapacity)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Provided load capacity is invalid.",
    });
  }

  if(vehicleRegistractionCertificate && isEmpty(vehicleRegistractionCertificate)){
    return res.status(400).json({
      status: "FAILED",
      message: "Provided vehicle registration certificate is invalid.",
    });
  }

  if(roadWorthinessCertificate && isEmpty(roadWorthinessCertificate)){
    return res.status(400).json({
      status: "FAILED",
      message: "Provided road worthiness certificate is invalid.",
    });
  }

  if(operatingPermit && isEmpty(operatingPermit)){
    return res.status(400).json({
      status: "FAILED",
      message: "Provided operating permit is invalid.",
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

    const newUser = await userModel.create(
      {
        fullName,
        email,
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
        nationalID,
        residentailAddress,
        licenseNumber,
        licenseExpiryDate,
        vehicleRegistrationNumber,
        VINNumber,
        truckType,
        trailerType,
        loadCapacity,
        operatingPermit,
        vehicleRegistractionCertificate,
        roadWorthinessCertificate,
        isAccountVerified: true,
        licenseExpiryDate,
        dateOfBirth,
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
  if (!isValidCellphoneNumber(cellPhoneNumber)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Invalid cellphone number format.",
    });
  }
  if (!diskExpiryDate || isEmpty(diskExpiryDate)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Disk expiry date cannot be empty.",
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
        diskExpiryDate,
        isAccountVerified: false,
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
      "profileImage",
      "drivingLicenseFront",
      "drivingLicenseBack",
      "diskImage",
      "vehicleFrontImage",
      "vehicleBackImage",
      "vehicleRearImage",
    ];

    const updateData = {};

    for (const field of fileFields) {
      if (files[field] && files[field][0]) {
        const newFile = files[field][0].filename;

        if (user[field]) {
          const oldFilePath = path.join("uploads/registration", user[field]);
          fs.unlink(oldFilePath, (err) => {
            if (err)
              console.warn(
                "Failed to delete old file:",
                oldFilePath,
                err.message,
              );
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
    await userModel.update(
      {
        isAccountVerified: false,
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
      message: "Carrier files updated successfully.",
      data: updatedUser,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error updating carrier files:", error);

    res.status(500).json({
      status: "FAILED",
      message:
        "We are unable to process your request at the moment. Please try again.",
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
    cellPhoneNumber,
    industry,
    fullName,
    email,
    country,
    state,
    city,
    businessAddress,
    postalCode,
    websiteURL,
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

  let registrationCertificatePDF =
    files.registrationCertificatePDF && files.registrationCertificatePDF[0]
      ? files.registrationCertificatePDF[0].filename
      : null;
  let businessLicensePDF =
    files.businessLicensePDF && files.businessLicensePDF[0]
      ? files.businessLicensePDF[0].filename
      : null;
  let proofOfAddressPDF =
    files.proofOfAddressPDF && files.proofOfAddressPDF[0]
      ? files.proofOfAddressPDF[0].filename
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

  if (!industry || isEmpty(industry)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Oops! We need your industry to proceed.",
    });
  }
  if (!cellPhoneNumber || isEmpty(cellPhoneNumber)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Oops! We need your cellphone number to proceed.",
    });
  }
  if (!isValidCellphoneNumber(cellPhoneNumber)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Invalid cellphone number format.",
    });
  }

  if (!fullName || isEmpty(fullName)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Oops! We need your full name to proceed.",
    });
  }
  if (!email || isEmpty(email)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Oops! We need your email to proceed.",
    });
  }
  if (!country || isEmpty(country)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Oops! We need your country to proceed.",
    });
  }
  if (!state || isEmpty(state)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Oops! We need your state to proceed.",
    });
  }
  if (!city || isEmpty(city)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Oops! We need your city to proceed.",
    });
  }
  if (!businessAddress || isEmpty(businessAddress)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Oops! We need your business address to proceed.",
    });
  }
  if (!postalCode || isEmpty(postalCode)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Oops! We need your postal code to proceed.",
    });
  }

  if (registrationCertificatePDF && isEmpty(registrationCertificatePDF)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Provided registration certificate file is invalid.",
    });
  }
  if (businessLicensePDF && isEmpty(businessLicensePDF)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Provided business license file is invalid.",
    });
  }
  if (proofOfAddressPDF && isEmpty(proofOfAddressPDF)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Provided proof of address file is invalid.",
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

    const newUser = await shipperModel.create(
      {
        businessName,
        registrationNumber,
        dateOfIncorporation,
        entity,
        cellPhoneNumber,
        VerifiedCellPhoneNumber: cellPhoneNumber,
        companyLogo,
        industry,
        taxRegistrationPDF,
        isCellphoneNumberVerified: true,
        role: "shipper",
        fullName,
        email,
        country,
        state,
        city,
        businessAddress,
        postalCode,
        websiteURL: websiteURL || null,
        registrationCertificatePDF,
        businessLicensePDF,
        isAccountVerified: true,
        proofOfAddressPDF,
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

    const duplicateConditions = [];

    if (cellPhoneNumber !== shipper.cellPhoneNumber) {
      console.log("Checking for duplicate cellphone number:", cellPhoneNumber);
      duplicateConditions.push(
        { cellPhoneNumber },
        { VerifiedCellPhoneNumber: cellPhoneNumber },
      );
      console.log(
        "Duplicate conditions for cellphone number:",
        duplicateConditions,
      );
    }

    if (registrationNumber !== shipper.registrationNumber) {
      console.log(
        "Checking for duplicate registration number:",
        registrationNumber,
      );
      duplicateConditions.push({ registrationNumber });
      console.log(
        "Duplicate conditions for registration number:",
        duplicateConditions,
      );
    }

    const existingUser = await shipperModel.findOne({
      where: {
        id: { [Op.ne]: id },
        [Op.or]: duplicateConditions,
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
        isAccountVerified: false,
      },
      { where: { id }, transaction },
    );

    await transaction.commit();
    await NotificationModel.create({
      userId: id,
      userType: "shipper",
      title: "Profile information updated",
      message:
        "Your profile information has been updated. Please note that your account will be re-verified by our team to ensure the accuracy of the new details.",
      type: "system",
    });

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
        const oldLogoPath = path.join(
          "uploads/registration",
          shipper.companyLogo,
        );
        fs.unlink(oldLogoPath, (err) => {
          if (err)
            console.warn(
              "Failed to delete old company logo:",
              oldLogoPath,
              err.message,
            );
        });
      }

      updateData.companyLogo = newLogo;
    }

    // Update taxRegistrationPDF if provided
    if (files.taxRegistrationPDF && files.taxRegistrationPDF[0]) {
      const newPDF = files.taxRegistrationPDF[0].filename;

      if (shipper.taxRegistrationPDF) {
        const oldPDFPath = path.join(
          "uploads/registration",
          shipper.taxRegistrationPDF,
        );
        fs.unlink(oldPDFPath, (err) => {
          if (err)
            console.warn(
              "Failed to delete old tax registration PDF:",
              oldPDFPath,
              err.message,
            );
        });
      }

      updateData.taxRegistrationPDF = newPDF;
    }

    // Apply updates
    await shipperModel.update(updateData, {
      where: { id },
      transaction,
    });
    await shipperModel.update(
      {
        isAccountVerified: false,
      },
      {
        where: { id },
        transaction,
      },
    );

    await transaction.commit();
    await NotificationModel.create({
      userId: id,
      userType: "shipper",
      title: "Profile information updated",
      message:
        "Your profile information has been updated. Please note that your account will be re-verified by our team to ensure the accuracy of the new details.",
      type: "system",
    });

    const updatedShipper = await shipperModel.findByPk(id, {
      attributes: { exclude: ["password"] },
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
  console.log("Fetching details for userId:", userId, "with role:", role);
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
