import express from "express";
import {
  signUp,
  signIn,
  getUserById,
  googlesignin,
  signOut,
  updateProfileStatus,
  updateCategoryStatus,
} from "../../controllers/UserController/userAuthController.js";

const userAuthRoute = (userDbConnection) => {
  if (!userDbConnection) {
    throw new Error("User database connection is undefined");
  }

  const router = express.Router();

  // Pass the controller functions as references, not invoked immediately
  router.post("/signup", signUp(userDbConnection));
  router.post("/signin", signIn(userDbConnection));
  router.post("/googlesignin", googlesignin(userDbConnection));
  router.post("/signout", signOut); // Assuming signOut doesn't require the database connection
  router.get("/user/:userId", getUserById(userDbConnection));

  // update the profile status when the profile is completed
  router.put("/profilestatus", updateProfileStatus(userDbConnection));

  // update the Categgory status when the profile is completed
  router.put("/categorystatus", updateCategoryStatus(userDbConnection));

  return router;
};

export default userAuthRoute;
