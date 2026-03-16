const { Op, where } = require("sequelize");
const sequelize = require("../../config/database");
const loadModel = require("../models/load");
const shipperModel = require("../../common/models/shipper");
const { isEmpty } = require("../../common/services/isEmpty");
const fs = require("fs");
const path = require("path");
const loadAssignmentModel = require("../../carrier/models/loadAssignment");
const NotificationModel = require("../../common/models/notification");

exports.create = async (req, res) => {
  const { shipperId } = req.params;
  const {
    pickupLocation,
    dropoffLocation,
    weight,
    loadType,
    description,
    instruction,
    price,
    pickupTime,
    deadline,
  } = req.body;
  const files = req.files || {};
  let image1 =
    files.image1 && files.image1[0] ? files.image1[0].filename : null;
  let image2 =
    files.image2 && files.image2[0] ? files.image2[0].filename : null;
  let image3 =
    files.image3 && files.image3[0] ? files.image3[0].filename : null;

  if (!shipperId || isEmpty(shipperId)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Oops! We need your shipper ID to proceed.",
    });
  }
  if (!pickupLocation || isEmpty(pickupLocation)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Oops! We need your pickup location to proceed.",
    });
  }
  if (!dropoffLocation || isEmpty(dropoffLocation)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Oops! We need your dropoff location to proceed.",
    });
  }
  if (!weight || isEmpty(weight)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Oops! We need your weight to proceed.",
    });
  }
  if (!loadType || isEmpty(loadType)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Oops! We need your load type to proceed.",
    });
  }
  if (!description || isEmpty(description)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Oops! We need your description to proceed.",
    });
  }
  if (!instruction || isEmpty(instruction)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Oops! We need your instruction to proceed.",
    });
  }
  if (!price || isEmpty(price)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Oops! We need your price to proceed.",
    });
  }
  if (!pickupTime || isEmpty(pickupTime)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Oops! We need your pickup time to proceed.",
    });
  }
  if (!deadline || isEmpty(deadline)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Oops! We need your description to proceed.",
    });
  }
  if (!image1 || isEmpty(image1)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Oops! We need your image to proceed.",
    });
  }
  const filesToCleanup = [];
  [image1, image2, image3].forEach(
    (f) => f && filesToCleanup.push(path.join("uploads/loads", f)),
  );

  const transaction = await sequelize.transaction();
  try {
    const shipper = await shipperModel.findByPk(shipperId, { transaction });

    if (!shipper) {
        await transaction.rollback();
        return res.status(404).json({
            status: "FAILED",
            message: "Shipper not found. Please provide a valid shipper ID.",
        });
    }
    const existingLoad = await loadModel.findOne({
      where: {
        pickupLocation,
        dropoffLocation,
        shipperId,
        status: {
          [Op.in]: ["open", "assigned"],
        },
      },
    });

    if (existingLoad) {
        await transaction.rollback();
      return res.status(400).json({
        status: "FAILED",
        message:
          "A load with the same pickup and dropoff location is already created or assigned.",
      });
    }

    const load = await loadModel.create(
      {
        shipperId,
        pickupLocation,
        dropoffLocation,
        weight,
        loadType,
        description,
        instruction,
        price,
        pickupTime,
        deadline,
        status: "open",
        image1,
        image2,
        image3,
      },
      { transaction },
    );

    await transaction.commit();

    return res.status(201).json({
      status: "SUCCESS",
      message: "Load created successfully",
      data: load,
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

exports.cancelLoad = async (req, res) => {
  const { loadId } = req.params;

  if (!loadId || isEmpty(loadId)) {
    return res.status(400).json({
      status: "FAILED",
      message: "A valid load ID is required to proceed.",
    });
  }

  const transaction = await sequelize.transaction();

  try {
    const load = await loadModel.findOne({
      where: { id: loadId },
      transaction,
    });

    if (!load) {
      await transaction.rollback();
      return res.status(404).json({
        status: "FAILED",
        message: "The requested load could not be found.",
      });
    }

    if (load.status === "in_transit" || load.status === "delivered") {
      await transaction.rollback();
      return res.status(400).json({
        status: "FAILED",
        message: `This load is currently marked as ${load.status} and cannot be cancelled.`,
      });
    }

    const assignment = await loadAssignmentModel.findOne({
      where: { loadId },
      transaction,
    });

    const previousStatus = load.status;

    load.status = "cancelled";
    await load.save({ transaction });

    if (previousStatus === "open") {
      await NotificationModel.create(
        {
          userId: load.shipperId,
          userType: "shipper",
          title: "Load Cancelled Successfully",
          message:
            "Your load has been cancelled successfully. It is no longer visible to carriers.",
          type: "system",
        },
        { transaction }
      );
    }

    if (previousStatus === "assigned" && assignment) {
      await NotificationModel.create(
        {
          userId: assignment.carrierId,
          userType: "carrier",
          title: "Assigned Load Cancelled",
          message:
            "The shipper has cancelled the load that was previously assigned to you.",
          type: "system",
        },
        { transaction }
      );
    }

    await transaction.commit();

    return res.status(200).json({
      status: "SUCCESS",
      message: "The load has been cancelled successfully.",
    });
  } catch (error) {
    await transaction.rollback();

    console.error("Error cancelling load:", error);

    return res.status(500).json({
      status: "FAILED",
      message:
        "An unexpected error occurred while attempting to cancel the load. Please try again later.",
      error: error.message,
    });
  }
};

exports.allUserLoads = async (req, res) => {
  const { shipperId } = req.params;

  if (!shipperId || isEmpty(shipperId)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Oops! We need your shipper ID to proceed.",
    });
  }
  try{
    const shipper = await shipperModel.findByPk(shipperId);

    if (!shipper) {
        return res.status(404).json({
            status: "FAILED",
            message: "Shipper not found. Please provide a valid shipper ID.",
        });
    }
    const loads = await loadModel.findAll({
        where: {
            shipperId
        },
        order: [
        ['createdAt', 'DESC']  // newest first
    ]
    });
    return res.status(200).json({
      status: "SUCCESS",
      message: "Loads fetched successfully",
      data: loads,
    });

  }catch (error) {
    console.error("Error fetching user details:", error);

    return res.status(500).json({
      status: "FAILED",
      message:
        "We are unable to process your request at the moment. Please try again.",
      error: error.message,
    });
  }
}


exports.allUserLoadsActive = async (req, res) => {
 const { shipperId } = req.params;

  if (!shipperId || isEmpty(shipperId)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Oops! We need your shipper ID to proceed.",
    });
  }
  try{
    const shipper = await shipperModel.findByPk(shipperId);

    if (!shipper) {
        return res.status(404).json({
            status: "FAILED",
            message: "Shipper not found. Please provide a valid shipper ID.",
        });
    }
    const loads = await loadModel.count({
        where: {
            shipperId,
              status: {
                [Op.in]: ["open", "assigned", "in_transit"],
              },
        },
    });
    return res.status(200).json({
      status: "SUCCESS",
      message: "Loads fetched successfully",
      data: loads,
    });
  }catch (error) {
    console.error("Error fetching user details:", error);

    return res.status(500).json({
      status: "FAILED",
      message:
        "We are unable to process your request at the moment. Please try again.",
      error: error.message,
    });
  }
}

