// src/pages/ProfilePage.jsx
//
// User profile page — view and edit personal details, upload a profile photo,
// and manage account actions including sign out and account deletion.
//
// SECTIONS:
//   1. Profile header — avatar with upload button, name, email
//   2. Personal details — editable name and phone
//   3. Account information — read-only metadata with email change explanation
//   4. Danger zone — sign out (with confirmation) and delete account
//
// MODAL STRATEGY:
//   Both the logout confirmation and delete confirmation use the Modal component
//   which renders via createPortal into document.body. This ensures they appear
//   centred over the full viewport — not trapped inside a parent stacking context.
//
// WHY EMAIL CANNOT BE CHANGED:
//   Email changes require verifying ownership of the new address. Without that,
//   anyone with session access could hijack an account by changing the email.
//   The correct flow (Sprint 7): POST /auth/change-email → sends verification
//   link → email updates only after the user clicks the link.
//
// ACCOUNT DELETION:
//   Soft delete — sets isActive: false in MongoDB. Preserves order history
//   and referential integrity across services. Requires typing "DELETE" to confirm.

import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import PropTypes from 'prop-types';
import toast from 'react-hot-toast';
import useAuth from '../hooks/useAuth';
import Navbar from '../components/ui/Navbar';
import Modal from '../components/ui/Modal';
import {
  fileToBase64,
  saveProfileImage,
  loadProfileImage,
  clearProfileImage,
  generateInitialsAvatar,
} from '../utils/profileImage';
import { updateProfile, deleteAccount } from '../api/auth.api';

// ── Validation schema ──────────────────────────────────────────────────────

const profileSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name cannot exceed 50 characters'),
  phone: z
    .string()
    .regex(/^\+?[\d\s\-()]{7,20}$/, 'Please enter a valid phone number')
    .or(z.literal(''))
    .optional(),
});

// The user must type this word exactly to confirm account deletion
const DELETE_CONFIRMATION_WORD = 'DELETE';

// ── Sub-components ─────────────────────────────────────────────────────────

const Avatar = ({ user, imageUrl, onImageChange, uploading }) => {
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    onImageChange(file);
  };

  const displayImage = imageUrl || generateInitialsAvatar(user.name, user.id);

  return (
    <div className="relative inline-block">
      <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-white shadow-md">
        <img
          src={displayImage}
          alt={`${user.name}'s avatar`}
          className="w-full h-full object-cover"
        />
      </div>

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        disabled={uploading}
        aria-label="Change profile photo"
        className="absolute bottom-0 right-0 w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center text-white hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
      >
        {uploading ? (
          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" focusable="false">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
        )}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
};

Avatar.propTypes = {
  user: PropTypes.shape({
    name: PropTypes.string.isRequired,
    id:   PropTypes.string.isRequired,
  }).isRequired,
  imageUrl:      PropTypes.string,
  onImageChange: PropTypes.func.isRequired,
  uploading:     PropTypes.bool.isRequired,
};

// ── Logout modal content ───────────────────────────────────────────────────

const LogoutModalContent = ({ onConfirm, onCancel }) => (
  <div className="p-6">
    <div className="flex justify-center mb-4">
      <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center">
        <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" focusable="false">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
        </svg>
      </div>
    </div>
    <h2 className="text-base font-semibold text-gray-900 text-center mb-1">
      Sign out of QuickBite?
    </h2>
    <p className="text-sm text-gray-500 text-center mb-6">
      You will need to sign in again to place orders.
    </p>
    <div className="flex gap-3">
      <button onClick={onCancel}
        className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
        Cancel
      </button>
      <button onClick={onConfirm}
        className="flex-1 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
        Sign out
      </button>
    </div>
  </div>
);

LogoutModalContent.propTypes = {
  onConfirm: PropTypes.func.isRequired,
  onCancel:  PropTypes.func.isRequired,
};

// ── Delete account modal content ───────────────────────────────────────────

