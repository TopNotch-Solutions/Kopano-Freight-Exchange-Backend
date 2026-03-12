const NotificationModel = require("../../common/models/notification");
const { isEmpty } = require("../../common/services/isEmpty");
const sequelize = require("../../config/database");
const loadModel = require("../../shipper/models/load");
const loadAssignmentModel = require("../models/loadAssignment");

exports.allUserLoads = async (req, res) => {
  try {
    const loads = await loadModel.findAll({
        where: {
            status: "open"
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
        userId: carrierId,
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
                loadId
            }
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
