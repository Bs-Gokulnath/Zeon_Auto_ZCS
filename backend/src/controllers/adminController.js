const User = require('../models/User');

// Add new user (admin only)
const addUser = async (req, res) => {
  try {
    const { email, role } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Validate role
    if (role && !['admin', 'user'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be "admin" or "user"' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    const newUser = await User.create({
      email,
      role: role || 'user',
      addedBy: req.user.email,
      isActive: true
    });

    res.status(201).json({
      message: 'User added successfully',
      user: {
        id: newUser._id,
        email: newUser.email,
        role: newUser.role,
        addedBy: newUser.addedBy,
        createdAt: newUser.createdAt
      }
    });
  } catch (error) {
    console.error('Error in addUser:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all users (admin only)
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({})
      .select('-__v')
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: 'Users retrieved successfully',
      count: users.length,
      users: users.map(user => ({
        id: user._id,
        email: user.email,
        role: user.role,
        addedBy: user.addedBy,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }))
    });
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete user (admin only)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Find user
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent deleting the two main admins
    if (['madhan@zeoncharging.com', 'techcrivo@gmail.com'].includes(user.email)) {
      return res.status(403).json({ message: 'Cannot delete primary admin accounts' });
    }

    // Delete user
    await User.findByIdAndDelete(id);

    res.status(200).json({
      message: 'User deleted successfully',
      deletedUser: {
        id: user._id,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error in deleteUser:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update user role (admin only)
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['admin', 'user'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be "admin" or "user"' });
    }

    // Find user
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent changing role of primary admins
    if (['madhan@zeoncharging.com', 'techcrivo@gmail.com'].includes(user.email)) {
      return res.status(403).json({ message: 'Cannot change role of primary admin accounts' });
    }

    // Update role
    user.role = role;
    user.updatedAt = Date.now();
    await user.save();

    res.status(200).json({
      message: 'User role updated successfully',
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Error in updateUserRole:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Toggle user active status (admin only)
const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Find user
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent deactivating primary admins
    if (['madhan@zeoncharging.com', 'techcrivo@gmail.com'].includes(user.email)) {
      return res.status(403).json({ message: 'Cannot deactivate primary admin accounts' });
    }

    // Toggle status
    user.isActive = !user.isActive;
    user.updatedAt = Date.now();
    await user.save();

    res.status(200).json({
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      user: {
        id: user._id,
        email: user.email,
        isActive: user.isActive,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Error in toggleUserStatus:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  addUser,
  getAllUsers,
  deleteUser,
  updateUserRole,
  toggleUserStatus
};
