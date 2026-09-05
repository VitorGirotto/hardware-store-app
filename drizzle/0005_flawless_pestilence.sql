DROP TRIGGER `cash_registers_block_close_with_open_sales`;
--> statement-breakpoint
DROP TRIGGER `cash_registers_closed_immutable_update`;
--> statement-breakpoint
DROP TRIGGER `cash_registers_closed_immutable_delete`;
--> statement-breakpoint
DROP TRIGGER `sales_require_open_cash_register_insert`;
--> statement-breakpoint
DROP TRIGGER `sales_require_open_cash_register_update`;
--> statement-breakpoint
DROP TRIGGER `sales_require_open_cash_register_delete`;
--> statement-breakpoint
DROP TRIGGER `sale_items_require_open_cash_register_insert`;
--> statement-breakpoint
DROP TRIGGER `sale_items_require_open_cash_register_update`;
--> statement-breakpoint
DROP TRIGGER `sale_items_require_open_cash_register_delete`;
--> statement-breakpoint
DROP TRIGGER `payments_require_open_cash_register_insert`;
--> statement-breakpoint
DROP TRIGGER `payments_require_open_cash_register_update`;
--> statement-breakpoint
DROP TRIGGER `payments_require_open_cash_register_delete`;
--> statement-breakpoint
CREATE TABLE __migration_sale_items AS SELECT i.*, p.name AS product_name FROM sale_items i LEFT JOIN products p ON p.id = i.product_id;
--> statement-breakpoint
CREATE TABLE __migration_payments AS SELECT * FROM payments;
--> statement-breakpoint
DELETE FROM payments;
--> statement-breakpoint
DROP TABLE sale_items;
--> statement-breakpoint
CREATE TABLE `__new_sales` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`customer_id` integer,
	`cash_register_id` integer NOT NULL,
	`subtotal_in_cents` integer NOT NULL,
	`discount_in_cents` integer DEFAULT 0 NOT NULL,
	`total_in_cents` integer NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cash_register_id`) REFERENCES `cash_registers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_sales`("id", "customer_id", "cash_register_id", "subtotal_in_cents", "discount_in_cents", "total_in_cents", "status", "created_at") SELECT "id", "customer_id", "cash_register_id", "subtotal_in_cents", "discount_in_cents", "total_in_cents", "status", "created_at" FROM `sales`;
--> statement-breakpoint
DROP TABLE `sales`;
--> statement-breakpoint
ALTER TABLE `__new_sales` RENAME TO `sales`;
--> statement-breakpoint
CREATE TABLE __new_sale_items (
 id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
 sale_id integer NOT NULL REFERENCES sales(id),
 product_id integer NOT NULL REFERENCES products(id),
 product_name text NOT NULL,
 quantity real NOT NULL,
 unit_price_in_cents integer NOT NULL,
 discount_in_cents integer DEFAULT 0 NOT NULL,
 total_in_cents integer NOT NULL
);
--> statement-breakpoint
INSERT INTO __new_sale_items (id, sale_id, product_id, product_name, quantity, unit_price_in_cents, discount_in_cents, total_in_cents)
SELECT id, sale_id, product_id, product_name, quantity, unit_price_in_cents, 0, total_in_cents FROM __migration_sale_items;
--> statement-breakpoint
ALTER TABLE __new_sale_items RENAME TO sale_items;
--> statement-breakpoint
INSERT INTO payments SELECT * FROM __migration_payments;
--> statement-breakpoint
DROP TABLE __migration_payments;
--> statement-breakpoint
DROP TABLE __migration_sale_items;
--> statement-breakpoint
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
END;
--> statement-breakpoint
CREATE TRIGGER `cash_registers_closed_immutable_update`
BEFORE UPDATE ON `cash_registers`
WHEN OLD.`status` = 'closed'
BEGIN
	SELECT RAISE(ABORT, 'CLOSED_CASH_REGISTER_IMMUTABLE');
END;
--> statement-breakpoint
CREATE TRIGGER `cash_registers_closed_immutable_delete`
BEFORE DELETE ON `cash_registers`
WHEN OLD.`status` = 'closed'
BEGIN
	SELECT RAISE(ABORT, 'CLOSED_CASH_REGISTER_IMMUTABLE');
END;
--> statement-breakpoint
CREATE TRIGGER `sales_require_open_cash_register_insert`
BEFORE INSERT ON `sales`
WHEN NEW.`cash_register_id` IS NULL OR NOT EXISTS (
	SELECT 1 FROM `cash_registers`
	WHERE `cash_registers`.`id` = NEW.`cash_register_id`
		AND `cash_registers`.`status` = 'open'
)
BEGIN
	SELECT RAISE(ABORT, 'CASH_REGISTER_REQUIRED_OPEN');
END;
--> statement-breakpoint
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
END;
--> statement-breakpoint
CREATE TRIGGER `sales_require_open_cash_register_delete`
BEFORE DELETE ON `sales`
WHEN NOT EXISTS (
	SELECT 1 FROM `cash_registers`
	WHERE `cash_registers`.`id` = OLD.`cash_register_id`
		AND `cash_registers`.`status` = 'open'
)
BEGIN
	SELECT RAISE(ABORT, 'CLOSED_CASH_REGISTER_IMMUTABLE');
END;
--> statement-breakpoint
CREATE TRIGGER `sale_items_require_open_cash_register_insert`
BEFORE INSERT ON `sale_items`
WHEN NOT EXISTS (
	SELECT 1 FROM `sales`
	INNER JOIN `cash_registers` ON `cash_registers`.`id` = `sales`.`cash_register_id`
	WHERE `sales`.`id` = NEW.`sale_id` AND `cash_registers`.`status` = 'open'
)
BEGIN
	SELECT RAISE(ABORT, 'CASH_REGISTER_REQUIRED_OPEN');
END;
--> statement-breakpoint
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
END;
--> statement-breakpoint
CREATE TRIGGER `sale_items_require_open_cash_register_delete`
BEFORE DELETE ON `sale_items`
WHEN NOT EXISTS (
	SELECT 1 FROM `sales`
	INNER JOIN `cash_registers` ON `cash_registers`.`id` = `sales`.`cash_register_id`
	WHERE `sales`.`id` = OLD.`sale_id` AND `cash_registers`.`status` = 'open'
)
BEGIN
	SELECT RAISE(ABORT, 'CLOSED_CASH_REGISTER_IMMUTABLE');
END;
--> statement-breakpoint
CREATE TRIGGER `payments_require_open_cash_register_insert`
BEFORE INSERT ON `payments`
WHEN NOT EXISTS (
	SELECT 1 FROM `sales`
	INNER JOIN `cash_registers` ON `cash_registers`.`id` = `sales`.`cash_register_id`
	WHERE `sales`.`id` = NEW.`sale_id` AND `cash_registers`.`status` = 'open'
)
BEGIN
	SELECT RAISE(ABORT, 'CASH_REGISTER_REQUIRED_OPEN');
END;
--> statement-breakpoint
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
END;
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TRIGGER sales_paid_immutable_update
BEFORE UPDATE ON sales WHEN OLD.status = 'paid'
BEGIN SELECT RAISE(ABORT, 'PAID_SALE_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER sales_paid_immutable_delete
BEFORE DELETE ON sales WHEN OLD.status = 'paid'
BEGIN SELECT RAISE(ABORT, 'PAID_SALE_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER sale_items_paid_immutable_insert
BEFORE INSERT ON sale_items WHEN EXISTS (SELECT 1 FROM sales WHERE id = NEW.sale_id AND status = 'paid')
BEGIN SELECT RAISE(ABORT, 'PAID_SALE_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER sale_items_paid_immutable_update
BEFORE UPDATE ON sale_items WHEN EXISTS (SELECT 1 FROM sales WHERE id = OLD.sale_id AND status = 'paid') OR EXISTS (SELECT 1 FROM sales WHERE id = NEW.sale_id AND status = 'paid')
BEGIN SELECT RAISE(ABORT, 'PAID_SALE_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER sale_items_paid_immutable_delete
BEFORE DELETE ON sale_items WHEN EXISTS (SELECT 1 FROM sales WHERE id = OLD.sale_id AND status = 'paid')
BEGIN SELECT RAISE(ABORT, 'PAID_SALE_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER payments_paid_immutable_insert
BEFORE INSERT ON payments WHEN EXISTS (SELECT 1 FROM sales WHERE id = NEW.sale_id AND status = 'paid')
BEGIN SELECT RAISE(ABORT, 'PAID_SALE_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER payments_paid_immutable_update
BEFORE UPDATE ON payments WHEN EXISTS (SELECT 1 FROM sales WHERE id = OLD.sale_id AND status = 'paid') OR EXISTS (SELECT 1 FROM sales WHERE id = NEW.sale_id AND status = 'paid')
BEGIN SELECT RAISE(ABORT, 'PAID_SALE_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER payments_paid_immutable_delete
BEFORE DELETE ON payments WHEN EXISTS (SELECT 1 FROM sales WHERE id = OLD.sale_id AND status = 'paid')
BEGIN SELECT RAISE(ABORT, 'PAID_SALE_IMMUTABLE'); END;
