import nodeCron from "node-cron";
import storeRates from "../controllers/CommonController/currencyDailyRateController.js";

export const CurrencyDailyRateJob = (adminDbConnection) => {
  console.log("✅ Currency update job scheduled to run daily at 00:30 AM IST.");

  nodeCron.schedule(
    "30 0 * * *",
    async () => {
      console.log("🔄 Running scheduled currency rate update...");
      try {
        const today = new Date();
        const formattedDate = `${today
          .getDate()
          .toString()
          .padStart(2, "0")}-${(today.getMonth() + 1)
          .toString()
          .padStart(2, "0")}-${today.getFullYear()}`;

        await storeRates(adminDbConnection, formattedDate);
        console.log("✅ Currency rates updated successfully.");
      } catch (error) {
        console.error("❌ Error updating currency rates:", error);
      }
    },
    {
      timezone: "Asia/Kolkata", // Set timezone to Indian Standard Time (IST)
    }
  );
};
// import nodeCron from "node-cron";
// import storeRates from "../controllers/CommonController/currencyDailyRateController.js";

// export const CurrencyDailyRateJob = (adminDbConnection) => {
//   // console.log("✅ Currency update job scheduled to run at 10:37 AM IST.");

//   nodeCron.schedule(
//     "40 0 * * *", // Runs at 10:13 AM IST (04:13 UTC)
//     async () => {
//       // console.log("🔄 Running scheduled currency rate update...");
//       try {
//         const today = new Date();
//         const formattedDate = `${today
//           .getDate()
//           .toString()
//           .padStart(2, "0")}-${(today.getMonth() + 1)
//           .toString()
//           .padStart(2, "0")}-${today.getFullYear()}`;

//         await storeRates(adminDbConnection, formattedDate);
//         // console.log("✅ Currency rates updated successfully.");
//       } catch (error) {
//         console.error("❌ Error updating currency rates:", error);
//       }
//     },
//     {
//       timezone: "Asia/Kolkata", // Set timezone to Indian Standard Time (IST)
//     }
//   );
// };
