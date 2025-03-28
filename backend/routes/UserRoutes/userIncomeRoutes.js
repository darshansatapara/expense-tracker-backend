import express from "express";
import {
  addUserIncome,
  deleteUserIncome,
  getUserIncome,
  updateUserIncome,
} from "../../controllers/UserController/userIncomeController.js";

const userIncomeRoute = (userDbConnection, adminDbConnection) => {
  if (!userDbConnection) {
    throw new Error("User database connection is undefined");
  }
  const router = express.Router();

  // Pass the controller functions as references, not invoked immediately
  router.post("/addIncome/:userId", addUserIncome(userDbConnection));

  // get the user incomes using userId startdate, end-date, profession
  router.get(
    "/getIncomes/:userId/:startDate/:endDate/:professionId",
    getUserIncome(userDbConnection, adminDbConnection)
  );
  // update the user perticular income
  router.put(
    "/updateIncome/:userId/:incomeDate",
    updateUserIncome(userDbConnection)
  );

  // delete the perticular user income
  router.delete(
    "/deleteIncome/:userId/:incomeDate",
    deleteUserIncome(userDbConnection)
  );

  return router;
};
export default userIncomeRoute;
