ALTER TABLE `cash_registers` ADD `difference_in_cents` integer;--> statement-breakpoint
UPDATE `cash_registers`
SET `difference_in_cents` = `closing_amount_in_cents` - (
	`opening_amount_in_cents` + COALESCE((
		SELECT SUM(`payments`.`amount_in_cents`)
		FROM `payments`
		INNER JOIN `sales` ON `sales`.`id` = `payments`.`sale_id`
		WHERE `sales`.`cash_register_id` = `cash_registers`.`id`
			AND `sales`.`status` = 'paid'
			AND `payments`.`method` = 'cash'
	), 0)
)
WHERE `status` = 'closed' AND `closing_amount_in_cents` IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `cash_registers_single_open_idx` ON `cash_registers` (`status`) WHERE "cash_registers"."status" = 'open';--> statement-breakpoint
CREATE INDEX `cash_registers_opened_at_idx` ON `cash_registers` (`opened_at`);--> statement-breakpoint
CREATE TRIGGER `cash_registers_block_close_with_open_sales`
BEFORE UPDATE OF `status` ON `cash_registers`
WHEN OLD.`status` = 'open'
	AND NEW.`status` = 'closed'
	AND EXISTS (
		SELECT 1 FROM `sales`
		WHERE `sales`.`cash_register_id` = OLD.`id`
			AND `sales`.`status` = 'open'
	)
BEGIN
	SELECT RAISE(ABORT, 'CASH_REGISTER_HAS_OPEN_SALES');
END;--> statement-breakpoint
CREATE TRIGGER `cash_registers_closed_immutable_update`
BEFORE UPDATE ON `cash_registers`
WHEN OLD.`status` = 'closed'
BEGIN
	SELECT RAISE(ABORT, 'CLOSED_CASH_REGISTER_IMMUTABLE');
END;--> statement-breakpoint
CREATE TRIGGER `cash_registers_closed_immutable_delete`
BEFORE DELETE ON `cash_registers`
WHEN OLD.`status` = 'closed'
BEGIN
	SELECT RAISE(ABORT, 'CLOSED_CASH_REGISTER_IMMUTABLE');
END;--> statement-breakpoint
CREATE TRIGGER `sales_require_open_cash_register_insert`
BEFORE INSERT ON `sales`
WHEN NEW.`cash_register_id` IS NULL OR NOT EXISTS (
	SELECT 1 FROM `cash_registers`
	WHERE `cash_registers`.`id` = NEW.`cash_register_id`
		AND `cash_registers`.`status` = 'open'
)
BEGIN
	SELECT RAISE(ABORT, 'CASH_REGISTER_REQUIRED_OPEN');
END;--> statement-breakpoint
CREATE TRIGGER `sales_require_open_cash_register_update`
BEFORE UPDATE ON `sales`
WHEN NEW.`cash_register_id` IS NULL
	OR NOT EXISTS (
		SELECT 1 FROM `cash_registers`
		WHERE `cash_registers`.`id` = NEW.`cash_register_id`
			AND `cash_registers`.`status` = 'open'
	)
	OR NOT EXISTS (
		SELECT 1 FROM `cash_registers`
		WHERE `cash_registers`.`id` = OLD.`cash_register_id`
			AND `cash_registers`.`status` = 'open'
	)
BEGIN
	SELECT RAISE(ABORT, 'CASH_REGISTER_REQUIRED_OPEN');
END;--> statement-breakpoint
CREATE TRIGGER `sales_require_open_cash_register_delete`
BEFORE DELETE ON `sales`
WHEN NOT EXISTS (
	SELECT 1 FROM `cash_registers`
	WHERE `cash_registers`.`id` = OLD.`cash_register_id`
		AND `cash_registers`.`status` = 'open'
)
BEGIN
	SELECT RAISE(ABORT, 'CLOSED_CASH_REGISTER_IMMUTABLE');
