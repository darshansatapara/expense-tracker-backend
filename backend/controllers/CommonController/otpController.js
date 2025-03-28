import nodemailer from "nodemailer";

const otpStore = new Map(); // Temporary store for OTPs (use Redis/DB for production)

export const otpController = async (req, res) => {
  try {
    const { email } = req.body;
    if (email) {
      // Generate a 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000);
      const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // OTP valid for 10 minutes

      // Save OTP and expiration in the temporary store
      otpStore.set(email, { otp: otp.toString(), expiresAt });

      // Create Nodemailer transporter
      const transporter = nodemailer.createTransport({
        service: "gmail",
        secure: true,
        port: 465,
        auth: {
          user: "expensetracker1908@gmail.com",
          pass: "dtjhnxsreewiyxps",
        },
      });

      // Email content
      const mailOptions = {
        from: '"Expense Tracker" <expensetracker1908@gmail.com>', // Replace with your sender email
        to: email,
        subject: "expense-tracker OTP Code",
        html: `
      <div style="font-family: Arial, sans-serif; text-align: center;">
        <h2>Your OTP Code is : </h2>
         <h1 style="font-size: 36px; font-weight: bold; color: #4CAF50;">${otp}</h1>
        <p>Please use the following OTP to complete your process. This code is valid for 2 minutes.</p>
      </div>
    `,
      };

      console.log(email);
      // Send email
      await transporter.sendMail(mailOptions);

      res.status(200).json({ message: "OTP sent successfully!", otp }); // Remove `otp` in production
      console.log("otp sent successfully");
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error sending OTP!", error: error.message });
  }
};

// Verify OTP Controller
export const verifyOtp = (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const storedOtpData = otpStore.get(email);

    if (!storedOtpData) {
      return res.status(404).json({ message: "OTP not found or expired" });
    }

    const { otp: storedOtp, expiresAt } = storedOtpData;

    // Validate OTP and expiration
    if (storedOtp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (new Date() > expiresAt) {
      otpStore.delete(email); // Clean up expired OTP
      return res.status(400).json({ message: "OTP has expired" });
    }

    // OTP verified successfully
    otpStore.delete(email); // Optional: Remove OTP after successful verification
    res.status(200).json({ message: "OTP verified successfully" });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res
      .status(500)
      .json({ message: "Error verifying OTP!", error: error.message });
  }
};
