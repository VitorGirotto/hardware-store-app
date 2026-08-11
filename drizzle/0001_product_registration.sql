PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `__new_products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`internal_code` text NOT NULL,
	`barcode` text,
	`ncm` text,
	`category` text,
	`unit_of_measure` text DEFAULT 'Un' NOT NULL,
	`cost_price_in_cents` integer DEFAULT 0 NOT NULL,
	`sale_price_in_cents` integer NOT NULL,
	`stock_quantity` real DEFAULT 0 NOT NULL,
	`minimum_stock_quantity` real DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_products` (
	`id`,
	`name`,
	`internal_code`,
	`barcode`,
	`ncm`,
	`category`,
	`unit_of_measure`,
	`cost_price_in_cents`,
	`sale_price_in_cents`,
	`stock_quantity`,
	`minimum_stock_quantity`,
	`is_active`,
	`created_at`,
	`updated_at`
)
SELECT
	`id`,
	`name`,
	`sku`,
	NULL,
	NULL,
	NULL,
	CASE
		WHEN lower(`unit`) = 'kg' THEN 'Kg'
		WHEN lower(`unit`) = 'metro' THEN 'Metro'
		ELSE 'Un'
	END,
	0,
	`price_in_cents`,
	`stock_quantity`,
	`minimum_stock_quantity`,
	`is_active`,
	`created_at`,
	`updated_at`
FROM `products`;
--> statement-breakpoint
DROP INDEX `products_sku_unique`;
--> statement-breakpoint
DROP TABLE `products`;
--> statement-breakpoint
ALTER TABLE `__new_products` RENAME TO `products`;
--> statement-breakpoint
CREATE UNIQUE INDEX `products_internal_code_unique` ON `products` (`internal_code`);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_barcode_unique` ON `products` (`barcode`);
--> statement-breakpoint
PRAGMA foreign_keys=ON;
