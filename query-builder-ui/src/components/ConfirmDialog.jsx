import Modal from './Modal.jsx'
import Button from './Button.jsx'

/**
 * Small confirmation dialog, stacked on top of whatever is open. Render it conditionally; it
 * calls onConfirm or onCancel and the caller unmounts it.
 */
export default function ConfirmDialog({ title, children, confirmLabel = 'Confirm', variant = 'danger', busy = false, onConfirm, onCancel }) {
  return (
    <Modal
      title={title}
      size="md"
      onRequestClose={busy ? undefined : onCancel}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={busy} data-autofocus>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm text-slate-600">{children}</div>
    </Modal>
  )
}