exports.allUserLoadsPending = async (req, res) => {
 const { shipperId } = req.params;

  if (!shipperId || isEmpty(shipperId)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Oops! We need your shipper ID to proceed.",
    });
  }
  try{
    const shipper = await shipperModel.findByPk(shipperId);

    if (!shipper) {
        return res.status(404).json({
            status: "FAILED",
            message: "Shipper not found. Please provide a valid shipper ID.",
        });
    }
    const loads = await loadModel.count({
        where: {
            shipperId,
             status: "open",
        }
    });
    return res.status(200).json({
      status: "SUCCESS",
      message: "Loads fetched successfully",
      data: loads,
    });
  }catch (error) {
    console.error("Error fetching user details:", error);

    return res.status(500).json({
      status: "FAILED",
      message:
        "We are unable to process your request at the moment. Please try again.",
      error: error.message,
    });
  }
}

exports.allUserLoadsCompleted = async (req, res) => {
 const { shipperId } = req.params;

  if (!shipperId || isEmpty(shipperId)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Oops! We need your shipper ID to proceed.",
    });
  }
  try{
    const shipper = await shipperModel.findByPk(shipperId);

    if (!shipper) {
        return res.status(404).json({
            status: "FAILED",
            message: "Shipper not found. Please provide a valid shipper ID.",
        });
    }
    const loads = await loadModel.count({
        where: {
            shipperId,
              status: "delivered",
        }
    });
    return res.status(200).json({
      status: "SUCCESS",
      message: "Loads fetched successfully",
      data: loads,
    });
  }catch (error) {
    console.error("Error fetching user details:", error);

    return res.status(500).json({
      status: "FAILED",
      message:
        "We are unable to process your request at the moment. Please try again.",
      error: error.message,
    });
  }
}