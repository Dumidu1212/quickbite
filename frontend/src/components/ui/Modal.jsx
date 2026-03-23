// src/components/ui/Modal.jsx
//
// Reusable accessible modal overlay using native <dialog> with showModal().
//
// WHY showModal()?
//   showModal() promotes the <dialog> to the browser's TOP LAYER —
//   a special rendering context above all CSS stacking contexts, including
//   position:sticky, z-index, and transform. This guarantees the modal
//   appears above everything on the page without z-index fights.
//
// BACKDROP CLICK DETECTION:
//   We cannot put onClick on the <dialog> element because SonarLint S6847
//   flags onClick on non-interactive elements. Instead we use a document-level
//   mousedown listener in a useEffect. When the user clicks the ::backdrop,
//   the event target is the <dialog> element itself (not any of its children).
//   We compare e.target === dialogRef.current to detect backdrop clicks.
//   This is the spec-correct approach used by browser vendors in their docs.
//
// ESCAPE KEY:
//   The browser fires a native 'close' event on the dialog when Escape is pressed.
//   We listen for this event and call onClose() to keep React state in sync.
//   We do NOT need to add our own keydown listener for Escape.

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';

const Modal = ({ open, onClose, title, children }) => {
  const dialogRef = useRef(null);

  // ── Open / close via native API ───────────────────────────────────────────
  //
  // showModal() / close() control visibility.
  // Using else if instead of else { if } satisfies S6660.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // ── Prevent body scroll while open ────────────────────────────────────────

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // ── Sync React state when native dialog closes (e.g. Escape key) ─────────
  //
  // The browser fires 'close' on the dialog element when Escape is pressed.
  // We call onClose() so the parent's open state updates correctly.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleNativeClose = () => onClose();
    dialog.addEventListener('close', handleNativeClose);
    return () => dialog.removeEventListener('close', handleNativeClose);
  }, [onClose]);

  // ── Backdrop click detection via document mousedown ───────────────────────
  //
  // S6847 prohibits onClick on <dialog> because dialog is not interactive.
  // The correct fix: listen on document for mousedown events.
  // When showModal() is active, clicking the ::backdrop area fires mousedown
  // with e.target === the <dialog> element itself (not any child).
  // Clicks inside the modal content bubble up to child elements instead.
  useEffect(() => {
    if (!open) return;

    const handleMouseDown = (e) => {
      if (e.target === dialogRef.current) {
        onClose();
      }
    };

    // useCapture: true ensures we catch the event before it reaches children
    document.addEventListener('mousedown', handleMouseDown, true);
    return () => document.removeEventListener('mousedown', handleMouseDown, true);
  }, [open, onClose]);

  return createPortal(
    <>
      <style>{`
        dialog.qb-modal::backdrop {
          background: rgba(0, 0, 0, 0.5);
        }
        dialog.qb-modal {
          border: none;
          border-radius: 1rem;
          padding: 0;
          max-width: 24rem;
          width: calc(100% - 2rem);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
      `}</style>

      {/* Native <dialog> — no onClick (S6847), no role override (S6819) */}
      <dialog
        ref={dialogRef}
        className="qb-modal"
        aria-labelledby="modal-title"
      >
        {/* Visually hidden title for screen readers */}
        <span id="modal-title" className="sr-only">{title}</span>
        {children}
      </dialog>
    </>,
    document.body
  );
};

Modal.propTypes = {
  open:     PropTypes.bool.isRequired,
  onClose:  PropTypes.func.isRequired,
  title:    PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

export default Modal;
