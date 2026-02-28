// In-memory OTP storage with expiry
const otpStore = new Map();

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const storeOTP = (email, otp, expiryMinutes = 10) => {
  const expiryTime = Date.now() + expiryMinutes * 60 * 1000;
  otpStore.set(email, {
    otp,
    expiryTime
  });
};

const verifyOTP = (email, otp) => {
  const stored = otpStore.get(email);
  
  if (!stored) {
    return { valid: false, message: 'No OTP found for this email' };
  }
  
  if (Date.now() > stored.expiryTime) {
    otpStore.delete(email);
    return { valid: false, message: 'OTP has expired' };
  }
  
  if (stored.otp !== otp) {
    return { valid: false, message: 'Invalid OTP' };
  }
  
  otpStore.delete(email);
  return { valid: true };
};

module.exports = {
  generateOTP,
  storeOTP,
  verifyOTP
};
