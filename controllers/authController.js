const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { isDbReady } = require('../config/db');
const mongoose = require('mongoose');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Register a new user (dummy)
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    const { name, email, password } = req.body;
    if (!isDbReady() || mongoose.connection.readyState !== 1) {
        return res.status(503).json({
            message: 'Database still starting — wait a few seconds and try again.',
        });
    }
    try {
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }
        const user = await User.create({ name, email, password });
        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                token: generateToken(user._id)
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const authUser = async (req, res) => {
    const { email, password } = req.body;
    if (!isDbReady() || mongoose.connection.readyState !== 1) {
        return res.status(503).json({
            message: 'Database still starting — wait a few seconds and try again.',
        });
    }
    try {
        const user = await User.findOne({ email });
        if (user && (await user.matchPassword(password))) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                token: generateToken(user._id)
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { registerUser, authUser };
