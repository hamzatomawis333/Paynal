-- Trail of admin actions (settings changes, user role/status changes and
-- deletions, subscription rejections/expirations/deletions). payment_events
-- already covers payment confirmations; this covers everything else.
-- admin_id is nullable + SET NULL so deleting an admin account does not
-- erase the history of what they did.
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NULL,
    action VARCHAR(64) NOT NULL,
    target_type VARCHAR(32) NOT NULL DEFAULT '',
    target_id INT NOT NULL DEFAULT 0,
    details TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_created (created_at),
    INDEX idx_action (action),
    CONSTRAINT fk_audit_admin FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
