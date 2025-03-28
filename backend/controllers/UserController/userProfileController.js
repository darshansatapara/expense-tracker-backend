import UserProfile from "../../models/UserModel/UserProfileModel.js";
import { AdminIncomeCategory } from "../../models/AdminModel/AdminCategoryModels.js";

// Import necessary modules
export const updateUserProfile = (userDbConnection) => async (req, res) => {
  const { id } = req.params; // The ID of the user to update
  const allowedFields = [
    "profilePic",
    "username",
    "email",
    "mobile_no",
    "date_of_birth",
    "profession",
    "profile_complated",
    "category_completed",
  ];

  // Filter only allowed fields from the request body
  const updateData = Object.keys(req.body).reduce((acc, key) => {
    if (allowedFields.includes(key)) {
      acc[key] = req.body[key];
    }
    return acc;
  }, {});

  // Check if any valid fields are provided
  if (Object.keys(updateData).length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "No valid fields provided to update" });
  }

  try {
    // Handle profilePic upload to Cloudinary if provided
    if (updateData.profilePic) {
      try {
        const uploadProfilePic = await cloudinary.uploader.upload(
          updateData.profilePic,
          { folder: "user_profiles" }
        );
        updateData.profilePic = uploadProfilePic.secure_url;
      } catch (uploadError) {
        return res.status(500).json({
          success: false,
          message: "Failed to upload profile picture.",
        });
      }
    }

    // Perform the update
    const UserProfileModel = UserProfile(userDbConnection);

    const updatedUser = await UserProfileModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true } // `new` to return updated document, `runValidators` for schema validation
    );

    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      message: "User profile updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    // Handle duplicate field errors
    if (error.code === 11000) {
      const duplicateKey = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        success: false,
        message: `${duplicateKey} already exists. Please use a different ${duplicateKey}.`,
      });
    }

    res.status(500).json({
      success: false,
      message: "Error updating user profile",
      error,
    });
  }
};

export const getUserById = (userDbConnection, adminDbConnection) => async (req, res) => {
  const id =  req.params.id; // Replace with req.params.id in production

  try {
    console.log('Fetching user with ID:', id);

    // User profile model from userDbConnection
    const UserProfileModel = UserProfile(userDbConnection);

    // AdminIncomeCategory model from adminDbConnection
    const AdminIncomeCategoryModel = AdminIncomeCategory(adminDbConnection);

    // Log to verify if AdminIncomeCategoryModel is properly defined
    console.log(AdminIncomeCategoryModel);

    if (!AdminIncomeCategoryModel) {
      return res.status(500).json({
        success: false,
        message: "AdminIncomeCategory model is undefined",
      });
    }

    const user = await UserProfileModel.findById(id)
      .select("profilePic username email mobile_no date_of_birth profession profile_complated category_completed")
      .populate({
        path: "profession", // Reference field in UserProfileModel
        model: AdminIncomeCategoryModel, // Pass the model directly here
        select: "_id name",
       // Selecting only _id and name from AdminIncomeCategory
        // options: { lean: true },
      });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Format the date_of_birth to only return the date part (without the time)
    const formattedUser = {
      ...user.toObject(),
      date_of_birth: user.date_of_birth ? user.date_of_birth.toLocaleDateString("en-GB") : "Unknown",
    };

    // Remove the _id field from the response
    delete formattedUser._id;

    res.status(200).json({
      success: true,
      data: formattedUser,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user",
      error: error.message,
    });
  }
};






