import express from "express";
import {
  updateUserProfile,
  getUserById,
} from "../../controllers/UserController/userProfileController.js";

const userProfileRoute = (userDbConnection, adminDbConnection) => {
  if (!userDbConnection) {
    throw new Error("User database connection is undefined");
  }

  const router = express.Router();

  // Route to update user profile
  router.put(
    "/update-profile/:id",
    updateUserProfile(userDbConnection, adminDbConnection)
  );

  // Route to get all user profiles
  router.get("/all-users/:id", getUserById(userDbConnection, adminDbConnection));

  return router;
};

export default userProfileRoute;
