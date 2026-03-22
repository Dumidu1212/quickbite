// src/models/User.js
//
// The User model is the single source of truth for what a user looks like
// in our database. Mongoose enforces these rules BEFORE saving to MongoDB.
//
// SECURITY DECISIONS EXPLAINED:
//
// 1. We store passwordHash — never the plain text password.
//    bcrypt turns "MyPassword123" into a 60-character hash like
//    "$2b$12$..." that cannot be reversed. Even if our database is
//    leaked, attackers cannot recover the original passwords.
//
// 2. The toJSON transform removes passwordHash from every response.
//    This means even if a developer accidentally returns the full
//    user object, the password hash is never sent to the client.
//
// 3. email is stored lowercase with a unique index.
//    This prevents "User@test.com" and "user@test.com" being registered
//    as two different accounts.

'use strict';

const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,   // always stored as lowercase
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/,
        'Please provide a valid email address',
      ],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      // select: false means passwordHash is excluded from queries by default.
      // You must explicitly request it with .select('+passwordHash')
      // This is a safety net — even if we forget the toJSON transform,
      // the hash won't appear in query results.
      select: false,
    },
    phone: {
      type: String,
      default: null,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Track failed login attempts for account lockout (Sprint 7)
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockedUntil: {
      type: Date,
      default: null,
    },
  },
  {
    // Automatically adds createdAt and updatedAt fields
    timestamps: true,

    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        // Convert MongoDB _id to id string
        ret.id = ret._id.toString();

        // SECURITY: never send password hash to client
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        delete ret.failedLoginAttempts;
        delete ret.lockedUntil;

        return ret;
      },
    },
  }
);

module.exports = mongoose.model('User', UserSchema);
