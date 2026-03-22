// src/models/Order.js
//
// The Order model defines the schema for every order stored in MongoDB.
//
// KEY DESIGN DECISIONS:
//
// 1. We store item NAMES and PRICES at the time of ordering.
//    This is critical — if a restaurant later changes a price or removes
//    an item, old orders must still show the correct historic price.
//    Never store only the itemId and look up the price later.
//
// 2. userId is stored as a String (not ObjectId reference) because
//    users live in a DIFFERENT database (users-db, not orders-db).
//    Cross-database ObjectId references don't work in MongoDB.
//    This is the correct approach in a microservice architecture.
//
// 3. Status uses an enum so only valid status transitions are possible.

'use strict';

const mongoose = require('mongoose');

// Sub-schema for individual items within an order
const OrderItemSchema = new mongoose.Schema(
  {
    itemId: {
      type: String,
      required: [true, 'Item ID is required'],
    },
    name: {
      type: String,
      required: [true, 'Item name is required'],
    },
    price: {
      type: Number,
      required: [true, 'Item price is required'],
      min: [0, 'Price cannot be negative'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      max: [99, 'Quantity cannot exceed 99'],
    },
  },
  { _id: false } // don't create a separate _id for each item
);

const OrderSchema = new mongoose.Schema(
  {
    // References the user — stored as string because users live in a different DB
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      index: true, // index speeds up GET /orders/user/:userId queries
    },
    restaurantId: {
      type: String,
      required: [true, 'Restaurant ID is required'],
    },
    restaurantName: {
      type: String,
      required: [true, 'Restaurant name is required'],
    },
    items: {
      type: [OrderItemSchema],
      validate: {
        validator: (items) => items.length > 0,
        message: 'Order must contain at least one item',
      },
    },
    // Calculated server-side — never trust client-sent totals
    totalPrice: {
      type: Number,
      required: [true, 'Total price is required'],
      min: [0, 'Total price cannot be negative'],
    },
    status: {
      type: String,
      enum: {
        values: ['placed', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'],
        message: '{VALUE} is not a valid order status',
      },
      default: 'placed',
    },
    deliveryAddress: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      phone: { type: String, required: true },
    },
  },
  {
    // Automatically adds createdAt and updatedAt timestamps
    timestamps: true,
    // Adds a toJSON transform to convert _id to id in responses
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

module.exports = mongoose.model('Order', OrderSchema);
