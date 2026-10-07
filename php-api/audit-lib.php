<?php
// Admin action audit trail. Never throws: a failed audit insert must not
// break the admin action it is describing.

function logAdminAudit($conn, $adminId, $action, $targetType = '', $targetId = 0, $details = null) {
    try {
        $adminIdOrNull = $adminId ? (int) $adminId : null;
        $detailsJson = null;
        if ($details !== null && $details !== '') {
            $detailsJson = is_string($details) ? $details : json_encode($details, JSON_UNESCAPED_UNICODE);
        }

        $stmt = $conn->prepare(
            "INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details)
             VALUES (?, ?, ?, ?, ?)"
        );
        $stmt->bind_param(
            "issis",
            $adminIdOrNull,
            $action,
            $targetType,
            $targetId,
            $detailsJson
        );
        $stmt->execute();
    } catch (Throwable $e) {
        error_log("admin_audit_log insert failed: " . $e->getMessage());
    }
}
