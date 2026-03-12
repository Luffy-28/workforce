const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ['admin', 'manager', 'supervisor', 'employee'], default: 'employee' },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  site: { type: mongoose.Schema.Types.ObjectId, ref: 'Site' },
  title: String,
  phone: String,
  dob: Date,
  address: String,
  department: String,
  avatar: String,
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  fcmToken: String,
  refreshToken: String,
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