END;--> statement-breakpoint
CREATE TRIGGER `sale_items_require_open_cash_register_insert`
BEFORE INSERT ON `sale_items`
WHEN NOT EXISTS (
	SELECT 1 FROM `sales`
	INNER JOIN `cash_registers` ON `cash_registers`.`id` = `sales`.`cash_register_id`
	WHERE `sales`.`id` = NEW.`sale_id` AND `cash_registers`.`status` = 'open'
)
BEGIN
	SELECT RAISE(ABORT, 'CASH_REGISTER_REQUIRED_OPEN');
END;--> statement-breakpoint
CREATE TRIGGER `sale_items_require_open_cash_register_update`
BEFORE UPDATE ON `sale_items`
WHEN NOT EXISTS (
	SELECT 1 FROM `sales`
	INNER JOIN `cash_registers` ON `cash_registers`.`id` = `sales`.`cash_register_id`
	WHERE `sales`.`id` = OLD.`sale_id` AND `cash_registers`.`status` = 'open'
)
	OR NOT EXISTS (
		SELECT 1 FROM `sales`
		INNER JOIN `cash_registers` ON `cash_registers`.`id` = `sales`.`cash_register_id`
		WHERE `sales`.`id` = NEW.`sale_id` AND `cash_registers`.`status` = 'open'
	)
BEGIN
	SELECT RAISE(ABORT, 'CASH_REGISTER_REQUIRED_OPEN');
END;--> statement-breakpoint
CREATE TRIGGER `sale_items_require_open_cash_register_delete`
BEFORE DELETE ON `sale_items`
WHEN NOT EXISTS (
	SELECT 1 FROM `sales`
	INNER JOIN `cash_registers` ON `cash_registers`.`id` = `sales`.`cash_register_id`
	WHERE `sales`.`id` = OLD.`sale_id` AND `cash_registers`.`status` = 'open'
)
BEGIN
	SELECT RAISE(ABORT, 'CLOSED_CASH_REGISTER_IMMUTABLE');
END;--> statement-breakpoint
CREATE TRIGGER `payments_require_open_cash_register_insert`
BEFORE INSERT ON `payments`
WHEN NOT EXISTS (
	SELECT 1 FROM `sales`
	INNER JOIN `cash_registers` ON `cash_registers`.`id` = `sales`.`cash_register_id`
	WHERE `sales`.`id` = NEW.`sale_id` AND `cash_registers`.`status` = 'open'
)
BEGIN
	SELECT RAISE(ABORT, 'CASH_REGISTER_REQUIRED_OPEN');
END;--> statement-breakpoint
CREATE TRIGGER `payments_require_open_cash_register_update`
BEFORE UPDATE ON `payments`
WHEN NOT EXISTS (
	SELECT 1 FROM `sales`
	INNER JOIN `cash_registers` ON `cash_registers`.`id` = `sales`.`cash_register_id`
	WHERE `sales`.`id` = OLD.`sale_id` AND `cash_registers`.`status` = 'open'
)
	OR NOT EXISTS (
		SELECT 1 FROM `sales`
		INNER JOIN `cash_registers` ON `cash_registers`.`id` = `sales`.`cash_register_id`
		WHERE `sales`.`id` = NEW.`sale_id` AND `cash_registers`.`status` = 'open'
	)
BEGIN
	SELECT RAISE(ABORT, 'CASH_REGISTER_REQUIRED_OPEN');
END;--> statement-breakpoint
CREATE TRIGGER `payments_require_open_cash_register_delete`
BEFORE DELETE ON `payments`
WHEN NOT EXISTS (
	SELECT 1 FROM `sales`
	INNER JOIN `cash_registers` ON `cash_registers`.`id` = `sales`.`cash_register_id`
	WHERE `sales`.`id` = OLD.`sale_id` AND `cash_registers`.`status` = 'open'
)
BEGIN
	SELECT RAISE(ABORT, 'CLOSED_CASH_REGISTER_IMMUTABLE');
END;