const DeleteModalContent = ({ onConfirm, onCancel, deleting }) => {
  const [confirmText, setConfirmText] = useState('');
  const isConfirmed = confirmText === DELETE_CONFIRMATION_WORD;

  return (
    <div className="p-6">
      {/* Destructive warning icon */}
      <div className="flex justify-center mb-4">
        <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
          <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" focusable="false">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
        </div>
      </div>

      <h2 className="text-base font-semibold text-gray-900 text-center mb-2">
        Delete your account?
      </h2>

      {/* Explicit list of consequences */}
      <div className="bg-red-50 rounded-xl p-3 mb-5 text-left">
        <p className="text-xs font-semibold text-red-700 mb-2">This cannot be undone:</p>
        <ul className="text-xs text-red-600 space-y-1">
          <li className="flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0" />
            <span>Your account will be permanently deactivated</span>
          </li>
          <li className="flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0" />
            <span>You will not be able to log in again</span>
          </li>
          <li className="flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0" />
            <span>Your order history will be preserved for records</span>
          </li>
        </ul>
      </div>

      {/* Type DELETE to confirm — prevents accidental deletion */}
      <div className="mb-5">
        <label htmlFor="delete-confirm-input" className="block text-sm text-gray-600 mb-1.5">
          Type <span className="font-mono font-bold text-red-600 select-all">{DELETE_CONFIRMATION_WORD}</span> to confirm
        </label>
        <input
          id="delete-confirm-input"
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={DELETE_CONFIRMATION_WORD}
          autoComplete="off"
          spellCheck="false"
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent font-mono tracking-wider"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={deleting}
          className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={!isConfirmed || deleting}
          className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {deleting ? 'Deleting...' : 'Delete account'}
        </button>
      </div>
    </div>
  );
};

DeleteModalContent.propTypes = {
  onConfirm: PropTypes.func.isRequired,
  onCancel:  PropTypes.func.isRequired,
  deleting:  PropTypes.bool.isRequired,
};

// ── Reusable form field ────────────────────────────────────────────────────

