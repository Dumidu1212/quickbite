// src/pages/CheckoutPage.jsx
//
// Checkout page — delivery details form and order submission.
//
// SESSION EXPIRY HANDLING:
//   The JWT is stored in memory and lost on page refresh.
//   Before submitting, we check hasToken(). If no token exists
//   (session expired after refresh), we show a toast and redirect
//   to login instead of letting the API call fail silently.
//   This gives the user a clear message: "Please sign in to place your order."

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import PropTypes from 'prop-types';
import toast from 'react-hot-toast';
import Navbar from '../components/ui/Navbar';
import BackButton from '../components/ui/BackButton';
import useCart from '../hooks/useCart';
import useAuth from '../hooks/useAuth';
import { createOrder } from '../api/orders.api';
import { hasToken } from '../api/client';

const checkoutSchema = z.object({
  street: z.string().min(5, 'Please enter your full street address').max(200, 'Address too long'),
  city:   z.string().min(2, 'Please enter your city').max(100, 'City name too long'),
  phone:  z.string().regex(/^\+?[\d\s\-()]{7,20}$/, 'Please enter a valid phone number'),
});

const Field = ({ id, label, type = 'text', placeholder, registration, error }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
      {label}
    </label>
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      autoComplete={id}
      className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
        error ? 'border-red-400 bg-red-50' : 'border-gray-200'
      }`}
      {...registration}
    />
    {error && <p className="mt-1 text-xs text-red-600" role="alert">{error.message}</p>}
  </div>
);

Field.propTypes = {
  id:           PropTypes.string.isRequired,
  label:        PropTypes.string.isRequired,
  type:         PropTypes.string,
  placeholder:  PropTypes.string.isRequired,
  registration: PropTypes.object.isRequired,
  error:        PropTypes.shape({ message: PropTypes.string }),
};

const CheckoutPage = () => {
  const { items, totalPrice, clearCart, restaurantId } = useCart();
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(checkoutSchema) });

  // Empty cart state
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-xl mx-auto px-4 py-16 text-center">
          <p className="text-lg font-medium text-gray-600 mb-2">Your cart is empty</p>
          <p className="text-sm text-gray-400 mb-6">Add items from a restaurant to place an order.</p>
          <button
            onClick={() => navigate('/restaurants')}
            className="px-6 py-2.5 bg-gray-900 text-white text-sm rounded-xl hover:bg-gray-800 transition-colors"
          >
            Browse restaurants
          </button>
        </div>
      </div>
    );
  }

  const onSubmit = async (data) => {
    // Check token before making the API call.
    // The token is lost on page refresh — detect this early and give
    // the user a clear message instead of a silent 401 redirect.
    if (!hasToken()) {
      toast.error('Your session expired. Please sign in to place your order.');
      navigate('/login');
      return;
    }

    setSubmitting(true);
    try {
      const orderPayload = {
        restaurantId,
        restaurantName: items[0]?.restaurantName || 'Restaurant',
        items: items.map((item) => ({
          itemId:   item.itemId,
          quantity: item.quantity,
        })),
        deliveryAddress: {
          street: data.street.trim(),
          city:   data.city.trim(),
          phone:  data.phone.trim(),
        },
      };

      const result = await createOrder(orderPayload);
      clearCart();
      toast.success('Order placed! Tracking your delivery...');
      navigate(`/orders/${result.order.id}`);
    } catch (err) {
      if (!err.response) {
        toast.error('Cannot connect to Order service. Please try again.');
        return;
      }
      const apiErrors = err.response?.data?.errors;
      if (apiErrors?.length > 0) {
        toast.error(apiErrors[0].message);
        return;
      }
      toast.error('Could not place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-xl mx-auto px-4 py-8">

        {/* Back navigation */}
        <div className="mb-5">
          <BackButton fallback="/restaurants" label="Back to menu" />
        </div>

        <h1 className="text-xl font-semibold text-gray-900 mb-6">Checkout</h1>

        <div className="space-y-4">
          {/* Order summary */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Order summary</h2>
            <div className="space-y-2 mb-4">
              {items.map((item) => (
                <div key={item.itemId} className="flex justify-between text-sm">
                  <span className="text-gray-700">
                    {item.name}
                    <span className="text-gray-400 ml-1">× {item.quantity}</span>
                  </span>
                  <span className="font-medium text-gray-900">
                    £{(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-between pt-3 border-t border-gray-100">
              <span className="text-sm font-semibold text-gray-900">Total</span>
              <span className="text-base font-bold text-gray-900">£{totalPrice.toFixed(2)}</span>
            </div>
          </div>

          {/* Delivery form */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Delivery details</h2>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                  <p className="text-xs text-gray-500 mb-0.5">Delivering to</p>
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                </div>
                <Field id="street" label="Street address" placeholder="42 Kandy Road, Apartment 3B"
                  registration={register('street')} error={errors.street} />
                <Field id="city" label="City" placeholder="Colombo"
                  registration={register('city')} error={errors.city} />
                <Field id="phone" label="Phone number" type="tel" placeholder="+94 77 123 4567"
                  registration={register('phone')} error={errors.phone} />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-6 bg-gray-900 text-white py-3 rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Placing order...' : `Place order · £${totalPrice.toFixed(2)}`}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CheckoutPage;
