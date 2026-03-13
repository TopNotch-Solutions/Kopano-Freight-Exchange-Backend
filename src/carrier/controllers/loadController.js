const NotificationModel = require("../../common/models/notification");
const { isEmpty } = require("../../common/services/isEmpty");
const sequelize = require("../../config/database");
const loadModel = require("../../shipper/models/load");
const deliveryDocumentModel = require("../models/deliveryDocument");
const loadAssignmentModel = require("../models/loadAssignment");
const { Op } = require("sequelize");

exports.allUserLoads = async (req, res) => {
  try {
    const loads = await loadModel.findAll({
        where: {
            status: "open"
        },
        order: [
        ['createdAt', 'DESC']
      ]
    });
    return res.status(200).json({
      status: "SUCCESS",
      message: "Loads fetched successfully",
      data: loads,
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

exports.allUserLoadsPerPickUpLocation = async (req, res) => {
  const { pickUpLocation } = req.params;
  if (!pickUpLocation || isEmpty(pickUpLocation)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Oops! We need the pick up location to proceed.",
    });
  }

  try {
    const loads = await loadModel.findAll({
      where: {
        pickUpLocation,
        status: "open"
      },
      order: [
        ['createdAt', 'DESC']
      ]
    });
    return res.status(200).json({
      status: "SUCCESS",
      message: "Loads fetched successfully",
      data: loads,
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

exports.acceptLoad = async (req, res) => {
  const { loadId } = req.params;
  const { carrierId } = req.query;
  if (!loadId || isEmpty(loadId)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Oops! We need the load ID to proceed.",
    });
  }

  if (!carrierId || isEmpty(carrierId)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Oops! We need the carrier ID to proceed.",
    });
  }
  const transaction = await sequelize.transaction();
  try {
    const loads = await loadModel.findOne(
      {
        where: {
          id: loadId,
        },
      },
      { transaction },
    );
    if (!loads) {
      await transaction.rollback();
      return res.status(404).json({
        status: "FAILED",
        message: "Load not found. Please provide a valid load ID.",
      });
    }

    loads.status = "assigned";
    await loads.save();
    await loadAssignmentModel.create(
      {
        carrierId,
        loadId: loads.id,
      },
      { transaction },
    );
    await NotificationModel.create(
      {
        userId: carrierId,
        userType: "carrier",
        title: "Load Accepted",
        message:
          "Congratulations! You have successfully accepted the load. We will notify you of any updates regarding this load. Thank you for being a valued carrier on our platform.",
        type: "system",
      },
      { transaction },
    );
    await NotificationModel.create(
      {
        userId: loads.shipperId,
        userType: "shipper",
        title: "Your Load Has Been Accepted",
        message:
          "Great news! Your load has been accepted by a carrier. We will keep you updated on the status of your load and notify you of any important updates. Thank you for choosing our platform to ship your goods.",
        type: "system",
      },
      { transaction },
    );
    await transaction.commit();
    return res.status(200).json({
        status: "SUCCESS",
        message: "Load accepted successfully",
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error fetching user details:", error);

    return res.status(500).json({
      status: "FAILED",
      message:
        "We are unable to process your request at the moment. Please try again.",
      error: error.message,
    });
  }
};

exports.markLoadInTransit = async (req, res) => {
  const { loadId } = req.params;
  const { carrierId } = req.query;
  if (!loadId || isEmpty(loadId)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Oops! We need the load ID to proceed.",
    });
  }

  if (!carrierId || isEmpty(carrierId)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Oops! We need the carrier ID to proceed.",
    });
  }
  const transaction = await sequelize.transaction();
  try {
    const loads = await loadModel.findOne(
      {
        where: {
          id: loadId,
        },
      },
      { transaction },
    );
    if (!loads) {
      await transaction.rollback();
      return res.status(404).json({
        status: "FAILED",
        message: "Load not found. Please provide a valid load ID.",
      });
    }

    loads.status = "in_transit";
    await loads.save();
    await loadAssignmentModel.create(
      {
        carrierId,
        loadId: loads.id,
      },
      { transaction },
    );
    await NotificationModel.create(
      {
        userId: carrierId,
        userType: "carrier",
        title: "Load In Transit",
        message:
          "You have marked the load "+loads.description+" as in transit. Thank you for being a valued carrier on our platform.",
        type: "system",
      },
      { transaction },
    );
    await NotificationModel.create(
      {
        userId: loads.shipperId,
        userType: "shipper",
        title: "Your Load Is In Transit",
        message:
          "Your load is now in transit. We will keep you updated on the status of your load and notify you of any important updates. Thank you for choosing our platform to ship your goods.",
        type: "system",
      },
      { transaction },
    );
    await transaction.commit();
    return res.status(200).json({
        status: "SUCCESS",
        message: "Load marked as in transit successfully",
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error fetching user details:", error);

    return res.status(500).json({
      status: "FAILED",
      message:
        "We are unable to process your request at the moment. Please try again.",
      error: error.message,
    });
  }
};

exports.deliverLoad = async (req, res) => {
  const { loadId } = req.params;
  const { carrierId } = req.query;
  const deliveryPhoto = req.files['deliveryPhoto'] ? req.files['deliveryPhoto'][0].path : null;

  if (!loadId || isEmpty(loadId)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Oops! We need the load ID to proceed.",
    });
  }
  if (!deliveryPhoto) {
    return res.status(400).json({
      status: "FAILED",
      message: "Oops! We need the delivery photo to proceed.",
    });
  }

  if (!carrierId || isEmpty(carrierId)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Oops! We need the carrier ID to proceed.",
    });
  }
  const transaction = await sequelize.transaction();
  try {
    const loads = await loadModel.findOne(
      {
        where: {
          id: loadId,
        },
      },
      { transaction },
    );
    if (!loads) {
      await transaction.rollback();
      return res.status(404).json({
        status: "FAILED",
        message: "Load not found. Please provide a valid load ID.",
      });
    }

    loads.status = "delivered";
    await loads.save();
    await deliveryDocumentModel.create(
      {
        loadId,
        deliveryPhoto
      },
      { transaction },
    );
    await NotificationModel.create(
      {
        userId: carrierId,
        userType: "carrier",
        title: "Load Delivered",
        message:
          "Congratulations! You have successfully delivered the load. We will notify you of any updates regarding this load. Thank you for being a valued carrier on our platform.",
        type: "system",
      },
      { transaction },
    );
    await NotificationModel.create(
      {
        userId: loads.shipperId,
        userType: "shipper",
        title: "Your Load Has Been Delivered",
        message:
          "Great news! Your load has been delivered by the carrier. Thank you for choosing our platform to ship your goods.",
        type: "system",
      },
      { transaction },
    );
    await transaction.commit();
    return res.status(200).json({
        status: "SUCCESS",
        message: "Load delivered successfully",
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error fetching user details:", error);

    return res.status(500).json({
      status: "FAILED",
      message:
        "We are unable to process your request at the moment. Please try again.",
      error: error.message,
    });
  }
};
exports.allAcepted = async (req, res) => {  
    const { carrierId } = req.params;
    if (!carrierId || isEmpty(carrierId)) {
        return res.status(400).json({
            status: "FAILED",
            message: "Oops! We need the carrier ID to proceed.",
        });
    }
    try {
        const loadAssignments = await loadAssignmentModel.findAll({
            where: {    
                carrierId
            },
        });
        const loadIds = loadAssignments.map(assignment => assignment.loadId);
        const loads = await loadModel.findAll({
            where: {
                id: loadIds
            },order: [
        ['createdAt', 'DESC']
      ]
        });
        return res.status(200).json({
            status: "SUCCESS",
            message: "Loads fetched successfully",
            data: loads,
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

exports.loadDeclean = async (req, res) => {
    const { loadId } = req.params;
    const { carrierId } = req.query;
     if (!carrierId || isEmpty(carrierId)) {
        return res.status(400).json({
            status: "FAILED",
            message: "Oops! We need the carrier ID to proceed.",
        });
    }

    if (!loadId || isEmpty(loadId)) {
      return res.status(400).json({
        status: "FAILED",
        message: "Oops! We need the load ID to proceed.",
      });
    }
    const transaction = await sequelize.transaction();
  try {
    const loads = await loadModel.findOne(
        {
            where: {
                id: loadId
            }        },
        { transaction },
    );
    if (!loads) {
        await transaction.rollback();
        return res.status(404).json({
            status: "FAILED",
            message: "Load not found. Please provide a valid load ID.",
        });
    }
    if (loads.status !== "assigned") {
        await transaction.rollback();
        return res.status(400).json({
            status: "FAILED",
            message: "Only assigned loads can be declaened.",
        });
    }

    loads.status = "open";
    await loads.save();
    await loadAssignmentModel.destroy(
      {
        where: {
          loadId,
        },
      },
      { transaction },
    );
    await NotificationModel.create(
        {
            userId: carrierId,
            userType: "carrier",
            title: "Load Decleaned",
            message: "You have declaened the load "+loads.description+". We understand that sometimes things don't work out as planned, and we respect your decision. Please rest assured that we are actively working to find a new carrier for this load and will keep you updated on any progress. Thank you for your understanding and cooperation.",
            type: "system",
        },
        { transaction },
    );
    await NotificationModel.create( 
        {
            userId: loads.shipperId,
            userType: "shipper",
            title: "Load Decleaned",
            message:
              "We regret to inform you that the load "+loads.description+" has been declaened by the carrier. We understand that this may be disappointing news, and we apologize for any inconvenience this may cause. Please rest assured that we are actively working to find a new carrier for your load and will keep you updated on any progress. Thank you for your understanding and patience during this time.",
            type: "system",
        },
        { transaction },
    );

    await transaction.commit();
    return res.status(200).json({
        status: "SUCCESS",
        message: "Load declaened successfully",
    }); 
  } catch (error) {
    await transaction.rollback();
    console.error("Error fetching user details:", error);
    return res.status(500).json({
      status: "FAILED",
      message:
        "We are unable to process your request at the moment. Please try again.",
      error: error.message,
    });
  }
};


exports.allActiveLoads = async (req, res) => {  
    const { carrierId } = req.params;
    if (!carrierId || isEmpty(carrierId)) {
        return res.status(400).json({
            status: "FAILED",
            message: "Oops! We need the carrier ID to proceed.",
        });
    }
    try {
        const loadAssignments = await loadAssignmentModel.findAll({
            where: {    
                carrierId
            },
        });
        const loadIds = loadAssignments.map(assignment => assignment.loadId);
         const loads = await loadModel.count({
            where: {
                id: {
                    [Op.in]: loadIds
                },
                status: {
                    [Op.in]: ["assigned", "in_transit"]
                }
            }
        });
        return res.status(200).json({
            status: "SUCCESS",
            message: "Loads fetched successfully",
            data: loads,
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

exports.allDeliveredLoads = async (req, res) => {  
    const { carrierId } = req.params;
    if (!carrierId || isEmpty(carrierId)) {
        return res.status(400).json({
            status: "FAILED",
            message: "Oops! We need the carrier ID to proceed.",
        });
    }
    try {
        const loadAssignments = await loadAssignmentModel.findAll({
            where: {    
                carrierId
            },
        });
        const loadIds = loadAssignments.map(assignment => assignment.loadId);
         const loads = await loadModel.count({
            where: {
                id: {
                    [Op.in]: loadIds
                },
                status: "delivered"
            }
        });
        return res.status(200).json({
            status: "SUCCESS",
            message: "Loads fetched successfully",
            data: loads,
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

exports.allOfferLoads = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const loads = await loadModel.count({
      where: {
        status: "open",
        createdAt: {
          [Op.between]: [startOfDay, endOfDay],
        },
      },
    });

    return res.status(200).json({
      status: "SUCCESS",
      message: "Today's loads fetched successfully",
      data: loads,
    });

  } catch (error) {
    console.error("Error fetching loads:", error);

    return res.status(500).json({
      status: "FAILED",
      message: "We are unable to process your request at the moment. Please try again.",
      error: error.message,
    });
  }
};

exports.allLoadsAcceptedToday = async (req, res) => {  
    const { carrierId } = req.params;

    if (!carrierId || isEmpty(carrierId)) {
        return res.status(400).json({
            status: "FAILED",
            message: "Oops! We need the carrier ID to proceed.",
        });
    }

    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const loadAssignments = await loadAssignmentModel.findAll({
            where: {    
                carrierId,
                createdAt: {
                    [Op.between]: [startOfDay, endOfDay],
                },
            },
            attributes: ["loadId"]
        });

        const loadIds = loadAssignments.map(a => a.loadId);

        if (loadIds.length === 0) {
            return res.status(200).json({
                status: "SUCCESS",
                message: "Loads fetched successfully",
                data: 0,
            });
        }

        const loads = await loadModel.count({
            where: {
                id: {
                    [Op.in]: loadIds
                }
            }
        });

        return res.status(200).json({
            status: "SUCCESS",
            message: "Loads fetched successfully",
            data: loads,
        });

    } catch (error) {
        console.error("Error fetching loads:", error);

        return res.status(500).json({
            status: "FAILED",
            message: "We are unable to process your request at the moment. Please try again.",
            error: error.message,
        });
    }
};

exports.allDeliveredLoadsToday = async (req, res) => {  
    const { carrierId } = req.params;
    if (!carrierId || isEmpty(carrierId)) {
        return res.status(400).json({
            status: "FAILED",
            message: "Oops! We need the carrier ID to proceed.",
        });
    }
    try {
      const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        const loadAssignments = await loadAssignmentModel.findAll({
            where: {    
                carrierId,
                createdAt: {
                    [Op.between]: [startOfDay, endOfDay],
                },
            },
        });
        const loadIds = loadAssignments.map(assignment => assignment.loadId);
         const loads = await loadModel.count({
            where: {
                id: {
                    [Op.in]: loadIds
                },
                status: "delivered"
            }
        });
        return res.status(200).json({
            status: "SUCCESS",
            message: "Loads fetched successfully",
            data: loads,
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