const Field = ({ id, label, type = 'text', placeholder, registration, error, hint }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
      {label}
    </label>
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
        error ? 'border-red-400 bg-red-50' : 'border-gray-200'
      }`}
      {...registration}
    />
    {error && <p className="mt-1 text-xs text-red-600" role="alert">{error.message}</p>}
    {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
  </div>
);

Field.propTypes = {
  id:           PropTypes.string.isRequired,
  label:        PropTypes.string.isRequired,
  type:         PropTypes.string,
  placeholder:  PropTypes.string.isRequired,
  registration: PropTypes.object.isRequired,
  error:        PropTypes.shape({ message: PropTypes.string }),
  hint:         PropTypes.string,
};

// ── Read-only info row ─────────────────────────────────────────────────────

const InfoRow = ({ label, value }) => (
  <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
    <span className="text-sm text-gray-500">{label}</span>
    <span className="text-sm font-medium text-gray-900">{value}</span>
  </div>
);

InfoRow.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
};

// ── Page ───────────────────────────────────────────────────────────────────

const ProfilePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [profileImage, setProfileImage]       = useState(() => loadProfileImage(user?.id));
  const [uploadingImage, setUploadingImage]   = useState(false);
  const [isEditing, setIsEditing]             = useState(false);
  const [saving, setSaving]                   = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting]               = useState(false);

  // ── Form ───────────────────────────────────────────────────────────────

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name || '', phone: user?.phone || '' },
  });

  // ── Image handlers ─────────────────────────────────────────────────────

  const handleImageChange = useCallback(async (file) => {
    setUploadingImage(true);
    try {
      const base64 = await fileToBase64(file);
      saveProfileImage(user.id, base64);
      setProfileImage(base64);
      toast.success('Profile photo updated');
    } catch (err) {
      toast.error(err.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  }, [user?.id]);

  const handleRemoveImage = useCallback(() => {
    clearProfileImage(user.id);
    setProfileImage(null);
    toast.success('Profile photo removed');
  }, [user?.id]);

  // ── Profile update ─────────────────────────────────────────────────────

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      const updates = {
        name: data.name.trim(),
        ...(data.phone?.trim() && { phone: data.phone.trim() }),
      };
      const result = await updateProfile(updates);
      const updatedUser = result.user;
      sessionStorage.setItem('quickbite_user', JSON.stringify(updatedUser));
      reset({ name: updatedUser.name, phone: updatedUser.phone || '' });
      setIsEditing(false);
      toast.success('Profile updated successfully');
      globalThis.location.reload();
    } catch (err) {
      const msg = err.response?.data?.errors?.[0]?.message
        || 'Failed to update profile. Please try again.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    reset({ name: user?.name || '', phone: user?.phone || '' });
    setIsEditing(false);
  };

  // ── Logout handlers ────────────────────────────────────────────────────

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    logout();
    navigate('/login');
  };

  // ── Delete handlers ────────────────────────────────────────────────────

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      toast.success('Account deleted. Goodbye.');
      clearProfileImage(user.id);
      logout();
    } catch (err) {
      const msg = err.response?.data?.message
        || 'Failed to delete account. Please try again.';
      toast.error(msg);
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  // ── Formatted member since date ────────────────────────────────────────

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : 'N/A';

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-xl mx-auto px-4 py-10">
        <h1 className="text-xl font-semibold text-gray-900 mb-6">Your profile</h1>

        {/* ── Profile header ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4">
          <div className="flex items-center gap-5">
            <Avatar
              user={user}
              imageUrl={profileImage}
              onImageChange={handleImageChange}
              uploading={uploadingImage}
            />
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 truncate">{user?.name}</h2>
              <p className="text-sm text-gray-500 truncate">{user?.email}</p>
              {profileImage && (
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="mt-2 text-xs text-red-500 hover:text-red-600 hover:underline transition-colors"
                >
                  Remove photo
                </button>
              )}
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
            Profile photos are stored in this browser session only and cleared when you close this tab.
          </p>
        </div>

        {/* ── Personal details ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-gray-900">Personal details</h2>
            {!isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                Edit
              </button>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="space-y-4">
                <Field
                  id="profile-name"
                  label="Full name"
                  placeholder="Dumidu Perera"
                  registration={register('name')}
                  error={errors.name}
                />
                <Field
                  id="profile-phone"
                  label="Phone number"
                  type="tel"
                  placeholder="+94 77 123 4567"
                  registration={register('phone')}
                  error={errors.phone}
                  hint="Optional — used for delivery contact"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={handleCancelEdit}
                  className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={!isDirty || saving}
                  className="flex-1 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          ) : (
            <div>
              <InfoRow label="Full name" value={user?.name || '—'} />
              <InfoRow label="Phone" value={user?.phone || 'Not added'} />
            </div>
          )}
        </div>

        {/* ── Account information (read-only) ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Account information</h2>

          {/* Email — read-only with explanation */}
          <div className="flex items-start justify-between py-3 border-b border-gray-100 gap-4">
            <span className="text-sm text-gray-500 flex-shrink-0">Email address</span>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user?.email}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Email changes require identity verification — coming soon
              </p>
            </div>
          </div>

          <InfoRow label="Member since" value={memberSince} />
          <InfoRow label="Account ID" value={user?.id?.slice(-8)?.toUpperCase() || '—'} />
        </div>

        {/* ── Danger zone ── */}
        <div className="bg-white rounded-2xl border border-red-200 overflow-hidden">
          <div className="px-6 py-4 bg-red-50 border-b border-red-200">
            <h2 className="text-sm font-semibold text-red-700">Danger zone</h2>
            <p className="text-xs text-red-500 mt-0.5">
              These actions are irreversible. Please be certain before proceeding.
            </p>
          </div>

          {/* Sign out row */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-900">Sign out</p>
              <p className="text-xs text-gray-400 mt-0.5">End your current session</p>
            </div>
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="px-4 py-2 border border-gray-200 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Sign out
            </button>
          </div>

          {/* Delete account row */}
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-sm font-medium text-gray-900">Delete account</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Permanently deactivate your account
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>

      </main>

      {/* Logout confirmation — rendered via createPortal, above everything */}
      <Modal
        open={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="Sign out confirmation"
      >
        <LogoutModalContent
          onConfirm={handleConfirmLogout}
          onCancel={() => setShowLogoutModal(false)}
        />
      </Modal>

      {/* Delete confirmation — rendered via createPortal, above everything */}
      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete account confirmation"
      >
        <DeleteModalContent
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowDeleteModal(false)}
          deleting={deleting}
        />
      </Modal>

    </div>
  );
};

export default ProfilePage;
